import { test, expect } from "@playwright/test";

/**
 * Auth tests use a fixed test account.
 * Set TEST_USER_EMAIL and TEST_USER_PASSWORD env vars to run against a real Supabase project.
 * When those vars are absent the tests are skipped so CI doesn't fail without credentials.
 */
const TEST_EMAIL = process.env.TEST_USER_EMAIL ?? "";
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD ?? "";

test.describe("Login flow", () => {
  test.skip(!TEST_EMAIL, "Set TEST_USER_EMAIL + TEST_USER_PASSWORD to run auth tests");

  test("login with valid credentials reaches dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email address").fill(TEST_EMAIL);
    await page.getByLabel("Password").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /Log in/i }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 20_000 });
    await expect(page.getByText(/Good Morning|Good Afternoon|Good Evening/i)).toBeVisible();
  });

  test("login with wrong password shows error", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email address").fill(TEST_EMAIL);
    await page.getByLabel("Password").fill("wrong-password-123");
    await page.getByRole("button", { name: /Log in/i }).click();
    await expect(page.getByText(/Incorrect|invalid/i)).toBeVisible({ timeout: 10_000 });
  });

  test("unauthenticated visit to /dashboard redirects to /login", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL(/\/login/, { timeout: 10_000 });
  });
});

test.describe("Protected routes redirect to login", () => {
  for (const path of ["/dashboard", "/profile", "/tracker", "/bursaries", "/vault"]) {
    test(`${path} redirects when not logged in`, async ({ page }) => {
      await page.goto(path);
      await page.waitForURL(/\/login/, { timeout: 10_000 });
    });
  }
});
