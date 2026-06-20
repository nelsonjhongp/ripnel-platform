import { type FullConfig } from "@playwright/test"

async function globalSetup(_config: FullConfig) {
  // Global setup — authentication is handled by the storageState fixture
  // which is loaded automatically for all tests.
  // To generate a fresh storage state, run:
  //   npx playwright codegen --save-storage=.auth/user.json http://localhost:3000
  //
  // Then manually log in and the session cookie will be saved.

  console.log("global-setup: storageState will be loaded from .auth/user.json")
}

export default globalSetup
