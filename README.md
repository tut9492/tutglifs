# GLiFS guide

A zoomable map + dictionary of the **300 [GLiFS](https://www.glifs.art/) by Efdot**,
laid out as a fixed table over New York City and organized into **collections**
(faces, figures, hands, animals, nature, circles, items, symbols, letters) so the
community can start to read and build the glif "language."

> [!IMPORTANT]
> **Unofficial & independent.** Not affiliated with, endorsed by, or connected to
> GLiFS, Efdot, or Transient Labs. **Open source. No wallet connect, ever** — this
> site never asks for a wallet, a signature, or a seed phrase, and the codebase
> ships no wallet libraries.

The GLiFS artwork is © Efdot Studio / Transient Labs and is **not** redistributed
here — `npm run setup` fetches it from the official sources. See [NOTICE](./NOTICE).

---

## What it does

- **See all 300 at once** — a 20×15 table with a constant 3px gap at every zoom.
- **Coupled map** — the NYC basemap pans and zooms together with the grid.
- **Collections** — toggle a collection to highlight its glifs in place; the table
  is sorted by collection so each one reads as a contiguous band (and the misses
  sit at its edges, for easy verification).
- **Hover** — a glif scales up and plays its live animation.

The categorization in [`public/glifs.json`](./public/glifs.json) is a **seed**.
Refining it — and growing the language around it — is the whole point. See
[CONTRIBUTING](./CONTRIBUTING.md).

## Quick start

Requirements: **Node 20+**.

```bash
npm install
npm run setup     # fetches the 300 glifs + logo, builds thumbnails (one time)
npm run dev       # http://localhost:3000
```

`npm run setup` writes git-ignored assets into `public/glifs/`,
`public/glifs-static/`, and `public/glifs-logo.gif`. It is safe to re-run.

```bash
npm run build     # production build (runs setup automatically via prebuild)
npm start         # serve the production build
npm run lint
```

## How it's built

- **`src/components/GlifMap.tsx`** — the whole surface. The glifs are a fixed-pixel
  CSS grid (not map markers), so the 3px gap stays constant at any zoom. Pan/zoom
  gestures accumulate and apply to both the grid and the MapLibre camera **once per
  animation frame**, which keeps the live vector map smooth.
- **`src/data/categories.ts`** — the 9 collections (id, label, color).
- **`public/glifs.json`** — one record per glif: `{ id, src, gif, lng, lat,
  categories, tags }`. The `categories` array is the contribution surface.
- **`scripts/`** — `setup.mjs` (fetch art + build thumbnails), `gen-glifs.mjs`
  (regenerate the grid layout), `apply-categories.mjs` (apply the seeded taxonomy).
- **Basemap** — `public/map/nyc.pmtiles`, an OpenStreetMap extract served via
  [pmtiles](https://github.com/protomaps/PMTiles) + [Protomaps](https://protomaps.com),
  rendered label-free with darkened roads.

### Stack

Next.js 16 (App Router) · React 19 · TypeScript · MapLibre GL JS · Protomaps ·
Tailwind CSS. No backend, no database, no auth — it's a static front-end.

## Contributing

Fixes to the taxonomy, new tags, bug fixes, and UI improvements are all welcome.
Start with [CONTRIBUTING.md](./CONTRIBUTING.md) — the most valuable contribution is
correcting/extending the collections in `public/glifs.json`.

## Security

No wallet connect, no secrets, no backend. To report a vulnerability, see
[SECURITY.md](./SECURITY.md). Please **do not** open a public issue for security
problems.

## License & attribution

Source code is [MIT](./LICENSE). Third-party assets (GLiFS artwork, map data,
fonts) are **not** covered by that license — see [NOTICE](./NOTICE).

Built by [tut](https://x.com/tuteth_) · [@tuteth_](https://x.com/tuteth_)
