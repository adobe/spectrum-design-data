// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Page } from "@playwright/test";
import { resolveCategoryIcon } from "../../src/features/icons/categoryIcons";
import { selectColorPanelSection } from "./colorPanelSection";
import { enableEditMode } from "./editMode";
import { createDefaultSnapshot } from "../../src/features/edit-session/state";
import {
  AUTHORING_RECORD_VERSION,
  AUTHORING_STORAGE_KEY,
} from "../../src/features/edit-session/storage";
import { createStructure } from "../../src/features/structures/model";

const errors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const collected: string[] = [];
  errors.set(page, collected);
  page.on("pageerror", (error) => collected.push(error.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      message.text().startsWith("Category icon configuration:")
    )
      collected.push(message.text());
  });
});
test.afterEach(({ page }) => {
  expect(errors.get(page)).toEqual([]);
});

async function navigate(page: Page, name: string) {
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: new RegExp(`^${name}(?: WIP)?$`) })
    .click();
}
async function icon(page: Page, category: string) {
  await expect(
    page.locator(`[data-category="${category}"]`).first(),
  ).toHaveAttribute(
    "data-category-icon",
    resolveCategoryIcon(category).iconName,
  );
}

for (const width of [1280, 390]) {
  test(`Opacity foundation follows Colors and shows its placeholder at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    await navigate(page, "Foundations");
    const tabs = page
      .locator('[data-component="FoundationsLayout"]')
      .getByRole("tablist", { name: "Foundation sections", exact: true })
      .getByRole("tab");
    await expect(tabs.nth(0)).toHaveAccessibleName("Colors");
    await expect(tabs.nth(1)).toHaveAccessibleName("Opacity");
    await expect(tabs.nth(2)).toHaveAccessibleName("Typography");
    await expect(page.locator('[data-category="opacity"]')).toHaveAttribute(
      "data-category-icon",
      "ViewTransparency",
    );
    await tabs.nth(1).click();
    await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
    await expect(
      page.getByRole("tabpanel", { name: "Opacity", exact: true }),
    ).toHaveText("TBD");
    await tabs.nth(0).click();
    await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true");
  });

  test(`Category workflow icons retain labels and behavior at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    for (const category of [
      "foundations",
      "tokens",
      "platforms",
      "themes",
      "update.bug-fix",
      "update.feature",
      "update.breaking-change",
    ])
      await icon(page, category);
    await navigate(page, "Foundations");
    for (const category of [
      "color",
      "opacity",
      "typography",
      "spacing",
      "size",
      "radius",
      "elevation",
      "motion",
      "view.elements",
      "view.preview",
      "view.analyze",
      "view.code",
    ])
      await icon(page, category);
    await page
      .getByRole("tab", { name: "Spacing", exact: true })
      .press("Space");
    await expect(
      page.getByRole("tab", { name: "Spacing", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    await navigate(page, "Tokens");
    await expect(
      page.getByRole("heading", { name: "Tokens", exact: true }),
    ).toBeVisible();
    for (const category of [
      "color",
      "typography",
      "spacing",
      "size",
      "radius",
      "elevation",
      "motion",
    ])
      await icon(page, category);
    await page
      .getByRole("radio", { name: "Typography", exact: true })
      .press("Space");
    await expect(
      page.getByRole("radio", { name: "Typography", exact: true }),
    ).toBeChecked();
    await page
      .getByRole("radio", { name: "Grid view", exact: true })
      .press("Space");
    await expect(
      page.getByRole("radio", { name: "Grid view", exact: true }),
    ).toBeChecked();
    await navigate(page, "Design");
    for (const category of [
      "styles",
      "structures",
      "design",
      "view.permutations",
      "view.preview",
    ])
      await icon(page, category);
    await page
      .getByRole("tab", { name: "Structures", exact: true })
      .press("Space");
    await expect(
      page.getByRole("tab", { name: "Structures", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("[data-category-icon-error]")).toHaveCount(0);
  });
}

test("Color picker categorical controls keep native icon sizing and labels", async ({
  page,
}) => {
  await enableEditMode(page);
  await page.setViewportSize({ width: 2200, height: 1000 });
  await page.goto("/");
  await navigate(page, "Foundations");
  await page.getByRole("tab", { name: "Colors", exact: true }).click();
  await selectColorPanelSection(page, "Palette");
  await page
    .getByRole("button", { name: /^Edit value of / })
    .first()
    .click();
  for (const category of [
    "color-model.cartesian",
    "color-model.polar",
    "color-view.color-area",
    "color-view.channels",
  ])
    await icon(page, category);
  await page.getByRole("radio", { name: "Channels", exact: true }).click();
  await expect(
    page.getByRole("radio", { name: "Channels", exact: true }),
  ).toBeChecked();
  await expect(
    page.locator('[data-category="color-view.channels"]'),
  ).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator('[data-category="color-view.channels"]')).toHaveCSS(
    "width",
    "20px",
  );
  await page.getByRole("textbox", { name: "Hex", exact: true }).fill("#123456");
  await page.mouse.click(2100, 800);
  await expect(
    page.getByRole("textbox", { name: "Hex", exact: true }),
  ).toHaveCount(0);
  const log = page.getByRole("complementary", {
    name: "Change log",
    exact: true,
  });
  if (!(await log.isVisible()))
    await page.getByRole("button", { name: /^Change log/ }).click();
  await log.getByRole("tab", { name: "Log", exact: true }).click();
  await icon(page, "source.palette-color");
  await expect(log.locator('[data-category="foundations"]')).toHaveAttribute(
    "data-category-icon",
    "Shapes",
  );
});

test("Structure property and alignment categories preserve editing controls", async ({
  page,
}) => {
  const snapshot = createDefaultSnapshot();
  snapshot.structures!.structures.push(
    createStructure(
      "Icon test structure",
      "c0000000-0000-4000-8000-000000000001",
    ),
  );
  await page.addInitScript(
    ({ key, snapshot, version }) => {
      localStorage.setItem(
        key,
        JSON.stringify({
          version,
          working: snapshot,
          saved: snapshot,
          isEditing: true,
          attachments: {},
          savedAttachments: {},
        }),
      );
    },
    { key: AUTHORING_STORAGE_KEY, snapshot, version: AUTHORING_RECORD_VERSION },
  );
  await page.setViewportSize({ width: 1800, height: 1000 });
  await page.goto("/");
  await navigate(page, "Design");
  await page
    .getByRole("tab", { name: "Structures", exact: true })
    .press("Space");
  await page
    .getByRole("row", { name: "Icon test structure", exact: true })
    .click({ position: { x: 4, y: 4 } });
  const settings = page.getByRole("region", {
    name: "Structure settings for Icon test structure",
    exact: true,
  });
  await expect(settings).toBeVisible();
  for (const category of [
    "property.gap",
    "radius",
    "elevation",
    "alignment.left",
    "alignment.center",
    "alignment.right",
    "alignment.top",
    "alignment.middle",
    "alignment.bottom",
  ]) {
    await expect(
      settings.locator(`[data-category="${category}"]`),
    ).toHaveAttribute(
      "data-category-icon",
      resolveCategoryIcon(category).iconName,
    );
  }
  await settings
    .getByRole("radio", { name: "Align center", exact: true })
    .click();
  await expect(
    settings.getByRole("radio", { name: "Align center", exact: true }),
  ).toBeChecked();
  await settings
    .getByRole("button", {
      name: "Use individual corner radius values",
      exact: true,
    })
    .click();
  for (const corner of ["top-left", "top-right", "bottom-right", "bottom-left"])
    await icon(page, `property.radius-${corner}`);
});
