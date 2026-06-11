// Validates public/glifs.json so a bad taxonomy edit fails CI instead of prod.
// Run: node scripts/validate-glifs.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// Keep in sync with src/data/categories.ts
const VALID = new Set([
  "faces", "figures", "hands", "animals", "nature",
  "circles", "items", "symbols",
]);
const EXPECTED_COUNT = 300;

const errors = [];
let glifs;
try {
  glifs = JSON.parse(readFileSync(join(root, "public", "glifs.json"), "utf8"));
} catch (e) {
  console.error("✗ public/glifs.json is not valid JSON:", e.message);
  process.exit(1);
}

if (!Array.isArray(glifs)) errors.push("top-level value is not an array");
if (glifs.length !== EXPECTED_COUNT) errors.push(`expected ${EXPECTED_COUNT} entries, got ${glifs.length}`);

const seen = new Set();
for (const g of glifs) {
  const tag = `#${g?.id ?? "?"}`;
  if (typeof g.id !== "number") errors.push(`${tag}: id must be a number`);
  if (seen.has(g.id)) errors.push(`${tag}: duplicate id`);
  seen.add(g.id);
  if (g.src !== `/glifs-static/${g.id}.png`) errors.push(`${tag}: unexpected src "${g.src}"`);
  if (g.gif !== `/glifs/${g.id}.gif`) errors.push(`${tag}: unexpected gif "${g.gif}"`);
  if (typeof g.lng !== "number" || typeof g.lat !== "number") errors.push(`${tag}: lng/lat must be numbers`);
  if (!Array.isArray(g.categories)) {
    errors.push(`${tag}: categories must be an array`);
  } else {
    // An empty array is allowed — it's the "bucket" (no home yet).
    for (const c of g.categories) {
      if (!VALID.has(c)) errors.push(`${tag}: unknown collection "${c}" (valid: ${[...VALID].join(", ")})`);
    }
  }
  if (!Array.isArray(g.tags)) errors.push(`${tag}: tags must be an array`);
}

if (errors.length) {
  console.error(`✗ glifs.json invalid — ${errors.length} problem(s):`);
  errors.slice(0, 50).forEach((e) => console.error("  -", e));
  process.exit(1);
}

const unsorted = glifs.filter((g) => Array.isArray(g.categories) && g.categories.length === 0).length;
console.log(`✓ glifs.json valid: ${glifs.length} glifs, all collections known.`);
if (unsorted) console.log(`  note: ${unsorted} glif(s) in the bucket (no collection yet).`);
