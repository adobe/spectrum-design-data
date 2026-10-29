// Copyright 2026 Adobe. All rights reserved.
import { expect, test } from "@playwright/test";

test("Typography icon stories render with keyboard interaction and explicit loading states", async ({
  page,
}, info) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const story of [
    "search-and-keyboard",
    "hidden-labels",
    "large-icons",
    "loading",
    "load-error",
    "dark",
    "narrow",
  ]) {
    await page.setViewportSize({
      width: story === "narrow" ? 480 : 1280,
      height: 900,
    });
    await page.goto(
      `/iframe.html?id=views-typography-icon-samples--${story}&viewMode=story`,
    );
    await expect(page.locator("[data-icon-preview]")).toBeVisible();
    if (story === "search-and-keyboard")
      await expect(page.locator('[data-play-complete="true"]')).toHaveCount(1);
    else if (story === "loading")
      await expect(page.getByRole("status")).toContainText(
        "Loading sample icon",
      );
    else if (story === "load-error")
      await expect(page.getByRole("alert")).toContainText("Could not load");
    else
      await expect(page.locator(".typographyElementIcon svg")).toHaveCount(3);
    await page.screenshot({
      path: info.outputPath(`typography-icon-story-${story}.png`),
      animations: "disabled",
    });
    if (story === "narrow") {
      await page
        .locator(".typographyElementIcon")
        .last()
        .scrollIntoViewIfNeeded();
      await page.screenshot({
        path: info.outputPath("typography-icon-story-narrow-icons.png"),
        animations: "disabled",
      });
    }
  }
  expect(errors).toEqual([]);
});
