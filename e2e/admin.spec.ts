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
