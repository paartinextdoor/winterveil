// ===========================================================
// Loads the JSON content files and builds lookup tables.
// ===========================================================

export const db = {
  pokemon: [],          // sorted by dex number
  byId: new Map(),      // "W001" → Pokémon
  types: {},            // "ice" → { label, color }
  codes: [],
  codeById: new Map(),
  achievements: [],
  notes: [],
};

async function getJSON(path) {
  const res = await fetch(path, { cache: "no-cache" });
  if (!res.ok) throw new Error(`Could not load ${path} (${res.status})`);
  return res.json();
}

export async function loadData() {
  const [pokemon, types, codes, achievements, notes] = await Promise.all([
    getJSON("data/pokemon.json"),
    getJSON("data/types.json"),
    getJSON("data/codes.json"),
    getJSON("data/achievements.json"),
    getJSON("data/research-notes.json"),
  ]);

  db.pokemon = pokemon.sort((a, b) => a.number - b.number);
  db.byId = new Map(pokemon.map((p) => [p.id, p]));
  db.types = types;
  db.codes = codes;
  db.codeById = new Map(codes.map((c) => [c.id, c]));
  db.achievements = achievements;
  db.notes = notes;
  return db;
}

/** Full evolution line containing `id`, from first stage to last. */
export function evolutionChain(id) {
  let root = db.byId.get(id);
  while (root?.evolution?.from) root = db.byId.get(root.evolution.from);
  const chain = [];
  for (let p = root; p; p = p.evolution?.to ? db.byId.get(p.evolution.to) : null) chain.push(p);
  return chain;
}

export function typeInfo(key) {
  return db.types[key] || { label: key, color: "#8592AD" };
}

export const dexNo = (n) => String(n).padStart(3, "0");
