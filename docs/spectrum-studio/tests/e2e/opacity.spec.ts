// Copyright 2026 Adobe. All rights reserved.
import { expect, test } from "@playwright/test";
import { enableEditMode } from "./editMode";
import { selectMode } from "./modeControl";

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
  await page.getByRole("tab", { name: "Opacity", exact: true }).click();

  await expect(
    page.getByRole("slider", {
      name: "Polarity compensation (dark modes)",
      exact: true,
    }),
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
