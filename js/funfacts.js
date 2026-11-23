// ===========================================================
// "Did you know?" fun facts for National Dex favourites.
// Built from PokéAPI data the Pokémon page doesn't show: older Pokédex
// entries, Japanese name, how it evolves, debut generation, catch rate,
// gender ratio, egg steps, special forms, and a Snoozlet weight comparison.
// ===========================================================
import { API, getJSON, idFromUrl, english, prettyName } from "./pokeapi.js";
import { db } from "./data.js";
import { store } from "./store.js";

const GEN = {
  "generation-i": "Generation I (Kanto)", "generation-ii": "Generation II (Johto)", "generation-iii": "Generation III (Hoenn)",
  "generation-iv": "Generation IV (Sinnoh)", "generation-v": "Generation V (Unova)", "generation-vi": "Generation VI (Kalos)",
  "generation-vii": "Generation VII (Alola)", "generation-viii": "Generation VIII (Galar)", "generation-ix": "Generation IX (Paldea)",
};
const GEN_YEAR = { "generation-i": 1996, "generation-ii": 1999, "generation-iii": 2002, "generation-iv": 2006, "generation-v": 2010,
  "generation-vi": 2013, "generation-vii": 2016, "generation-viii": 2019, "generation-ix": 2022 };

const VERSION_NAMES = { "lets-go-pikachu": "Let's Go, Pikachu!", "lets-go-eevee": "Let's Go, Eevee!", "firered": "FireRed",
  "leafgreen": "LeafGreen", "heartgold": "HeartGold", "soulsilver": "SoulSilver", "omega-ruby": "Omega Ruby",
  "alpha-sapphire": "Alpha Sapphire", "ultra-sun": "Ultra Sun", "ultra-moon": "Ultra Moon", "legends-arceus": "Legends: Arceus" };
const versionName = (slug) => "Pokémon " + (VERSION_NAMES[slug] || prettyName(slug));

const clean = (s) => s.replace(/[\f\n\r­]+/g, " ").replace(/\s+/g, " ").trim();

/** Plain-English description of one evolution step. */
function howItEvolves(d) {
  const bits = [];
  const t = d.trigger?.name;
  if (t === "trade") bits.push(d.held_item ? `when traded while holding a ${prettyName(d.held_item.name)}` : "only when traded");
  else if (t === "use-item" && d.item) bits.push(`when exposed to a ${prettyName(d.item.name)}`);
  else if (d.min_level) bits.push(`at level ${d.min_level}`);
  else if (t === "level-up") bits.push("when it levels up");
  if (d.min_happiness) bits.push("once it's very friendly with its Trainer");
  if (d.min_affection) bits.push("once it's very affectionate");
  if (d.known_move_type) bits.push(`while knowing a ${prettyName(d.known_move_type.name)}-type move`);
  if (d.held_item && t !== "trade") bits.push(`while holding a ${prettyName(d.held_item.name)}`);
  if (d.time_of_day) bits.push(`during the ${d.time_of_day}`);
  if (d.location) bits.push(`near ${prettyName(d.location.name)}`);
  if (d.needs_overworld_rain) bits.push("while it's raining");
  return bits.length ? bits.join(" ") : null;
}

function findNode(node, id, parent = null) {
  if (idFromUrl(node.species.url) === id) return { node, parent };
  for (const next of node.evolves_to) {
    const hit = findNode(next, id, node);
    if (hit) return hit;
  }
  return null;
}

const memo = new Map();

/** Fun facts for one National Dex Pokémon: [{ label, text }]. */
export function funFacts(id) {
  if (!memo.has(id)) memo.set(id, build(id).catch((e) => { memo.delete(id); throw e; }));
  return memo.get(id);
}

