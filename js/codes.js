// ===========================================================
// Mystery Gift codes.
// Codes are stored as SHA-256 hashes so reading the repo won't spoil them.
// "snow day 123", "SNOW_DAY_123", "snow-day-123" all count as the same code (example only).
// ===========================================================
import { db } from "./data.js";
import { store } from "./store.js";
import { CONFIG } from "./config.js";

export const canonical = (input) => input.toUpperCase().replace(/[^A-Z0-9]/g, "");

export async function hashCode(input) {
  const bytes = new TextEncoder().encode("winterveil:" + canonical(input));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function isAvailable(code) {
  if (!code.availableFrom || CONFIG.dev) return true;
  const [y, m, d] = code.availableFrom.split("-").map(Number);
  return new Date() >= new Date(y, m - 1, d); // local midnight
}

/**
 * Validates and redeems a code.
 * Returns { status, code?, unlocked? } where status is one of:
 *   "empty" | "unsupported" | "invalid" | "already" | "early" | "ok"
 */
export async function redeem(input) {
  if (!canonical(input)) return { status: "empty" };
  if (!window.crypto?.subtle) return { status: "unsupported" };

  const hash = await hashCode(input);
  const code = db.codes.find((c) => c.hash === hash);
  if (!code) return { status: "invalid" };
  if (store.hasRedeemed(code.id)) return { status: "already", code };
  if (!isAvailable(code)) return { status: "early", code };

  const unlocked = store.unlock(code.unlocks, code.id);
  store.markRedeemed(code.id);
  return { status: "ok", code, unlocked };
}
