// ===========================================================
// Locks the Christmas ending message with a gift code, so reading the
// public repo can't spoil it. Only someone who types the code can unlock it.
// Uses AES-GCM with a key derived from the code (PBKDF2, SHA-256).
// Make a new locked message with tools/message-locker.html.
// ===========================================================
import { canonical } from "./codes.js";

const ITERATIONS = 150000;
const enc = new TextEncoder();

const toB64 = (bytes) => btoa(String.fromCharCode(...bytes));
const fromB64 = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

async function keyFor(code, salt) {
  const base = await crypto.subtle.importKey("raw", enc.encode("winterveil-ending:" + canonical(code)), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
    base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

/** Object → locked text (base64 of salt + iv + ciphertext). */
export async function lock(obj, code) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await keyFor(code, salt), enc.encode(JSON.stringify(obj)));
  return toB64(new Uint8Array([...salt, ...iv, ...new Uint8Array(data)]));
}

/** Locked text → object, or null if the code is wrong. */
export async function unlock(locked, code) {
  try {
    const bytes = fromB64(locked);
    const salt = bytes.slice(0, 16), iv = bytes.slice(16, 28), data = bytes.slice(28);
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, await keyFor(code, salt), data);
    return JSON.parse(new TextDecoder().decode(plain));
  } catch {
    return null;
  }
}
