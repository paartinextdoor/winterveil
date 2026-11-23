// ===========================================================
// Media cards on Pokémon pages: Spotify podcast / playlist players
// and "Movie Night" trailer cards. Content lives in data/media.json.
// ===========================================================
import { db } from "./data.js";
import { esc } from "./ui.js";

const ICON = {
  podcast: `<svg viewBox="0 0 24 24"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/></svg>`,
  playlist: `<svg viewBox="0 0 24 24"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg>`,
  track: `<svg viewBox="0 0 24 24"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg>`,
  movie: `<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18M7 5l2 4M12 5l2 4M17 5l2 4"/></svg>`,
  play: `<svg viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z"/></svg>`,
};

const SPOTIFY = /open\.spotify\.com\/(?:intl-[a-z-]+\/)?(playlist|show|episode|album|track)\/([A-Za-z0-9]+)/;

/** Turns a normal Spotify share link into its embeddable player URL. */
function spotifyEmbed(url) {
  const m = url?.match(SPOTIFY);
  return m ? `https://open.spotify.com/embed/${m[1]}/${m[2]}?utm_source=generator` : null;
}

function spotifyCard(m) {
  const embed = spotifyEmbed(m.spotify);
  if (!embed) return "";
  const tall = m.kind === "playlist";
  return `<div class="card media media--${m.kind}">
    <div class="media__head">
      <span class="media__icon" aria-hidden="true">${ICON[m.kind]}</span>
      <div><small>${esc(m.title)}</small>${m.name ? `<b>${esc(m.name)}</b>` : ""}${m.artist ? `<span class="media__artist">${esc(m.artist)}</span>` : ""}</div>
    </div>
    ${m.note ? `<p class="media__note">${esc(m.note)}</p>` : ""}
    <iframe class="media__player${tall ? " media__player--tall" : ""}" src="${embed}" title="${esc(m.name || m.title)} on Spotify"
      loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe>
    <a class="btn btn--navy btn--block media__open" href="${esc(m.spotify)}" target="_blank" rel="noopener">${ICON.play}Open in Spotify</a>
  </div>`;
}

function movieCard(m, p) {
  const upNext = m.status === "watchlist";
  const place = db.placeByPokemon.get(p.id);
  return `<div class="card media media--movie">
    <div class="media__head">
      <span class="media__icon" aria-hidden="true">${ICON.movie}</span>
      <div><small>${esc(m.title)}</small></div>
      <span class="media__badge${upNext ? " is-next" : ""}">${upNext ? "On our watchlist" : "Watched together"}</span>
    </div>
    <div class="media__film">
      <b>${esc(m.name)}</b>${m.year ? `<span>${m.year}</span>` : ""}
      ${place && !upNext ? `<small class="media__seen">Seen at ${esc(place.name)}</small>` : ""}
    </div>
    ${m.note ? `<p class="media__note">${esc(m.note)}</p>` : ""}
    ${m.trailer ? `<a class="btn btn--navy btn--block media__trailer" href="${esc(m.trailer)}" target="_blank" rel="noopener">${ICON.play}Watch the trailer</a>` : ""}
  </div>`;
}

export function mediaCardHTML(p) {
  const m = db.media[p.id];
  if (!m) return "";
  return m.kind === "movie" ? movieCard(m, p) : spotifyCard(m);
}
