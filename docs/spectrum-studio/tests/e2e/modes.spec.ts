// Copyright 2026 Adobe. All rights reserved.
import { expect, test } from "@playwright/test";
import { enableEditMode } from "./editMode";
import { selectMode } from "./modeControl";

// Edit mode plus the default mode sets and top bar links need this width before the top bar collapses into the Modes picker.
test.use({ viewport: { width: 2200, height: 900 } });

test("Foundations displays active mode values even when parameters are adaptive", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem(
      "leonardo:v1:modes/adaptive-claims",
      JSON.stringify({
        schemaVersion: 1,
        data: {
          "color.backgroundLightness": "mode-set-color-scheme",
          "color.contrastMultiplier": "mode-set-contrast",
        },
      }),
    );
  });
  await page.setViewportSize({ width: 1100, height: 850 });
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations" })
    .dispatchEvent("click");
  await page.getByRole("tab", { name: "Colors" }).dispatchEvent("click");
  const panel = page.getByRole("tabpanel", { name: "Colors" }).first();
  const lightness = panel
    .getByText("Background lightness", { exact: true })
    .locator("../..");
  const contrast = panel
    .getByText("Overall contrast", { exact: true })
    .locator("../..");
  await expect(lightness).toContainText("100%");
  await expect(
    panel.getByRole("slider", { name: "Background lightness" }),
  ).toHaveCount(0);
  await selectMode(page, "Dark");
  await expect(lightness).toContainText("0%");
  await selectMode(page, "High");
  await expect(contrast).toContainText("200%");
  expect(errors).toEqual([]);
});

test("Top Nav mode selection stores an authored lightness override and restores universal default", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await enableEditMode(page);
  await page.setViewportSize({ width: 1100, height: 850 });
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations" })
    .dispatchEvent("click");
  await page.getByRole("tab", { name: "Colors" }).dispatchEvent("click");
  const lightness = page.getByRole("slider", { name: "Background lightness" });
  await expect(lightness).toHaveValue("100");
  const picker = page.getByRole("button", { name: /^Modes/ });
  await picker.dispatchEvent("click");
  await page.getByRole("option", { name: "Dark", exact: true }).click();
  await expect(lightness).toHaveValue("0");
  await lightness.fill("30");
  await expect(lightness).toHaveValue("30");
  await page.getByRole("option", { name: "Light", exact: true }).click();
  await expect(lightness).toHaveValue("100");
  await lightness.fill("80");
  await expect(lightness).toHaveValue("80");
  await page.getByRole("option", { name: "Dark", exact: true }).click();
  await expect(lightness).toHaveValue("30");
  await page.reload();
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations" })
    .dispatchEvent("click");
  await page.getByRole("tab", { name: "Colors" }).dispatchEvent("click");
  await expect(
    page.getByRole("slider", { name: "Background lightness" }),
  ).toHaveValue("30");
  expect(errors).toEqual([]);
});

test("mode sets render, edit, persist, and restore after delete", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await enableEditMode(page);
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Modes" })
    .dispatchEvent("click");

  await expect(page.getByRole("heading", { name: "Mode sets" })).toBeVisible();
  const card = page.locator("[data-component=ModeSetCard]").first();
  await expect(
    card.getByRole("heading", { name: "Color scheme" }),
  ).toBeVisible();
  await expect(card).toContainText("React, Web components, iOS, Android");

  await page
    .getByRole("button", { name: "Edit mode set Color scheme" })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", { name: "Edit mode set" }),
  ).toBeVisible();

  await dialog
    .getByRole("textbox", { name: "Mode set name" })
    .fill("Appearance");
  await dialog.getByRole("button", { name: "Remove iOS" }).first().click();
  await dialog.getByRole("button", { name: "Save" }).click();

  await expect(card.getByRole("heading", { name: "Appearance" })).toBeVisible();
  await expect(card).toContainText("React, Web components, Android");

  await page.reload();
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Modes" })
    .dispatchEvent("click");
  await expect(page.getByRole("heading", { name: "Appearance" })).toBeVisible();

  await page
    .getByRole("button", { name: "Delete mode set Appearance" })
    .click();
  await expect(page.getByRole("heading", { name: "Appearance" })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("heading", { name: "Appearance" })).toBeVisible();

  expect(errors).toEqual([]);
});

