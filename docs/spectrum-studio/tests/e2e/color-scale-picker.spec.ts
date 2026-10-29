// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { AUTHORING_STORAGE_KEY } from "../../src/features/edit-session/storage";
import type { EditSessionSnapshot } from "../../src/features/edit-session/state";

const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const collected: string[] = [];
  errors.set(page, collected);
  page.on("pageerror", (error) => collected.push(error.message));
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations", exact: true })
    .click();
  await page.getByRole("tab", { name: "Colors", exact: true }).click();
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Edit", exact: true })
    .click();
});
test.afterEach(async ({ page }) => {
  expect(errors.get(page)).toEqual([]);
});

async function working(page: Page): Promise<EditSessionSnapshot> {
  await expect
    .poll(() =>
      page.evaluate(
        (key) => localStorage.getItem(key) !== null,
        AUTHORING_STORAGE_KEY,
      ),
    )
    .toBe(true);
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).working,
    AUTHORING_STORAGE_KEY,
  );
}

async function chooseScale(
  page: Page,
  picker: Locator,
  name: string,
  count: number,
) {
  await picker.click();
  const options = page.getByRole("listbox");
  const option = options.getByRole("option", { name, exact: true });
  await expect(option).toHaveAttribute(
    "aria-setsize",
    String(
      count +
        (await options
          .getByRole("option", { name: "Base color", exact: true })
          .count()),
    ),
  );
  const gradient = option.locator("[data-color-scale-id]");
  await expect(gradient).toHaveAttribute("aria-hidden", "true");
  expect(
    await gradient.evaluate((node) => ({
      width: getComputedStyle(node).width,
      height: getComputedStyle(node).height,
      background: (node as HTMLElement).style.background,
    })),
  ).toMatchObject({
    width: "32px",
    height: "18px",
    background: expect.stringContaining("linear-gradient"),
  });
  await option.press("Enter");
  await expect(picker).toContainText(name);
}

async function finishEditing(page: Page) {
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Save", exact: true })
    .click();
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Discard edits", exact: true })
    .click();
}

