// ===========================================================
// Field Map: where each Winterveil Pokémon lives in Trinidad & Tobago.
// Places come from data/places.json (one per Pokémon).
// ===========================================================
import { db, dexNo } from "../data.js";
import { store } from "../store.js";
import { artHTML, tintFor } from "../art.js";
import { esc, typeChips, ICONS } from "../ui.js";
import { back } from "../router.js";
import { mapSVG, projectPct } from "../tt-map.js";

const ZOOMS = [1, 1.8, 2.8, 4];

// Places that are almost on top of each other (e.g. two cinemas in Port of Spain)
// get their pins nudged apart by a few pixels so both stay tappable.
const NEAR = 0.04;   // degrees
const SPREAD = 15;   // px from the shared centre
function pinOffsets() {
  const offsets = new Map();
  const groups = [];
  for (const pl of db.places) {
    const g = groups.find((grp) => grp.some((o) => Math.hypot(o.lat - pl.lat, o.lon - pl.lon) < NEAR));
    if (g) g.push(pl); else groups.push([pl]);
  }
  for (const g of groups) {
    if (g.length < 2) continue;
    g.sort((a, b) => a.lon - b.lon).forEach((pl, i) => {
      const angle = Math.PI + (i / g.length) * Math.PI * 2;
      offsets.set(pl.pokemonId, { dx: Math.cos(angle) * SPREAD, dy: Math.sin(angle) * SPREAD });
    });
  }
  return offsets;
}

const found = (pl) => store.isUnlocked(pl.pokemonId);
const isSecret = (pl) => db.byId.get(pl.pokemonId)?.secret && !found(pl);

export const exploredCount = () => db.places.filter(found).length;

/** Small map with gold dots for explored places (Home preview). */
export function miniMapHTML() {
  const dots = db.places.filter(found).map((pl) => {
    const { left, top } = projectPct(pl.lat, pl.lon);
    return `<i class="mini-map__dot" style="left:${left}%;top:${top}%"></i>`;
  }).join("");
  return `<div class="mini-map">${mapSVG({ labels: false, id: "mini" })}${dots}</div>`;
}

function pinHTML(pl, offsets) {
  const p = db.byId.get(pl.pokemonId);
  const { left, top } = projectPct(pl.lat, pl.lon);
  const off = offsets.get(pl.pokemonId);
  const nudge = off ? `;--dx:${off.dx.toFixed(1)}px;--dy:${off.dy.toFixed(1)}px` : "";
  const state = found(pl) ? "is-found" : isSecret(pl) ? "is-secret" : "is-locked";
  const label = found(pl) ? `${p.name} at ${pl.name}` : isSecret(pl) ? "Uncharted place" : `Unexplored: ${pl.name}`;
  return `<button class="pin ${state}" style="left:${left}%;top:${top}%${nudge}" data-pid="${p.id}" aria-label="${esc(label)}">
    ${found(pl) ? `<span class="pin__art" style="--tint:${tintFor(p)}">${artHTML(p, { eager: true })}</span>` : `<span class="pin__q">?</span>`}
  </button>`;
}

function sheetHTML(pl) {
  if (!pl) {
    return `<div class="place-sheet__empty">${ICONS.pin}<p>Tap a pin to see who lives there.</p></div>`;
  }
  const p = db.byId.get(pl.pokemonId);

  if (isSecret(pl)) {
    return `<p class="eyebrow place-sheet__eyebrow">Uncharted</p>
      <h2 class="place-sheet__title">???</h2>
      <p class="place-sheet__text">A faint melody drifts from somewhere on the islands. No one has found where it comes from… yet.</p>`;
  }

  if (!found(pl)) {
    const hint = db.notes.find((n) => n.pokemonId === p.id);
    return `<p class="eyebrow place-sheet__eyebrow">${esc(pl.island)} · Unexplored</p>
      <h2 class="place-sheet__title">${esc(pl.name)}</h2>
      <div class="place-sheet__mon">
        <div class="place-sheet__art">${artHTML(p, { locked: true })}</div>
        <div><b>???</b><small>Something was spotted here…</small></div>
      </div>
      ${hint ? `<blockquote class="place-sheet__memory place-sheet__memory--hint">${esc(hint.text)}</blockquote>` : ""}
      <a class="btn btn--gold btn--block" href="#/gift">Redeem a Mystery Gift</a>`;
  }

  return `<p class="eyebrow place-sheet__eyebrow">${esc(pl.island)}</p>
    <h2 class="place-sheet__title">${esc(pl.name)}</h2>
    ${pl.memory ? `<blockquote class="place-sheet__memory">${esc(pl.memory)}</blockquote>` : ""}
    <a class="place-sheet__mon place-sheet__mon--link" href="#/dex/${p.id}">
      <div class="place-sheet__art" style="--tint:${tintFor(p)}">${artHTML(p)}</div>
      <div>
        <small>No. ${dexNo(p.number)}</small>
        <b>${esc(p.name)}</b>
        ${typeChips(p, true)}
      </div>
      <span class="place-sheet__chev" aria-hidden="true">${ICONS.forward}</span>
    </a>`;
}

