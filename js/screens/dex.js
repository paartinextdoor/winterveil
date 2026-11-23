import { db, dexNo } from "../data.js";
import { store } from "../store.js";
import { artHTML, tintFor } from "../art.js";
import { esc, typeDots } from "../ui.js";
import { mountNational } from "./national.js";

function winterveilDex() {
  const total = db.pokemon.length;
  const found = store.unlockedCount();

  const cards = db.pokemon.map((p) => {
    const unlocked = store.isUnlocked(p.id);
    const isNew = unlocked && !store.isViewed(p.id);
    return `<a class="card dex-card${unlocked ? "" : " is-locked"}" href="#/dex/${p.id}" ${unlocked ? `style="--tint:${tintFor(p)}"` : ""}
              aria-label="${unlocked ? esc(p.name) : "Undiscovered"} number ${p.number}">
      ${isNew ? `<span class="pill pill--new">New</span>` : ""}
      <span class="dex-card__no">${dexNo(p.number)}</span>
      <div class="dex-card__art">${artHTML(p, { locked: !unlocked })}</div>
      <div class="dex-card__foot">
        <span class="dex-card__name">${unlocked ? esc(p.name) : "???"}</span>
        ${unlocked ? typeDots(p) : ""}
      </div>
    </a>`;
  }).join("");

  return `
    <div class="dex-summary">
      <div class="dex-summary__row"><span>Discovered</span><span><b>${found}</b> / ${total}</span></div>
      <div class="progress progress--light"><div class="progress__fill" data-w="${Math.round((found / total) * 100)}"></div></div>
    </div>
    <div class="dex-grid">${cards}</div>`;
}

export function renderDex(root, { tab }) {
  const national = tab === "national";
  root.innerHTML = `
    <header class="page-head">
      <h1>Pokédex</h1>
      <p>${national ? "Every Pokémon known to science." : "Species of the Winterveil region."}</p>
    </header>
    <div class="segmented" role="tablist" data-active="${national ? 1 : 0}">
      <span class="segmented__thumb" aria-hidden="true"></span>
      <a class="segmented__btn" role="tab" href="#/dex" aria-selected="${!national}" style="text-align:center">Winterveil Dex</a>
      <a class="segmented__btn" role="tab" href="#/dex/national" aria-selected="${national}" style="text-align:center">National Dex</a>
    </div>
    ${national ? `<div class="ndex"></div>` : winterveilDex()}`;

  if (national) mountNational(root.querySelector(".ndex"));

  requestAnimationFrame(() => requestAnimationFrame(() => {
    root.querySelectorAll("[data-w]").forEach((el) => (el.style.width = el.dataset.w + "%"));
  }));
}
