// Copyright 2026 Adobe. All rights reserved.
import { expect, test } from "@playwright/test";
import { enableEditMode } from "./editMode";
import { selectMode } from "./modeControl";

test("Opacity panel keeps its accessible region name without a visible heading", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations", exact: true })
    .click();
  await page.getByRole("tab", { name: "Opacity", exact: true }).click();

  const swatches = page.getByRole("region", {
    name: "Opacity swatches",
    exact: true,
  });
  await expect(swatches).toBeVisible();
  await expect(
    swatches.getByText("Opacity swatches", { exact: true }),
  ).toHaveCount(0);
});

test("Opacity swatch ink follows the preview background independently of app appearance", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await enableEditMode(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations", exact: true })
    .click();
  await page.getByRole("tab", { name: "Colors", exact: true }).click();
  const systemSettings = page.getByRole("button", {
    name: "System settings",
    exact: true,
  });
  const colorSettingsBounds = await systemSettings.boundingBox();
  expect(colorSettingsBounds).not.toBeNull();
  const modeSets = page.getByRole("button", { name: "Mode sets", exact: true });
  const colorModeSetsBounds = await modeSets.boundingBox();
  expect(colorModeSetsBounds).not.toBeNull();
  await page.getByRole("tab", { name: "Opacity", exact: true }).click();

  const opacitySettingsBounds = await systemSettings.boundingBox();
  expect(opacitySettingsBounds).not.toBeNull();
  expect(opacitySettingsBounds!.x).toBeCloseTo(colorSettingsBounds!.x, 0);
  expect(opacitySettingsBounds!.width).toBeCloseTo(
    colorSettingsBounds!.width,
    0,
  );
  const modeSetsBounds = await modeSets.boundingBox();
  expect(modeSetsBounds).not.toBeNull();
  expect(opacitySettingsBounds!.y).toBeLessThan(modeSetsBounds!.y);
  expect(modeSetsBounds!.x).toBeCloseTo(opacitySettingsBounds!.x, 0);
  expect(modeSetsBounds!.width).toBeCloseTo(colorModeSetsBounds!.width, 0);

  const compensation = page.getByRole("slider", {
    name: "Polarity compensation (dark modes)",
    exact: true,
  });
  const swatches = page.getByRole("region", { name: "Opacity swatches" });
  await expect(systemSettings).toHaveAttribute("aria-expanded", "false");
  await expect(modeSets).toHaveAttribute("aria-expanded", "false");
  await expect(compensation).not.toBeVisible();
  await expect(swatches).toBeVisible();
  await expect(swatches).toHaveCSS("padding", "16px");
  await systemSettings.click();
  await expect(compensation).toBeVisible();
  const labelBounds = await page
    .getByText("Polarity compensation (dark modes)", { exact: true })
    .boundingBox();
  const sliderBounds = await compensation.boundingBox();
  expect(labelBounds).not.toBeNull();
  expect(sliderBounds).not.toBeNull();
  expect(labelBounds!.y + labelBounds!.height).toBeLessThanOrEqual(
    sliderBounds!.y,
  );
  await systemSettings.click();
  await expect(compensation).not.toBeVisible();
  await expect(
    swatches.getByRole("slider", { name: "100", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Mode sets" })).toBeVisible();
  await expect(
    page.getByRole("slider", { name: "100", exact: true }),
  ).toBeVisible();

  await page.getByRole("radio", { name: "Elements", exact: true }).click();
  const firstSwatch = page
    .locator('[data-component="OpacityElements"] [data-opacity-id]')
    .first();
  await expect(firstSwatch).toHaveAttribute("role", "img");
  const description = await firstSwatch.getAttribute("aria-label");
  const lightBackground = await firstSwatch.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );
  expect(lightBackground).toMatch(/rgba?\(0(?:, | )0(?:, | )0/);
  await expect(firstSwatch).toHaveCSS("background-image", "none");
  await expect(firstSwatch).toHaveCSS("opacity", "0.02");

  await page
    .getByRole("button", { name: "Dark app appearance", exact: true })
    .click();
  await expect(firstSwatch).toHaveCSS("background-color", lightBackground);
  await page
    .getByRole("button", { name: "Dark app appearance", exact: true })
    .click();
  await page.getByRole("button", { name: "Mode sets", exact: true }).click();
  await selectMode(page, "Dark");
  await expect(firstSwatch).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(firstSwatch).toHaveCSS("opacity", "0.02");
  await expect(firstSwatch).toHaveAttribute("aria-label", description!);
  await selectMode(page, "Light");
  await expect(firstSwatch).toHaveCSS("background-color", "rgb(0, 0, 0)");
  await expect(firstSwatch).toHaveAttribute("aria-label", description!);
  await expect(firstSwatch).toHaveCSS("width", "130px");
  await expect(firstSwatch).toHaveCSS("height", "64px");

  await page.getByRole("radio", { name: "Analyze", exact: true }).click();
  await expect(
    page.getByRole("img", { name: "Contrast (WCAG 2)", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: "Opacity percentage", exact: true }),
  ).toBeVisible();

  await page.getByRole("radio", { name: "Code", exact: true }).click();
  await expect(page.locator('[data-code-block="css"]')).toContainText(
    "--opacity-100:",
  );
  expect(errors).toEqual([]);
});

test("Opacity levels support zero, keyboard edits, removal and Undo", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await enableEditMode(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations", exact: true })
    .click();
  await page.getByRole("tab", { name: "Opacity", exact: true }).click();
  await page.getByRole("button", { name: "Add opacity", exact: true }).click();
  const added = page.getByRole("slider", { name: "1800", exact: true });
  await expect(added).toHaveValue("0");
  await page.getByRole("radio", { name: "Elements", exact: true }).click();
  const zero = page.getByRole("img", { name: /^Opacity 1800, 0%/ });
  await expect(zero).toBeVisible();
  await expect(zero).toHaveCSS("height", "64px");
  await expect(zero).toHaveCSS("background-image", "none");
  await expect(zero).toHaveCSS("opacity", "0");
  await expect(zero.locator("svg")).toHaveCount(0);
  await added.press("ArrowRight");
  await expect(added).toHaveValue("0.01");
  await expect(added).toHaveAttribute("aria-valuetext", "1%");
  await added.press("End");
  await expect(added).toHaveValue("1");
  await page
    .getByRole("button", { name: "Remove opacity 1800", exact: true })
    .click();
  await expect(added).toHaveCount(0);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(added).toHaveValue("1");
  expect(errors).toEqual([]);
});
