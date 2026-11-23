import { db, dexNo, evolutionChain, typeInfo } from "../data.js";
import { store } from "../store.js";
import { artHTML, mix } from "../art.js";
import { esc, typeChips, ICONS } from "../ui.js";
import { back, navigate } from "../router.js";
import { syncAchievements, announce } from "../achievements.js";
import { CONFIG } from "../config.js";
import { mediaCardHTML } from "../media.js";

const STAT_LABELS = { hp: "HP", attack: "Attack", defense: "Defense", spAtk: "Sp. Atk", spDef: "Sp. Def", speed: "Speed" };

export function heroColors(p, unlocked) {
  if (!unlocked) return "--c1:#2A4378;--c2:#0B1630";
  const a = typeInfo(p.types[0]).color;
  const b = typeInfo(p.types[1] || p.types[0]).color;
  return `--c1:${mix(a, "#ffffff", 0.08)};--c2:${mix(b, "#0B1630", 0.5)}`;
}

function evolutionCard(p) {
  const chain = evolutionChain(p.id);
  if (chain.length < 2) {
    return `<div class="card"><h3 class="card__title">Evolution</h3><p class="evo__single">This Pokémon is not known to evolve.</p></div>`;
  }
  const nodes = chain.map((e, i) => {
    const known = store.isUnlocked(e.id);
    const node = `<a class="evo__node${e.id === p.id ? " is-current" : ""}" href="#/dex/${e.id}">
        <div class="evo__art">${artHTML(e, { locked: !known })}</div>
        <span class="evo__name">${known ? esc(e.name) : "???"}</span>
      </a>`;
    return i === 0 ? node : `<span class="evo__arrow" aria-hidden="true">${ICONS.arrow}</span>${node}`;
  }).join("");
  return `<div class="card"><h3 class="card__title">Evolution</h3><div class="evo">${nodes}</div></div>`;
}

export function statsCard(p) {
  const total = Object.values(p.stats).reduce((a, b) => a + b, 0);
  const rows = Object.entries(STAT_LABELS).map(([k, label]) => {
    const v = p.stats[k];
    return `<div class="stat">
      <span class="stat__label">${label}</span><span class="stat__val">${v}</span>
      <span class="stat__bar"><i class="${v >= 100 ? "is-high" : ""}" data-w="${Math.min(100, (v / 150) * 100)}"></i></span>
    </div>`;
  }).join("");
  return `<div class="card"><h3 class="card__title">Base Stats</h3><div class="stats">${rows}
    <div class="stat stat--total"><span class="stat__label">Total</span><span class="stat__val">${total}</span><span></span></div>
  </div></div>`;
}

function habitatCard(p) {
  const pl = db.placeByPokemon.get(p.id);
  if (!pl) return "";
  return `<a class="card habitat" href="#/map/${p.id}">
    <span class="habitat__icon" aria-hidden="true">${ICONS.pin}</span>
    <span class="habitat__text"><small>Found at</small><b>${esc(pl.name)}</b><span>${esc(pl.island)} · View on map</span></span>
    <span class="habitat__chev" aria-hidden="true">${ICONS.forward}</span>
  </a>`;
}

function unlockedBody(p) {
  const abilities = p.abilities.map((a) => `<div class="ability">
      <div class="ability__name">${esc(a.name)}${a.hidden ? `<span class="ability__hidden">Hidden</span>` : ""}</div>
      <p>${esc(a.description)}</p>
    </div>`).join("");

  const letter = p.id === CONFIG.ending.pokemonId
    ? `<a class="card card--navy letter-cta" href="#/ending">
         <span class="letter-cta__icon" aria-hidden="true">💌</span>
         <span><b>A message for you</b><small>Harmona brought something special.</small></span>
       </a>`
    : "";

  return `${letter}
    <div class="card"><h3 class="card__title">Pokédex Entry</h3><p class="detail__entry">${esc(p.entry)}</p></div>
    ${mediaCardHTML(p)}
    <div class="card">
      <h3 class="card__title">Profile</h3>
      <div class="info-grid">
        <div><small>Height</small><b>${p.height.toFixed(1)} m</b></div>
        <div><small>Weight</small><b>${p.weight.toFixed(1)} kg</b></div>
      </div>
    </div>
    ${habitatCard(p)}
    <div class="card"><h3 class="card__title">Abilities</h3>${abilities}</div>
    ${statsCard(p)}
    ${evolutionCard(p)}`;
}

function lockedBody(p) {
  const hint = db.notes.find((n) => n.pokemonId === p.id);
  return `
    <div class="card locked-panel">
      <h3 class="card__title" style="margin-bottom:0">Not Yet Discovered</h3>
      <p>Data on this Pokémon will be recorded once it has been encountered.</p>
      ${hint ? `<blockquote>${esc(hint.text)}</blockquote>` : ""}
      <a class="btn btn--gold btn--block" href="#/gift">Redeem a Mystery Gift</a>
    </div>
    ${p.secret ? "" : evolutionCard(p)}`;
}

export function renderDetail(root, { id }) {
  const p = db.byId.get(id);
  if (!p) return navigate("/dex");

  const unlocked = store.isUnlocked(p.id);
  const hideName = !unlocked;

  root.innerHTML = `
    <article class="detail">
      <header class="detail__hero" style="${heroColors(p, unlocked)}">
        <div class="detail__bar">
          <button class="icon-btn" data-back aria-label="Back">${ICONS.back}</button>
          <span class="detail__no">No. ${dexNo(p.number)}</span>
          ${p.rarity === "legendary" || p.rarity === "mythical"
            ? `<span class="pill pill--legend">${unlocked ? p.rarity : "???"}</span>`
            : `<span style="width:42px"></span>`}
        </div>
        <div class="detail__art">${artHTML(p, { locked: !unlocked, eager: true })}</div>
        <h1 class="detail__name">${hideName ? "???" : esc(p.name)}</h1>
        <p class="detail__cat">${hideName ? "Unknown Pokémon" : esc(p.category)}</p>
        ${unlocked ? typeChips(p) : ""}
      </header>
      <div class="detail__body">${unlocked ? unlockedBody(p) : lockedBody(p)}</div>
    </article>`;

  root.querySelector("[data-back]").addEventListener("click", () => back("#/dex"));

  requestAnimationFrame(() => requestAnimationFrame(() => {
    root.querySelectorAll("[data-w]").forEach((el) => (el.style.width = el.dataset.w + "%"));
  }));

  if (unlocked && store.markViewed(p.id)) announce(syncAchievements());
}
