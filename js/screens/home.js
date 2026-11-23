import { db, dexNo } from "../data.js";
import { store } from "../store.js";
import { CONFIG } from "../config.js";
import { artHTML, tintFor } from "../art.js";
import { esc, ICONS } from "../ui.js";
import { earnedCount } from "../achievements.js";

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? "Still up" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function recentCards() {
  const ids = store.recent(3, db.byId);
  const cards = ids.map((id) => {
    const p = db.byId.get(id);
    return `<a class="card mini-card" href="#/dex/${p.id}" style="--tint:${tintFor(p)}">
      ${store.isViewed(p.id) ? "" : `<span class="pill pill--new">New</span>`}
      <div class="mini-card__art">${artHTML(p)}</div>
      <span class="mini-card__no">No. ${dexNo(p.number)}</span>
      <span class="mini-card__name">${esc(p.name)}</span>
    </a>`;
  });
  // Fill empty slots with the next undiscovered silhouettes.
  const upcoming = db.pokemon.filter((p) => !store.isUnlocked(p.id)).slice(0, 3 - cards.length);
  upcoming.forEach((p) => cards.push(`<a class="card mini-card" href="#/dex/${p.id}">
      <div class="mini-card__art">${artHTML(p, { locked: true })}</div>
      <span class="mini-card__no">No. ${dexNo(p.number)}</span>
      <span class="mini-card__name" style="color:var(--ink-3)">???</span>
    </a>`));
  return cards.join("");
}

function researchNotes() {
  const locked = db.notes.filter((n) => !store.isUnlocked(n.pokemonId));
  const pool = locked.length ? locked : db.notes;
  // Rotate daily so the notes feel fresh.
  const day = Math.floor(Date.now() / 86400000);
  const start = pool.length ? day % pool.length : 0;
  const picks = [0, 1, 2].map((i) => pool[(start + i) % pool.length]).filter((n, i, arr) => n && arr.indexOf(n) === i);

  return picks.map((n) => {
    const confirmed = store.isUnlocked(n.pokemonId);
    const name = confirmed ? db.byId.get(n.pokemonId).name : null;
    return `<div class="card note">
      <div class="note__icon">${ICONS.note}</div>
      <div>
        <span class="note__tag${confirmed ? " is-confirmed" : ""}">${confirmed ? `Confirmed · ${esc(name)}` : "Unconfirmed sighting"}</span>
        <p>${esc(n.text)}</p>
      </div>
    </div>`;
  }).join("");
}

// Shown only in iPhone/iPad Safari when the app isn't on the Home Screen yet.
// (navigator.standalone exists only on Apple devices: false = in Safari, true = installed.)
const canInstall = () => navigator.standalone === false && !store.state.settings.installHintDismissed;

function installCard() {
  if (!canInstall()) return "";
  return `<section class="card install" aria-label="Install the app">
    <button class="install__close" data-install-close aria-label="Dismiss">×</button>
    <div class="install__row">
      <img class="install__icon" src="assets/icons/apple-touch-icon.png" alt="">
      <div>
        <h3>Add Winterveil to your Home Screen</h3>
        <p>It opens full-screen like a real app and works offline.</p>
      </div>
    </div>
    <ol class="install__steps">
      <li><span class="install__n">1</span><span>Tap <b>Share</b> <i class="install__share" aria-label="Share icon">${ICONS.share}</i> in Safari's toolbar <small>(on newer iPhones it's inside the <b>•••</b> menu)</small></span></li>
      <li><span class="install__n">2</span><span>Choose <b>Add to Home Screen</b>, then tap <b>Add</b></span></li>
    </ol>
  </section>`;
}

export function renderHome(root) {
  const total = db.pokemon.length;
  const found = store.unlockedCount();
  const pct = Math.round((found / total) * 100);
  const gifts = Object.keys(store.state.redeemedCodes).length;
  const earned = earnedCount();
  const first = found === 0;

  root.innerHTML = `${installCard()}
    <section class="card card--navy hero">
      <div class="hero__top">
        <div>
          <p class="eyebrow">${esc(CONFIG.regionName)} Region</p>
          <h1 class="hero__title">${greeting()},<br>${esc(CONFIG.trainerName)}</h1>
          <p class="hero__sub">${esc(CONFIG.eventSubtitle)}</p>
        </div>
        <div class="hero__emblem" aria-hidden="true">${ICONS.snowflake}</div>
      </div>
      <div class="hero__progress">
        <div class="hero__row">
          <span class="hero__label">Winterveil Pokédex</span>
          <span class="hero__pct">${pct}%</span>
        </div>
        <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${found}" aria-label="Species found">
          <div class="progress__fill" data-w="${pct}"></div>
        </div>
        <div class="hero__stats">
          <div><b>${found}</b><span>/ ${total}</span><small>Species Found</small></div>
          <div><b>${gifts}</b><small>Gifts Opened</small></div>
          <div><b>${earned}</b><small>Badges</small></div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="section__head">
        <h2 class="section__title">Recently Discovered</h2>
        <a class="section__link" href="#/dex">See Pokédex</a>
      </div>
      <div class="recent">${recentCards()}</div>
    </section>

    <section class="section">
      <div class="card card--ice gift-cta">
        <div class="gift-cta__row">
          <div class="gift-cta__icon">${ICONS.gift}</div>
          <div>
            <h3>${first ? "Your first gift is waiting" : "Mystery Gift"}</h3>
            <p>${first
              ? "Enter the code from your advent gift to meet your partner Pokémon."
              : "Found a new code? Redeem it to discover more Pokémon."}</p>
          </div>
        </div>
        <a class="btn btn--gold btn--lg btn--block" href="#/gift">Redeem Code</a>
      </div>
    </section>

    <section class="section">
      <div class="section__head">
        <h2 class="section__title">Achievements</h2>
        <a class="section__link" href="#/achievements">View all</a>
      </div>
      <a class="card ach-preview" href="#/achievements">
        <div class="badges">
          ${db.achievements.map((a) => `<span class="badge${store.hasAchievement(a.id) ? "" : " is-locked"}" title="${esc(a.name)}">${a.icon}</span>`).join("")}
        </div>
        <div class="ach-preview__meta"><span>${earned} of ${db.achievements.length} earned</span><span>${earned === db.achievements.length ? "Complete!" : "Keep exploring"}</span></div>
      </a>
    </section>

    <section class="section">
      <div class="section__head"><h2 class="section__title">Region Research Notes</h2></div>
      <div class="notes">${researchNotes()}</div>
    </section>`;

  root.querySelector("[data-install-close]")?.addEventListener("click", (e) => {
    store.dismissInstallHint();
    e.currentTarget.closest(".install").remove();
  });

  // Animate the progress bar in.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    root.querySelectorAll("[data-w]").forEach((el) => (el.style.width = el.dataset.w + "%"));
  }));
}
