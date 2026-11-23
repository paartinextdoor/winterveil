// ===========================================================
// Sound effects (off by default; the toggle is on the Achievements tab).
// Every sound is synthesised with the Web Audio API, so there are no audio files.
// On iPhone, sounds follow the ring/silent switch.
// ===========================================================
import { store } from "./store.js";

let ctx = null;
let master = null;

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

// iOS only allows audio to start from a tap, so wake the audio engine on the first touch.
const wake = () => { if (store.soundOn()) audio(); };
window.addEventListener("pointerdown", wake, { passive: true });
window.addEventListener("keydown", wake);

const NOTE = (n) => 440 * 2 ** ((n - 69) / 12); // MIDI note → Hz

/** One soft, bell-like note. */
function tone(midi, at, { dur = 0.5, type = "triangle", vol = 0.6, glide = 0 } = {}) {
  const c = ctx, t = c.currentTime + at;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(NOTE(midi), t);
  if (glide) osc.frequency.exponentialRampToValueAtTime(NOTE(midi + glide), t + dur);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

const SOUNDS = {
  // Little "tick" while the present shakes.
  shake() { [0, 0.18, 0.36, 0.54, 0.7].forEach((t, i) => tone(60 + i, t, { dur: 0.09, type: "square", vol: 0.12 })); },
  // Sparkling arpeggio when a Pokémon appears.
  reveal() {
    [72, 76, 79, 84, 88].forEach((n, i) => tone(n, i * 0.07, { dur: 0.6, vol: 0.45 }));
    tone(96, 0.4, { dur: 1.2, type: "sine", vol: 0.25 });
  },
  // Two-note chime for a new badge.
  achievement() { tone(83, 0, { dur: 0.35, vol: 0.5 }); tone(88, 0.12, { dur: 0.7, vol: 0.5 }); },
  // Gentle "nope" for a wrong code.
  error() { tone(64, 0, { dur: 0.18, type: "sine", vol: 0.4 }); tone(60, 0.14, { dur: 0.3, type: "sine", vol: 0.4 }); },
  // Soft click for a favorite.
  favorite() { tone(88, 0, { dur: 0.18, type: "sine", vol: 0.35, glide: 5 }); },
  // A short music-box melody for Harmona's ending.
  ending() {
    const melody = [[76, 0], [79, 0.35], [84, 0.7], [83, 1.05], [79, 1.4], [81, 1.75], [84, 2.1], [88, 2.6]];
    melody.forEach(([n, t]) => tone(n, t, { dur: 1.1, type: "sine", vol: 0.4 }));
    [[60, 0], [67, 0.7], [65, 1.4], [64, 2.1]].forEach(([n, t]) => tone(n, t, { dur: 1.4, type: "triangle", vol: 0.18 }));
  },
};

/** Plays a named sound if sound effects are switched on. */
export function play(name) {
  if (!store.soundOn() || !SOUNDS[name]) return;
  if (!audio()) return;
  try { SOUNDS[name](); } catch { /* never let a sound break the app */ }
}
