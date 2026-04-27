import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "apps/web/tests",
  use: {
    baseURL: "http://localhost:3107"
  },
  webServer: {
    command: "pnpm --filter @kdesign/web dev",
    url: "http://localhost:3107",
    reuseExistingServer: true,
    timeout: 120000
  }
});
