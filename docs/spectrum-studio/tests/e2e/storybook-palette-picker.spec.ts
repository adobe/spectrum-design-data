// Copyright 2026 Adobe. All rights reserved.
import { expect, test } from "@playwright/test";

test("native palette swatches fill their options and toggle palette links", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(
    "/iframe.html?id=components-palette-swatch-picker--compact-swatches&viewMode=story",
  );
  const palette = page.getByRole("listbox", { name: "Palette colors" });
  const swatch = palette.getByRole("option").first();
  await expect(swatch).toHaveAttribute("aria-selected", "true");
  const dimensions = await swatch.evaluate((option) => {
    const preview = option.querySelector('[role="img"]')!;
    const optionBox = option.getBoundingClientRect();
    const previewBox = preview.getBoundingClientRect();
    return {
      width: optionBox.width,
      height: optionBox.height,
      previewWidth: previewBox.width,
      previewHeight: previewBox.height,
    };
  });
  expect(dimensions.width).toBe(32);
  expect(dimensions.height).toBe(32);
  expect(dimensions.previewWidth).toBe(dimensions.width);
  expect(dimensions.previewHeight).toBe(dimensions.height);
  await expect(swatch.locator('[aria-hidden="true"]')).toHaveCSS(
    "border-top-width",
    "2px",
  );
  await swatch.hover();
  await expect(page.getByRole("tooltip")).toHaveText("Click to unlink");
  await swatch.click();
  await expect(palette.locator('[aria-selected="true"]')).toHaveCount(0);
  await page.mouse.move(0, 0);
  await swatch.hover();
  await expect(page.getByRole("tooltip")).toHaveText("Link to palette color");
  await swatch.click();
  await expect(swatch).toHaveAttribute("aria-selected", "true");
  await palette.getByRole("option").nth(1).click();
  await expect(palette.getByRole("option").nth(1)).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(swatch).toHaveAttribute("aria-selected", "false");
  expect(errors).toEqual([]);
});

test("native palette swatches support keyboard linking and unlinking", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(
    "/iframe.html?id=components-palette-swatch-picker--compact-swatches&viewMode=story",
  );
  const palette = page.getByRole("listbox", { name: "Palette colors" });
  const swatch = palette.getByRole("option").first();
  await swatch.focus();
  await swatch.press("Enter");
  await expect(palette.locator('[aria-selected="true"]')).toHaveCount(0);
  await swatch.press("Enter");
  await expect(swatch).toHaveAttribute("aria-selected", "true");
  await swatch.press("Space");
  await expect(palette.locator('[aria-selected="true"]')).toHaveCount(0);
  await swatch.press("ArrowRight");
  const nextSwatch = palette.getByRole("option").nth(1);
  await expect(nextSwatch).toBeFocused();
  await nextSwatch.press("Enter");
  await expect(nextSwatch).toHaveAttribute("aria-selected", "true");
  await page.keyboard.down("Space");
  await page.keyboard.down("Space");
  await page.keyboard.up("Space");
  await expect(palette.locator('[aria-selected="true"]')).toHaveCount(0);
  expect(errors).toEqual([]);
});