function rowHTML(pl) {
  const p = db.byId.get(pl.pokemonId);
  const secret = isSecret(pl);
  return `<button class="card place-row${found(pl) ? "" : " is-locked"}" data-pid="${p.id}">
    <span class="place-row__art">${found(pl) ? artHTML(p, { eager: true }) : `<span class="pin__q">?</span>`}</span>
    <span class="place-row__text">
      <b>${secret ? "Uncharted" : esc(pl.name)}</b>
      <small>${secret ? "???" : esc(pl.island)} · ${found(pl) ? esc(p.name) : "Unexplored"}</small>
    </span>
  </button>`;
}

export function renderMap(root, { id }) {
  const total = db.places.length;
  const explored = exploredCount();
  // List order: north-west to south-east, Tobago last, so it reads like the map.
  const places = [...db.places].sort((a, b) => (a.island === b.island ? b.lat - a.lat : a.island === "Tobago" ? 1 : -1));

  root.innerHTML = `
    <header class="page-head map-head">
      <button class="icon-btn" data-back aria-label="Back">${ICONS.back}</button>
      <div>
        <h1>Field Map</h1>
        <p>Trinidad &amp; Tobago · ${explored} of ${total} places explored</p>
      </div>
    </header>

    <section class="card map-card">
      <div class="map-viewport">
        <div class="map-canvas">
          ${mapSVG()}
          ${(() => { const offsets = pinOffsets(); return db.places.map((pl) => pinHTML(pl, offsets)).join(""); })()}
        </div>
      </div>
      <div class="map-zoom">
        <button class="icon-btn" data-zoom="1" aria-label="Zoom in">+</button>
        <button class="icon-btn" data-zoom="-1" aria-label="Zoom out" disabled>−</button>
      </div>
    </section>

    <section class="card place-sheet" aria-live="polite"></section>

    <section class="section">
      <div class="section__head"><h2 class="section__title">All Places</h2></div>
      <div class="place-list">${places.map(rowHTML).join("")}</div>
    </section>`;

  const viewport = root.querySelector(".map-viewport");
  const canvas = root.querySelector(".map-canvas");
  const sheet = root.querySelector(".place-sheet");
  const [zoomIn, zoomOut] = root.querySelectorAll("[data-zoom]");
  let zoom = 0;

  function setZoom(level, focus) {
    // Keep the point under `focus` (or the centre) steady while zooming.
    const fx = focus?.x ?? (viewport.scrollLeft + viewport.clientWidth / 2) / canvas.offsetWidth;
    const fy = focus?.y ?? (viewport.scrollTop + viewport.clientHeight / 2) / canvas.offsetHeight;
    zoom = Math.max(0, Math.min(ZOOMS.length - 1, level));
    canvas.style.width = ZOOMS[zoom] * 100 + "%";
    viewport.scrollLeft = fx * canvas.offsetWidth - viewport.clientWidth / 2;
    viewport.scrollTop = fy * canvas.offsetHeight - viewport.clientHeight / 2;
    zoomIn.disabled = zoom === ZOOMS.length - 1;
    zoomOut.disabled = zoom === 0;
  }

  function select(pid, { fromList = false } = {}) {
    const pl = db.placeByPokemon.get(pid);
    root.querySelectorAll(".pin, .place-row").forEach((el) => el.classList.toggle("is-selected", el.dataset.pid === pid));
    sheet.innerHTML = sheetHTML(pl);
    sheet.classList.remove("is-in");
    void sheet.offsetWidth;
    sheet.classList.add("is-in");
    history.replaceState(null, "", pid ? `#/map/${pid}` : "#/map");
    if (pl && zoom > 0) {
      const { left, top } = projectPct(pl.lat, pl.lon);
      setZoom(zoom, { x: left / 100, y: top / 100 });
    }
    if (fromList) root.querySelector(".map-card").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  root.querySelector("[data-back]").addEventListener("click", () => back("#/home"));
  zoomIn.addEventListener("click", () => setZoom(zoom + 1));
  zoomOut.addEventListener("click", () => setZoom(zoom - 1));
  canvas.addEventListener("click", (e) => {
    const pin = e.target.closest(".pin");
    if (pin) select(pin.dataset.pid);
  });
  root.querySelector(".place-list").addEventListener("click", (e) => {
    const row = e.target.closest(".place-row");
    if (row) select(row.dataset.pid, { fromList: true });
  });

  select(id && db.placeByPokemon.has(id) ? id : null);
}
