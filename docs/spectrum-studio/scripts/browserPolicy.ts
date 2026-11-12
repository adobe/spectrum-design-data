// Copyright 2026 Adobe. All rights reserved.
export function requireBrowserSelection(
  expected: "app" | "storybook",
  env = process.env,
) {
  if (env.STUDIO_BROWSER_SCOPE !== expected)
    throw new Error(
      `Select a browser check through pnpm check:focused --profile browser --only browser-<spec>. ${expected === "app" ? "Actual app checks also require explicit user permission and --app-approved." : "Run only after the relevant feature is complete or separately approved."}`,
    );
}

export const boundedBrowserOptions = {
  workers: 1,
  globalTimeout: 120_000,
  retries: 0,
  maxFailures: 1,
};
