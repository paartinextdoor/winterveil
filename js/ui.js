// ===========================================================
// Shared UI helpers: escaping, chips, toasts, unlock animation.
// ===========================================================
import { typeInfo, dexNo } from "./data.js";
import { artHTML } from "./art.js";
import { play } from "./sound.js";
import { hasHook, playHook, stopHook } from "./hooks.js";

export const esc = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const wait = (ms) => new Promise((r) => setTimeout(r, reducedMotion() ? Math.min(ms, 60) : ms));

export function typeChips(p, small = false) {
  return `<div class="types">${p.types.map((t) => {
    const info = typeInfo(t);
    return `<span class="type${small ? " type--sm" : ""}" style="--c:${info.color}">${esc(info.label)}</span>`;
  }).join("")}</div>`;
}

export function typeDots(p) {
  return `<span class="type-dots" aria-label="${p.types.map((t) => typeInfo(t).label).join(" / ")}">${p.types
    .map((t) => `<i class="type-dot" style="--c:${typeInfo(t).color}"></i>`).join("")}</span>`;
}

export const ICONS = {
  back: `<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>`,
  arrow: `<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`,
  note: `<svg viewBox="0 0 24 24"><path d="M6 3.5h9l3.5 3.5V20a.5.5 0 0 1-.5.5H6a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5zM9 11h6M9 15h6M9 7h3"/></svg>`,
  gift: `<svg viewBox="0 0 24 24"><rect x="3.5" y="9" width="17" height="11.5" rx="2"/><path d="M2.5 9h19M12 9v11.5M12 9c-1.5-3.5-5.5-4.5-6-2s3.5 2 6 2c2.5 0 6.5.5 6-2s-4.5-1.5-6 2"/></svg>`,
  star: `<svg viewBox="0 0 24 24"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></svg>`,
  search: `<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L20 20"/></svg>`,
  share: `<svg viewBox="0 0 24 24"><path d="M12 3v12M7.5 7.5L12 3l4.5 4.5M8 10.5H6.5a1.5 1.5 0 0 0-1.5 1.5v7.5A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V12a1.5 1.5 0 0 0-1.5-1.5H16"/></svg>`,
  forward: `<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>`,
  pin: `<svg viewBox="0 0 24 24"><path d="M12 21s-6.5-6.2-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 14.8 12 21 12 21z"/><circle cx="12" cy="9.8" r="2.4"/></svg>`,
  snowflake:`<svg viewBox="0 0 24 24"><path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7M9.5 3.5L12 6l2.5-2.5M9.5 20.5L12 18l2.5 2.5M3.2 10.4l3.4-1-1-3.4M20.8 13.6l-3.4 1 1 3.4M5.6 17.8l1-3.4-3.4-1M18.4 6.2l-1 3.4 3.4 1"/></svg>`,
};

/** A large, wrapped present (used on the Gift screen and in the unlock animation). */
export function giftBoxSVG() {
  return `<svg viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <linearGradient id="gb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F4F8FF"/><stop offset="1" stop-color="#B6DAF1"/></linearGradient>
      <linearGradient id="gr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F1DCA5"/><stop offset="1" stop-color="#D4AE5B"/></linearGradient>
    </defs>
    <rect x="28" y="70" width="104" height="74" rx="10" fill="url(#gb)"/>
    <rect x="71" y="70" width="18" height="74" fill="url(#gr)"/>
    <g class="lid">
      <rect x="20" y="52" width="120" height="24" rx="8" fill="#E8F3FB"/>
      <rect x="71" y="52" width="18" height="24" fill="url(#gr)"/>
      <path d="M80 52c-10-22-34-26-36-12s24 12 36 12zm0 0c10-22 34-26 36-12s-24 12-36 12z" fill="url(#gr)" stroke="#B08A3A" stroke-width="2"/>
    </g>
  </svg>`;
}

// ---------- Toasts ----------
export function toast({ icon = "✨", title = "", text = "" }, ms = 3200) {
  const root = document.getElementById("toast-root");
  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = `<span class="toast__icon">${icon}</span><div>${title ? `<strong>${esc(title)}</strong>` : ""}${esc(text)}</div>`;
  root.appendChild(el);
  setTimeout(() => {
    el.classList.add("is-leaving");
    el.addEventListener("animationend", () => el.remove(), { once: true });
  }, ms);
}

