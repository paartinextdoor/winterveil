# Winterveil Pokédex: Architecture & Plan

## 1. Architecture

The app is a static single-page app (SPA). It has no build step, framework, or backend.
GitHub Pages serves the files exactly as they are in the repo.

```
            ┌──────────────────────────── index.html ────────────────────────────┐
            │  <header snow canvas>   <main id="view">   <nav bottom tab bar>     │
            └────────────────────────────────┬───────────────────────────────────┘
                                             │ loads (ES modules)
                                     js/main.js  (boot)
          ┌──────────────┬──────────────┬────┴─────────┬──────────────┬──────────────┐
      data.js        store.js       router.js        art.js         ui.js        snow.js
   fetch /data/*   localStorage    #/hash routes   artwork +      DOM helpers,   ambient
   JSON, indexes   save + events   → screen fn     placeholders   toasts, modal  snowfall
          └──────────────┴──────────────┬──────────────┴──────────────┘
                                 js/screens/*.js
              home · dex · detail · gift · achievements · national (stub)
```

**Principles**

| Concern | Decision | Why |
|---|---|---|
| Rendering | Each screen is a function `render(root, params)` that builds DOM from template strings | Simple to read. Nothing to compile. |
| Routing | Hash routes (`#/dex/W001`) | Works on GitHub Pages without server rewrites |
| Content | All Pokémon, codes, notes, and achievements live in `/data/*.json` | Edit content without touching code |
| State | One versioned object in LocalStorage, accessed only via `store.js` | One source of truth. Easy to migrate or reset. |
| Reactivity | `store` emits a `change` event. The current screen re-renders. | No framework needed at this size |
| Artwork | Each Pokémon has `artwork.src`. If the file is missing, a generated SVG placeholder is drawn. | Drop in a PNG later and change zero code |
| Codes | Codes are stored as SHA-256 hashes, not plain text | Peeking at the public repo won't spoil the gifts |
| Dates | A code can have `availableFrom`, e.g. Christmas Day for the final legendary | Real "event" feel |

## 2. Folder structure

```
/
├── index.html                 App shell (header, view outlet, tab bar, iOS icon/splash links)
├── manifest.webmanifest       "Add to Home Screen" support
├── sw.js                      Service worker (offline support)
├── .nojekyll                  Tells GitHub Pages to serve files as-is
├── assets/
│   ├── icons/                 App icon (SVG + iOS/Android PNGs)
│   ├── splash/                iPhone launch screens
│   └── images/pokemon/        Drop final artwork here (w001.png …), see README inside
├── css/
│   ├── tokens.css             Design tokens: colours, type, radius, shadow, motion
│   ├── base.css               Reset, typography, page background, layout
│   ├── components.css         Cards, buttons, chips, progress, tab bar, modal, toast
│   └── screens.css            Screen-specific layout
├── data/
│   ├── pokemon.json           15 Winterveil species (full data model)
│   ├── types.json             Type names + colours (incl. custom Sound type)
│   ├── codes.json             Hashed Mystery Gift codes → unlocks
│   ├── achievements.json      Achievement definitions + rules
│   └── research-notes.json    Hints shown on Home
├── js/
│   ├── main.js                Boot: load data, start router, tab bar, snow
│   ├── config.js              Trainer name, storage key, dev flags
│   ├── data.js                Loads JSON, builds lookup indexes
│   ├── store.js               LocalStorage persistence + change events
│   ├── router.js              Hash router
│   ├── art.js                 Artwork resolver + placeholder generator
│   ├── ui.js                  DOM helpers, toast, modal, unlock animation
│   ├── snow.js                Canvas snowfall (pauses when hidden / reduced motion)
│   ├── sound.js               Opt-in sound effects (Web Audio, no files)
│   ├── secret.js              Locks/unlocks the Christmas message
│   ├── pokeapi.js             National Dex data from PokéAPI
│   ├── achievements.js        Rule evaluation
│   ├── codes.js               Normalize + hash + validate codes
│   └── screens/
│       ├── home.js
│       ├── dex.js             Winterveil Dex (+ National Dex tab shell)
│       ├── detail.js          Pokémon detail
│       ├── gift.js            Mystery Gift redemption
│       ├── achievements.js    Achievement Hall (+ ?dev tools)
│       ├── national.js        National Dex list + detail (PokéAPI)
│       └── ending.js          Christmas ending (wording in config.js)
├── tools/code-hasher.html     Make new gift codes (prints the hash)
├── tools/message-locker.html  Encrypt the Christmas ending message
└── docs/ARCHITECTURE.md       This file
```

