# Winterveil Pokédex: project notes for Claude

A Christmas gift: a Pokémon-HOME-style regional Pokédex. Through December, the boyfriend redeems advent gift codes to unlock 15 custom Pokémon (W001–W015).
The owner is a **beginner developer with a full-time job**. Keep changes low-maintenance, explain steps plainly, and make all design decisions yourself (no Figma, no wireframes to fill in).

Full plan: `docs/ARCHITECTURE.md` (architecture, data schema, LocalStorage schema, roadmap). Setup and publishing: `README.md`.

## Hard constraints
- Plain **HTML + CSS + vanilla JS (ES modules)**. No React/Vue/frameworks, no build step, no backend, no database.
- Data lives in `data/*.json`. Progress is saved in LocalStorage (key `winterveil.save.v1`), only through `js/store.js`.
- Must run on **GitHub Pages**. The main target is **iPhone Safari** (safe-area insets, inputs at 16px or larger, `-webkit-backdrop-filter`).
- To test locally, serve the folder (VS Code Live Server). Opening it as `file://` breaks `fetch`.

## Design system
- Colours are in `css/tokens.css`: Deep Navy (primary), Ice Blue (secondary), Soft Gold (accent), Forest Green (support), Winter White (background).
- Style: frosted-glass cards, rounded Nintendo-style UI, subtle snowfall (`js/snow.js`), smooth transitions. Avoid clutter, cheesy Christmas graphics, and heavy red/green.
- Font: Nunito (Google Fonts). The bottom tab bar has 4 tabs: Home, Pokédex, Mystery Gift, Achievements.

## Key decisions (don't undo without asking)
- **Codes are SHA-256 hashed** in `data/codes.json`: `sha256("winterveil:" + CANONICAL)`, where CANONICAL is uppercase letters and digits only, so input is forgiving. Never write plain-text codes into the repo; the repo is public and he might look. `tools/code-hasher.html` generates new hashes.
- **Never write plain codes anywhere in the repo** (docs, comments, examples, tests). Codes are random word pairs plus digits, chosen so they can't be guessed from the gift titles. c01 unlocks W001, W004 and W007 together. c13 (Harmona, W015) has `availableFrom: "2026-12-25"` and also unlocks the encrypted ending message.
- **`?dev` in the URL:** on localhost it ignores code dates and shows Unlock-all/Preview/Reset on the Achievements tab. On the live site (`CONFIG.devReset`) it shows **only** Reset, so nobody can open gifts or the message early.
- **Artwork:** `artwork.src` → `assets/images/pokemon/w0XX.png`. If the file is missing, `js/art.js` draws a generated SVG placeholder from `artwork.placeholder`. Locked = CSS black silhouette. `secret: true` shows a "?" tile.
- Hash routes: `#/home`, `#/dex`, `#/dex/national`, `#/dex/W001`, `#/gift`, `#/achievements`. Each screen in `js/screens/` is `render(root, params)`.
- Achievements are rule-based (`count` / `all` / `any` / `viewed`) in `data/achievements.json`, evaluated by `js/achievements.js`.
- Trainer name and event copy live in `js/config.js`.

## Status
- **Phase 1: done** (2026-11-23). Home, navigation, Winterveil Dex, detail page, Mystery Gift with unlock animation, data JSON, placeholder art, responsive CSS. Tested at iPhone size.
- **Phase 2: built** (2026-11-23), awaiting the owner's review. Achievement Hall with progress (new rule type `favorites`). National Dex via PokéAPI (`js/pokeapi.js`, `js/screens/national.js`; routes `#/dex/national` and `#/dex/national/<n>`; search, region/type filters, favorites in `favorites.national`). Ending at `#/ending` (`js/screens/ending.js`) plays once after Harmona is unlocked and can be replayed from her page. The ending message is **encrypted** (`CONFIG.ending.locked`, AES-GCM keyed from the c13 code via `js/secret.js`). Redeeming that code decrypts it into the save (`ending`). Never write the plain message into the repo; to change it, use `tools/message-locker.html`.
- **Phase 3: built** (2026-11-23), awaiting the owner's review. `sw.js` (network-first for app files, cache-first for `/assets/`, fonts, PokéAPI; bump `MEDIA` if an art file is replaced). iOS `apple-touch-icon` + 12 `apple-touch-startup-image` launch screens in `assets/splash/`. Opt-in Web Audio sounds (`js/sound.js`, `settings.sound` in the save, toggle on the Achievements tab). Deploy + real-iPhone checklist in `README.md`. `trainerName` is "Jonathan". The owner is keeping the generated placeholder art as the final look (no custom artwork planned); the PNG swap-in pipeline stays in case that changes.
- **Phase 4: done** (2026-11-23). Printable gift cards (13 × 85×55 mm, 2 A4 pages, card 1 has the install QR) at `C:\Users\DJ_Si\Documents\Winterveil-gift-cards.pdf`, plus `Winterveil-QR.png` and the private schedule `Winterveil-gift-codes.md` in the same folder. All are outside the repo and must never be copied in. Codes are not date-locked except c13 (the owner's choice for flexibility).
- **Live site:** https://paartinextdoor.github.io/winterveil/ (repo `paartinextdoor/winterveil`, branch `main`, GitHub Pages from root). Repo-local git email is the GitHub noreply address; keep it that way.
- Build one phase at a time and stop for approval after each.