function sparkles(host, n = 18) {
  if (reducedMotion()) return;
  const rect = host.getBoundingClientRect();
  for (let i = 0; i < n; i++) {
    const s = document.createElement("i");
    s.className = "sparkle";
    const a = Math.random() * Math.PI * 2, d = 90 + Math.random() * 110;
    s.style.left = rect.width / 2 + "px";
    s.style.top = rect.height / 2 + "px";
    s.style.setProperty("--dx", Math.cos(a) * d + "px");
    s.style.setProperty("--dy", Math.sin(a) * d + "px");
    s.style.animationDelay = Math.random() * 200 + "ms";
    host.appendChild(s);
    setTimeout(() => s.remove(), 1800);
  }
}

// ---------- Unlock ceremony ----------
/**
 * Plays the "gift opens → Pokémon revealed" sequence.
 * Resolves with "dex:<id>" if the user chose to view it, otherwise "close".
 */
export function playUnlock(pokemonList, giftTitle = "Mystery Gift") {
  return new Promise(async (resolve) => {
    const root = document.getElementById("overlay-root");
    const el = document.createElement("div");
    el.className = "unlock";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.setAttribute("aria-label", "New Pokémon discovered");
    el.innerHTML = `
      <div class="unlock__flash"></div>
      <div class="unlock__stage">
        <div class="unlock__rays"></div>
        <div class="unlock__content">
          <p class="eyebrow">${esc(giftTitle)}</p>
          <div class="unlock__gift">${giftBoxSVG()}</div>
          <p class="unlock__hint">Something is moving inside…</p>
        </div>
      </div>`;
    root.appendChild(el);
    document.body.style.overflow = "hidden";

    const content = el.querySelector(".unlock__content");
    const gift = el.querySelector(".unlock__gift");

    await wait(350);
    gift.classList.add("is-shaking");
    play("shake");
    await wait(950);
    el.classList.add("is-flash");
    await wait(220);

    let index = 0;
    const close = (result) => {
      el.classList.add("is-leaving");
      el.addEventListener("animationend", () => {
        el.remove();
        document.body.style.overflow = "";
        resolve(result);
      }, { once: true });
    };

    const show = () => {
      const p = pokemonList[index];
      const last = index === pokemonList.length - 1;
      el.classList.add("is-revealed");
      content.className = "unlock__reveal";
      content.innerHTML = `
        <div class="unlock__art">${artHTML(p, { eager: true })}</div>
        <p class="eyebrow unlock__eyebrow">New Pokémon Discovered</p>
        <h2 class="unlock__name">${esc(p.name)}</h2>
        <p class="unlock__meta">No. ${dexNo(p.number)} · ${esc(p.category)}</p>
        ${typeChips(p)}
        ${pokemonList.length > 1 ? `<p class="unlock__count">${index + 1} of ${pokemonList.length}</p>` : ""}
        <div class="unlock__actions">
          ${last
            ? `<button class="btn btn--gold btn--lg btn--block" data-act="view">View in Pokédex</button>
               <button class="btn btn--ghost-dark btn--block" data-act="close">Done</button>`
            : `<button class="btn btn--gold btn--lg btn--block" data-act="next">Next</button>`}
        </div>`;
      sparkles(el.querySelector(".unlock__stage"));
      // Song Pokémon play their hook; everyone else gets a sleigh-bell jingle.
      if (hasHook(p.id)) playHook(p.id).then((ok) => { if (!ok) play("jingle"); });
      else play("jingle");
      content.querySelector(".btn").focus({ preventScroll: true });
    };

    el.addEventListener("click", (e) => {
      const act = e.target.closest("[data-act]")?.dataset.act;
      if (!act) return;
      stopHook();
      if (act === "next") { index++; el.classList.remove("is-flash"); void el.offsetWidth; el.classList.add("is-flash"); show(); }
      if (act === "view") close(pokemonList.length > 1 ? "dex:" : "dex:" + pokemonList[0].id);
      if (act === "close") close("close");
    });

    show();
  });
}
