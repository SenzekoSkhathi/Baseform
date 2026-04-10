import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "list",

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    // Simulate a mid-range Android phone on slow SA mobile data
    ...devices["Pixel 5"],
    // SA mobile data: ~1.5 Mbps down, 750 kbps up, 100ms RTT
    // Playwright uses Chrome DevTools Protocol throttling
    launchOptions: {
      args: ["--disable-dev-shm-usage"],
    },
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    // Generous timeout — real SA mobile can be slow
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "desktop-chrome",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Automatically start Next.js dev server before running tests
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
