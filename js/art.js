// ===========================================================
// Artwork
// Each Pokémon's real art lives at `artwork.src` (e.g. assets/images/pokemon/w001.png).
// Until that file exists, a generated SVG placeholder is shown instead.
// Dropping the PNG into the folder is all it takes to swap art. No code changes needed.
// ===========================================================
import { db, typeInfo } from "./data.js";

const missing = new Set();       // ids whose art file failed to load this session
const placeholderCache = new Map();

// ---------- colour helpers ----------
const hexToRgb = (h) => h.replace("#", "").match(/.{2}/g).map((x) => parseInt(x, 16));
const rgbToHex = (rgb) => "#" + rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
export const mix = (a, b, t) => {
  const A = hexToRgb(a), B = hexToRgb(b);
  return rgbToHex(A.map((v, i) => v + (B[i] - v) * t));
};
const lighten = (c, t) => mix(c, "#ffffff", t);
const darken = (c, t) => mix(c, "#0B1630", t);

/** Soft background tint based on a Pokémon's primary type. */
export const tintFor = (p) => lighten(typeInfo(p.types[0]).color, 0.72);

// ---------- placeholder generator ----------
const SHAPES = {
  round: { cy: 122, rx: 56, ry: 50 },
  tall:  { cy: 116, rx: 46, ry: 60 },
  wide:  { cy: 126, rx: 70, ry: 42 },
  box:   { cy: 121, rx: 48, ry: 43 },
};

