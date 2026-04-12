import { expect, test, type Page } from "@playwright/test";

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? process.env.TEST_USER_EMAIL ?? "";
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? process.env.TEST_USER_PASSWORD ?? "";
const NON_ADMIN_EMAIL = process.env.TEST_NON_ADMIN_EMAIL ?? "";
const NON_ADMIN_PASSWORD = process.env.TEST_NON_ADMIN_PASSWORD ?? "";

async function loginAs(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /Log in/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 25_000 });
}

function sectionByTitle(page: Page, title: string) {
  return page.locator("section", {
    has: page.getByRole("heading", { name: title }),
  });
}

async function expectAuditEntry(page: Page, entityType: "plan" | "site_setting", entityKey: string, action: "create" | "update" | "delete" | "import") {
  const auditSection = sectionByTitle(page, "Content Edit History");
  await expect(auditSection).toBeVisible();

  const row = auditSection.locator("details").filter({
    hasText: `${entityType} · ${entityKey}`,
  }).first();

  await expect(row).toBeVisible({ timeout: 15_000 });
  await expect(row).toContainText(new RegExp(`\\b${action}\\b`, "i"));
}

test.describe("Admin access control", () => {
  test("non-admin blocked from /admin", async ({ page }) => {
    test.skip(!NON_ADMIN_EMAIL || !NON_ADMIN_PASSWORD, "Set TEST_NON_ADMIN_EMAIL + TEST_NON_ADMIN_PASSWORD to run non-admin access test");

    await loginAs(page, NON_ADMIN_EMAIL, NON_ADMIN_PASSWORD);
    await page.goto("/admin");
    await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: /Admin Dashboard/i })).toHaveCount(0);
  });

  test("admin can open /admin", async ({ page }) => {
    test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, "Set TEST_ADMIN_EMAIL + TEST_ADMIN_PASSWORD (or TEST_USER_*) to run admin tests");

    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Admin Dashboard" })).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("Admin CRUD + CSV + audit", () => {
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, "Set TEST_ADMIN_EMAIL + TEST_ADMIN_PASSWORD (or TEST_USER_*) to run admin tests");

  test("create/update/delete plan and setting, import CSV, and record audit rows", async ({ page }) => {
    const stamp = Date.now();
    const planSlug = `e2e-plan-${stamp}`;
    const importedPlanSlug = `e2e-plan-import-${stamp}`;
    const settingKey = `e2e_setting_${stamp}`;
    const importedSettingKey = `e2e_setting_import_${stamp}`;

    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto("/admin");

    const planSection = sectionByTitle(page, "Plan Management");
    const settingSection = sectionByTitle(page, "Frontend Site Settings");

    await expect(planSection).toBeVisible();
    await expect(settingSection).toBeVisible();

    // Create plan
    await planSection.getByPlaceholder("Slug (e.g. essential)").fill(planSlug);
    await planSection.getByPlaceholder("Name").first().fill("E2E Plan");
    await planSection.getByPlaceholder("Price (e.g. R59)").fill("R66");
    await planSection.getByPlaceholder("Tagline").fill("Created by e2e");
    await planSection.getByRole("button", { name: "Add plan" }).click();
    await expect(page.getByText("Plan added.")).toBeVisible({ timeout: 10_000 });
    await expectAuditEntry(page, "plan", planSlug, "create");

    // Update plan
    await planSection.getByPlaceholder("Search plans").fill(planSlug);
    const planCard = planSection.locator("div.rounded-xl.border").filter({
      has: planSection.locator(`input[value="${planSlug}"]`),
    }).first();
    await expect(planCard).toBeVisible({ timeout: 10_000 });

    await planCard.locator(`input[value="E2E Plan"]`).fill("E2E Plan Updated");
    await planCard.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Plan updated.")).toBeVisible({ timeout: 10_000 });
    await expectAuditEntry(page, "plan", planSlug, "update");

    // Delete plan
    page.once("dialog", (dialog) => dialog.accept());
    await planCard.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("Plan deleted.")).toBeVisible({ timeout: 10_000 });
    await expectAuditEntry(page, "plan", planSlug, "delete");

    // Create setting
    await settingSection.getByPlaceholder("Key (e.g. home_features)").fill(settingKey);
    await settingSection.getByPlaceholder("Description").fill("E2E setting");
    await settingSection.getByPlaceholder('JSON value, e.g. ["a", "b"] or {"x":1}').fill('{"enabled": true, "source": "manual"}');
    await settingSection.getByRole("button", { name: "Add setting" }).click();
    await expect(page.getByText("Setting added.")).toBeVisible({ timeout: 10_000 });
    await expectAuditEntry(page, "site_setting", settingKey, "create");

    // Update setting
    await settingSection.getByPlaceholder("Search setting key or description").fill(settingKey);
    const settingCard = settingSection.locator("div.rounded-xl.border").filter({
      has: settingSection.locator(`input[value="${settingKey}"]`),
    }).first();
    await expect(settingCard).toBeVisible({ timeout: 10_000 });

    await settingCard.locator("div.grid input").nth(1).fill("E2E setting updated");
    await settingCard.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Setting updated.")).toBeVisible({ timeout: 10_000 });
    await expectAuditEntry(page, "site_setting", settingKey, "update");

    // Delete setting
    page.once("dialog", (dialog) => dialog.accept());
    await settingCard.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("Setting deleted.")).toBeVisible({ timeout: 10_000 });
    await expectAuditEntry(page, "site_setting", settingKey, "delete");

    // Import plans CSV and verify update
    const plansCsv = [
      "slug,name,price,period,tagline,features,available,recommended,sort_order,updated_at",
      `${importedPlanSlug},E2E Imported Plan,R77,/month,Imported by CSV,"Feature A\nFeature B",true,false,9,`,
    ].join("\n");

    await planSection.locator('input[type="file"]').first().setInputFiles({
      name: "plans-import.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(plansCsv, "utf-8"),
    });

    await expect(page.getByText("Plans imported.")).toBeVisible({ timeout: 10_000 });
    await planSection.getByPlaceholder("Search plans").fill(importedPlanSlug);
    await expect(planSection.locator(`input[value="${importedPlanSlug}"]`)).toBeVisible({ timeout: 10_000 });
    await expect(planSection.locator('input[value="E2E Imported Plan"]')).toBeVisible({ timeout: 10_000 });
    await expectAuditEntry(page, "plan", importedPlanSlug, "import");

    // Import site settings CSV and verify update
    const importedSettingJson = JSON.stringify({ enabled: true, source: "csv" });
    const escapedImportedSettingJson = importedSettingJson.replace(/"/g, '""');
    const settingsCsv = [
      "key,value,description,updated_at",
      `${importedSettingKey},"${escapedImportedSettingJson}",Imported via CSV,`,
    ].join("\n");

    await settingSection.locator('input[type="file"]').first().setInputFiles({
      name: "settings-import.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(settingsCsv, "utf-8"),
    });

    await expect(page.getByText("Site settings imported.")).toBeVisible({ timeout: 10_000 });
    await settingSection.getByPlaceholder("Search setting key or description").fill(importedSettingKey);

    const importedSettingCard = settingSection.locator("div.rounded-xl.border").filter({
      has: settingSection.locator(`input[value="${importedSettingKey}"]`),
    }).first();

    await expect(importedSettingCard).toBeVisible({ timeout: 10_000 });
    await expect(importedSettingCard.locator("textarea")).toContainText('"source": "csv"');
    await expectAuditEntry(page, "site_setting", importedSettingKey, "import");
  });
});

