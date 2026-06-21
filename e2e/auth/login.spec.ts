import { test, expect } from "@playwright/test"

test.describe("Login page", () => {
  test("loads the login page at /", async ({ page }) => {
    await page.goto("/")

    await expect(page.locator("h1, h2, h3").filter({ hasText: /inicio de sesión/i }).first()).toBeVisible()

    await expect(page.locator("#username")).toBeVisible()
    await expect(page.locator("#password")).toBeVisible()

    const submitButton = page.getByRole("button", { name: /iniciar sesión/i })
    await expect(submitButton).toBeVisible()
  })

  test("shows required validation on empty submit", async ({ page }) => {
    await page.goto("/")

    const submitButton = page.getByRole("button", { name: /iniciar sesión/i })

    await submitButton.click()

    await expect(page.locator("#username")).toBeVisible()

    const currentUrl = page.url()
    expect(currentUrl).not.toContain("/inicio")
  })

  test("has username field with correct attributes", async ({ page }) => {
    await page.goto("/")

    const usernameInput = page.locator("#username")
    await expect(usernameInput).toHaveAttribute("name", "username")
    await expect(usernameInput).toHaveAttribute("required", "")
    await expect(usernameInput).toHaveAttribute("autocomplete", "username")
  })

  test("has password field with correct attributes", async ({ page }) => {
    await page.goto("/")

    const passwordInput = page.locator("#password")
    await expect(passwordInput).toHaveAttribute("name", "password")
    await expect(passwordInput).toHaveAttribute("required", "")
    await expect(passwordInput).toHaveAttribute("autocomplete", "current-password")
    await expect(passwordInput).toHaveAttribute("type", "password")
  })

  test("shows a password visibility toggle", async ({ page }) => {
    await page.goto("/")

    const toggle = page.getByRole("button", { name: /mostrar contraseña/i })
    await expect(toggle).toBeVisible()

    await toggle.click()

    const passwordInput = page.locator("#password")
    await expect(passwordInput).toHaveAttribute("type", "text")

    const hideToggle = page.getByRole("button", { name: /ocultar contraseña/i })
    await expect(hideToggle).toBeVisible()
  })
})