function placeholderSVG(p) {
  const { body, accent, shape = "round", features = [] } = p.artwork.placeholder;
  const { cy, rx, ry } = SHAPES[shape] || SHAPES.round;
  const top = cy - ry;
  const has = (f) => features.includes(f);
  const line = darken(body, 0.25);
  const back = [], front = [];

  if (has("ears")) {
    for (const s of [-1, 1]) {
      back.push(`<path d="M${100 + s * rx * 0.2} ${top + 8} L${100 + s * rx * 0.78} ${top - 28} L${100 + s * rx * 0.62} ${top + 22} Z" fill="${darken(body, 0.12)}" stroke="${line}" stroke-width="3" stroke-linejoin="round"/>`);
    }
  }
  if (has("antlers")) {
    for (const s of [-1, 1]) {
      back.push(`<g stroke="${accent}" stroke-width="6" stroke-linecap="round" fill="none"><path d="M${100 + s * 18} ${top + 8} L${100 + s * 38} ${top - 30}"/><path d="M${100 + s * 29} ${top - 12} L${100 + s * 52} ${top - 20}"/><path d="M${100 + s * 35} ${top - 24} L${100 + s * 28} ${top - 46}"/></g>`);
    }
  }
  if (has("pine")) {
    for (const s of [-1, 1]) {
      const x = 100 + s * rx * 0.62;
      back.push([0, 1, 2].map((i) => {
        const w = 22 - i * 5, y = top + 6 - i * 15;
        return `<path d="M${x - w} ${y} L${x} ${y - 24} L${x + w} ${y} Z" fill="${darken(body, 0.18)}" stroke="${accent}" stroke-width="3" stroke-linejoin="round"/>`;
      }).join(""));
    }
  }
  if (has("halo")) {
    back.push(`<ellipse cx="100" cy="${top - 24}" rx="34" ry="9" fill="none" stroke="#E8C77A" stroke-width="5"/>`);
  }
  if (has("antenna")) {
    back.push(`<path d="M100 ${top + 6} Q 104 ${top - 14} 114 ${top - 22}" stroke="${line}" stroke-width="4" fill="none" stroke-linecap="round"/>
      <g fill="${accent}" stroke="${darken(accent, 0.3)}" stroke-width="2"><circle cx="114" cy="${top - 24}" r="7"/></g>
      <path d="M120 ${top - 24} V${top - 46} q8 3 10 10" stroke="${darken(accent, 0.3)}" stroke-width="3" fill="none" stroke-linecap="round"/>`);
  }

  // Body
  const bodyShape = shape === "box"
    ? `<rect x="${100 - rx}" y="${top}" width="${rx * 2}" height="${ry * 2}" rx="16" fill="url(#g)" stroke="${line}" stroke-width="3"/>`
    : `<ellipse cx="100" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#g)" stroke="${line}" stroke-width="3"/>`;
  const feet = [-1, 1].map((s) => `<ellipse cx="${100 + s * rx * 0.45}" cy="${cy + ry - 2}" rx="13" ry="8" fill="${darken(body, 0.1)}" stroke="${line}" stroke-width="3"/>`).join("");
  const belly = shape === "box" ? "" : `<ellipse cx="100" cy="${cy + ry * 0.38}" rx="${rx * 0.55}" ry="${ry * 0.42}" fill="${lighten(body, 0.45)}" opacity="0.85"/>`;
  const ribbon = has("bow") ? `<rect x="91" y="${top}" width="18" height="${ry * 2}" fill="${accent}" stroke="${darken(accent, 0.25)}" stroke-width="2"/>` : "";

  // Face
  const ey = cy - ry * 0.12;
  const ex = rx * 0.4;
  const sleepy = has("nightcap");
  const eyes = [-1, 1].map((s) => sleepy
    ? `<path d="M${100 + s * ex - 8} ${ey} q8 7 16 0" stroke="#1B2440" stroke-width="3.5" fill="none" stroke-linecap="round"/>`
    : `<ellipse cx="${100 + s * ex}" cy="${ey}" rx="6.5" ry="8.5" fill="#1B2440"/><circle cx="${100 + s * ex + 2}" cy="${ey - 3}" r="2.6" fill="#fff"/>`).join("");
  const cheeks = [-1, 1].map((s) => `<ellipse cx="${100 + s * (ex + 12)}" cy="${ey + 13}" rx="8" ry="5" fill="${accent}" opacity="0.45"/>`).join("");
  const mouth = `<path d="M93 ${ey + 14} q3.5 4 7 0 q3.5 4 7 0" stroke="#1B2440" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;

  if (has("nightcap")) {
    const L = 100 - rx * 0.75, R = 100 + rx * 0.75, y = top + 20;
    front.push(`<path d="M${L} ${y} Q ${92} ${top - 44} ${100 + rx * 1.02} ${top - 18} Q ${100 + rx * 0.45} ${top - 6} ${R} ${y} Z" fill="${accent}" stroke="${darken(accent, 0.3)}" stroke-width="3" stroke-linejoin="round"/>
      <rect x="${L - 4}" y="${y - 7}" width="${R - L + 8}" height="13" rx="6.5" fill="#fff" stroke="${line}" stroke-width="2"/>
      <circle cx="${100 + rx * 1.02}" cy="${top - 18}" r="9" fill="#fff" stroke="${line}" stroke-width="2"/>`);
  }
  if (has("crown")) {
    front.push(`<path d="M78 ${top + 8} V${top - 14} L89 ${top - 2} L100 ${top - 22} L111 ${top - 2} L122 ${top - 14} V${top + 8} Z" fill="#E8C77A" stroke="#B08A3A" stroke-width="2.5" stroke-linejoin="round"/><circle cx="100" cy="${top - 1}" r="3.5" fill="${accent === "#E8C77A" ? "#E9708F" : accent}"/>`);
  }
  if (has("headphones")) {
    const hy = cy - ry * 0.12;
    front.push(`<path d="M${100 - rx - 1} ${hy} Q 100 ${top - 46} ${100 + rx + 1} ${hy}" stroke="${darken(accent, 0.35)}" stroke-width="7" fill="none" stroke-linecap="round"/>`);
    for (const s of [-1, 1]) front.push(`<rect x="${100 + s * (rx + 1) - 10}" y="${hy - 17}" width="20" height="34" rx="9" fill="${accent}" stroke="${darken(accent, 0.35)}" stroke-width="3"/>`);
  }
  if (has("bow")) {
    front.push(`<g fill="${accent}" stroke="${darken(accent, 0.3)}" stroke-width="3" stroke-linejoin="round"><path d="M100 ${top} C 80 ${top - 26} 66 ${top - 6} 100 ${top}"/><path d="M100 ${top} C 120 ${top - 26} 134 ${top - 6} 100 ${top}"/><circle cx="100" cy="${top - 1}" r="6"/></g>`);
  }
  if (has("flame")) {
    front.push(`<path d="M100 ${top - 46} C 118 ${top - 24} 114 ${top - 2} 100 ${top + 2} C 86 ${top - 2} 82 ${top - 24} 100 ${top - 46} Z" fill="${accent}"/><path d="M100 ${top - 28} C 108 ${top - 16} 107 ${top - 4} 100 ${top - 2} C 93 ${top - 4} 92 ${top - 16} 100 ${top - 28} Z" fill="#F7EACB"/>`);
  }
  if (has("star")) {
    const s = 8, x = 100, y = top + 16;
    const pts = Array.from({ length: 10 }, (_, i) => {
      const r = i % 2 ? s * 0.45 : s, a = (Math.PI / 5) * i - Math.PI / 2;
      return `${(x + r * Math.cos(a)).toFixed(1)},${(y + r * Math.sin(a)).toFixed(1)}`;
    }).join(" ");
    front.push(`<polygon points="${pts}" fill="#E8C77A" stroke="#B08A3A" stroke-width="1.5"/>`);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <defs><radialGradient id="g" cx="38%" cy="30%" r="80%"><stop offset="0" stop-color="${lighten(body, 0.55)}"/><stop offset="0.6" stop-color="${body}"/><stop offset="1" stop-color="${darken(body, 0.12)}"/></radialGradient></defs>
  <ellipse cx="100" cy="${cy + ry + 6}" rx="${rx * 0.9}" ry="7" fill="#0B1630" opacity="0.14"/>
  ${back.join("")}${feet}${bodyShape}${belly}${ribbon}${cheeks}${eyes}${mouth}${front.join("")}
</svg>`;
}

export function placeholderURI(p) {
  if (!placeholderCache.has(p.id)) {
    placeholderCache.set(p.id, "data:image/svg+xml;charset=utf-8," + encodeURIComponent(placeholderSVG(p)));
  }
  return placeholderCache.get(p.id);
}

/**
 * <img> markup for a Pokémon.
 * locked → black silhouette. Secret + locked → "?" mystery tile.
 */
export function artHTML(p, { locked = false, eager = false } = {}) {
  if (locked && p.secret) return `<div class="art-mystery" aria-label="Unknown Pokémon">?</div>`;
  const src = p.artwork?.src && !missing.has(p.id) ? p.artwork.src : placeholderURI(p);
  const alt = locked ? "Undiscovered Pokémon" : p.artwork?.alt || p.name;
  return `<img class="art${locked ? " art--locked" : ""}" src="${src}" alt="${alt}" data-pid="${p.id}" ${eager ? "" : 'loading="lazy"'} decoding="async" draggable="false">`;
}

// Swap to the placeholder whenever a real art file is missing.
document.addEventListener("error", (e) => {
  const img = e.target;
  if (!(img instanceof HTMLImageElement) || !img.dataset.pid || img.dataset.fallback) return;
  const p = db.byId.get(img.dataset.pid);
  if (!p) return;
  missing.add(p.id);
  img.dataset.fallback = "1";
  img.src = placeholderURI(p);
}, true);
