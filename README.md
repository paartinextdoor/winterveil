# Winterveil Pokédex

A Christmas-themed regional Pokédex. New Pokémon are unlocked through December with advent gift codes.
It's plain HTML, CSS and JavaScript, with no build step, and it runs on GitHub Pages.

See docs/ARCHITECTURE.md for the architecture, data schema and roadmap.

## Run it on your computer
The app loads JSON files, so it must be served, not double-clicked.

1. Open this folder in VS Code.
2. Install the "Live Server" extension (by Ritwick Dey).
3. Right-click index.html, then choose "Open with Live Server".

## Personalise
- Name in the Home greeting: js/config.js (trainerName)
- Pokémon names, entries, stats: data/pokemon.json
- Research-note hints: data/research-notes.json
- Artwork: drop PNGs into assets/images/pokemon/ (see the README there)
- Colours: css/tokens.css

## Gift codes
Codes are stored as hashes in data/codes.json, so nobody can read them in the public repo.
Keep your own list of the plain codes somewhere private.

- Spaces, dashes, underscores and capital letters don't matter. "snow day 123" works the same as "SNOW-DAY-123".
- Never use a gift's title as its code, and never write a real code anywhere in this project.
- A code can be date-locked with "availableFrom": "2026-12-25".
- To add a new code, open tools/code-hasher.html through Live Server.
- The Christmas message is locked with the Christmas (Harmona) code. To change it, open tools/message-locker.html through Live Server.

## Testing without spoiling anything
Add ?dev to the URL (e.g. http://127.0.0.1:5500/?dev#/achievements).
- **On your laptop (Live Server):** ignores code dates, and shows "Unlock all", "Preview the ending" and "Reset all progress" on the Achievements tab.
- **On the live site:** only shows "Reset all progress". Codes stay date-locked, so nobody can open gifts or the message early.

Progress is saved in each browser separately, so testing on your laptop won't affect his phone.

## Sharing and separate progress
Progress is saved **on each phone/browser separately**. You can play on your own phone and share the link
with friends: nobody's progress affects anyone else's.
Just don't give anyone the codes you haven't given him yet, especially the Christmas code: it also unlocks your Christmas message.

## Publish on GitHub Pages
1. Create a GitHub repository and upload these files (keep the folder structure, including the hidden `.nojekyll` file).
2. Go to Settings > Pages. Set the source to "Deploy from a branch", pick main and / (root), then click Save.
3. After a minute the site is live at https://YOUR-USERNAME.github.io/YOUR-REPO/
4. On his iPhone in Safari, tap Share > Add to Home Screen for the app-like version.

Later edits: just upload the changed files. The app always fetches fresh files when online, so changes show up the next time he opens it.

## Before you give it to him (checklist)
- [x] His name is set in `js/config.js` → `trainerName` (shown in the Home greeting).
- [x] Artwork: the built-in drawn Pokémon are the final look. (Optional: drop PNGs into `assets/images/pokemon/` any time.)
- [ ] Publish to GitHub Pages (above) and open the link on **your** phone first.
- [ ] Test on a real iPhone (yours is fine), in Safari:
  - [ ] Add to Home Screen: the snowflake icon appears, and opening it shows the navy launch screen.
  - [ ] It opens full-screen with no Safari bars, and nothing hides under the notch or home bar.
  - [ ] Typing a code doesn't zoom the page in.
  - [ ] Redeem the Dec 1 code: the gift animation plays and 3 Pokémon appear.
  - [ ] National Dex: search, filters and favorites work.
  - [ ] Achievements → Settings → turn Sound effects on, and hear a chime (ring/silent switch must be on ring).
  - [ ] Turn on Airplane Mode and reopen the app: it still opens and the Winterveil Dex still works.
- [ ] **Reset your test progress** on every device you tested with: open `…/?dev#/achievements` → Reset all progress.
- [ ] Keep `Winterveil-gift-codes.md` (in your Documents) private, and out of the repo.

## Offline
After the first visit the app works without internet: Home, Winterveil Dex, Mystery Gift, Achievements,
and any National Dex pages already viewed. New National Dex pages need a connection.
If you ever replace an artwork PNG with a new version **of the same name**, change `MEDIA = "winterveil-media-v1"`
to `v2` in `sw.js` so phones fetch the new picture.
