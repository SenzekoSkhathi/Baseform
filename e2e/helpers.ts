import { Page } from "@playwright/test";

/**
 * Fills the 3-step onboarding flow (name → subjects → profile) and lands on the reveal page.
 * Does NOT create an account.
 */
export async function completeOnboarding(page: Page, overrides?: { firstName?: string; province?: string }) {
  const firstName = overrides?.firstName ?? "Thabo";
  const province = overrides?.province ?? "Gauteng";

  await page.goto("/onboarding");

  // Step 1 — Name
  await page.getByLabel("Your first name").fill(firstName);
  await page.getByLabel("Your last name").fill("Mokoena");
  await page.getByLabel("Phone number").fill("0821234567");
  // WhatsApp: same as phone
  await page.getByRole("button", { name: /Same as phone/i }).click();
  await page.getByRole("button", { name: /Continue/i }).click();

  // Step 2 — Subjects (fill 6 subjects to get a valid APS)
  const subjectInputs = page.locator("input[placeholder*='%'], input[type='number']").first();
  // The subject step likely has subject name + mark pairs
  // Use the continue button after subjects are visible
  await page.waitForSelector("text=Subjects", { timeout: 5000 }).catch(() => {});
  // Find all mark inputs and fill with 70 (= 6 APS points each)
  const markInputs = page.locator("input[type='number']");
  const count = await markInputs.count();
  for (let i = 0; i < Math.min(count, 7); i++) {
    await markInputs.nth(i).fill("70");
  }
  await page.getByRole("button", { name: /Continue/i }).click();

  // Step 3 — Profile
  await page.waitForSelector("text=Province", { timeout: 5000 }).catch(() => {});
  const provinceSelect = page.locator("select").first();
  if (await provinceSelect.isVisible()) {
    await provinceSelect.selectOption(province);
  }
  await page.getByRole("button", { name: /Continue/i }).click();

  // Should land on /reveal
  await page.waitForURL(/\/reveal/, { timeout: 15_000 });
}

/** Signs up a new test account. Assumes onboarding already ran (localStorage set). */
export async function signupAccount(
  page: Page,
  email: string,
  password: string
) {
  await page.goto("/signup");

  // Step 1 — Email + password
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("button", { name: /Continue/i }).click();

  // Step 2 — Guardian
  await page.getByLabel("Full name").fill("Nomsa Mokoena");
  // Relationship defaults to Parent — leave it
  await page.getByLabel("Phone number").fill("0831234567");
  // WhatsApp same toggle
  await page.getByRole("button", { name: /Same as phone/i }).click();
  await page.getByRole("button", { name: /Create account/i }).click();

  // Should end up on /plans or /dashboard
  await page.waitForURL(/\/(plans|dashboard)/, { timeout: 30_000 });
}

/** Logs in with existing credentials. */
export async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /Log in/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 20_000 });
}