test("adding a mode set only commits on save", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await enableEditMode(page);
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Modes" })
    .dispatchEvent("click");
  const cards = page.locator("[data-component=ModeSetCard]");
  await expect(
    page.getByRole("heading", { name: "Mode sets", exact: true }),
  ).toBeVisible();
  const initialCount = await cards.count();

  await page.getByRole("button", { name: "Add mode set" }).click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", { name: "New mode set" }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Delete mode set" }),
  ).toHaveCount(0);

  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(cards).toHaveCount(initialCount);

  await page.getByRole("button", { name: "Add mode set" }).click();
  await dialog.getByRole("textbox", { name: "Mode set name" }).fill("Density");
  await expect(cards).toHaveCount(initialCount);
  await dialog.getByRole("button", { name: "Save" }).click();

  const reservedNameError = page.getByRole("alertdialog", {
    name: "Unsupported mode declaration: density.",
    exact: true,
  });
  await expect(reservedNameError).toBeVisible();
  await expect(cards).toHaveCount(initialCount);
  await reservedNameError
    .getByRole("button", { name: "Dismiss", exact: true })
    .click();
  await dialog
    .getByRole("textbox", { name: "Mode set name" })
    .fill("Custom test modes");
  await dialog.getByRole("button", { name: "Save" }).click();

  await expect(cards).toHaveCount(initialCount + 1);
  await expect(
    page.getByRole("heading", { name: "Custom test modes" }),
  ).toBeVisible();

  expect(errors).toEqual([]);
});

test("the color panel edits mode-owned background scales in the active mode", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await enableEditMode(page);
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Modes" })
    .dispatchEvent("click");
  await page
    .getByRole("button", { name: "Edit mode set Color scheme" })
    .dispatchEvent("click");
  await page
    .getByRole("dialog")
    .getByRole("checkbox", { name: "Background scale" })
    .dispatchEvent("click");
  await expect(
    page
      .getByRole("dialog")
      .getByRole("checkbox", { name: "Base color scale" }),
  ).toBeChecked();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save" })
    .dispatchEvent("click");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations" })
    .dispatchEvent("click");
  await page.getByRole("tab", { name: "Colors" }).dispatchEvent("click");

  const basePicker = page.getByRole("button", { name: /Base color scale/ });
  await selectMode(page, "Light");
  const lightScale = await basePicker.textContent();

  // Editing a global while a non-default mode is active records an override on that mode.
  await selectMode(page, "Dark");
  await basePicker.dispatchEvent("click");
  await page
    .getByRole("option", { name: "Indigo", exact: true })
    .dispatchEvent("click");
  await expect(basePicker).toContainText("Indigo");

  // Light keeps the untouched base value.
  await selectMode(page, "Light");
  await expect(basePicker).toHaveText(String(lightScale));

  // The dialog reports the override instead of editing it.
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Modes" })
    .dispatchEvent("click");
  await page
    .getByRole("button", { name: "Edit mode set Color scheme" })
    .dispatchEvent("click");
  const dialog = page.getByRole("dialog");
  const foundationsPicker = dialog.getByRole("button", { name: /Foundations/ });
  await expect(foundationsPicker).toContainText("Color");
  await foundationsPicker.dispatchEvent("click");
  await page
    .getByRole("option", { name: "Typography", exact: true })
    .dispatchEvent("click");
  await expect(foundationsPicker).toContainText("Color, Typography");
  await page.keyboard.press("Escape");

  const darkTable = dialog.getByRole("table", { name: "Dark overrides" });
  await expect(darkTable).toContainText("Background scale");
  await expect(darkTable).toContainText("Indigo");
  await expect(
    dialog.getByRole("table", { name: "Light overrides" }),
  ).toHaveCount(0);
  await expect(
    dialog.getByRole("switch", { name: "Background scale" }),
  ).toHaveCount(0);

  // Removing the override returns the mode to the base value.
  await darkTable
    .getByRole("button", { name: /Remove Background scale override/ })
    .dispatchEvent("click");
  await expect(darkTable).not.toContainText("Background scale");
  await expect(darkTable).toContainText("Background lightness");
  await dialog.getByRole("button", { name: "Save" }).dispatchEvent("click");

  await selectMode(page, "Dark");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations" })
    .dispatchEvent("click");
  await expect(basePicker).toHaveText(String(lightScale));

  expect(errors).toEqual([]);
});

test("a per-mode foundation override changes the resolved background", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await enableEditMode(page);
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations" })
    .dispatchEvent("click");
  await page.getByRole("tab", { name: "Colors" }).dispatchEvent("click");
  await page
    .getByRole("radio", { name: "Elements", exact: true })
    .dispatchEvent("click");

  const copyButton = page.getByRole("button", {
    name: /Copy resolved background color/,
  });
  await selectMode(page, "Light");
  const lightBackground = await copyButton.getAttribute("aria-label");

  // Change a global while Dark is active, which records the override on Dark.
  await selectMode(page, "Dark");
  await page.getByRole("slider", { name: "Background lightness" }).fill("20");
  await expect
    .poll(() => copyButton.getAttribute("aria-label"))
    .not.toBe(lightBackground);

  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Modes" })
    .dispatchEvent("click");
  await expect(
    page
      .locator("[data-component=ModeSetCard]")
      .filter({ hasText: "Color scheme" }),
  ).toContainText("Background lightness: 20%");

  // Light is unaffected by the Dark override.
  await selectMode(page, "Light");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations" })
    .dispatchEvent("click");
  await expect
    .poll(() => copyButton.getAttribute("aria-label"))
    .toBe(lightBackground);

  expect(errors).toEqual([]);
});
