import { createRequire } from "node:module";
// Borrow playwright from a sibling repo so tutglifs stays dependency-light.
const require = createRequire("/Users/shanemacinnes/ClawMultiAgent/");
const { chromium } = require("playwright");

const url = process.argv[2] || "http://localhost:3000";
const out = process.argv[3] || "/tmp/tutglifs-shot.png";

const browser = await chromium.launch({
  args: [
    "--enable-unsafe-swiftshader",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--ignore-gpu-blocklist",
    "--enable-webgl",
  ],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));

await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
// Give MapLibre time to fetch tiles + drop markers
await page.waitForTimeout(4000);
const markerCount = await page.locator(".glif-marker").count();
await page.screenshot({ path: out });
await browser.close();

console.log("markers:", markerCount);
console.log("console errors:", errors.length);
errors.slice(0, 15).forEach((e) => console.log("  -", e));
