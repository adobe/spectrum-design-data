// Copyright 2026 Adobe. All rights reserved.
import { defineConfig } from "@playwright/test";

const baseURL =
  process.env.PLAYWRIGHT_STORYBOOK_BASE_URL ?? "http://127.0.0.1:6007";
const port = new URL(baseURL).port || "6007";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: ["**/storybook-*.spec.ts"],
  timeout: 30_000,
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `pnpm exec storybook dev --ci --host 127.0.0.1 --port ${port} --disable-telemetry`,
    url: baseURL,
    reuseExistingServer: true,
  },
});
