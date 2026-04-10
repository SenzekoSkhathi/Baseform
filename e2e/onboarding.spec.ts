import { test, expect } from "@playwright/test";

test.describe("Onboarding → Reveal (unauthenticated)", () => {
  test("landing page loads and CTA navigates to onboarding", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Baseform")).toBeVisible();
    // The main CTA should link to onboarding
    const cta = page.getByRole("link", { name: /Get started|Calculate|APS/i }).first();
    await expect(cta).toBeVisible();
    await cta.click();
    await page.waitForURL(/\/(onboarding|reveal)/, { timeout: 15_000 });
  });

  test("onboarding step 1 — name validation blocks empty submission", async ({ page }) => {
    await page.goto("/onboarding");
    const continueBtn = page.getByRole("button", { name: /Continue/i });
    await expect(continueBtn).toBeDisabled();

    await page.getByLabel("Your first name").fill("T");
    await expect(continueBtn).toBeDisabled(); // too short

    await page.getByLabel("Your first name").fill("Thabo");
    await page.getByLabel("Your last name").fill("Mokoena");
    // phone still empty — button should remain disabled
    await expect(continueBtn).toBeDisabled();
  });

  test("APS reveal page renders with score and stats", async ({ page }) => {
    // Skip the full flow — navigate directly with known APS
    await page.goto("/reveal?aps=30&name=Thabo+Mokoena");
    await expect(page.getByText("30")).toBeVisible();
    await expect(page.getByText(/Strong|Excellent|Average/i)).toBeVisible();
    // CTA visible
    await expect(page.getByRole("link", { name: /Create.*account|waitlist/i })).toBeVisible();
  });

  test("Grade 11 reveal shows waitlist CTA not signup", async ({ page }) => {
    // Simulate Grade 11 onboarding data in localStorage
    await page.goto("/reveal?aps=28&name=Siya+Ndaba");
    await page.evaluate(() => {
      localStorage.setItem(
        "bf_onboarding",
        JSON.stringify({ gradeYear: "Grade 11", province: "Western Cape" })
      );
    });
    await page.reload();
    // The Grade 11 path shows waitlist CTA
    await expect(page.getByRole("link", { name: /waitlist/i })).toBeVisible({ timeout: 5000 });
  });

  test("waitlist page accepts submission", async ({ page }) => {
    await page.goto("/waitlist?aps=28&name=Siya+Ndaba");
    await page.getByLabel("Email address").fill(`waitlist-test-${Date.now()}@example.com`);
    await page.getByRole("button", { name: /Join the waitlist/i }).click();
    await expect(page.getByText(/on the list|saved/i)).toBeVisible({ timeout: 10_000 });
  });
});
