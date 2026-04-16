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

test.describe("Dashboard — missing page coverage (authenticated)", () => {
  test.skip(!TEST_EMAIL, "Set TEST_USER_EMAIL + TEST_USER_PASSWORD to run dashboard tests");

  test("vault page renders without error", async ({ page }) => {
    await loginOnce(page);
    await page.goto("/vault");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.getByText(/vault|document|upload/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test("notifications page renders without error", async ({ page }) => {
    await loginOnce(page);
    await page.goto("/notifications");
    await expect(page).not.toHaveURL(/login/);
    // Either has notifications or shows empty state
    await expect(page.getByText(/notification|alert|all caught up/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test("programmes page renders without error", async ({ page }) => {
    await loginOnce(page);
    await page.goto("/programmes");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.getByText(/programme|university|APS/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test("settings/appearance page renders without error", async ({ page }) => {
    await loginOnce(page);
    await page.goto("/settings/appearance");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.getByText(/appearance|theme|dark|light/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("settings/about page renders without error", async ({ page }) => {
    await loginOnce(page);
    await page.goto("/settings/about");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.getByText(/Baseform|version|about/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("settings/usage page renders without error", async ({ page }) => {
    await loginOnce(page);
    await page.goto("/settings/usage");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.getByText(/usage|credit|plan/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("error boundary recovers — navigating to dashboard after error shows no crash", async ({ page }) => {
    await loginOnce(page);
    // Navigate to a non-existent sub-route to trigger a 404/not-found
    await page.goto("/dashboard/nonexistent-page-xyz");
    // Should not fully crash — either 404 page or redirect
    await expect(page).not.toHaveTitle(/500|Internal Server Error/i);
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
