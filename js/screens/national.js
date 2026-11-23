// ===========================================================
// National Dex: every Pokémon, loaded live from PokéAPI.
// The list lives inside the Pokédex tab (#/dex/national);
// each Pokémon opens at #/dex/national/<number>.
// ===========================================================
import { dexNo, typeInfo } from "../data.js";
import { store } from "../store.js";
import { esc, typeChips, ICONS } from "../ui.js";
import { back, navigate } from "../router.js";
import { syncAchievements, announce } from "../achievements.js";
import { play } from "../sound.js";
import { heroColors, statsCard } from "./detail.js";
import { speciesList, idsOfType, pokemonDetail, artUrl, GENERATIONS, NATIONAL_TYPES } from "../pokeapi.js";

const PAGE = 60;

// Remembered while the app is open, so filters and scroll survive a trip to a detail page.
const view = { q: "", gen: "", type: "", fav: false, shown: PAGE, scrollY: 0, restore: false };

// Hide broken artwork images (rare, but some new species lag behind).
document.addEventListener("error", (e) => {
  if (e.target instanceof HTMLImageElement && e.target.classList.contains("ndex-img")) e.target.classList.add("is-missing");
}, true);

const offlineCard = (text) => `<div class="card empty ndex-msg">
    <div class="empty__icon">📡</div>
    <h2>Can't reach the National Pokédex</h2>
    <p>${esc(text)}</p>
    <button class="btn btn--navy" data-retry style="margin-top:16px">Try again</button>
  </div>`;

const loadingHTML = `<div class="ndex-loading"><div class="boot__emblem"></div><p>Contacting Professor's lab…</p></div>`;

// ---------------------------------------------------------------- List

function cardHTML(s) {
  return `<a class="card dex-card ndex-card" href="#/dex/national/${s.id}" aria-label="${esc(s.name)} number ${s.id}">
    <span class="dex-card__no">${dexNo(s.id)}</span>
    ${store.isFavorite(s.id) ? `<span class="ndex-card__fav" aria-label="Favorite">${ICONS.star}</span>` : ""}
    <div class="dex-card__art"><img class="art ndex-img" src="${artUrl(s.id)}" alt="" loading="lazy" decoding="async" draggable="false"></div>
    <div class="dex-card__foot"><span class="dex-card__name">${esc(s.name)}</span></div>
  </a>`;
}

function controlsHTML() {
  const gens = GENERATIONS.map((g) => `<option value="${g.n}"${String(g.n) === view.gen ? " selected" : ""}>${g.label}</option>`).join("");
  const types = NATIONAL_TYPES.map((t) => `<option value="${t}"${t === view.type ? " selected" : ""}>${esc(typeInfo(t).label)}</option>`).join("");
  return `
    <div class="ndex-controls">
      <label class="search">
        <span class="search__icon" aria-hidden="true">${ICONS.search}</span>
        <span class="sr-only">Search by name or number</span>
        <input type="search" class="search__input" placeholder="Search name or number" value="${esc(view.q)}"
               autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="search" data-q>
      </label>
      <div class="filters">
        <label class="select${view.gen ? " is-on" : ""}"><span class="sr-only">Generation</span>
          <select data-gen><option value="">All regions</option>${gens}</select></label>
        <label class="select${view.type ? " is-on" : ""}"><span class="sr-only">Type</span>
          <select data-type><option value="">All types</option>${types}</select></label>
        <button class="chip${view.fav ? " is-on" : ""}" type="button" data-fav aria-pressed="${view.fav}">${ICONS.star}<span>Favorites</span></button>
      </div>
    </div>
    <p class="ndex-count" aria-live="polite"></p>
    <div class="ndex-results"></div>`;
}

