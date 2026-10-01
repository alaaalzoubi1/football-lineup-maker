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
- Lineup persists in `localStorage`
- Export the lineup as a 1240×1660 poster PNG

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
  stadium.js     three.js scene, stands, crowd, camera auto-fit
  pitch.js       slot DOM projected from 3D anchors every frame
  drag.js        pointer-based drag controller (mouse + touch)
  bench.js       substitute bench
  sidebar.js     squad list, tabs, add-player form
  cards.js       shared card markup
  exportPng.js   poster export
  util.js        helpers and toasts
```