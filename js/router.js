// ===========================================================
// Tiny hash router: "#/dex/W001" → detail screen.
// ===========================================================

const routes = [];
let outlet;
let history = [];

export function route(pattern, tab, render) {
  routes.push({ pattern, tab, render });
}

export function navigate(path) {
  location.hash = path;
}

/** Go back inside the app, or to `fallback` if there is no in-app history. */
export function back(fallback = "#/home") {
  if (history.length > 1) window.history.back();
  else navigate(fallback);
}

export function rerender() {
  resolve(false);
}

function setActiveTab(tab) {
  document.querySelectorAll(".tabbar__item").forEach((el) => {
    const on = el.dataset.tab === tab;
    el.classList.toggle("is-active", on);
    if (on) el.setAttribute("aria-current", "page");
    else el.removeAttribute("aria-current");
  });
}

function resolve(scroll = true) {
  const path = location.hash.replace(/^#/, "") || "/home";
  for (const r of routes) {
    const match = path.match(r.pattern);
    if (!match) continue;
    outlet.innerHTML = "";
    setActiveTab(r.tab);
    r.render(outlet, match.groups || {});
    if (scroll) window.scrollTo({ top: 0, behavior: "instant" });
    return;
  }
  navigate("/home");
}

export function startRouter(el) {
  outlet = el;
  window.addEventListener("hashchange", () => {
    history.push(location.hash);
    resolve();
  });
  history.push(location.hash || "#/home");
  resolve();
}