export function mountNational(host) {
  host.innerHTML = controlsHTML();
  const results = host.querySelector(".ndex-results");
  const count = host.querySelector(".ndex-count");
  let all = null;
  let filtered = [];
  let observer = null;
  let runId = 0;

  const appendPage = (from) => {
    const grid = results.querySelector(".dex-grid");
    grid.insertAdjacentHTML("beforeend", filtered.slice(from, view.shown).map(cardHTML).join(""));
    results.querySelector(".ndex-more").hidden = view.shown >= filtered.length;
  };

  const showMore = () => {
    if (view.shown >= filtered.length) return;
    const from = view.shown;
    view.shown += PAGE;
    appendPage(from);
  };

  async function apply({ keepShown = false } = {}) {
    const run = ++runId;
    if (!all) return;
    let typeIds = null;
    if (view.type) {
      results.innerHTML = loadingHTML;
      try {
        typeIds = await idsOfType(view.type);
      } catch {
        if (run !== runId || !host.isConnected) return;
        results.innerHTML = offlineCard("Type filters need an internet connection.");
        return;
      }
      if (run !== runId || !host.isConnected) return;
    }

    const q = view.q.trim().toLowerCase().replace(/^#/, "");
    const num = /^\d+$/.test(q) ? Number(q) : null;
    const gen = GENERATIONS.find((g) => String(g.n) === view.gen);

    filtered = all.filter((s) =>
      (!q || (num !== null ? String(s.id).startsWith(q) || s.id === num : s.name.toLowerCase().includes(q) || s.slug.includes(q))) &&
      (!gen || (s.id >= gen.from && s.id <= gen.to)) &&
      (!typeIds || typeIds.has(s.id)) &&
      (!view.fav || store.isFavorite(s.id)));

    if (!keepShown) view.shown = PAGE;
    count.textContent = `${filtered.length.toLocaleString()} Pokémon`;

    if (!filtered.length) {
      results.innerHTML = `<div class="card empty ndex-msg"><div class="empty__icon">${view.fav && !q ? "⭐" : "🔍"}</div>
        <h2>${view.fav && !store.favoriteCount() ? "No favorites yet" : "No Pokémon found"}</h2>
        <p>${view.fav && !store.favoriteCount() ? "Tap the star on any Pokémon's page to add it here." : "Try a different name, number, or filter."}</p></div>`;
      return;
    }

    results.innerHTML = `<div class="dex-grid"></div>
      <button class="btn btn--ghost btn--block ndex-more" type="button">Show more</button>`;
    appendPage(0);
    results.querySelector(".ndex-more").addEventListener("click", showMore);

    observer?.disconnect();
    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver((entries) => {
        if (!host.isConnected) return observer.disconnect();
        if (entries.some((e) => e.isIntersecting)) showMore();
      }, { rootMargin: "600px 0px" });
      observer.observe(results.querySelector(".ndex-more"));
    }
  }

  async function load() {
    results.innerHTML = loadingHTML;
    try {
      all = await speciesList();
    } catch {
      if (!host.isConnected) return;
      results.innerHTML = offlineCard("Check your internet connection. The Winterveil Dex still works offline.");
      return;
    }
    if (!host.isConnected) return;
    const restoring = view.restore;
    view.restore = false;
    await apply({ keepShown: restoring });
    if (restoring) requestAnimationFrame(() => window.scrollTo({ top: view.scrollY, behavior: "instant" }));
  }

  // ---- events ----
  let typing;
  host.querySelector("[data-q]").addEventListener("input", (e) => {
    view.q = e.target.value;
    clearTimeout(typing);
    typing = setTimeout(() => apply(), 160);
  });
  host.querySelector("[data-q]").addEventListener("keydown", (e) => { if (e.key === "Enter") e.target.blur(); });

  host.querySelectorAll("select").forEach((sel) => sel.addEventListener("change", () => {
    const key = sel.matches("[data-gen]") ? "gen" : "type";
    view[key] = sel.value;
    sel.parentElement.classList.toggle("is-on", Boolean(sel.value));
    apply();
  }));

  host.querySelector("[data-fav]").addEventListener("click", (e) => {
    view.fav = !view.fav;
    e.currentTarget.classList.toggle("is-on", view.fav);
    e.currentTarget.setAttribute("aria-pressed", view.fav);
    apply();
  });

  results.addEventListener("click", (e) => {
    if (e.target.closest("[data-retry]")) return all ? apply() : load();
    if (e.target.closest(".ndex-card")) {
      view.scrollY = window.scrollY;
      view.restore = true;
    }
  });

  load();
}

// ---------------------------------------------------------------- Detail

function evolutionCard(d) {
  if (d.evolution.length < 2) {
    return `<div class="card"><h3 class="card__title">Evolution</h3><p class="evo__single">This Pokémon is not known to evolve.</p></div>`;
  }
  const node = (e) => `<a class="evo__node${e.id === d.id ? " is-current" : ""}" href="#/dex/national/${e.id}">
      <div class="evo__art"><img class="art ndex-img" src="${artUrl(e.id)}" alt="" loading="lazy" decoding="async"></div>
      <span class="evo__name">${esc(e.name)}</span>
    </a>`;
  const stages = d.evolution.map((stage) =>
    `<div class="nevo__stage${stage.length > 2 ? " is-branch" : ""}">${stage.map(node).join("")}</div>`);
  return `<div class="card"><h3 class="card__title">Evolution</h3>
    <div class="nevo">${stages.join(`<span class="evo__arrow" aria-hidden="true">${ICONS.arrow}</span>`)}</div></div>`;
}

