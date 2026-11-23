// ===========================================================
// The Christmas ending: Harmona appears and a personal message is revealed.
// The message is locked with the Harmona gift code (see js/secret.js);
// redeeming that code unlocks it and saves it on the device.
// ===========================================================
import { db } from "../data.js";
import { store } from "../store.js";
import { CONFIG } from "../config.js";
import { artHTML } from "../art.js";
import { esc } from "../ui.js";
import { navigate } from "../router.js";
import { unlock as unlockSecret } from "../secret.js";
import { play } from "../sound.js";

function letterHTML(m) {
  const paragraphs = m.message.map((text, i) => `<p style="--i:${i}">${esc(text)}</p>`).join("");
  return `
    <h1 class="ending__title" id="ending-title">${esc(m.title)}</h1>
    <div class="ending__letter">${paragraphs}</div>
    ${m.signature ? `<p class="ending__sign">${esc(m.signature)}</p>` : ""}
    <button class="btn btn--gold btn--lg btn--block ending__btn" data-done>${esc(CONFIG.ending.button)}</button>`;
}

// Shown only if the message isn't on this device yet (e.g. Harmona was unlocked with ?dev).
const askCodeHTML = `
  <h1 class="ending__title" id="ending-title">A sealed message</h1>
  <form class="ending__form" novalidate>
    <p>Enter your Christmas gift code to open it.</p>
    <label class="sr-only" for="ending-code">Gift code</label>
    <input id="ending-code" class="code-field" placeholder="ENTER CODE" autocomplete="off" autocapitalize="characters" autocorrect="off" spellcheck="false" enterkeyhint="go">
    <p class="ending__err" aria-live="polite"></p>
    <button class="btn btn--gold btn--lg btn--block" type="submit">Open</button>
  </form>`;

export function renderEnding(root) {
  const p = db.byId.get(CONFIG.ending.pokemonId);
  // Only reachable once Harmona has been unlocked (or with ?dev for previewing).
  if (!p || (!store.isUnlocked(p.id) && !CONFIG.dev)) return navigate("/home");

  const m = store.state.ending;
  root.innerHTML = `
    <section class="ending" role="dialog" aria-modal="true" aria-labelledby="ending-title" style="--n:${m ? m.message.length : 0}">
      <div class="ending__sky" aria-hidden="true"></div>
      <div class="ending__inner">
        <div class="ending__art">${artHTML(p, { eager: true })}</div>
        <p class="eyebrow ending__eyebrow">${esc(CONFIG.ending.eyebrow)}</p>
        <div class="ending__body">${m ? letterHTML(m) : askCodeHTML}</div>
      </div>
    </section>`;

  const body = root.querySelector(".ending__body");
  body.addEventListener("click", (e) => { if (e.target.closest("[data-done]")) navigate("/dex"); });

  if (m) {
    store.markEndingSeen();
    setTimeout(() => play("ending"), 300);
    return;
  }

  const form = body.querySelector("form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = form.querySelector("input");
    const opened = await unlockSecret(CONFIG.ending.locked, input.value);
    if (!opened) {
      form.querySelector(".ending__err").textContent = "That's not the right code.";
      input.classList.remove("is-error"); void input.offsetWidth; input.classList.add("is-error");
      return;
    }
    store.saveEnding(opened);
    store.markEndingSeen();
    root.querySelector(".ending").style.setProperty("--n", opened.message.length);
    body.classList.add("is-opening");
    body.innerHTML = letterHTML(opened);
    play("ending");
  });
}

/** Whether the ending should play automatically right now. */
export const endingPending = () => store.isUnlocked(CONFIG.ending.pokemonId) && !store.state.seenEnding;
