// One-time asset setup for tutglifs.
//
// The GLiFS artwork is © Efdot Studio / Transient Labs and is NOT redistributed
// in this repository. This script pulls the 300 glifs (and the GLiFS wordmark)
// from the official public sources and builds the local thumbnails the app uses.
//
// Run: npm run setup   (safe to re-run; it skips files that already exist)
//
// What it writes (all git-ignored):
//   public/glifs/<1..300>.gif          source art, used on hover
//   public/glifs-static/<1..300>.png   192px first-frame thumbnails (the grid)
//   public/glifs-logo.gif              the GLiFS wordmark (top-left logo)
//
// The NYC basemap (public/map/nyc.pmtiles) is OpenStreetMap-derived open data and
// is committed to the repo, so it is not fetched here.

import { mkdir, access, writeFile, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const GIF_DIR = join(root, "public", "glifs");
const THUMB_DIR = join(root, "public", "glifs-static");
const COUNT = 300;
const THUMB_PX = 192;
const CONCURRENCY = 12;

const GIF_URL = (id) => `https://cdn.transientlabs.xyz/tlx/glifs/glifs/v3/${id}.gif`;
const LOGO_URL = "https://www.glifs.art/nav.gif";

const exists = (p) => access(p, constants.F_OK).then(() => true).catch(() => false);

async function fetchToFile(url, dest) {
  if (await exists(dest)) return "skip";
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buf);
  return "fetched";
}

async function makeThumb(id) {
  const dest = join(THUMB_DIR, `${id}.png`);
  if (await exists(dest)) return "skip";
  const src = join(GIF_DIR, `${id}.gif`);
  const buf = await sharp(src).resize(THUMB_PX, THUMB_PX, { fit: "inside" }).png().toBuffer();
  await writeFile(dest, buf);
  return "made";
}

async function pool(items, worker, concurrency) {
  let i = 0;
  let fetched = 0;
  let made = 0;
  let skipped = 0;
  const run = async () => {
    while (i < items.length) {
      const idx = i++;
      const r = await worker(items[idx]);
      if (r === "fetched") fetched++;
      else if (r === "made") made++;
      else skipped++;
      if ((fetched + made + skipped) % 50 === 0) {
        process.stdout.write(`  …${fetched + made + skipped}/${items.length}\n`);
      }
    }
  };
  await Promise.all(Array.from({ length: concurrency }, run));
  return { fetched, made, skipped };
}

async function main() {
  await mkdir(GIF_DIR, { recursive: true });
  await mkdir(THUMB_DIR, { recursive: true });

  // sanity: glifs.json should list the same ids we fetch
  const ids = Array.from({ length: COUNT }, (_, i) => i + 1);

  console.log(`Fetching ${COUNT} glifs from the official CDN…`);
  const f = await pool(ids, (id) => fetchToFile(GIF_URL(id), join(GIF_DIR, `${id}.gif`)), CONCURRENCY);
  console.log(`  gifs: ${f.fetched} fetched, ${f.skipped} already present`);

  console.log(`Building ${THUMB_PX}px thumbnails…`);
  const t = await pool(ids, makeThumb, CONCURRENCY);
  console.log(`  thumbnails: ${t.made} built, ${t.skipped} already present`);

  console.log("Fetching the GLiFS wordmark logo…");
  const logo = await fetchToFile(LOGO_URL, join(root, "public", "glifs-logo.gif"));
  console.log(`  logo: ${logo}`);

  // keep glifs.json honest
  try {
    const glifs = JSON.parse(await readFile(join(root, "public", "glifs.json"), "utf8"));
    if (glifs.length !== COUNT) {
      console.warn(`  ! glifs.json has ${glifs.length} entries, expected ${COUNT}`);
    }
  } catch {
    console.warn("  ! could not read public/glifs.json");
  }

  console.log("\nDone. Run `npm run dev` and open http://localhost:3000");
}

main().catch((e) => {
  console.error("\nsetup failed:", e.message);
  process.exit(1);
});
