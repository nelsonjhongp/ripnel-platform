import { defineConfig } from "@playwright/test"

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
    },
  ],
})
