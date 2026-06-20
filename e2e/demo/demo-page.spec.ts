import { test, expect } from "@playwright/test"

test.describe("Demo page", () => {
  test("loads the demo page and renders component sections", async ({ page }) => {
    await page.goto("/demo")

    await expect(page.getByRole("heading", { name: /demo de componentes/i })).toBeVisible()
  })

  test("renders the data table section", async ({ page }) => {
    await page.goto("/demo")

    await expect(page.getByText(/data table/i)).toBeVisible()

    await expect(page.getByPlaceholder(/buscar producto/i)).toBeVisible()
  })

  test("renders the status badges section", async ({ page }) => {
    await page.goto("/demo")

    await expect(page.getByText(/status badges/i)).toBeVisible()
  })

  test("renders the metrics section", async ({ page }) => {
    await page.goto("/demo")

    await expect(page.getByText(/Metrics/i)).toBeVisible()
  })

  test("renders the form inputs section", async ({ page }) => {
    await page.goto("/demo")

    await expect(page.getByText(/form inputs/i)).toBeVisible()
  })

  test("renders the empty state components", async ({ page }) => {
    await page.goto("/demo")

    await expect(page.getByText(/empty & feedback/i)).toBeVisible()
  })

  test("renders the dialogs section", async ({ page }) => {
    await page.goto("/demo")

    await expect(page.getByText(/Dialogs/i)).toBeVisible()
  })

  test("renders the alerts section", async ({ page }) => {
    await page.goto("/demo")

    await expect(page.getByText(/Alerts/i)).toBeVisible()
  })
})
