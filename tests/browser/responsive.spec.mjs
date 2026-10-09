import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

// Layout invariants + human-review screenshots; not unapproved pixel baselines.
const pages = [
  ["home", "index.html"],
  ["portfolio", "portfolio.html"],
  ["journal", "journal.html"],
  ["market-radar", "market-radar.html"],
  ["arcade", "arcade.html"],
  ["collectables-shop", "collectables/shop.html"],
  ["collectables-splash", "collectables/index.html"],
  ["case-study", "project-personal-command-centre.html"]
];
const viewports = [
  { name: "small-mobile", width: 320, height: 720 },
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 }
];

for (const [name, url] of pages) {
  test(`${name}: responsive overflow and visual evidence`, async ({ page }, testInfo) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await expect(page.locator("main").first()).toBeVisible();
      await expect(page.locator("body")).toBeVisible();
      await page.evaluate(() => document.fonts?.ready).catch(() => {});
      const dims = await page.evaluate(() => ({
        width: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth
      }));
      expect.soft(
        dims.scrollWidth,
        `${name} @ ${viewport.width}: unexpected horizontal overflow (viewport ${dims.width})`
      ).toBeLessThanOrEqual(dims.width + 12);
      if (viewport.name === "mobile" || viewport.name === "desktop") {
        const dir = join("test-results", "responsive-evidence");
        await mkdir(dir, { recursive: true });
        await page.screenshot({
          path: join(dir, `${name}-${viewport.name}.png`),
          fullPage: true,
          animations: "disabled",
          timeout: 15_000
        });
      }
    }
    // Some third-party feeds may fail offline. Only fatal document errors are blockers.
    const fatal = errors.filter((x) => /SyntaxError|ReferenceError|TypeError/.test(x) && !/fetch|network|undefined.*feed/i.test(x));
    expect.soft(fatal, `${name}: uncaught application errors`).toEqual([]);
  });
}

test("mobile navigation is keyboard-accessible", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("index.html", { waitUntil: "domcontentloaded" });
  const toggle = page.locator("#mobile-nav-toggle");
  await expect(toggle).toBeVisible();
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
});

test("Collectables preview cannot initiate live checkout", async ({ page }) => {
  let createCalls = 0;
  let captureCalls = 0;
  await page.route(/\/functions\/v1\/collectables-(create|capture)-order/, async (route) => {
    if (route.request().url().includes("create")) createCalls++;
    else captureCalls++;
    await route.fulfill({ status: 503, contentType: "application/json", body: '{"error":"store_not_accepting_orders"}' });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("collectables/shop.html", { waitUntil: "domcontentloaded" });
  await page.locator("#cart-open").click();
  await expect(page.locator("#cart-drawer")).toBeVisible();
  // No customer order or PayPal capture is permitted from the public demo page.
  expect(createCalls).toBe(0);
  expect(captureCalls).toBe(0);
});
