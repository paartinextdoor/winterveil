// ===========================================================
// Achievement Hall: every badge, with progress and earned dates.
// ===========================================================
import { db } from "../data.js";
import { store } from "../store.js";
import { CONFIG } from "../config.js";
import { earnedCount, progress, syncAchievements } from "../achievements.js";
import { rerender } from "../router.js";
import { esc } from "../ui.js";
import { play } from "../sound.js";

const fmtDate = (iso) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

function achievementCard(a) {
  const earnedAt = store.state.achievements[a.id];
  const { have, need } = progress(a.rule);
  const shown = Math.min(have, need);
  const pct = Math.round((shown / need) * 100);

  const status = earnedAt
    ? `<span class="ach__date">Earned ${fmtDate(earnedAt)}</span>`
    : need > 1
      ? `<div class="ach__progress">
           <span class="progress progress--light"><span class="progress__fill" data-w="${pct}"></span></span>
           <span class="ach__count">${shown} / ${need}</span>
         </div>`
      : `<span class="ach__date is-locked">Not yet earned</span>`;

  return `<li class="card ach${earnedAt ? " is-earned" : ""}">
    <span class="badge ach__badge${earnedAt ? "" : " is-locked"}" aria-hidden="true">${a.icon}</span>
    <div class="ach__body">
      <h3 class="ach__name">${esc(a.name)}</h3>
      <p class="ach__desc">${esc(a.description)}</p>
      ${status}
    </div>
  </li>`;
}

export function renderAchievements(root) {
  const total = db.achievements.length;
  const earned = earnedCount();
  const pct = Math.round((earned / total) * 100);
  const latest = db.achievements
    .filter((a) => store.hasAchievement(a.id))
    .sort((a, b) => store.state.achievements[b.id].localeCompare(store.state.achievements[a.id]))[0];

  root.innerHTML = `
    <header class="page-head">
      <h1>Achievements</h1>
      <p>Badges earned on your Winterveil research.</p>
    </header>

    <section class="card card--navy ach-hero">
      <div class="ach-hero__row">
        <div>
          <p class="eyebrow">Achievement Hall</p>
          <p class="ach-hero__big"><b>${earned}</b><span>/ ${total}</span></p>
        </div>
        <div class="ach-hero__trophy" aria-hidden="true">${earned === total ? "🏆" : latest ? latest.icon : "🎖️"}</div>
      </div>
      <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${earned}" aria-label="Badges earned">
        <div class="progress__fill" data-w="${pct}"></div>
      </div>
      <p class="ach-hero__sub">${earned === total
        ? "Every badge collected. A true Christmas Champion!"
        : latest ? `Latest: ${esc(latest.name)}` : "Your first badge is one gift away."}</p>
    </section>

    <ul class="ach-list">${db.achievements.map(achievementCard).join("")}</ul>

    <section class="section">
      <div class="section__head"><h2 class="section__title">Settings</h2></div>
      <label class="card setting">
        <span><b>Sound effects</b><small>Chimes for gifts, badges and more</small></span>
        <input type="checkbox" class="switch" data-sound ${store.soundOn() ? "checked" : ""}>
      </label>
    </section>

    ${CONFIG.devReset ? `
      <div class="card" style="margin-top:16px;display:grid;gap:10px">
        <h3 class="card__title" style="margin:0">Developer tools (?dev)</h3>
        ${CONFIG.dev ? `
          <button class="btn btn--navy" data-dev="all">Unlock all Pokémon</button>
          <a class="btn btn--ghost" href="#/ending">Preview the ending</a>` : ""}
        <button class="btn btn--ghost" data-dev="reset">Reset all progress</button>
      </div>` : ""}`;

  requestAnimationFrame(() => requestAnimationFrame(() => {
    root.querySelectorAll("[data-w]").forEach((el) => (el.style.width = el.dataset.w + "%"));
  }));

  root.querySelector("[data-sound]").addEventListener("change", (e) => {
    store.setSound(e.target.checked);
    play("achievement"); // a little preview when switched on
  });

  root.querySelector('[data-dev="all"]')?.addEventListener("click", () => {
    store.unlock(db.pokemon.map((p) => p.id), "dev");
    syncAchievements();
    rerender();
  });
  root.querySelector('[data-dev="reset"]')?.addEventListener("click", () => {
    if (confirm("Erase all Winterveil progress on this device?")) { store.reset(); rerender(); }
  });
}
