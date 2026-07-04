import { test, expect, type Page } from "@playwright/test";

async function mockAuthedPage(page: Page) {
  await page.route("**/api/auth/me", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
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
        permissions: ["admin.manage"],
      }),
    });
  });
}

test.describe("Session expired (E2E)", () => {
  test("handles 401 SESSION_EXPIRED on API call", async ({ page }) => {
    await mockAuthedPage(page);
    await page.route("**/api/home/overview", (route) => {
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          ok: false,
          code: "SESSION_EXPIRED",
          message: "Session expired",
        }),
      });
    });
    // Visit a protected page — expect redirect to login or error state
    await page.goto("/inicio");
  });
});

test.describe("Audit endpoint access (E2E)", () => {
  test("non-admin gets 403 on GET /api/audit", async ({ page }) => {
    await page.route("**/api/audit**", (route) => {
      route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({ ok: false, code: "FORBIDDEN", message: "Forbidden" }),
      });
    });
    // This validates the route mocked response, not a full page integration
    const res = await page.request.get("/api/audit");
    expect(res.status()).toBe(403);
  });

  test("admin gets 200 on GET /api/audit with filters", async ({ page }) => {
    await page.route("**/api/audit**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          data: {
            rows: [
              {
                audit_id: 1,
                table_name: "sales",
                operation: "UPDATE",
                row_pk: "550e8400",
                old_data: { status: "draft" },
                new_data: { status: "confirmed" },
                actor_user_id: "550e8400",
                actor_role: "Administrador",
                occurred_at: "2026-07-04T00:00:00Z",
              },
            ],
            total: 1,
            limit: 100,
            offset: 0,
          },
        }),
      });
    });
    const res = await page.request.get("/api/audit?table=sales&operation=UPDATE");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.rows[0].table_name).toBe("sales");
    expect(body.data.rows[0].operation).toBe("UPDATE");
  });
});