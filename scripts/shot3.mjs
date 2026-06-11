import { createRequire } from "node:module";
const require = createRequire("/Users/shanemacinnes/ClawMultiAgent/");
const { chromium } = require("playwright");

const browser = await chromium.launch({
  args: ["--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader", "--ignore-gpu-blocklist", "--enable-webgl"],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));

await page.goto("http://localhost:3000", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(3500);
console.log("tiles:", await page.locator(".tg-tile").count());
await page.screenshot({ path: "/tmp/tg-table.png" });

// Filter: Faces
await page.getByRole("button", { name: /Faces/ }).click();
await page.waitForTimeout(600);
await page.screenshot({ path: "/tmp/tg-table-faces.png" });

// Clear, then zoom in with + button a few times
await page.getByRole("button", { name: /clear/ }).click();
await page.waitForTimeout(300);
const plus = page.getByRole("button", { name: "zoom in" });
for (let i = 0; i < 4; i++) { await plus.click(); await page.waitForTimeout(150); }
await page.waitForTimeout(400);
await page.screenshot({ path: "/tmp/tg-table-zoom.png" });

await browser.close();
console.log("console errors:", errors.length);
errors.slice(0, 12).forEach((e) => console.log("  -", e));
