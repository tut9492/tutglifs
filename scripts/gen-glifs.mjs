// Generates public/glifs.json — one record per glif (1..300).
// v1: lays all 300 out in a deterministic grid over the Manhattan core so the
// whole set is visible when zoomed out. `category` starts null; the taxonomy is
// seeded/refined separately and is the open-source contribution surface.
//
// Run: node scripts/gen-glifs.mjs
import { writeFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const glifDir = join(root, "public", "glifs");
const ids = readdirSync(glifDir)
  .filter((f) => f.endsWith(".gif"))
  .map((f) => parseInt(f, 10))
  .filter((n) => Number.isFinite(n))
  .sort((a, b) => a - b);

// Manhattan-core grid bounds (lng/lat). Tight enough that the full set reads as
// a dense atlas on the island when zoomed out.
const BOUNDS = { minLng: -74.018, maxLng: -73.928, minLat: 40.702, maxLat: 40.804 };

const cols = Math.ceil(Math.sqrt(ids.length));
const rows = Math.ceil(ids.length / cols);

const records = ids.map((id, i) => {
  const col = i % cols;
  const row = Math.floor(i / cols);
  // +0.5 to center each cell; small deterministic jitter so it doesn't look like graph paper.
  const fx = (col + 0.5) / cols;
  const fy = (row + 0.5) / rows;
  const jitter = (n) => (Math.sin(n * 12.9898) * 43758.5453 % 1) * 0.5 - 0.25; // [-0.25,0.25)
  const jx = (jitter(id) / cols);
  const jy = (jitter(id + 100) / rows);
  const lng = BOUNDS.minLng + (fx + jx) * (BOUNDS.maxLng - BOUNDS.minLng);
  const lat = BOUNDS.maxLat - (fy + jy) * (BOUNDS.maxLat - BOUNDS.minLat);
  return {
    id,
    src: `/glifs/${id}.gif`,
    lng: Number(lng.toFixed(6)),
    lat: Number(lat.toFixed(6)),
    category: null, // seeded later — see glifs.json contribution guide
    tags: [],
  };
});

writeFileSync(
  join(root, "public", "glifs.json"),
  JSON.stringify(records, null, 2) + "\n"
);
console.log(`wrote ${records.length} glifs to public/glifs.json (${cols}x${rows} grid)`);
