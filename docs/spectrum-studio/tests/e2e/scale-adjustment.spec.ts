// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { concreteColor } from "../../src/features/color-system/data-vis/colors";
import {
  createColorFromCoords,
  getCanvasPixelColor,
  getColorSpaceConfig,
} from "../../src/components/color-picker/colorUtils";
import { MAX_CHROMA } from "../../src/features/color-system/paletteValue";
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

async function expectSaturationHue(section: Locator, hue: number) {
  const canvas = section
    .locator(".colorPickerSlider")
    .filter({
      has: section
        .page()
        .getByRole("slider", { name: "Saturation (%)", exact: true }),
    })
    .locator("canvas");
  await expect
    .poll(async () => {
      const sample = await canvas.evaluate((element: HTMLCanvasElement) => {
        const x = Math.floor(element.width / 2);
        return {
          fraction: x / (element.width - 1),
          pixel: Array.from(
            element.getContext("2d")!.getImageData(x, 0, 1, 1).data,
          ).slice(0, 3),
        };
      });
      const expected = getCanvasPixelColor(
        createColorFromCoords(getColorSpaceConfig("OKlch", "polar"), [
          0.65,
          sample.fraction * MAX_CHROMA,
          hue,
        ]),
        "srgb",
      );
      return sample.pixel.map((channel, index) => channel - expected[index]);
    })
    .toEqual([0, 0, 0]);
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
  const adjustColors = dialog.getByRole("checkbox", {
    name: "Adjust colors",
    exact: true,
  });
  const adjustColorsLabel = dialog.getByText("Adjust colors", { exact: true });
  await expect(adjustColors).toBeChecked();
  await adjustColorsLabel.click();
  await expect(method).toHaveCount(0);
  await adjustColorsLabel.click();
  await expect(method).toContainText("Absolute");
  const colorPicker = page.getByRole("dialog", { name: "Color", exact: true });
  const hex = colorPicker.getByRole("textbox", { name: "Hex", exact: true });
  await expect(hex).toHaveCount(0);
  await dialog.getByRole("button", { name: "Color", exact: true }).click();
  await expect(hex).toHaveValue("#486ec2");
  await hex.fill("#336699");
  await expect(hex).toHaveValue("#336699");
  await hex.press("Tab");
  await page.keyboard.press("Escape");
  await expect(colorPicker).toHaveCount(0);
  await method.click();
  await page.getByRole("option", { name: "Relative", exact: true }).click();
  await expect(
    dialog.getByRole("slider", { name: "Hue shift (°)", exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("slider", { name: "Saturation (%)", exact: true }),
  ).toBeVisible();
  await expect(hex).toHaveCount(0);
  await method.click();
  await page.getByRole("option", { name: "Absolute", exact: true }).click();
  await dialog.getByRole("button", { name: "Color", exact: true }).click();
  await hex.fill("#123456");
  await expect(hex).toHaveValue("#123456");
  await hex.press("Tab");
  await page.keyboard.press("Escape");
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
  await dialog.getByRole("button", { name: "Color", exact: true }).click();
  await expect(hex).toHaveValue("#123456");
  const selected = concreteColor("#123456").to("oklch").coords.map(Number);
  await expect
    .poll(async () =>
      page.evaluate((key) => {
        const record = JSON.parse(localStorage.getItem(key)!);
        return record.saved.modeSets
          .find((set: { key: string }) => set.key === "colorScheme")
          .modes.find((mode: { key: string }) => mode.key === "wireframe")
          .foundations.color.scaleAdjustment.color;
      }, AUTHORING_STORAGE_KEY),
    )
    .toEqual({
      lightness: selected[0],
      chroma: (selected[1] / MAX_CHROMA) * 100,
      hue: selected[2],
    });
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
  const colorButton = section.getByRole("button", {
    name: "Color",
    exact: true,
  });
  const colorPicker = page.getByRole("dialog", { name: "Color", exact: true });
  const hex = colorPicker.getByRole("textbox", { name: "Hex", exact: true });
  await expect(hex).toHaveCount(0);
  expect(
    await colorButton.evaluate((element) => {
      const styles = getComputedStyle(element);
      return {
        border: styles.borderTopWidth,
        padding: styles.padding,
        background: styles.backgroundColor,
      };
    }),
  ).toEqual({
    border: "0px",
    padding: "0px",
    background: "rgba(0, 0, 0, 0)",
  });
  await colorButton.focus();
  await page.keyboard.press("Enter");
  await expect(hex).toHaveValue("#486ec2");
  await page.keyboard.press("Escape");
  await method.click();
  await page.getByRole("option", { name: "Relative", exact: true }).click();
  const hue = section.getByRole("textbox", {
    name: "Hue shift (°)",
    exact: true,
  });
  const hueSlider = section.getByRole("slider", {
    name: "Hue shift (°)",
    exact: true,
  });
  const saturationSlider = section.getByRole("slider", {
    name: "Saturation (%)",
    exact: true,
  });
  const saturation = section.getByRole("textbox", {
    name: "Saturation (%)",
    exact: true,
  });
  await expect(hue).toHaveValue("0");
  await expect(hueSlider).toHaveAttribute("aria-valuenow", "0");
  await expect(saturationSlider).toHaveAttribute("aria-valuetext", "100%");
  await expectSaturationHue(section, 0);
  await hueSlider.focus();
  await page.keyboard.press("ArrowRight");
  await expect
    .poll(async () => Number(await hue.inputValue()))
    .toBeGreaterThan(0);
  await hue.fill("-90");
  await hue.press("Tab");
  await expect(hueSlider).toHaveAttribute("aria-valuenow", "-90");
  await expectSaturationHue(section, -90);
  await saturationSlider.focus();
  await page.keyboard.press("ArrowRight");
  await expect
    .poll(async () => Number(await saturation.inputValue()))
    .toBeGreaterThan(100);
  await saturation.fill("50");
  await saturation.press("Tab");
  await expect(saturationSlider).toHaveAttribute("aria-valuetext", "50%");
  await hue.fill("30");
  await hue.press("Tab");
  await expectSaturationHue(section, 30);
  const adjustColors = section.getByRole("checkbox", {
    name: "Adjust colors",
    exact: true,
  });
  const adjustColorsLabel = section.getByText("Adjust colors", { exact: true });
  await adjustColorsLabel.click();
  await expect(method).toHaveCount(0);
  await expect(hueSlider).toHaveCount(0);
  await adjustColorsLabel.click();
  await expect(hue).toHaveValue("30");
  await expect(saturation).toHaveValue("50");
  await section
    .getByRole("button", { name: "Reset relative adjustments", exact: true })
    .click();
  await expect(adjustColors).toBeChecked();
  await expect(hue).toHaveValue("0");
  await expect(saturation).toHaveValue("100");
  await hue.fill("30");
  await hue.press("Tab");
  await saturation.fill("50");
  await saturation.press("Tab");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page
    .getByRole("button", { name: "Open mode set Color scheme", exact: true })
    .click();
  await expect(hue).toHaveValue("30");
  await expect(saturation).toHaveValue("50");
  await method.click();
  await page.getByRole("option", { name: "Absolute", exact: true }).click();
  await colorButton.click();
  await hex.fill("#ff0000");
  await hex.press("Tab");
  await page.keyboard.press("Escape");
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

test("Modes saves disabled color adjustments without losing their settings", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await navigate(page, "Modes");
  const open = page.getByRole("button", {
    name: "Open mode set Color scheme",
    exact: true,
  });
  await open.click();
  const section = page
    .locator("section")
    .filter({
      has: page.getByRole("button", {
        name: "Delete mode Wireframe",
        exact: true,
      }),
    })
    .last();
  const enabled = section.getByRole("checkbox", {
    name: "Adjust colors",
    exact: true,
  });
  const enabledLabel = section.getByText("Adjust colors", { exact: true });
  const method = section.getByRole("button", { name: /Adjustment method/ });
  await enabledLabel.click();
  await expect(method).toHaveCount(0);
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await open.click();
  await expect(enabled).not.toBeChecked();
  await enabledLabel.click();
  await expect(method).toContainText("Absolute");
  await section.getByRole("button", { name: "Color", exact: true }).click();
  const picker = page.getByRole("dialog", { name: "Color", exact: true });
  await expect(
    picker.getByRole("textbox", { name: "Hex", exact: true }),
  ).toHaveValue("#486ec2");
  await page.keyboard.press("Escape");
  await expect(picker).toHaveCount(0);
  await page
    .getByRole("main")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Discard", exact: true })
    .click();
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Save", exact: true })
    .click();
  await page.reload();
  await navigate(page, "Modes");
  await open.click();
  await expect(enabled).not.toBeChecked();
  await expect(method).toHaveCount(0);
  await enabledLabel.click();
  await expect(method).toContainText("Absolute");
  await section.getByRole("button", { name: "Color", exact: true }).click();
  await expect(
    picker.getByRole("textbox", { name: "Hex", exact: true }),
  ).toHaveValue("#486ec2");
  expect(errors).toEqual([]);
});
