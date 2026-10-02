# Lineup Studio

3D football lineup maker. Add your squad, drag players onto a 3D stadium pitch, and export the lineup as a poster PNG.

![stack](https://img.shields.io/badge/three.js-0.169-000?logo=three.js) ![vite](https://img.shields.io/badge/vite-5-646cff?logo=vite&logoColor=white)

## Features

- 3D stadium (procedural pitch, goals, tiered stands, crowd, floodlights) with orbit, zoom and auto-fit
- Formations: `4-1`, `3-2`, `3-1-1`, `2-2-1` — always 1 goalkeeper + 5 outfield
- Two independent teams (home / away) with team name and colour
- Drag & drop from the bench onto a slot, slot to slot, or back to the bench; tap-to-select then tap-to-swap on touch devices
- GK is locked to the GK slot, players can't be dropped on an offside position
- Optional player photo, compressed in the browser before storing
- Automatic lineup filler that picks players by position
- Lineup persists in `localStorage`, and on a shared board so everyone with the link sees the same XI
- Shared board is view-only until a visitor enters the editor PIN
- Export the lineup as a 1240×1660 poster PNG
- English / Arabic switcher: the whole UI, the exported poster and the `<html dir>` all follow the chosen language

## Language

Arabic and English ship in `src/i18n.js` as two plain dictionaries.

- Static text in `index.html` carries `data-i18n` (plus `-placeholder`, `-title`, `-aria-label`) and is rewritten by `applyDom()`.
- Text built in JavaScript goes through `t('key')`; pass `{ name }` style vars to fill `{name}` placeholders.
- Plural strings are stored with a plural suffix (`toast.need_one`, `toast.need_other`, and the Arabic `_two` / `_few` / `_many` forms). Pass `{ count }` and the right form is chosen with `Intl.PluralRules`, falling back to `_other`.
- Position names come from `positionLabel(id)` (`pos.GK` → "Goalkeeper" / "حارس مرمى") and formation descriptions from `formationBlurb(id)`.
- The choice is saved in `localStorage` under `lineup-studio-lang`; with nothing stored the browser's language list decides.
- `isRtl()` drives the mirrored layout in `styles.css`. The document direction alone flips the flex row (a `row-reverse` override would undo it), so only the sidebar's border/shadow/transition and the toolbar corner are mirrored by hand.

Adding a language means adding an entry to `LANGS` and a dictionary with the same keys.

## Run it locally

Requires [Node.js](https://nodejs.org) 18 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:5173/ — the dev server listens on your local network too, so you can open it on a phone (`--host` is already enabled).

### Other commands

```bash
npm run build    # production build into dist/
npm run preview  # serve the production build on http://localhost:4173/
```

> The app needs WebGL. If WebGL is unavailable it shows a message instead of the pitch; adding players and exporting a poster still work.

## The shared board

Everyone who opens the site sees the same lineup. Reads are open to all; changing anything requires the editor PIN, which is checked by the backend — it is never sent anywhere except as a header to the Worker that verifies it.

- The board is polled every 8 seconds while the tab is visible, so other people's edits appear without a refresh.
- Edits are debounced and sent with the revision they were based on. If someone else saved in the meantime you are told rather than silently overwriting them.
- The PIN is kept in `sessionStorage`, so it lasts for the tab and not beyond it.

To run without a shared board (purely local, edits always allowed), put this in `.env.local`:

```
VITE_BOARD_ENDPOINT=off
```

Point it somewhere else to use a different backend:

```
VITE_BOARD_ENDPOINT=https://your-worker.workers.dev/board
```

### Backend

The Worker in `worker/` is the only server-side piece. It stores one JSON document in Cloudflare D1 and serves it:

| Route | Auth | Purpose |
| --- | --- | --- |
| `GET /board` | open | current board, its revision and timestamp |
| `PUT /board` | `X-Board-Pin` | save the board, reports `conflict` if the base revision was stale |
| `GET /verify` | `X-Board-Pin` | check the PIN without writing anything |
| `GET /health` | open | liveness |

The PIN is never stored. Only its SHA-256 digest lives in D1, so neither the repository nor the database contains a PIN that could be typed in.

```bash
cd worker
wrangler login
wrangler d1 create lineup-board          # paste the database_id into wrangler.toml
wrangler d1 execute lineup-board --file=schema.sql
node -e "console.log(require('crypto').createHash('sha256').update('YOUR-PIN').digest('hex'))" \
  | xargs -I{} wrangler d1 execute lineup-board --remote \
      --command "INSERT OR REPLACE INTO settings (key,value) VALUES ('pin_hash','{}')"
wrangler deploy
```

Requests are only answered with a CORS header for origins listed in `origins` in `wrangler.toml`, writes are rate limited per IP, and payloads are capped at 400 KB.

## Deploy

### GitHub Pages (automatic)

Every push to `main` builds and publishes the site via `.github/workflows/deploy.yml`.
After the first successful run, enable it in **Settings → Pages → Build and deployment → Source → GitHub Actions**.

The build uses a relative `base` path, so it works on project pages (`https://<user>.github.io/<repo>/`) with no extra configuration.

### Any other static host

`npm run build` produces a fully static `dist/` folder — upload it to Netlify, Vercel, Cloudflare Pages, Render or any web server. No server-side code, no environment variables.

## Tech

- [Vite](https://vitejs.dev) + vanilla JS modules (no framework)
- [three.js](https://threejs.org) with `OrbitControls`
- Plain CSS, no UI library
- State in a small observable store, persisted to `localStorage` under `lineup-studio-v1`

## Project layout

```
src/
  main.js        app wiring: drag/drop handlers, toolbar, keyboard, debug hook
  data.js        pitch dimensions, positions, formations
  store.js       state, persistence, lineup rules (place/swap/autoFill)
  sync.js        shared board: polling, debounced saves, PIN unlock, conflicts
  stadium.js     three.js scene, stands, crowd, camera auto-fit
  pitch.js       slot DOM projected from 3D anchors every frame
  drag.js        pointer-based drag controller (mouse + touch)
  bench.js       substitute bench
  sidebar.js     squad list, tabs, add-player form
  cards.js       shared card markup
  exportPng.js   poster export
  i18n.js        en/ar dictionaries, t(), language state, RTL helpers
  util.js        helpers and toasts
worker/
  src/index.js   board API: read, save, PIN check, CORS, rate limiting
  schema.sql     D1 tables (board document + PIN digest)
  wrangler.toml  worker name, allowed origins, D1 binding
```