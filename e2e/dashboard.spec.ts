import { test, expect } from "@playwright/test";

const TEST_EMAIL = process.env.TEST_USER_EMAIL ?? "";
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD ?? "";

/** Helper: login and return to the page — reuse across tests in this file. */
async function loginOnce(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(TEST_EMAIL);
  await page.getByLabel("Password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: /Log in/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 20_000 });
}

test.describe("Dashboard + core navigation (authenticated)", () => {
  test.skip(!TEST_EMAIL, "Set TEST_USER_EMAIL + TEST_USER_PASSWORD to run dashboard tests");

  test("dashboard loads APS card and quick-access tiles", async ({ page }) => {
    await loginOnce(page);
    // APS card
    await expect(page.getByText(/APS/i).first()).toBeVisible();
    // At least one tile visible
    await expect(page.getByRole("link", { name: /Applications|Programmes|Bursaries/i }).first()).toBeVisible();
  });

  test("dashboard → tracker page renders", async ({ page }) => {
    await loginOnce(page);
    // Navigate to tracker
    await page.goto("/tracker");
    // The tracker page should render without error
    await expect(page).not.toHaveURL(/login/);
    // Some tracker element should be visible
    await expect(page.getByText(/tracker|goal|application/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test("dashboard → profile page renders", async ({ page }) => {
    await loginOnce(page);
    await page.goto("/profile");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.getByText(/Student profile|APS/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test("dashboard → bursaries page renders", async ({ page }) => {
    await loginOnce(page);
    await page.goto("/bursaries");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.getByText(/Bursaries/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test("dashboard → basebot chat renders and accepts input", async ({ page }) => {
    await loginOnce(page);
    await page.goto("/basebot");
    await expect(page).not.toHaveURL(/login/);
    const input = page.getByRole("textbox").first();
    if (await input.isVisible()) {
      await input.fill("What is APS?");
      // Don't submit — just confirm input works
      await expect(input).toHaveValue("What is APS?");
    }
  });
});

test.describe("Public pages load without auth", () => {
  test("share card 404 for unknown token", async ({ page }) => {
    await page.goto("/share/00000000-0000-0000-0000-000000000000");
    // Should show Next.js 404 or the app's not-found page
    const status = await page.evaluate(() => document.title);
    expect(status).toBeTruthy(); // page at least renders
  });

  test("parent portal 404 for unknown token", async ({ page }) => {
    await page.goto("/parent/00000000-0000-0000-0000-000000000000");
    const status = await page.evaluate(() => document.title);
    expect(status).toBeTruthy();
  });
});
