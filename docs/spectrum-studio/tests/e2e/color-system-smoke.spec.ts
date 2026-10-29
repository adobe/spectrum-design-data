// Copyright 2026 Adobe. All rights reserved.
import { expect, test } from "@playwright/test";
import { enableEditMode } from "./editMode";
import { selectColorPanelSection } from "./colorPanelSection";

test("Foundations color scale editor hosts the color picker and the color views render", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await enableEditMode(page);
  await page.setViewportSize({ width: 2200, height: 900 });
  await page.goto("/");

  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations", exact: true })
    .dispatchEvent("click");
  await page
    .getByRole("tab", { name: "Colors", exact: true })
    .dispatchEvent("click");
  await selectColorPanelSection(page, "Color scales");
  await page
    .getByRole("tabpanel", { name: "Colors", exact: true })
    .getByRole("button", { name: "Red", exact: true })
    .click();

  await expect(page.getByRole("button", { name: /Color space/ })).toBeVisible();
  await expect(page.locator(".colorPickerCanvas").first()).toBeVisible();
  const hex = page.getByRole("textbox", { name: "Hex", exact: true });
  await expect(hex).toBeVisible();
  await hex.fill("#336699");
  await expect(hex).toHaveValue("#336699");
  await page.getByRole("radio", { name: "Channels", exact: true }).click();
  await expect(
    page.getByRole("slider", { name: "Lightness", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("slider", { name: "Lightness", exact: true })
    .press("ArrowRight");
  await expect(hex).not.toHaveValue("#336699");
  await page.keyboard.press("Escape");

  for (const view of ["Elements", "Preview", "Analyze", "Code"]) {
    await page
      .getByRole("radio", { name: view, exact: true })
      .dispatchEvent("click");
    await expect(
      page.locator(`[data-view="${view.toLowerCase()}"]`),
    ).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test("palette color Hex edits update the shared value and remain after reopening", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await enableEditMode(page);
  await page.setViewportSize({ width: 2200, height: 900 });
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations", exact: true })
    .dispatchEvent("click");
  await page
    .getByRole("tab", { name: "Colors", exact: true })
    .dispatchEvent("click");
  await selectColorPanelSection(page, "Palette");
  const colorButton = page
    .getByRole("button", { name: /^Edit value of / })
    .first();
  await colorButton.click();
  const hex = page.getByRole("textbox", { name: "Hex", exact: true });
  await hex.fill("#123456");
  await expect(hex).toBeFocused();
  await expect(hex).toHaveValue("#123456");
  await page.mouse.click(2100, 800);
  await expect(hex).toHaveCount(0);
  await colorButton.click();
  await expect(hex).toHaveValue("#123456");
  await page.mouse.click(2100, 800);
  await expect(hex).toHaveCount(0);
  await page
    .getByRole("radio", { name: "Elements", exact: true })
    .dispatchEvent("click");
  await expect(
    page.getByRole("heading", { name: "Color ramps" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("shadow color picker synchronizes Hex edits with RGB fields", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await enableEditMode(page);
  await page.setViewportSize({ width: 2200, height: 900 });
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations", exact: true })
    .dispatchEvent("click");
  await page
    .getByRole("tab", { name: "Elevation", exact: true })
    .dispatchEvent("click");
  await page.getByRole("button", { name: "Mode sets", exact: true }).click();
  await page
    .getByRole("button", { name: "Edit Dark for elevation", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Edit shadow color", exact: true })
    .click();
  const hex = page.getByRole("textbox", { name: "Hex", exact: true });
  await hex.fill("#336699");
  const red = page.getByRole("textbox", { name: /^Red/ });
  await expect(red).toHaveValue("51");
  await red.fill("255");
  await red.press("Tab");
  await expect(hex).toHaveValue("#ff6699");
  await page.mouse.click(2100, 800);
  await expect(hex).toHaveCount(0);
  await page
    .getByRole("button", { name: "Edit shadow color", exact: true })
    .click();
  await expect(hex).toHaveValue("#ff6699");
  expect(errors).toEqual([]);
});
