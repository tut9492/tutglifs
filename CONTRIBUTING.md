# Contributing to GLiFS guide

Thanks for helping build the glif language. This is a community project — the most
valuable contributions are **corrections and extensions to the taxonomy**.

By contributing you agree your contributions are licensed under the project's
[MIT license](./LICENSE), and you confirm you have the right to submit them.
Please also follow our [Code of Conduct](./CODE_OF_CONDUCT.md).

## Setup

Requirements: **Node 20+**.

```bash
npm install
npm run setup     # fetches the glifs + builds thumbnails (one time, ~1 min)
npm run dev
```

## The most useful contribution: fix the collections

Every glif is assigned a **primary collection** in
[`public/glifs.json`](./public/glifs.json). That seed was a single human's
first-pass read of abstract art — plenty of calls are debatable or wrong.

To verify and fix:

1. Run the app and toggle a collection (e.g. **Faces**). The matching glifs stay
   solid; everything else fades. Because the table is sorted by collection, each
   one is a contiguous band — so wrong calls and misses show up right at the edges.
2. Hover any glif to see its number (`#id`) and its current collection.
3. Edit the glif's entry in `public/glifs.json`:

```jsonc
{
  "id": 42,
  "src": "/glifs-static/42.png",
  "gif": "/glifs/42.gif",
  "lng": -74.0,
  "lat": 40.7,
  "categories": ["hands"],   // <-- change this
  "tags": []                 // <-- optional free-form descriptors
}
```

- `categories[0]` is the **primary** collection (drives sorting + highlight).
  Use exactly one of the ids in [`src/data/categories.ts`](./src/data/categories.ts):
  `faces`, `figures`, `hands`, `animals`, `nature`, `circles`, `items`, `symbols`,
  `letters`.
- `tags` is free-form — add descriptive words to enrich the language.
- Don't change `id`, `src`, `gif`, `lng`, or `lat`.

Proposing a **new collection**? Open an issue first so we can discuss it before
the colors/ids land in `categories.ts`.

## Code contributions

- Keep changes focused; one concern per PR.
- Match the existing style. `npm run lint` and `npm run build` must pass.
- The app is a single client component plus data — no backend. Keep it that way
  unless there's a strong reason.
- **Never** add wallet-connect, analytics that fingerprint users, or anything that
  requests signatures/keys. "No wallet connect, ever" is a promise on the page.

## Pull requests

1. Fork and branch off `main`.
2. Make your change; run `npm run lint` and `npm run build`.
3. Open a PR describing **what** changed and **why**. For taxonomy fixes, list the
   glif `#id`s and the corrected collections.
4. CI runs lint + build on every PR.

## Reporting

- Bugs / ideas → [open an issue](https://github.com/tut9492/tutglifs/issues).
- Security problems → **do not** open a public issue; see [SECURITY.md](./SECURITY.md).