## 3. Data schema

### `pokemon.json`: `Pokemon[]`
```jsonc
{
  "id": "W001",                     // stable key used everywhere
  "number": 1,                      // dex order
  "name": "Snoozlet",
  "category": "Drowsy Pokémon",
  "types": ["normal"],              // keys into types.json
  "rarity": "starter",              // starter | evolution | special | legendary | mythical
  "secret": false,                  // true → name + silhouette hidden until unlocked
  "height": 0.4,                    // metres
  "weight": 6.8,                    // kilograms
  "abilities": [
    { "name": "Power Nap", "description": "…", "hidden": false }
  ],
  "stats": { "hp": 50, "attack": 45, "defense": 50, "spAtk": 40, "spDef": 50, "speed": 30 },
  "entry": "Pokédex flavour text…",
  "evolution": {
    "from": null,                   // id or null
    "to": "W002",                   // id or null
    "trigger": "Gift code"          // display text for the arrow
  },
  "artwork": {
    "src": "assets/images/pokemon/w001.png",   // final art (optional until it exists)
    "alt": "Snoozlet curled up asleep",
    "credit": "",
    "placeholder": { "body": "#E9E4DA", "accent": "#B9B1A3", "shape": "round", "feature": "nightcap" }
  }
}
```

### `types.json`: `{ [typeKey]: { "label": string, "color": hex } }`

### `codes.json`: `Code[]`
```jsonc
{ "id": "c13", "hash": "<sha256('winterveil:' + CANONICAL)>", "unlocks": ["W015"],
  "title": "A Song Beneath the Snow", "availableFrom": "2026-12-25" }
```
The canonical form is the code in uppercase with only letters and digits kept.
So `snow day 123`, `SNOW_DAY_123` and `snow-day-123` all match. (Example only, not a real code.)

### `achievements.json`: `Achievement[]`
```jsonc
{ "id": "playlist-master", "name": "Playlist Master", "description": "…", "icon": "🎧",
  "rule": { "type": "all", "ids": ["W004","W005","W006"] } }
```
Rule types: `count` (`min`), `all` (`ids`), `any` (`ids`), `viewed` (`min`), `favorites` (`min`, National Dex favorites).

### `research-notes.json`: `{ "id", "pokemonId", "text" }[]`

## 4. LocalStorage schema

Key: `winterveil.save.v1`

```jsonc
{
  "version": 1,
  "unlocked":     { "W001": { "at": "2026-12-01T08:12:00.000Z", "via": "c01" } },
  "viewed":       ["W001"],                          // detail pages opened
  "redeemedCodes":{ "c01": "2026-12-01T08:12:00.000Z" },
  "achievements": { "first-discovery": "2026-12-01T08:12:00.000Z" },
  "favorites":    { "national": [25, 133] },         // PokéAPI ids (Phase 2)
  "seenEnding":   false,
  "ending":       null                               // decrypted message, set when the Christmas code is redeemed
}
```
All reads and writes go through `store.js`. If a future version changes the shape,
`migrate()` upgrades the old save so progress is never lost.

## 5. Development roadmap

| Phase | Scope | Status |
|---|---|---|
| **1 · Core** | App shell, bottom nav, Home, Winterveil Dex, Detail, Mystery Gift with unlock animation, data JSON, placeholder art, responsive CSS, achievements engine (preview on Home) | ✅ |
| **2 · Collection** | Full Achievements screen and unlock toasts. National Dex (PokéAPI search, filters, detail, favorites). Harmona ending screen with personal message. | ✅ built |
| **3 · Polish & Ship** | Final artwork swap-in. Sound effects (opt-in). iOS home-screen icons and splash. Offline caching (service worker). GitHub Pages deploy checklist. Test pass on a real iPhone. | ✅ built (placeholder art kept as final; real-iPhone test: owner) |
| **4 · Gift Ops** | Print-ready advent code cards. Date schedule for each code. Reset/test tools hidden behind `?dev`. | ✅ (cards and schedule kept privately, outside the repo) |
