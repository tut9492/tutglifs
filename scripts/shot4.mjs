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
console.log("cells:", await page.locator(".tg-cell").count());
await page.screenshot({ path: "/tmp/tg4-default.png" });

// Click Faces -> bunch
await page.getByRole("button", { name: /Faces/ }).click();
await page.waitForTimeout(900);
const visible = await page.locator('.tg-cell:visible').count();
console.log("visible cells after Faces:", visible);
await page.screenshot({ path: "/tmp/tg4-faces-bunch.png" });

// Hover a glif in the bunch (animate + scale)
const box = await page.locator(".tg-cell:visible").nth(10).boundingBox();
if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await page.waitForTimeout(700);
await page.screenshot({ path: "/tmp/tg4-hover.png" });

await browser.close();
console.log("console errors:", errors.length);
errors.slice(0, 12).forEach((e) => console.log("  -", e));
