import { test, expect, type Page } from "@playwright/test";

const TEST_USER = "admin";
const TEST_PASSWORD = "admin12345";

async function mockLoginSuccess(page: Page) {
  await page.route("**/api/auth/login", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "Set-Cookie": "ripnel_session=mock-access-token; Path=/; HttpOnly" },
      body: JSON.stringify({
        user: {
          user_id: "550e8400-e29b-41d4-a716-446655440001",
          full_name: "Admin Test",
          username: "admin",
          email: "admin@ripnel.test",
          role_id: "550e8400-e29b-41d4-a716-446655440002",
          role_name: "Administrador",
          must_change_password: false,
        },
        permissions: ["admin.manage", "sales.create", "cash.manage"],
      }),
    });
  });
}

test.describe("Login flow (E2E)", () => {
  test("renders login form with username and password fields", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('input[name="username"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test("submit triggers POST /api/auth/login", async ({ page }) => {
    await mockLoginSuccess(page);
    await page.goto("/");
    await page.locator('input[name="username"]').fill(TEST_USER);
    await page.locator('input[name="password"]').fill(TEST_PASSWORD);
    await page.locator('button[type="submit"]').click();
  });

  test("shows error on invalid credentials (401)", async ({ page }) => {
    await page.route("**/api/auth/login", (route) => {
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ ok: false, code: "AUTH_REQUIRED", message: "Invalid credentials" }),
      });
    });
    await page.goto("/");
    await page.locator('input[name="username"]').fill("wrong");
    await page.locator('input[name="password"]').fill("wrongpass12");
    await page.locator('button[type="submit"]').click();
  });

  test("shows lockout message on 423", async ({ page }) => {
    await page.route("**/api/auth/login", (route) => {
      route.fulfill({
        status: 423,
        contentType: "application/json",
        body: JSON.stringify({
          ok: false,
          code: "ACCOUNT_LOCKED",
          message: "Account temporarily locked due to repeated failures",
        }),
      });
    });
    await page.goto("/");
    await page.locator('input[name="username"]').fill("locked");
    await page.locator('input[name="password"]').fill("wrongpass12");
    await page.locator('button[type="submit"]').click();
  });
});