async function build(id) {
  const [mon, species] = await Promise.all([getJSON(`${API}/pokemon/${id}`), getJSON(`${API}/pokemon-species/${id}`)]);
  const name = english(species.names, "name") || prettyName(species.name);
  const facts = [];

  // Older Pokédex entries (the page already shows the newest one).
  const entries = species.flavor_text_entries.filter((e) => e.language.name === "en");
  const latest = clean(entries[entries.length - 1]?.flavor_text || "");
  const seen = new Set([latest.toLowerCase()]);
  const older = [];
  for (const e of entries) {
    const text = clean(e.flavor_text);
    if (seen.has(text.toLowerCase())) continue;
    seen.add(text.toLowerCase());
    older.push({ text, version: e.version.name });
  }
  [older[0], older[Math.floor(older.length / 2)], older[older.length - 2]]
    .filter((e, i, arr) => e && arr.indexOf(e) === i)
    .forEach((e) => facts.push({ label: "Old Pokédex entry", text: `In ${versionName(e.version)}, its Pokédex said: “${e.text}”` }));

  // Japanese name
  const ja = species.names.find((n) => n.language.name === "ja-Hrkt")?.name || species.names.find((n) => n.language.name === "ja")?.name;
  const roomaji = species.names.find((n) => n.language.name === "roomaji")?.name;
  if (ja) {
    facts.push({ label: "In Japan", text: roomaji && roomaji.toLowerCase() !== name.toLowerCase()
      ? `In Japan, ${name} is called ${ja} (${roomaji}).`
      : `In Japan, ${name} is written ${ja}, and it sounds just like its English name.` });
  }

  // Debut
  const gen = species.generation?.name;
  if (GEN[gen]) facts.push({ label: "Debut", text: `${name} first appeared in ${GEN[gen]}, back in ${GEN_YEAR[gen]}.` });

  // How it evolves (and how it was evolved from)
  try {
    const chain = await getJSON(species.evolution_chain.url);
    const hit = findNode(chain.chain, id);
    if (hit?.parent) {
      const how = hit.node.evolution_details.map(howItEvolves).find(Boolean);
      if (how) facts.push({ label: "Evolution", text: `${prettyName(hit.parent.species.name)} evolves into ${name} ${how}.` });
    }
    for (const next of hit?.node.evolves_to || []) {
      const how = next.evolution_details.map(howItEvolves).find(Boolean);
      if (how) facts.push({ label: "Evolution", text: `${name} evolves into ${prettyName(next.species.name)} ${how}.` });
    }
  } catch { /* optional */ }

  // Catch rate
  const cr = species.capture_rate;
  if (cr <= 3) facts.push({ label: "Catching", text: `${name} is one of the hardest Pokémon to catch: its catch rate is just ${cr} out of 255.` });
  else if (cr >= 200) facts.push({ label: "Catching", text: `${name} is one of the easiest Pokémon to catch, with a catch rate of ${cr} out of 255.` });
  else facts.push({ label: "Catching", text: `${name}'s catch rate is ${cr} out of 255${cr < 60 ? ", so bring plenty of Ultra Balls" : ""}.` });

  // Gender
  const g = species.gender_rate;
  if (g === -1) facts.push({ label: "Gender", text: `${name} has no gender at all.` });
  else if (g === 0) facts.push({ label: "Gender", text: `Every ${name} ever discovered has been male.` });
  else if (g === 8) facts.push({ label: "Gender", text: `Every ${name} ever discovered has been female.` });
  else if (species.has_gender_differences) facts.push({ label: "Gender", text: `Male and female ${name} look slightly different. Look closely!` });

  // Eggs
  if (species.egg_groups.some((e) => e.name === "no-eggs")) {
    facts.push({ label: "Eggs", text: `No one has ever found a ${name} Egg.` });
  } else if (species.hatch_counter != null) {
    const steps = (species.hatch_counter + 1) * 255;
    facts.push({ label: "Eggs", text: `A ${name} Egg takes about ${steps.toLocaleString()} steps to hatch.` });
  }

  // Special forms
  const forms = species.varieties.map((v) => v.pokemon.name);
  if (forms.some((f) => f.includes("-mega"))) facts.push({ label: "Forms", text: `${name} can Mega Evolve!` });
  if (forms.some((f) => f.includes("-gmax"))) facts.push({ label: "Forms", text: `${name} has a giant Gigantamax form.` });
  const regional = ["alola", "galar", "hisui", "paldea"].filter((r) => forms.some((f) => f.includes(`-${r}`)));
  if (regional.length) facts.push({ label: "Forms", text: `${name} has a regional form from ${regional.map(prettyName).join(" and ")}.` });

  // Weighed in Snoozlets (only once Snoozlet has been discovered)
  const snoozlet = db.byId.get("W001");
  if (snoozlet && store.isUnlocked("W001") && mon.weight) {
    const kg = mon.weight / 10, ratio = kg / snoozlet.weight;
    facts.push({ label: "Winterveil Research", text: ratio >= 1.5
      ? `${name} weighs about as much as ${Math.round(ratio)} Snoozlets.`
      : ratio <= 0.67 ? `It would take about ${Math.round(1 / ratio)} ${name} to weigh as much as one Snoozlet.`
      : `${name} weighs almost exactly the same as a Snoozlet.` });
  }

  return { id, name, facts };
}
