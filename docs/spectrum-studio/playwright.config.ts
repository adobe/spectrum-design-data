// Copyright 2026 Adobe. All rights reserved.
import { defineConfig } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "https://localhost:5173";

export default defineConfig({
  testDir: "./tests/e2e",
  testIgnore: ["**/storybook-*.spec.ts"],
  timeout: 30_000,
  use: {
    baseURL,
    ignoreHTTPSErrors: true,
    trace: "retain-on-failure",
  },
  webServer: {
    command: "pnpm dev --host localhost",
    url: baseURL,
    reuseExistingServer: true,
    ignoreHTTPSErrors: true,
  },
});
