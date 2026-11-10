// Copyright 2026 Adobe. All rights reserved.
// Licensed under the Apache License, Version 2.0.

// Tests that need system Chrome skip when it is missing, except in CI, where a skip would hide
// lost coverage and fails instead. Pass the launch error so a failure shows its cause.
export function chromeUnavailable(t, error) {
  if (process.env.CI) return t.fail(`system Chrome failed to launch in CI: ${error ?? "unknown error"}`);
  return t.pass("system Chrome not found; skipped");
}
