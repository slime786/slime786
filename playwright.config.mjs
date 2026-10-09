import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  testMatch: "**/*.spec.mjs",
  timeout: 40_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:4173/slime786/",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    reducedMotion: "reduce"
  },
  webServer: {
    command: "python3 -m http.server 4173 --bind 127.0.0.1 --directory ..",
    url: "http://127.0.0.1:4173/slime786/index.html",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000
  }
});
