// Copyright 2026 Adobe. All rights reserved.
import { expect, test } from "@playwright/test";

test("Opacity editor stories cover appearance, overrides, boundaries, and keyboard focus", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const story of [
    "light-appearance",
    "dark-appearance",
    "dark-mode-in-light-appearance",
    "manual-override",
    "stale-override",
    "endpoints",
    "keyboard-editing",
    "narrow",
  ]) {
    await page.setViewportSize({
      width: story === "narrow" ? 420 : 1280,
      height: 900,
    });
    await page.goto(
      `/iframe.html?id=panels-opacity-foundation--${story}&viewMode=story`,
    );
    await expect(
      page.getByRole("button", { name: "Add opacity", exact: true }),
    ).toBeVisible();
    if (
      [
        "dark-mode-in-light-appearance",
        "manual-override",
        "keyboard-editing",
      ].includes(story)
    )
      await expect(page.locator('[data-play-complete="true"]')).toHaveCount(1);
    if (story === "stale-override")
      await expect(
        page.getByText("Out of date", { exact: true }),
      ).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test("Opacity Elements keep full swatch geometry and valid transparent data", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const story of [
    "light-appearance",
    "dark-appearance",
    "transparent-and-opaque",
    "manual-override",
    "narrow",
  ]) {
    await page.goto(
      `/iframe.html?id=views-opacity-elements--${story}&viewMode=story`,
    );
    const root = page.locator('[data-component="OpacityElements"]');
    await expect(root).toBeVisible();
    const swatch = root.getByRole("img").first();
    await expect(swatch).toHaveCSS("width", "130px");
    await expect(swatch).toHaveCSS("height", "64px");
    if (story === "transparent-and-opaque") {
      await expect(
        root.getByRole("img", { name: /^Opacity 100, 0%/ }),
      ).toBeVisible();
      await expect(page.locator('[data-play-complete="true"]')).toHaveCount(1);
    }
    if (story === "manual-override")
      await expect(
        root.getByRole("img", { name: /^Opacity 800, 31%/ }),
      ).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test("Opacity analysis charts share identities, percentage units, and fixed measurement backgrounds", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const story of [
    "light-mode",
    "dark-mode",
    "dark-appearance",
    "manual-override",
    "narrow",
  ]) {
    await page.goto(
      `/iframe.html?id=views-opacity-analysis--${story}&viewMode=story`,
    );
    const strip = page.getByRole("list", { name: "Opacity step progression" });
    const contrast = page.getByRole("img", {
      name: "Contrast (WCAG 2)",
      exact: true,
    });
    const percentage = page.getByRole("img", {
      name: "Opacity percentage",
      exact: true,
    });
    await expect(strip.getByRole("listitem")).toHaveCount(17);
    await expect(contrast).toBeVisible();
    await expect(percentage).toBeVisible();
    await expect(percentage).toContainText("100%");
    await expect(percentage).not.toContainText("10000%");
    await expect(strip.getByRole("listitem").first()).toHaveAttribute(
      "aria-label",
      story === "dark-mode" || story === "manual-override"
        ? /against black/
        : /against white/,
    );
    if (story === "manual-override")
      await expect(percentage).toContainText("Manual override");
  }
  expect(errors).toEqual([]);
});
