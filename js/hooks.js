// ===========================================================
// Song hooks on the reveal screen.
// Plays Apple's official 30-second preview of a Pokémon's song (data/media.json → hook).
// The audio streams from Apple's servers; nothing copyrighted is stored in this repo.
//
// iPhone rule: audio may only start from a tap. primeAudio() is called on the
// "Receive Gift" tap, which unlocks this one <audio> element for the reveal that follows.
// ===========================================================
import { db } from "./data.js";
import { store } from "./store.js";

// A tiny silent WAV, played once during the tap to unlock the element.
const SILENT = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

let el = null;

function player() {
  if (!el) {
    el = new Audio();
    el.preload = "auto";
    el.setAttribute("playsinline", "");
  }
  return el;
}

export const hasHook = (id) => Boolean(db.media[id]?.hook?.preview);

/** Call synchronously inside a tap handler. */
export function primeAudio() {
  if (!store.soundOn()) return;
  const a = player();
  a.src = SILENT;
  a.play().catch(() => {});
}

/** If Apple ever moves a preview file, ask Apple for the current link. */
async function freshPreview(itunesId) {
  const res = await fetch(`https://itunes.apple.com/lookup?id=${itunesId}`);
  const json = await res.json();
  return json.results?.[0]?.previewUrl || null;
}

/** Plays a Pokémon's hook. Resolves true if music started. */
export async function playHook(id) {
  const hook = db.media[id]?.hook;
  if (!hook || !store.soundOn()) return false;
  const a = player();
  try {
    a.src = hook.preview;
    await a.play();
    return true;
  } catch {
    try {
      const url = hook.itunesId && (await freshPreview(hook.itunesId));
      if (!url) return false;
      a.src = url;
      await a.play();
      return true;
    } catch {
      return false;
    }
  }
}

export function stopHook() {
  if (el && !el.paused) el.pause();
}
