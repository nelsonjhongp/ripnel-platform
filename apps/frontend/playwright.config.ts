import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./__tests__",
  timeout: 10000,
  retries: 0,
  use: {
    headless: true,
  },
  projects: [
    {
      name: "unit",
      testMatch: /.*\.test\.ts$/,
      testIgnore: /.*\.e2e\.ts$/,
    },
    {
      name: "e2e",
      testMatch: /.*\.e2e\.ts$/,
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://localhost:3000",
      },
      timeout: 30000,
    },
  ],
})
