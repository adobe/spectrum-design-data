// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Page } from "@playwright/test";
import { createDefaultSnapshot } from "../../src/features/edit-session/state";
import {
  AUTHORING_RECORD_VERSION,
  AUTHORING_STORAGE_KEY,
} from "../../src/features/edit-session/storage";
import { selectMode } from "./modeControl";
import { selectColorPanelSection } from "./colorPanelSection";

test.use({ viewport: { width: 2200, height: 1100 } });
test.beforeEach(async ({ page }) => {
  const snapshot = createDefaultSnapshot();
  await page.addInitScript(
    ({ key, record }) => {
      if (localStorage.getItem(key) === null)
        localStorage.setItem(key, JSON.stringify(record));
    },
    {
      key: AUTHORING_STORAGE_KEY,
      record: {
        version: AUTHORING_RECORD_VERSION,
        working: snapshot,
        saved: snapshot,
        isEditing: true,
        attachments: {},
        savedAttachments: {},
      },
    },
  );
});

async function navigate(page: Page, name: string) {
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: new RegExp(`^${name}\\b`) })
    .click();
}

test("Foundations uses one method and persists the shared absolute color", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await navigate(page, "Foundations");
  await page.getByRole("tab", { name: "Colors", exact: true }).click();
  const modeSets = page.getByRole("button", { name: "Mode sets", exact: true });
  if ((await modeSets.getAttribute("aria-expanded")) === "false")
    await modeSets.click();
  await selectMode(page, "Wireframe");
  await page
    .getByRole("button", { name: "Edit Wireframe for color", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Edit Wireframe for color",
    exact: true,
  });
  const method = dialog.getByRole("button", { name: /Adjustment method/ });
  await expect(method).toContainText("Absolute");
  const hex = dialog.getByRole("textbox", { name: "Hex", exact: true });
  await expect(hex).toHaveValue("#486ec2");
  await hex.fill("#336699");
  await expect(hex).toHaveValue("#336699");
  await method.click();
  await page.getByRole("option", { name: "Relative", exact: true }).click();
  await expect(
    dialog.getByRole("textbox", { name: "Hue shift (°)", exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("textbox", { name: "Saturation (%)", exact: true }),
  ).toBeVisible();
  await expect(hex).toHaveCount(0);
  await method.click();
  await page.getByRole("option", { name: "Absolute", exact: true }).click();
  await hex.fill("#123456");
  await expect(hex).toHaveValue("#123456");
  await page.mouse.click(2100, 800);
  await expect(dialog).toHaveCount(0);
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Save", exact: true })
    .click();
  await page.reload();
  await navigate(page, "Foundations");
  await page.getByRole("tab", { name: "Colors", exact: true }).click();
  const heading = page.getByRole("button", { name: "Mode sets", exact: true });
  if ((await heading.getAttribute("aria-expanded")) === "false")
    await heading.click();
  await selectMode(page, "Wireframe");
  await page
    .getByRole("button", { name: "Edit Wireframe for color", exact: true })
    .click();
  await expect(
    page
      .getByRole("dialog", { name: "Edit Wireframe for color" })
      .getByRole("textbox", { name: "Hex", exact: true }),
  ).toHaveValue("#123456");
  expect(errors).toEqual([]);
});

test("completed color adjustment keeps the Scale Editor and evaluation views working", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await navigate(page, "Foundations");
  await page.getByRole("tab", { name: "Colors", exact: true }).click();
  await selectColorPanelSection(page, "Color scales");
  await page
    .getByRole("tabpanel", { name: "Colors", exact: true })
    .getByRole("button", { name: "Red", exact: true })
    .click();
  const hex = page.getByRole("textbox", { name: "Hex", exact: true });
  await expect(hex).toBeVisible();
  await expect(page.locator(".colorPickerCanvas").first()).toBeVisible();
  await hex.fill("#336699");
  await expect(hex).toHaveValue("#336699");
  await page.mouse.click(2100, 800);
  await expect(hex).toHaveCount(0);
  for (const view of ["Elements", "Preview", "Analyze", "Code"]) {
    await page.getByRole("radio", { name: view, exact: true }).click();
    await expect(
      page.locator(`[data-view="${view.toLowerCase()}"]`),
    ).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test("Modes keeps relative and absolute changes local until Save changes", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await navigate(page, "Modes");
  await page
    .getByRole("button", { name: "Open mode set Color scheme", exact: true })
    .click();
  const section = page
    .locator("section")
    .filter({
      has: page.getByRole("button", {
        name: "Delete mode Wireframe",
        exact: true,
      }),
    })
    .last();
  const method = section.getByRole("button", { name: /Adjustment method/ });
  const hex = section.getByRole("textbox", { name: "Hex", exact: true });
  await expect(hex).toHaveValue("#486ec2");
  await method.click();
  await page.getByRole("option", { name: "Relative", exact: true }).click();
  const hue = section.getByRole("textbox", {
    name: "Hue shift (°)",
    exact: true,
  });
  await hue.fill("30");
  await hue.press("Tab");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page
    .getByRole("button", { name: "Open mode set Color scheme", exact: true })
    .click();
  await expect(hue).toHaveValue("30");
  await method.click();
  await page.getByRole("option", { name: "Absolute", exact: true }).click();
  await hex.fill("#ff0000");
  await page
    .getByRole("main")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Discard", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Open mode set Color scheme", exact: true })
    .click();
  await expect(hue).toHaveValue("30");
  await expect(hex).toHaveCount(0);
  expect(errors).toEqual([]);
});