function detailHTML(d, max) {
  const abilities = d.abilities.map((a) => `<span class="ability-chip">${esc(a.name)}${a.hidden ? `<span class="ability__hidden">Hidden</span>` : ""}</span>`).join("");
  const fav = store.isFavorite(d.id);
  const rarity = d.mythical ? "mythical" : d.legendary ? "legendary" : "";
  return `
    <header class="detail__hero" style="${heroColors(d, true)}">
      <div class="detail__bar">
        <button class="icon-btn" data-back aria-label="Back">${ICONS.back}</button>
        <span class="detail__no">No. ${dexNo(d.id)}</span>
        <button class="icon-btn fav-btn${fav ? " is-on" : ""}" data-fav aria-pressed="${fav}" aria-label="Favorite">${ICONS.star}</button>
      </div>
      <div class="detail__art"><img class="art ndex-img" src="${artUrl(d.id)}" alt="${esc(d.name)}" decoding="async" draggable="false"></div>
      <h1 class="detail__name">${esc(d.name)}</h1>
      <p class="detail__cat">${esc(d.category)}${rarity ? ` · <span class="pill pill--legend">${rarity}</span>` : ""}</p>
      ${typeChips(d)}
    </header>
    <div class="detail__body">
      ${d.entry ? `<div class="card"><h3 class="card__title">Pokédex Entry</h3><p class="detail__entry">${esc(d.entry)}</p></div>` : ""}
      <div class="card">
        <h3 class="card__title">Profile</h3>
        <div class="info-grid">
          <div><small>Height</small><b>${d.height.toFixed(1)} m</b></div>
          <div><small>Weight</small><b>${d.weight.toFixed(1)} kg</b></div>
        </div>
      </div>
      <div class="card"><h3 class="card__title">Abilities</h3><div class="ability-chips">${abilities}</div></div>
      ${statsCard(d)}
      ${evolutionCard(d)}
      <nav class="ndex-pager">
        ${d.id > 1 ? `<a class="btn btn--ghost" href="#/dex/national/${d.id - 1}">${ICONS.back}<span>No. ${dexNo(d.id - 1)}</span></a>` : "<span></span>"}
        ${d.id < max ? `<a class="btn btn--ghost" href="#/dex/national/${d.id + 1}"><span>No. ${dexNo(d.id + 1)}</span>${ICONS.forward}</a>` : "<span></span>"}
      </nav>
      <p class="ndex-credit">Data from PokéAPI</p>
    </div>`;
}

export function renderNationalDetail(root, { nid }) {
  const id = Number(nid);
  if (!id) return navigate("/dex/national");

  const page = document.createElement("article");
  page.className = "detail";
  root.appendChild(page);

  const showLoading = () => {
    page.innerHTML = `
      <header class="detail__hero" style="--c1:#2A4378;--c2:#0B1630">
        <div class="detail__bar"><button class="icon-btn" data-back aria-label="Back">${ICONS.back}</button>
          <span class="detail__no">No. ${dexNo(id)}</span><span style="width:42px"></span></div>
        <div class="detail__art ndex-loading"><div class="boot__emblem"></div></div>
        <h1 class="detail__name">&nbsp;</h1>
      </header>`;
  };

  async function load() {
    showLoading();
    let d, max = Infinity;
    try {
      [d, max] = await Promise.all([pokemonDetail(id), speciesList().then((l) => l.length).catch(() => Infinity)]);
    } catch {
      if (!page.isConnected) return;
      page.insertAdjacentHTML("beforeend", `<div class="detail__body">${offlineCard("This page needs an internet connection.")}</div>`);
      return;
    }
    if (!page.isConnected) return;
    page.innerHTML = detailHTML(d, max);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      page.querySelectorAll("[data-w]").forEach((el) => (el.style.width = el.dataset.w + "%"));
    }));
  }

  page.addEventListener("click", (e) => {
    if (e.target.closest("[data-back]")) return back("#/dex/national");
    if (e.target.closest("[data-retry]")) return load();
    const fav = e.target.closest("[data-fav]");
    if (fav) {
      const on = store.toggleFavorite(id);
      fav.classList.toggle("is-on", on);
      fav.setAttribute("aria-pressed", on);
      if (on) play("favorite");
      announce(syncAchievements());
    }
  });

  load();
}
