import { db } from "../data.js";
import { store } from "../store.js";
import { redeem } from "../codes.js";
import { esc, giftBoxSVG, playUnlock } from "../ui.js";
import { navigate, rerender } from "../router.js";
import { syncAchievements, announce } from "../achievements.js";
import { endingPending } from "./ending.js";
import { unlock as unlockSecret } from "../secret.js";
import { CONFIG } from "../config.js";
import { play } from "../sound.js";
import { primeAudio } from "../hooks.js";

const fmtDate = (iso) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

function message(kind, icon, title, text) {
  return `<div class="gift-msg gift-msg--${kind}" role="status"><span class="gift-msg__icon">${icon}</span><div><b>${esc(title)}</b>${esc(text)}</div></div>`;
}

function receivedList() {
  const entries = Object.entries(store.state.redeemedCodes).sort(([, a], [, b]) => b.localeCompare(a));
  if (!entries.length) {
    return `<div class="card empty"><div class="empty__icon">🎁</div><h2>No gifts yet</h2><p>Gifts you receive will be listed here.</p></div>`;
  }
  return entries.map(([id, at]) => {
    const code = db.codeById.get(id);
    if (!code) return "";
    const names = code.unlocks.map((pid) => db.byId.get(pid)?.name).filter(Boolean).join(", ");
    return `<div class="card received__item">
      <div class="received__icon">🎁</div>
      <div><div class="received__title">${esc(code.title)}</div><div class="received__meta">${fmtDate(at)} · ${esc(names)}</div></div>
    </div>`;
  }).join("");
}

export function renderGift(root) {
  root.innerHTML = `
    <header class="page-head">
      <h1>Mystery Gift</h1>
      <p>Receive Pokémon with a gift code.</p>
    </header>

    <section class="card card--navy gift-hero">
      <div class="gift-hero__box">${giftBoxSVG()}</div>
      <h2>Enter a Gift Code</h2>
      <p>Each advent gift hides a code. Enter it below to receive what's inside.</p>
      <form class="code-form" novalidate>
        <label class="sr-only" for="code">Gift code</label>
        <input id="code" class="code-field" name="code" placeholder="ENTER CODE" autocomplete="off" autocapitalize="characters" autocorrect="off" spellcheck="false" enterkeyhint="go" maxlength="32">
        <div class="gift-feedback" aria-live="polite"></div>
        <button class="btn btn--gold btn--lg btn--block" type="submit">Receive Gift</button>
      </form>
    </section>

    <section class="section">
      <div class="section__head"><h2 class="section__title">Received Gifts</h2></div>
      <div class="received">${receivedList()}</div>
    </section>`;

  const form = root.querySelector("form");
  const input = root.querySelector("#code");
  const feedback = root.querySelector(".gift-feedback");
  const button = form.querySelector("button");

  const fail = (html) => {
    feedback.innerHTML = html;
    if (html) play("error");
    input.classList.remove("is-error");
    void input.offsetWidth; // restart the shake animation
    input.classList.add("is-error");
  };

  input.addEventListener("input", () => {
    input.classList.remove("is-error");
    feedback.innerHTML = "";
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    primeAudio(); // must happen during the tap so iPhone allows the song hook later
    button.disabled = true;
    button.textContent = "Checking…";
    let result;
    try {
      result = await redeem(input.value);
    } finally {
      button.disabled = false;
      button.textContent = "Receive Gift";
    }

    switch (result.status) {
      case "empty":
        return fail("");
      case "invalid":
        return fail(message("error", "❄️", "That code didn't work", "Check the spelling on your gift tag and try again."));
      case "already":
        return fail(message("info", "📦", "Already received", `You've already opened “${result.code.title}”.`));
      case "early": {
        const [y, m, d] = result.code.availableFrom.split("-").map(Number);
        const when = new Date(y, m - 1, d).toLocaleDateString(undefined, { month: "long", day: "numeric" });
        return fail(message("wait", "⏳", "This gift is still wrapped", `It can be opened from ${when}. No peeking!`));
      }
      case "unsupported":
        return fail(message("error", "⚠️", "Can't check codes here", "Open the app from its https:// address to redeem gifts."));
    }

    // Success
    // The Christmas code also unlocks the personal message; keep it on this device.
    if (result.code.unlocks.includes(CONFIG.ending.pokemonId) && !store.state.ending) {
      const ending = await unlockSecret(CONFIG.ending.locked, input.value);
      if (ending) store.saveEnding(ending);
    }
    input.value = "";
    input.blur();
    feedback.innerHTML = "";
    const newAchievements = syncAchievements();
    const pokemon = result.code.unlocks.map((id) => db.byId.get(id)).filter(Boolean);
    const choice = await playUnlock(pokemon, result.code.title);
    announce(newAchievements);
    if (endingPending()) navigate("/ending");
    else if (choice.startsWith("dex:")) navigate(choice.length > 4 ? "/dex/" + choice.slice(4) : "/dex");
    else rerender();
  });
}
