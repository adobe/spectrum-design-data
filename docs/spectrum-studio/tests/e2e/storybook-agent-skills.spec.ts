// Copyright 2026 Adobe. All rights reserved.
import { expect, test } from "@playwright/test";

for (const story of ["all-skills", "color-tab"])
  test(`Agent skills story ${story} passes its checks`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(
      `/iframe.html?id=views-agent-skills--${story}&viewMode=story`,
    );
    await expect(page.locator("#storybook-root")).toHaveAttribute(
      "data-play-complete",
      "true",
    );
    expect(errors).toEqual([]);
  });
