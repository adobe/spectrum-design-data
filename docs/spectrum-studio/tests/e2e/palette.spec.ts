// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Page } from "@playwright/test";

const pageErrors = new WeakMap<Page, string[]>();
const SHIPPED_PALETTE_COLORS = 6;

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  pageErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("button", { name: /^Change log/ }).click();
});

test.afterEach(async ({ page }) => {
  expect(pageErrors.get(page)).toEqual([]);
});

async function openColorTab(page: Page, tab: "Palette" | "Color scales") {
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations", exact: true })
    .click();
  await page.getByRole("tab", { name: "Colors", exact: true }).click();
  await page.getByRole("tab", { name: tab, exact: true }).click();
}

async function addPaletteColor(page: Page, name: string) {
  await openColorTab(page, "Palette");
  await page
    .getByRole("button", { name: "Add palette color", exact: true })
    .click();
  const field = page
    .getByRole("combobox", { name: "Palette color name" })
    .last();
  await field.fill(name);
  await field.press("Enter");
  await expect(
    page.getByRole("button", {
      name: `Delete palette color ${name}`,
      exact: true,
    }),
  ).toBeVisible();
}

async function openScale(page: Page, scale: string) {
  await page.getByRole("tab", { name: "Color scales", exact: true }).click();
  await page
    .getByRole("tabpanel", { name: "Colors", exact: true })
    .getByRole("button", { name: scale, exact: true })
    .click();
}

test("Palette tab sits before Color scales and ships the product colors", async ({
  page,
}) => {
  await openColorTab(page, "Palette");
  const tabs = await page
    .getByRole("tablist", { name: "Color system controls" })
    .getByRole("tab")
    .allTextContents();
  expect(tabs.slice(0, 2)).toEqual(["Palette", "Color scales"]);
  await expect(
    page.getByRole("button", { name: /^Delete palette color / }),
  ).toHaveCount(SHIPPED_PALETTE_COLORS);
  await expect(
    page.getByRole("button", {
      name: "Delete palette color Illustrator Orange",
      exact: true,
    }),
  ).toBeVisible();
});

test("palette names hide their labels and show guidance only in contextual help", async ({
  page,
}) => {
  await openColorTab(page, "Palette");
  const row = page.locator("[data-palette-source]").first();
  await expect(
    row.getByRole("combobox", { name: "Palette color name" }),
  ).toBeVisible();
  await expect(
    row.getByText("Palette color name", { exact: true }),
  ).toHaveCount(0);
  await expect(
    row.getByText("Type a new name, or select an existing registered term."),
  ).toHaveCount(0);
  const help = row.getByRole("button", { name: /^Help for palette color / });
  const deleteButton = row.getByRole("button", {
    name: /^Delete palette color /,
  });
  expect(
    await help.evaluate((element) => {
      const row = element.closest("[data-palette-source]");
      const buttons = row ? Array.from(row.querySelectorAll("button")) : [];
      const next = buttons[buttons.indexOf(element as HTMLButtonElement) + 1];
      return next?.getAttribute("aria-label");
    }),
  ).toBe(await deleteButton.getAttribute("aria-label"));
  await help.click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByText("Type a new name, or select an existing registered term."),
  ).toBeVisible();
  await expect(dialog.getByRole("heading")).toHaveCount(0);
  await page.keyboard.press("Escape");
});

test("a color scale stop can link to a palette color and follows its changes", async ({
  page,
}) => {
  await addPaletteColor(page, "Brand color");

  await openScale(page, "Red");
  const palette = page.getByRole("listbox", { name: "Palette colors" });
  await expect(palette.getByRole("option")).toHaveCount(
    SHIPPED_PALETTE_COLORS + 1,
  );
  await expect(
    page.getByRole("button", { name: "Unlink", exact: true }),
  ).toHaveCount(0);
  await palette.getByRole("option", { name: "Brand color" }).click();
  await expect(page.getByText("Linked to Brand color")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Unlink", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");

  await openColorTab(page, "Palette");
  await page
    .getByRole("button", { name: /^Help for palette color Brand color/ })
    .click();
  await expect(
    page.getByRole("dialog").getByText(/Used by 1 color scale stop\./),
  ).toBeVisible();
  await page.keyboard.press("Escape");

  // Editing the palette color from the Tokens page updates the stop that references it.
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Tokens", exact: true })
    .click();
  await page
    .getByRole("searchbox", { name: "Search tokens" })
    .fill("brand-color");
  await page
    .getByRole("button", { name: "Open brand-color", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Authored in Palette")).toBeVisible();
  await dialog
    .getByRole("textbox", { name: "Value", exact: true })
    .fill("#123456");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog).toHaveCount(0);

  await openColorTab(page, "Palette");
  await page
    .getByRole("button", { name: /^Help for palette color Brand color/ })
    .click();
  await expect(
    page.getByRole("dialog").getByText(/Used by 1 color scale stop\./),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  expect(
    await page.evaluate(() =>
      localStorage.getItem("leonardo:v1:foundations/color"),
    ),
  ).toBeNull();

  // Delete detaches the stop onto the color's current value.
  await openColorTab(page, "Palette");
  await page
    .getByRole("button", {
      name: "Delete palette color Brand color",
      exact: true,
    })
    .click();
  await openScale(page, "Red");
  await expect(page.getByText("Linked to Brand color")).toHaveCount(0);
  await expect(
    page.getByRole("listbox", { name: "Palette colors" }).getByRole("option"),
  ).toHaveCount(SHIPPED_PALETTE_COLORS);
});

test("palette tokens appear once, in the Palette group, and reject duplicate names", async ({
  page,
}) => {
  await addPaletteColor(page, "Black");
  await openColorTab(page, "Palette");
  await page
    .getByRole("button", { name: "Add palette color", exact: true })
    .click();
  const field = page
    .getByRole("combobox", { name: "Palette color name" })
    .last();
  await field.fill("black");
  await field.press("Enter");
  await expect(page.getByText(/already owned/)).toBeVisible();

  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Tokens", exact: true })
    .click();
  await page.getByRole("searchbox", { name: "Search tokens" }).fill("black");
  await expect(
    page.getByRole("button", { name: "Open black", exact: true }),
  ).toHaveCount(1);
});

test("Foundations color views render with a palette color present", async ({
  page,
}) => {
  await addPaletteColor(page, "White");
  await openColorTab(page, "Color scales");
  await page.getByRole("radio", { name: "Elements", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Color ramps" }),
  ).toBeVisible();
  await expect(page.getByLabel("Surface", { exact: true })).toBeVisible();
  await page.getByRole("radio", { name: "Code", exact: true }).click();
  await expect(page.getByText("--color-palette-white").first()).toBeVisible();
});

test("a surface tint reference blocks scale deletion with a visible explanation", async ({
  page,
}) => {
  await openColorTab(page, "Color scales");
  await page
    .getByRole("button", { name: "Delete scale Red", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Choose another tint source" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("tabpanel", { name: "Colors", exact: true })
      .getByRole("button", { name: "Red", exact: true }),
  ).toBeVisible();
});
