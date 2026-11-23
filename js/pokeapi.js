// ===========================================================
// National Dex data from PokéAPI (https://pokeapi.co).
// Free and public, no key needed. Results are kept in memory for the
// session, and the browser's HTTP cache handles repeat visits.
// ===========================================================

const API = "https://pokeapi.co/api/v2";
const ART = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork";

const cache = new Map(); // url → Promise<json>

function getJSON(url) {
  if (!cache.has(url)) {
    const p = fetch(url).then((res) => {
      if (!res.ok) throw new Error(`PokéAPI ${res.status}`);
      return res.json();
    });
    p.catch(() => cache.delete(url)); // allow a retry after a failure
    cache.set(url, p);
  }
  return cache.get(url);
}

/** "https://…/pokemon-species/25/" → 25 */
const idFromUrl = (url) => Number(url.match(/\/(\d+)\/?$/)[1]);

export const artUrl = (id) => `${ART}/${id}.png`;

// ---------- Names ----------
const SPECIAL_NAMES = {
  "nidoran-f": "Nidoran♀", "nidoran-m": "Nidoran♂", "mr-mime": "Mr. Mime", "mime-jr": "Mime Jr.",
  "mr-rime": "Mr. Rime", "farfetchd": "Farfetch’d", "sirfetchd": "Sirfetch’d", "type-null": "Type: Null",
  "ho-oh": "Ho-Oh", "porygon-z": "Porygon-Z", "jangmo-o": "Jangmo-o", "hakamo-o": "Hakamo-o",
  "kommo-o": "Kommo-o", "flabebe": "Flabébé", "wo-chien": "Wo-Chien", "chien-pao": "Chien-Pao",
  "ting-lu": "Ting-Lu", "chi-yu": "Chi-Yu",
};
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
export const prettyName = (slug) => SPECIAL_NAMES[slug] || slug.split("-").map(cap).join(" ");

// ---------- Generations (by National Dex number) ----------
export const GENERATIONS = [
  { n: 1, label: "Gen I · Kanto",   from: 1,   to: 151 },
  { n: 2, label: "Gen II · Johto",  from: 152, to: 251 },
  { n: 3, label: "Gen III · Hoenn", from: 252, to: 386 },
  { n: 4, label: "Gen IV · Sinnoh", from: 387, to: 493 },
  { n: 5, label: "Gen V · Unova",   from: 494, to: 649 },
  { n: 6, label: "Gen VI · Kalos",  from: 650, to: 721 },
  { n: 7, label: "Gen VII · Alola", from: 722, to: 809 },
  { n: 8, label: "Gen VIII · Galar", from: 810, to: 905 },
  { n: 9, label: "Gen IX · Paldea", from: 906, to: Infinity },
];

export const NATIONAL_TYPES = [
  "normal", "fire", "water", "grass", "electric", "ice", "fighting", "poison", "ground",
  "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy",
];

// ---------- Endpoints ----------

/** Every species: [{ id, slug, name }], sorted by number. */
export async function speciesList() {
  const data = await getJSON(`${API}/pokemon-species?limit=2000`);
  return data.results
    .map((r) => ({ id: idFromUrl(r.url), slug: r.name, name: prettyName(r.name) }))
    .sort((a, b) => a.id - b.id);
}

/** Set of species ids that have the given type. */
export async function idsOfType(type) {
  const data = await getJSON(`${API}/type/${type}`);
  return new Set(data.pokemon.map((p) => idFromUrl(p.pokemon.url)).filter((id) => id < 10000));
}

const STAT_KEYS = {
  "hp": "hp", "attack": "attack", "defense": "defense",
  "special-attack": "spAtk", "special-defense": "spDef", "speed": "speed",
};

const english = (list, field) => list.find((e) => e.language.name === "en")?.[field];

function flattenChain(node, depth = 0, stages = []) {
  (stages[depth] ||= []).push({ id: idFromUrl(node.species.url), name: prettyName(node.species.name) });
  node.evolves_to.forEach((next) => flattenChain(next, depth + 1, stages));
  return stages;
}

/** Everything the detail page needs, in one object. */
export async function pokemonDetail(id) {
  const [mon, species] = await Promise.all([getJSON(`${API}/pokemon/${id}`), getJSON(`${API}/pokemon-species/${id}`)]);

  // Most recent English Pokédex entry (the list is oldest → newest).
  const entries = species.flavor_text_entries.filter((e) => e.language.name === "en");
  const entry = (entries[entries.length - 1]?.flavor_text || "")
    .replace(/[\f\n\r­]+/g, " ").replace(/\s+/g, " ").trim();

  let evolution = [];
  try {
    const chain = await getJSON(species.evolution_chain.url);
    evolution = flattenChain(chain.chain);
  } catch { /* evolution is optional */ }

  const stats = {};
  mon.stats.forEach((s) => { if (STAT_KEYS[s.stat.name]) stats[STAT_KEYS[s.stat.name]] = s.base_stat; });

  return {
    id,
    name: english(species.names, "name") || prettyName(species.name),
    category: english(species.genera, "genus") || "",
    types: mon.types.sort((a, b) => a.slot - b.slot).map((t) => t.type.name),
    height: mon.height / 10, // decimetres → metres
    weight: mon.weight / 10, // hectograms → kilograms
    abilities: mon.abilities.map((a) => ({ name: prettyName(a.ability.name), hidden: a.is_hidden })),
    stats,
    entry,
    legendary: species.is_legendary,
    mythical: species.is_mythical,
    evolution,
  };
}
