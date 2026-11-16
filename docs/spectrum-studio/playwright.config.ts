// Copyright 2026 Adobe. All rights reserved.
import { defineConfig } from "@playwright/test";
import {
  boundedBrowserOptions,
  requireBrowserSelection,
} from "./scripts/browserPolicy";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "https://localhost:7437";
const port = new URL(baseURL).port || "7437";
requireBrowserSelection("app");

export default defineConfig({
  testDir: "./tests/e2e",
  testIgnore: ["**/storybook-*.spec.ts"],
  timeout: 30_000,
  ...boundedBrowserOptions,
  use: {
    baseURL,
    ignoreHTTPSErrors: true,
    trace: "retain-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  webServer: {
    command: `pnpm dev --host localhost --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
    ignoreHTTPSErrors: true,
    timeout: 60_000,
    gracefulShutdown: { signal: "SIGTERM", timeout: 1000 },
  },
});
