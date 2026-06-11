// ⚠️ LEGACY — DO NOT RUN. This was the original bootstrap that generated
// public/glifs.json from scratch. Running it now would OVERWRITE the curated
// taxonomy with an obsolete schema (`category: null`, no `categories[]`) and
// fail scripts/validate-glifs.mjs. Kept for historical reference only.
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
  // Even grid, centered in each cell. No jitter — clean rows/columns.
  const fx = (col + 0.5) / cols;
  const fy = (row + 0.5) / rows;
  const lng = BOUNDS.minLng + fx * (BOUNDS.maxLng - BOUNDS.minLng);
  const lat = BOUNDS.maxLat - fy * (BOUNDS.maxLat - BOUNDS.minLat);
  return {
    id,
    src: `/glifs-static/${id}.png`, // static first-frame thumbnail (smooth render)
    gif: `/glifs/${id}.gif`,
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