test("base scale selection reuses gradients, follows output gamut and saves by identity", async ({
  page,
}) => {
  const initial = await working(page);
  const picker = page.getByRole("button", { name: /Base color scale$/ });
  await chooseScale(page, picker, "Cyan", initial.colorSystem.scales.length);
  const cyan = initial.colorSystem.scales.find(
    (scale) => scale.name === "Cyan",
  )!;
  await expect
    .poll(async () => (await working(page)).colorSystem.backgroundScaleId)
    .toBe(cyan.id);
  await page
    .getByRole("button", { name: "System settings", exact: true })
    .click();
  await page.getByRole("button", { name: /Output gamut$/ }).click();
  await page.getByRole("option", { name: "Display P3", exact: true }).click();
  await expect(picker.locator("[data-color-scale-id]")).toHaveAttribute(
    "style",
    /color\(display-p3/,
  );
  await finishEditing(page);
  await expect(picker).toHaveCount(0);
  const panel = page
    .getByRole("tabpanel", { name: "Colors", exact: true })
    .first();
  await expect(panel.getByText("Cyan", { exact: true })).toBeVisible();
  expect((await working(page)).colorSystem.scales).toEqual(
    initial.colorSystem.scales,
  );
  await page.reload();
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations", exact: true })
    .click();
  await page.getByRole("tab", { name: "Colors", exact: true }).click();
  await expect(picker).toHaveCount(0);
  await expect(panel.getByText("Cyan", { exact: true })).toBeVisible();
});

test("mode pickers preserve focus, route overrides and allow read-only adaptive previews", async ({
  page,
}) => {
  const initial = await working(page);
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Modes", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Edit mode set Color scheme", exact: true })
    .click();
  const setup = page.getByRole("dialog");
  await setup.getByText("Background scale", { exact: true }).click();
  await expect(
    setup.getByRole("checkbox", { name: "Background scale", exact: true }),
  ).toBeChecked();
  await setup.getByText("Color scale stops", { exact: true }).click();
  await setup.getByRole("button", { name: "Save", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations", exact: true })
    .click();
  await page.getByRole("tab", { name: "Colors", exact: true }).click();
  const modeSets = page.getByRole("button", { name: "Mode sets", exact: true });
  if ((await modeSets.getAttribute("aria-expanded")) !== "true")
    await modeSets.click();
  await page
    .getByRole("button", { name: "Edit Dark for color", exact: true })
    .click();
  const editor = page.getByRole("dialog");
  const background = editor.getByRole("button", { name: /Background scale$/ });
  await expect(background).toBeFocused();
  await chooseScale(
    page,
    background,
    "Cyan",
    initial.colorSystem.scales.length,
  );
  const cyan = initial.colorSystem.scales.find(
    (scale) => scale.name === "Cyan",
  )!;
  await expect
    .poll(
      async () =>
        (await working(page)).modeSets
          .find((set) => set.key === "colorScheme")
          ?.modes.find((mode) => mode.name === "Dark")?.foundations.color
          ?.backgroundScaleId,
    )
    .toBe(cyan.id);
  expect((await working(page)).colorSystem).toEqual(initial.colorSystem);
  const beforeSelection = await working(page);
  await chooseScale(
    page,
    editor.getByRole("button", { name: /Color scale$/ }),
    "Cyan",
    initial.colorSystem.scales.length,
  );
  expect(await working(page)).toEqual(beforeSelection);
  await editor
    .getByRole("slider", { name: "Background lightness" })
    .press("Escape");
  await page.getByRole("tab", { name: "Color scales", exact: true }).click();
  await page
    .getByRole("button", { name: "Silver", exact: true })
    .first()
    .click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("combobox", { name: "Color scale name", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("radio", { name: "Elements", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Color ramps", exact: true }),
  ).toBeVisible();
  await finishEditing(page);
  await expect(
    page.getByRole("button", { name: "Edit Dark for color", exact: true }),
  ).toHaveCount(0);
  const saved = await working(page);
  await page.getByRole("radio", { name: "Preview", exact: true }).click();
  await page
    .getByRole("button", { name: "Adaptive controls", exact: true })
    .click();
  const previewPicker = page
    .getByRole("dialog")
    .getByRole("button", { name: /Background scale$/ });
  await chooseScale(
    page,
    previewPicker,
    "Blue",
    initial.colorSystem.scales.length,
  );
  expect(await working(page)).toEqual(saved);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Reset to mode values", exact: true })
    .click();
  await expect(previewPicker).toContainText("Cyan");
  expect(await working(page)).toEqual(saved);
});

test("surface tint shares the picker and retains its base-color option and read-only name", async ({
  page,
}) => {
  const initial = await working(page);
  await page.getByRole("tab", { name: "Surfaces", exact: true }).click();
  const panel = page.getByRole("tabpanel", { name: "Surfaces", exact: true });
  const tint = panel.getByRole("button", { name: /Tint$/ }).first();
  await chooseScale(page, tint, "Blue", initial.colorSystem.scales.length);
  const surface = initial.colorSystem.surfaces.find((item) => !item.base)!;
  const blue = initial.colorSystem.scales.find(
    (scale) => scale.name === "Blue",
  )!;
  await expect
    .poll(
      async () =>
        (await working(page)).colorSystem.surfaces.find(
          (item) => item.id === surface.id,
        )?.sourceScaleId,
    )
    .toBe(blue.id);
  await finishEditing(page);
  await expect(tint).toHaveCount(0);
  await expect(panel.getByText("Blue", { exact: true }).first()).toBeVisible();
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  await tint.click();
  await page.getByRole("option", { name: "Base color", exact: true }).click();
  await expect(tint).toContainText("Base color");
  await expect
    .poll(
      async () =>
        (await working(page)).colorSystem.surfaces.find(
          (item) => item.id === surface.id,
        )?.sourceScaleId,
    )
    .toBeUndefined();
  expect((await working(page)).colorSystem.scales).toEqual(
    initial.colorSystem.scales,
  );
});
