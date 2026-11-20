// Copyright 2026 Adobe. All rights reserved.
import { expect, test } from "@playwright/test";

for (const story of [
  "pages-formulas--libraries",
  "pages-formulas--read-only",
  "pages-formulas--empty-interpolations",
  "pages-rules--types",
  "pages-rules--changed-type",
  "pages-rules--empty-conditions",
  "pages-rules--read-only",
]) {
  test(story, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`/iframe.html?id=${story}&viewMode=story`);
    await expect(page.locator("#storybook-root")).toHaveAttribute(
      "data-play-complete",
      "true",
    );
    expect(errors).toEqual([]);
  });
}
