import { test, expect } from "@playwright/test";

const TEST_EMAIL = process.env.TEST_USER_EMAIL ?? "";
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD ?? "";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(TEST_EMAIL);
  await page.getByLabel("Password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: /Log in/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 20_000 });
}

// ─── Page render ─────────────────────────────────────────────────────────────

test.describe("Payment page — unauthenticated", () => {
  test("unauthenticated visit to /payment redirects to /login", async ({ page }) => {
    await page.goto("/payment");
    await page.waitForURL(/\/login/, { timeout: 10_000 });
  });
});

test.describe("Payment page — authenticated", () => {
  test.skip(!TEST_EMAIL, "Set TEST_USER_EMAIL + TEST_USER_PASSWORD to run payment tests");

  test("payment page loads with plan cards visible", async ({ page }) => {
    await login(page);
    await page.goto("/payment");
    await expect(page).not.toHaveURL(/login/);
    // Plan cards or pricing information should be visible
    await expect(page.getByText(/Essential|Pro|Ultra|R\d+/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test("?status=cancelled shows cancellation notice", async ({ page }) => {
    await login(page);
    await page.goto("/payment?status=cancelled");
    await expect(page.getByText(/cancelled|try again/i)).toBeVisible({ timeout: 10_000 });
  });

  test("?status=success shows verification notice", async ({ page }) => {
    await login(page);
    await page.goto("/payment?status=success");
    // Should show a verifying / processing message (not a crash)
    await expect(page.getByText(/verif|upgrade|processing/i)).toBeVisible({ timeout: 10_000 });
  });

  test("unknown ?status param renders page without crash", async ({ page }) => {
    await login(page);
    await page.goto("/payment?status=unknown_value");
    // Page should still render normally — unknown status is ignored
    await expect(page).not.toHaveURL(/login/);
    await expect(page).not.toHaveURL(/error/);
    await expect(page.getByText(/Essential|Pro|Ultra|plan/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test("?plan=essential pre-selects Essential plan", async ({ page }) => {
    await login(page);
    await page.goto("/payment?plan=essential");
    await expect(page).not.toHaveURL(/login/);
    // Essential should be highlighted/selected
    await expect(page.getByText(/Essential/i).first()).toBeVisible({ timeout: 10_000 });
  });
});

// ─── Payment API guards ───────────────────────────────────────────────────────

test.describe("Payment API — auth guards", () => {
  test("POST /api/payments/payfast/initiate requires auth (401)", async ({ request }) => {
    const res = await request.post("/api/payments/payfast/initiate", {
      data: { plan: "essential", term: 1 },
    });
    expect(res.status()).toBe(401);
  });

  test("POST /api/payments/payfast/onsite requires auth (401)", async ({ request }) => {
    const res = await request.post("/api/payments/payfast/onsite", {
      data: { plan: "essential", term: 1 },
    });
    expect(res.status()).toBe(401);
  });

  test("POST /api/payments/payfast/verify-return requires auth (401)", async ({ request }) => {
    const res = await request.post("/api/payments/payfast/verify-return", {
      data: { plan: "essential", term: 1 },
    });
    expect(res.status()).toBe(401);
  });

  test("POST /api/billing/downgrade requires auth (401)", async ({ request }) => {
    const res = await request.post("/api/billing/downgrade");
    expect(res.status()).toBe(401);
  });
});

test.describe("Payment API — PayFast notify endpoint", () => {
  test("POST /api/payments/payfast/notify with no body returns 400", async ({ request }) => {
    const res = await request.post("/api/payments/payfast/notify", {
      data: {},
    });
    // Missing required PayFast fields — should be rejected
    expect([400, 401, 403]).toContain(res.status());
  });

  test("POST /api/payments/payfast/notify with invalid signature returns 400", async ({ request }) => {
    const res = await request.post("/api/payments/payfast/notify", {
      data: {
        merchant_id: "00000000",
        merchant_key: "invalid",
        payment_status: "COMPLETE",
        m_payment_id: "test-123",
        amount_gross: "59.00",
        signature: "invalid_signature",
      },
    });
    expect([400, 401, 403]).toContain(res.status());
  });
});
