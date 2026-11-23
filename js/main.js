// ===========================================================
// Boot
// ===========================================================
import { loadData } from "./data.js";
import { store } from "./store.js";
import { route, startRouter } from "./router.js";
import { startSnow } from "./snow.js";
import { renderHome } from "./screens/home.js";
import { renderDex } from "./screens/dex.js";
import { renderDetail } from "./screens/detail.js";
import { renderGift } from "./screens/gift.js";
import { renderAchievements } from "./screens/achievements.js";
import { renderNationalDetail } from "./screens/national.js";
import { renderEnding } from "./screens/ending.js";

route(/^\/home$/, "home", renderHome);
route(/^\/dex$/, "dex", renderDex);
route(/^\/dex\/(?<tab>national)$/, "dex", renderDex);
route(/^\/dex\/national\/(?<nid>\d+)$/, "dex", renderNationalDetail);
route(/^\/dex\/(?<id>W\d{3})$/, "dex", renderDetail);
route(/^\/ending$/, "", renderEnding);
route(/^\/gift$/, "gift", renderGift);
route(/^\/achievements$/, "achievements", renderAchievements);

function updateGiftDot() {
  // Nudge towards Mystery Gift until the first code is redeemed.
  document.querySelector(".tabbar__dot").hidden = Object.keys(store.state.redeemedCodes).length > 0;
}

async function boot() {
  startSnow(document.getElementById("snow"));
  const view = document.getElementById("view");
  try {
    await loadData();
  } catch (err) {
    console.error(err);
    view.innerHTML = `<div class="card empty" style="margin-top:20vh">
      <div class="empty__icon">⚠️</div>
      <h2>Couldn't load the Pokédex</h2>
      <p>${location.protocol === "file:"
        ? "Open the app through a local server (e.g. VS Code “Live Server”) or GitHub Pages, not by double-clicking the file."
        : "Check your connection and refresh the page."}</p>
    </div>`;
    return;
  }
  updateGiftDot();
  store.subscribe(updateGiftDot);
  startRouter(view);
}

// Offline support (see sw.js). Only works over https:// or localhost.
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}

boot();
