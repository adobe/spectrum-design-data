// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Page } from "@playwright/test";
import { createDefaultSnapshot } from "../../src/features/edit-session/state";
import {
  AUTHORING_RECORD_VERSION,
  AUTHORING_STORAGE_KEY,
} from "../../src/features/edit-session/storage";
import { selectColorPanelSection } from "./colorPanelSection";

const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const collected: string[] = [];
  errors.set(page, collected);
  page.on("pageerror", (error) => collected.push(error.message));
  await page.setViewportSize({ width: 1600, height: 1100 });
});
test.afterEach(({ page }) => {
  expect(errors.get(page)).toEqual([]);
});

async function seed(page: Page, snapshot = createDefaultSnapshot()) {
  // Expose base-stop controls without introducing a mode override.
  for (const set of snapshot.modeSets) {
    set.authoringCapabilities = set.authoringCapabilities?.filter(
      (capability) => capability !== "color.scales",
    );
  }
  await page.addInitScript(
    ({ key, version, snapshot }) => {
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
    { key: AUTHORING_STORAGE_KEY, version: AUTHORING_RECORD_VERSION, snapshot },
  );
  return snapshot;
}

async function openColors(page: Page) {
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations", exact: true })
    .click();
  await page.getByRole("tab", { name: "Colors", exact: true }).click();
  await selectColorPanelSection(page, "Color scales");
}

test("all six shipped links render and Orange follows a palette edit", async ({
  page,
}) => {
  await seed(page);
  await openColors(page);
  for (const [scale, index, palette] of [
    ["Orange", 1, "Illustrator Orange"],
    ["Celery", 1, "Dimension Green"],
    ["Cyan", 2, "Photoshop Blue"],
    ["Indigo", 1, "After Effects Indigo"],
    ["Fuchsia", 1, "XD Fuchsia"],
    ["Magenta", 1, "InDesign Magenta"],
  ] as const) {
    await page.getByRole("button", { name: scale, exact: true }).click();
    const dialog = page.getByRole("dialog", {
      name: `Edit ${scale} scale`,
      exact: true,
    });
    const stop = dialog.getByRole("button", {
      name: new RegExp(`^Stop ${index},`),
    });
    await stop.focus();
    await stop.press("Space");
    await expect(
      dialog.getByRole("radio", { name: palette, exact: true }),
    ).toBeChecked();
    await page.mouse.click(1500, 1050);
    await expect(dialog).toHaveCount(0);
  }

  await selectColorPanelSection(page, "Palette");
  await page
    .getByRole("button", {
      name: "Edit value of Illustrator Orange",
      exact: true,
    })
    .click();
  await page
    .getByRole("dialog", { name: "Illustrator Orange value", exact: true })
    .getByRole("textbox", { name: "Hex", exact: true })
    .fill("#123456");
  await page.mouse.click(1500, 1050);
  await selectColorPanelSection(page, "Color scales");
  await page.getByRole("button", { name: "Orange", exact: true }).click();
  const dialog = page.getByRole("dialog", {
    name: "Edit Orange scale",
    exact: true,
  });
  await expect(
    dialog.getByRole("radio", { name: "Illustrator Orange", exact: true }),
  ).toBeChecked();
  await expect(
    dialog.getByRole("button", { name: /^Stop 1,/ }).locator("span"),
  ).toHaveCSS("background-color", "rgb(18, 52, 86)");
  await page.mouse.click(1500, 1050);
  for (const view of ["Elements", "Preview", "Analyze", "Code"]) {
    await page.getByRole("radio", { name: view, exact: true }).click();
    await expect(
      page.locator(`[data-view="${view.toLowerCase()}"]`),
    ).toBeVisible();
  }
});

test("existing saved stops are not replaced by new shipped links", async ({
  page,
}) => {
  const previous = createDefaultSnapshot();
  for (const scale of previous.colorSystem.scales) {
    for (const stop of scale.stops) delete stop.paletteColorId;
  }
  const snapshot = await seed(page, previous);
  await openColors(page);
  await page.getByRole("button", { name: "Orange", exact: true }).click();
  const dialog = page.getByRole("dialog", {
    name: "Edit Orange scale",
    exact: true,
  });
  await expect(
    dialog.getByRole("radio", { name: "Illustrator Orange", exact: true }),
  ).not.toBeChecked();
  await expect(
    dialog.getByRole("textbox", { name: "Hex", exact: true }),
  ).toBeVisible();
  const stored = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    AUTHORING_STORAGE_KEY,
  );
  expect(stored.saved).toEqual(snapshot);
  expect(stored.working).toEqual(snapshot);
});
