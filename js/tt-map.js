// ===========================================================
// Illustrated map of Trinidad & Tobago (simplified coastlines).
// project(lat, lon) turns real coordinates into map positions,
// so places in data/places.json only need their latitude/longitude.
// ===========================================================

const LON0 = -62.03, LON1 = -60.42, LAT0 = 11.42, LAT1 = 9.95;
const K = 240;                                   // pixels per degree of latitude
const COS = Math.cos((10.6 * Math.PI) / 180);    // squash longitude at this latitude

export const MAP_W = Math.round((LON1 - LON0) * COS * K);
export const MAP_H = Math.round((LAT0 - LAT1) * K);

export function project(lat, lon) {
  return { x: (lon - LON0) * COS * K, y: (LAT0 - lat) * K };
}

/** Position as % of the map box (for HTML pins laid over the SVG). */
export function projectPct(lat, lon) {
  const { x, y } = project(lat, lon);
  return { left: (x / MAP_W) * 100, top: (y / MAP_H) * 100 };
}

// Coastline points as [lon, lat], clockwise.
const TRINIDAD = [
  [-61.665, 10.695], [-61.64, 10.716], [-61.6, 10.735], [-61.54, 10.744], [-61.48, 10.752], [-61.437, 10.766],
  [-61.4, 10.787], [-61.33, 10.795], [-61.25, 10.8], [-61.15, 10.81], [-61.06, 10.828], [-60.99, 10.834], [-60.918, 10.842],
  [-60.928, 10.8], [-60.958, 10.758], [-60.99, 10.71], [-61.012, 10.66], [-61.03, 10.6], [-61.042, 10.55],
  [-61.033, 10.48], [-61.012, 10.4], [-60.998, 10.3], [-61.008, 10.2], [-60.998, 10.142],
  [-61.05, 10.12], [-61.15, 10.1], [-61.28, 10.09], [-61.4, 10.076], [-61.52, 10.066], [-61.65, 10.07], [-61.78, 10.06], [-61.922, 10.048],
  [-61.9, 10.09], [-61.84, 10.12], [-61.76, 10.15], [-61.7, 10.18], [-61.62, 10.234], [-61.54, 10.255], [-61.476, 10.28],
  [-61.49, 10.33], [-61.472, 10.38], [-61.46, 10.44], [-61.47, 10.52], [-61.5, 10.6], [-61.52, 10.646], [-61.58, 10.67], [-61.64, 10.682],
];

const TOBAGO = [
  [-60.846, 11.15], [-60.835, 11.178], [-60.79, 11.21], [-60.75, 11.24], [-60.71, 11.274], [-60.66, 11.3], [-60.6, 11.32],
  [-60.545, 11.335], [-60.508, 11.346], [-60.522, 11.3], [-60.57, 11.265], [-60.62, 11.236], [-60.68, 11.205], [-60.73, 11.18], [-60.79, 11.16],
];

// The Bocas islands off Trinidad's north-west tip: [lon, lat, rx, ry]
const BOCAS = [[-61.755, 10.69, 6, 4], [-61.695, 10.695, 4, 3], [-61.665, 10.672, 3.5, 2.5]];

// Northern Range hills, Central Range, and Tobago's Main Ridge (soft green bands)
const RANGES = [
  [[-61.62, 10.705], [-61.45, 10.735], [-61.2, 10.765], [-60.98, 10.8], [-61.0, 10.765], [-61.25, 10.722], [-61.48, 10.7]],
  [[-61.36, 10.47], [-61.2, 10.45], [-61.1, 10.4], [-61.18, 10.385], [-61.32, 10.43]],
  [[-60.75, 11.215], [-60.6, 11.29], [-60.56, 11.31], [-60.59, 11.27], [-60.73, 11.2]],
];

/** Smooth closed path through points (Catmull-Rom → cubic Bézier). */
function smooth(points) {
  const p = points.map(([lon, lat]) => project(lat, lon));
  const n = p.length;
  let d = `M${p[0].x.toFixed(1)} ${p[0].y.toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = p[(i - 1 + n) % n], p1 = p[i], p2 = p[(i + 1) % n], p3 = p[(i + 2) % n];
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C${c1.x.toFixed(1)} ${c1.y.toFixed(1)} ${c2.x.toFixed(1)} ${c2.y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d + "Z";
}

function label(text, lat, lon, cls) {
  const { x, y } = project(lat, lon);
  return `<text class="${cls}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle">${text}</text>`;
}

/** The base map artwork. `labels: false` for the small Home preview. */
export function mapSVG({ labels = true, id = "tt" } = {}) {
  const tri = smooth(TRINIDAD), tob = smooth(TOBAGO);
  const bocas = BOCAS.map(([lon, lat, rx, ry]) => {
    const { x, y } = project(lat, lon);
    return `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${rx}" ry="${ry}"/>`;
  }).join("");
  const waves = [[40, 300], [300, 260], [250, 40], [70, 60], [330, 130]].map(([x, y]) =>
    `<path d="M${x} ${y} q6 -4 12 0 t12 0" />`).join("");

  return `<svg class="ttmap" viewBox="0 0 ${MAP_W} ${MAP_H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Map of Trinidad and Tobago">
  <defs>
    <linearGradient id="${id}-sea" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#D4EAF8"/><stop offset="1" stop-color="#B6DAF1"/>
    </linearGradient>
    <linearGradient id="${id}-land" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#EEF5EE"/>
    </linearGradient>
    <filter id="${id}-shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#12224A" flood-opacity="0.18"/>
    </filter>
  </defs>
  <rect width="${MAP_W}" height="${MAP_H}" fill="url(#${id}-sea)"/>
  <g class="ttmap__waves" fill="none" stroke="#FFFFFF" stroke-width="1.6" stroke-linecap="round" opacity="0.7">${waves}</g>
  <g class="ttmap__coast" fill="none" stroke="#FFFFFF" stroke-width="7" opacity="0.55" stroke-linejoin="round">
    <path d="${tri}"/><path d="${tob}"/>
  </g>
  <g filter="url(#${id}-shadow)" fill="url(#${id}-land)" stroke="#8EC5E8" stroke-width="1.6" stroke-linejoin="round">
    <path d="${tri}"/><path d="${tob}"/>${bocas}
  </g>
  <g fill="#3F8A70" opacity="0.13">${RANGES.map((r) => `<path d="${smooth(r)}"/>`).join("")}</g>
  ${labels ? `
  ${label("TRINIDAD", 10.36, -61.25, "ttmap__island")}
  ${label("TOBAGO", 11.205, -60.62, "ttmap__island ttmap__island--sm")}
  ${label("Gulf of Paria", 10.42, -61.73, "ttmap__sea")}
  ${label("Caribbean Sea", 11.08, -61.45, "ttmap__sea")}
  ${label("Atlantic Ocean", 10.6, -60.68, "ttmap__sea")}
  <g class="ttmap__compass" transform="translate(${MAP_W - 34} ${MAP_H - 38})">
    <circle r="15" fill="#FFFFFF" opacity="0.7"/>
    <path d="M0 -12 L4 0 L0 12 L-4 0Z" fill="#12224A" opacity="0.25"/>
    <path d="M0 -12 L4 0 L-4 0Z" fill="#D4AE5B"/>
    <text y="-17" text-anchor="middle">N</text>
  </g>` : ""}
</svg>`;
}
