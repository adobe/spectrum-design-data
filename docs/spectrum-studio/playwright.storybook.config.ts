// Copyright 2026 Adobe. All rights reserved.
import { defineConfig } from "@playwright/test";
import {
  boundedBrowserOptions,
  requireBrowserSelection,
} from "./scripts/browserPolicy";

const baseURL =
  process.env.PLAYWRIGHT_STORYBOOK_BASE_URL ?? "http://127.0.0.1:6007";
const port = new URL(baseURL).port || "6007";
requireBrowserSelection("storybook");

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: ["**/storybook-*.spec.ts"],
  timeout: 30_000,
  ...boundedBrowserOptions,
  use: {
    baseURL,
    trace: "retain-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  webServer: {
    command: `pnpm exec storybook dev --ci --host 127.0.0.1 --port ${port} --exact-port --disable-telemetry`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 60_000,
    gracefulShutdown: { signal: "SIGTERM", timeout: 1000 },
  },
});
