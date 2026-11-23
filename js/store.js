// ===========================================================
// Save data. All LocalStorage access lives here.
// ===========================================================
import { CONFIG } from "./config.js";

const VERSION = 1;

const fresh = () => ({
  version: VERSION,
  unlocked: {},        // { W001: { at: ISO, via: "c01" } }
  viewed: [],          // ["W001"]
  redeemedCodes: {},   // { c01: ISO }
  achievements: {},    // { "first-discovery": ISO }
  favorites: { national: [] },
  seenEnding: false,
  ending: null,        // { title, message[], signature } once unlocked with the Christmas code
  settings: { sound: false },
});

function migrate(save) {
  // Future versions: upgrade older saves here, e.g. if (save.version === 1) {...}
  const merged = { ...fresh(), ...save, version: VERSION };
  merged.favorites = { national: [], ...save.favorites };
  merged.settings = { sound: false, ...save.settings };
  return merged;
}

function read() {
  try {
    const raw = localStorage.getItem(CONFIG.storageKey);
    return raw ? migrate(JSON.parse(raw)) : fresh();
  } catch {
    return fresh();
  }
}

let state = read();
const listeners = new Set();

function commit() {
  try {
    localStorage.setItem(CONFIG.storageKey, JSON.stringify(state));
  } catch (err) {
    console.warn("Could not save progress", err);
  }
  listeners.forEach((fn) => fn(state));
}

export const store = {
  get state() { return state; },

  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

  isUnlocked: (id) => Boolean(state.unlocked[id]),
  unlockedIds: () => Object.keys(state.unlocked),
  unlockedCount: () => Object.keys(state.unlocked).length,

  /** Unlocks ids, returns the ones that were new. */
  unlock(ids, via) {
    const at = new Date().toISOString();
    const added = ids.filter((id) => !state.unlocked[id]);
    added.forEach((id) => { state.unlocked[id] = { at, via }; });
    if (added.length) commit();
    return added;
  },

  /** Most recent discoveries first (ties broken by dex order). */
  recent(limit, pokemonById) {
    return Object.entries(state.unlocked)
      .sort(([a, x], [b, y]) => y.at.localeCompare(x.at) || pokemonById.get(a).number - pokemonById.get(b).number)
      .slice(0, limit)
      .map(([id]) => id);
  },

  isViewed: (id) => state.viewed.includes(id),
  markViewed(id) {
    if (state.viewed.includes(id)) return false;
    state.viewed.push(id);
    commit();
    return true;
  },

  hasRedeemed: (codeId) => Boolean(state.redeemedCodes[codeId]),
  markRedeemed(codeId) {
    state.redeemedCodes[codeId] = new Date().toISOString();
    commit();
  },

  hasAchievement: (id) => Boolean(state.achievements[id]),
  grantAchievement(id) {
    if (state.achievements[id]) return false;
    state.achievements[id] = new Date().toISOString();
    commit();
    return true;
  },

  // National Dex favorites (PokéAPI ids)
  isFavorite: (nid) => state.favorites.national.includes(nid),
  favoriteCount: () => state.favorites.national.length,
  /** Adds or removes a favorite. Returns true if it is now a favorite. */
  toggleFavorite(nid) {
    const list = state.favorites.national;
    const i = list.indexOf(nid);
    if (i === -1) list.push(nid);
    else list.splice(i, 1);
    commit();
    return i === -1;
  },

  saveEnding(ending) {
    state.ending = ending;
    commit();
  },

  markEndingSeen() {
    if (state.seenEnding) return;
    state.seenEnding = true;
    commit();
  },

  soundOn: () => state.settings.sound,
  setSound(on) {
    state.settings.sound = on;
    commit();
  },

  reset() {
    const settings = state.settings; // keep preferences when progress is reset
    state = fresh();
    state.settings = settings;
    commit();
  },
};