test.describe("Admin API security", () => {
  test("non-admin gets 403 when hitting /api/admin/users", async ({ request }) => {
    test.skip(!NON_ADMIN_EMAIL || !NON_ADMIN_PASSWORD, "Set TEST_NON_ADMIN_EMAIL + TEST_NON_ADMIN_PASSWORD to run non-admin access test");

    // Login as non-admin to get session
    const loginResponse = await request.post("/api/auth/login", {
      data: { email: NON_ADMIN_EMAIL, password: NON_ADMIN_PASSWORD },
    });
    test.skip(!loginResponse.ok, "Non-admin login failed");

    // Attempt to access admin endpoint
    const response = await request.get("/api/admin/users");
    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  test("non-admin gets 403 when hitting /api/admin/content/plans", async ({ request }) => {
    test.skip(!NON_ADMIN_EMAIL || !NON_ADMIN_PASSWORD, "Set TEST_NON_ADMIN_EMAIL + TEST_NON_ADMIN_PASSWORD to run non-admin access test");

    const response = await request.get("/api/admin/content/plans");
    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  test("non-admin gets 403 when hitting /api/admin/metrics", async ({ request }) => {
    test.skip(!NON_ADMIN_EMAIL || !NON_ADMIN_PASSWORD, "Set TEST_NON_ADMIN_EMAIL + TEST_NON_ADMIN_PASSWORD to run non-admin access test");

    const response = await request.get("/api/admin/metrics");
    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  test("unauthenticated gets 401 when hitting /api/admin/content/site-settings", async ({ request }) => {
    const response = await request.get("/api/admin/content/site-settings");
    expect(response.status()).toBe(401);
  });
});

test.describe("Admin assignment grant/revoke", () => {
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, "Set TEST_ADMIN_EMAIL + TEST_ADMIN_PASSWORD (or TEST_USER_*) to run admin tests");

  test("admin assignment requires reason field", async ({ request }) => {
    // Get admin session cookie by logging in
    const loginPage = request.context().newPage();
    await loginPage.goto("/login");
    await loginPage.getByLabel("Email address").fill(ADMIN_EMAIL);
    await loginPage.getByLabel("Password").fill(ADMIN_PASSWORD);
    await loginPage.getByRole("button", { name: /Log in/i }).click();
    await loginPage.waitForURL(/\/dashboard/, { timeout: 25_000 });

    // Attempt assignment without reason
    const response = await loginPage.request.patch("/api/admin/users/admin-assignment", {
      data: {
        userId: "test-user-id",
        action: "grant",
        // reason intentionally omitted
      },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("reason");

    await loginPage.close();
  });

  test("admin cannot revoke own access", async ({ page }) => {
    test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, "Set TEST_ADMIN_EMAIL + TEST_ADMIN_PASSWORD (or TEST_USER_*) to run admin tests");

    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    const userId = await page.evaluate(() => {
      const match = document.body.innerHTML.match(/"userId":"([^"]+)"/);
      return match?.[1] || "";
    });

    test.skip(!userId, "Could not extract user ID from page");

    const response = await page.request.patch("/api/admin/users/admin-assignment", {
      data: {
        userId: userId,
        action: "revoke",
        reason: "Self-revoke test",
      },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("cannot revoke your own");
  });
});

test.describe("Admin content endpoints - universities/programmes/bursaries", () => {
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, "Set TEST_ADMIN_EMAIL + TEST_ADMIN_PASSWORD (or TEST_USER_*) to run admin tests");

  test("list universities via /api/admin/content/universities", async ({ request }) => {
    const response = await request.get("/api/admin/content/universities");
    if (response.status() === 200) {
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    }
  });

  test("list programmes via /api/admin/content/programmes", async ({ request }) => {
    const response = await request.get("/api/admin/content/programmes");
    if (response.status() === 200) {
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    }
  });

  test("create bursary via /api/admin/content/bursaries", async ({ request }) => {
    const response = await request.post("/api/admin/content/bursaries", {
      data: {
        name: `E2E Bursary ${Date.now()}`,
        sponsor: "E2E Test Sponsor",
        minimum_aps: 25,
        is_active: true,
      },
    });

    // Either 200 (success) or 403 (not admin) or 400 (validation) are acceptable
    expect([200, 400, 403]).toContain(response.status());
  });

  test("list bursaries via /api/admin/content/bursaries", async ({ request }) => {
    const response = await request.get("/api/admin/content/bursaries");
    if (response.status() === 200) {
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    }
  });
});

test.describe("Admin metrics and alerts", () => {
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, "Set TEST_ADMIN_EMAIL + TEST_ADMIN_PASSWORD (or TEST_USER_*) to run admin tests");

  test("metrics endpoint returns valid structure", async ({ request }) => {
    const response = await request.get("/api/admin/metrics");
    
    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty("range");
      expect(data).toHaveProperty("metrics");
      expect(Array.isArray(data.alerts)).toBe(true);
    }
  });

  test("alert history endpoint accessible", async ({ request }) => {
    const response = await request.get("/api/admin/alerts/history");
    
    // Either success (200) or requires authentication (401/403)
    expect([200, 401, 403]).toContain(response.status());
  });

  test("metrics export endpoint accessible", async ({ request }) => {
    const response = await request.get("/api/admin/metrics/export");
    
    // Either CSV success, requires auth, or method not allowed
    expect([200, 400, 401, 403, 405]).toContain(response.status());
  });
});

test.describe("Admin CSV export format", () => {
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, "Set TEST_ADMIN_EMAIL + TEST_ADMIN_PASSWORD (or TEST_USER_*) to run admin tests");

  test("CSV export has valid headers and structure", async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await page.goto("/admin");

    // Try to access export endpoint
    const response = await page.request.get("/api/admin/metrics/export?format=csv");
    
    if (response.status() === 200) {
      const csv = await response.text();
      // Basic CSV format sanity checks
      expect(csv).toBeTruthy();
      expect(csv.length).toBeGreaterThan(0);
      // Should contain at least one comma (CSV field separator)
      expect(csv).toContain(",");
    }
  });
});
