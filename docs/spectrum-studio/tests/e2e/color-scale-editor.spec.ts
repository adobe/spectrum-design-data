// Copyright 2026 Adobe. All rights reserved.
import { expect, test as base, type Page } from "@playwright/test";
import {
  createDefaultSnapshot,
  type EditSessionSnapshot,
} from "../../src/features/edit-session/state";
import {
  AUTHORING_RECORD_VERSION,
  AUTHORING_STORAGE_KEY,
  PREFERENCES_STORAGE_KEY,
} from "../../src/features/edit-session/storage";
import { selectColorPanelSection } from "./colorPanelSection";
import { paletteColorCss } from "../../src/features/color-system/paletteValue";
import { resolvePaletteLinks } from "../../src/features/color-system/paletteReferences";
import type { ColorOutputSettings } from "../../src/features/color-system/outputSettings";
import { createMode, createModeSet } from "../../src/features/modes/model";
import { STANDARD_SCALE_NAMING_RULE } from "../../src/features/logic/scaleNaming";

const test = base.extend<{
  editorSnapshot: EditSessionSnapshot;
  viewOnly: boolean;
  modeSelection: Record<string, string>;
}>({
  editorSnapshot: [createDefaultSnapshot(), { option: true }],
  viewOnly: [false, { option: true }],
  modeSelection: [{}, { option: true }],
});

const viewOnlyOutputs: ColorOutputSettings[] = [
  { authoringGamut: "srgb", outputFormat: "hex", mapOutputsToSrgb: false },
  { authoringGamut: "srgb", outputFormat: "rgb", mapOutputsToSrgb: false },
  { authoringGamut: "srgb", outputFormat: "hsl", mapOutputsToSrgb: false },
  {
    authoringGamut: "display-p3",
    outputFormat: "oklch",
    mapOutputsToSrgb: false,
  },
  {
    authoringGamut: "display-p3",
    outputFormat: "rgb",
    mapOutputsToSrgb: false,
  },
  { authoringGamut: "rec2020", outputFormat: "rgb", mapOutputsToSrgb: false },
  { authoringGamut: "rec2020", outputFormat: "hex", mapOutputsToSrgb: true },
];

for (const output of viewOnlyOutputs) {
  test.describe(`view-only ${output.authoringGamut} ${output.outputFormat}`, () => {
    const snapshot = createDefaultSnapshot();
    snapshot.colorSystem.settings.colorOutput = output;
    const scale = snapshot.colorSystem.scales.find(
      (scale) => scale.name === "Red",
    )!;
    scale.stops[0].paletteColorId = snapshot.colorSystem.palette[0].id;
    const resolved = resolvePaletteLinks(snapshot.colorSystem);
    const stops = resolved.scales.find(
      (candidate) => candidate.id === scale.id,
    )!.stops;
    test.use({ viewOnly: true, editorSnapshot: snapshot });
    test("shows each selected stop in the saved output format without allowing edits", async ({
      page,
    }) => {
      const dialog = page.getByRole("dialog", { name: "Edit Red scale" });
      await expect(
        dialog.getByRole("button", {
          name: "Custom contrast steps",
          exact: true,
        }),
      ).toHaveCount(0);
      await expect(dialog.locator(".colorPickerContents")).toHaveCount(0);
      const value = dialog.getByRole("textbox", {
        name: "Color value",
        exact: true,
      });
      await expect(value).toHaveAttribute("readonly", "");
      for (const [index, stop] of stops.entries()) {
        const handle = dialog.getByRole("button", {
          name: new RegExp(`^Stop ${index + 1},`),
        });
        await handle.click();
        await expect(value).toHaveValue(paletteColorCss(stop, output));
        await handle.press("ArrowRight");
        await expect(value).toHaveValue(paletteColorCss(stop, output));
      }
      const before = stops[1];
      const handle = dialog.getByRole("button", { name: /^Stop 2,/ });
      const bounds = (await handle.boundingBox())!;
      await page.mouse.move(
        bounds.x + bounds.width / 2,
        bounds.y + bounds.height / 2,
      );
      await page.mouse.down();
      await page.mouse.move(
        bounds.x + bounds.width / 2 + 20,
        bounds.y + bounds.height / 2,
      );
      await page.mouse.up();
      await expect(value).toHaveValue(paletteColorCss(before, output));
      expect((await working(page)).colorSystem).toEqual(snapshot.colorSystem);
    });
  });
}

test.describe("view-only mode-specific stops", () => {
  const snapshot = createDefaultSnapshot();
  const scale = snapshot.colorSystem.scales.find(
    (scale) => scale.name === "Red",
  )!;
  const modeSet = createModeSet();
  modeSet.key = "stop-preview";
  modeSet.name = "Stop preview";
  modeSet.authoringCapabilities = ["color.scales"];
  modeSet.modes[0].key = "default";
  modeSet.modes[0].name = "Default";
  const mode = createMode();
  mode.key = "alternate";
  mode.name = "Alternate";
  const channels = { lightness: 0.45, hue: 260, chroma: 35 };
  mode.foundations.color = {
    scaleStops: { [scale.id]: { [scale.stops[0].id]: channels } },
  };
  modeSet.modes.push(mode);
  for (const set of snapshot.modeSets)
    set.authoringCapabilities = set.authoringCapabilities?.filter(
      (capability) => capability !== "color.scales",
    );
  snapshot.modeSets.push(modeSet);
  snapshot.colorSystem.dataVisScales = [];
  test.use({
    viewOnly: true,
    editorSnapshot: snapshot,
    modeSelection: { [modeSet.key]: mode.id },
  });
  test("shows the resolved mode value even when stop authoring belongs to Modes", async ({
    page,
  }) => {
    expect((await working(page)).modeSets).toEqual(snapshot.modeSets);
    const value = page
      .getByRole("dialog", { name: "Edit Red scale" })
      .getByRole("textbox", { name: "Color value", exact: true });
    await expect(value).toHaveValue(
      paletteColorCss(channels, snapshot.colorSystem.settings.colorOutput),
    );
  });
});

test.describe("view-only custom contrasts", () => {
  const snapshot = createDefaultSnapshot();
  const scale = snapshot.colorSystem.scales.find(
    (scale) => scale.name === "Red",
  )!;
  scale.customContrasts = {
    namingRuleId: STANDARD_SCALE_NAMING_RULE.id,
    steps: structuredClone(snapshot.colorSystem.contrasts),
    baseContrastId: snapshot.colorSystem.contrasts[0].id,
  };
  test.use({ viewOnly: true, editorSnapshot: snapshot });
  test("keeps the custom section visible when this scale uses custom steps", async ({
    page,
  }) => {
    const dialog = page.getByRole("dialog", { name: "Edit Red scale" });
    const contrasts = dialog.getByRole("button", {
      name: "Custom contrast steps",
      exact: true,
    });
    await expect(contrasts).toBeVisible();
    await contrasts.click();
    await expect(
      dialog.getByRole("switch", { name: "Use custom contrast steps" }),
    ).toBeChecked();
    await expect(
      dialog.getByRole("switch", { name: "Use custom contrast steps" }),
    ).toBeDisabled();
    expect((await working(page)).colorSystem).toEqual(snapshot.colorSystem);
  });
});

const pageErrors = new WeakMap<Page, string[]>();
test.beforeEach(
  async ({ page, editorSnapshot: snapshot, viewOnly, modeSelection }) => {
    const errors: string[] = [];
    pageErrors.set(page, errors);
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(
      ({ key, version, snapshot, viewOnly, preferencesKey, modeSelection }) => {
        if (sessionStorage.getItem("color-scale-editor-seeded")) return;
        sessionStorage.setItem("color-scale-editor-seeded", "true");
        localStorage.setItem(
          key,
          JSON.stringify({
            version,
            working: snapshot,
            saved: snapshot,
            isEditing: !viewOnly,
            attachments: {},
            savedAttachments: {},
          }),
        );
        localStorage.setItem(
          preferencesKey,
          JSON.stringify({
            version: 1,
            appearance: "light",
            modeSelection,
          }),
        );
      },
      {
        key: AUTHORING_STORAGE_KEY,
        version: AUTHORING_RECORD_VERSION,
        snapshot,
        viewOnly,
        preferencesKey: PREFERENCES_STORAGE_KEY,
        modeSelection,
      },
    );
    await page.setViewportSize({ width: 1600, height: 1100 });
    await page.goto("/");
    await page
      .getByRole("navigation", { name: "Navigation", exact: true })
      .getByRole("link", { name: "Foundations", exact: true })
      .click();
    await page.getByRole("tab", { name: "Colors", exact: true }).click();
    await selectColorPanelSection(page, "Color scales");
    await page
      .getByRole("tabpanel", { name: "Colors", exact: true })
      .getByRole("button", { name: "Red", exact: true })
      .click();
  },
);
test.afterEach(({ page }) => {
  expect(pageErrors.get(page)).toEqual([]);
});

async function working(page: Page): Promise<EditSessionSnapshot> {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).working,
    AUTHORING_STORAGE_KEY,
  );
}

test("main sections are exclusive, can both close, and retain picker state", async ({
  page,
}, testInfo) => {
  const dialog = page.getByRole("dialog", { name: "Edit Red scale" });
  const keys = dialog.getByRole("button", { name: "Key colors", exact: true });
  const contrasts = dialog.getByRole("button", {
    name: "Custom contrast steps",
    exact: true,
  });
  const enabled = dialog.getByRole("switch", {
    name: "Use custom contrast steps",
  });
  const before = (await working(page)).colorSystem;
  await expect(keys).toHaveAttribute("aria-expanded", "true");
  await expect(contrasts).toHaveAttribute("aria-expanded", "false");
  await dialog.screenshot({ path: testInfo.outputPath("key-colors.png") });
  await dialog.getByRole("radio", { name: "Channels", exact: true }).click();
  await contrasts.click();
  await expect(keys).toHaveAttribute("aria-expanded", "false");
  await expect(contrasts).toHaveAttribute("aria-expanded", "true");
  await expect(enabled).not.toBeChecked();
  await expect(
    dialog.getByRole("button", { name: "Add contrast", exact: true }),
  ).toBeDisabled();
  await contrasts.click();
  await expect(contrasts).toHaveAttribute("aria-expanded", "false");
  await keys.click();
  await expect(
    dialog.getByRole("radio", { name: "Channels", exact: true }),
  ).toBeChecked();
  expect((await working(page)).colorSystem).toEqual(before);
  await enabled.locator("xpath=ancestor::label").click();
  await expect(keys).toHaveAttribute("aria-expanded", "true");
  await expect(contrasts).toHaveAttribute("aria-expanded", "false");
  await enabled.locator("xpath=ancestor::label").click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await expect(enabled).toBeChecked();
  await enabled.locator("xpath=ancestor::label").click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Use shared steps", exact: true })
    .click();
  await expect(enabled).not.toBeChecked();
  await expect(keys).toHaveAttribute("aria-expanded", "true");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(enabled).toBeChecked();
  await contrasts.click();
  await dialog.screenshot({
    path: testInfo.outputPath("custom-contrasts.png"),
  });
});

for (const edit of ["Hex", "area", "slider", "channel"] as const) {
  test(`a linked stop remains editable and ${edit} edits detach only that stop`, async ({
    page,
  }) => {
    const dialog = page.getByRole("dialog", { name: "Edit Red scale" });
    const palette = dialog.getByRole("radiogroup", { name: "Palette colors" });
    const swatch = palette.getByRole("radio").first();
    await swatch.click();
    await expect(swatch).toBeChecked();
    await expect
      .poll(
        async () =>
          (await working(page)).colorSystem.scales.find(
            (scale) => scale.name === "Red",
          )!.stops[0].paletteColorId,
      )
      .toBeTruthy();
    const before = await working(page);
    const scale = before.colorSystem.scales.find(
      (scale) => scale.name === "Red",
    )!;
    const stopId = scale.stops[0].id;
    expect(scale.stops[0].paletteColorId).toBeTruthy();
    const hex = dialog.getByRole("textbox", { name: "Hex", exact: true });
    await expect(hex).toBeVisible();
    await hex.fill("#12");
    await hex.press("Tab");
    await expect(swatch).toBeChecked();
    await dialog.getByRole("radio", { name: "Polar model" }).click();
    await dialog.getByRole("radio", { name: "Cartesian model" }).click();
    await expect(swatch).toBeChecked();
    if (edit === "Hex") {
      await dialog
        .getByRole("radio", { name: "Channels", exact: true })
        .click();
      await dialog
        .getByRole("radio", { name: "Color area", exact: true })
        .click();
      await dialog.getByRole("button", { name: /Gamut/ }).click();
      await page
        .getByRole("listbox", { name: "Gamut", exact: true })
        .getByRole("option", { name: "Display P3", exact: true })
        .click();
      await dialog.getByRole("button", { name: /Gamut/ }).click();
      await page
        .getByRole("listbox", { name: "Gamut", exact: true })
        .getByRole("option", { name: "sRGB", exact: true })
        .click();
      await dialog.getByRole("button", { name: /Color space/ }).click();
      await page
        .getByRole("listbox", { name: "Color space", exact: true })
        .getByRole("option", { name: "sRGB", exact: true })
        .click();
      await dialog.getByRole("button", { name: /Color space/ }).click();
      await page
        .getByRole("listbox", { name: "Color space", exact: true })
        .getByRole("option", { name: "OKLCH", exact: true })
        .click();
      await expect(swatch).toBeChecked();
      await hex.fill("#336699");
    } else if (edit === "area") {
      const bounds = await dialog.locator(".colorPickerArea").boundingBox();
      expect(bounds).not.toBeNull();
      await page.mouse.click(
        bounds!.x + bounds!.width / 2,
        bounds!.y + bounds!.height / 2,
      );
    } else if (edit === "slider") {
      await dialog
        .locator(".colorPickerSliderColumn [role=slider]")
        .press("ArrowDown");
    } else {
      await dialog.getByRole("radio", { name: "Polar model" }).click();
      const field = dialog.getByRole("textbox", {
        name: "Chroma",
        exact: true,
      });
      await field.fill("0");
      await field.press("Tab");
    }
    await expect(swatch).not.toBeChecked();
    await expect
      .poll(
        async () =>
          (await working(page)).colorSystem.scales
            .find((scale) => scale.name === "Red")!
            .stops.find((stop) => stop.id === stopId)!.paletteColorId,
      )
      .toBeUndefined();
    expect(
      (await working(page)).colorSystem.scales
        .find((scale) => scale.name === "Red")!
        .stops.filter((stop) => stop.id !== stopId),
    ).toEqual(scale.stops.filter((stop) => stop.id !== stopId));
    expect((await working(page)).colorSystem.palette).toEqual(
      before.colorSystem.palette,
    );
    await dialog
      .getByRole("button", { name: "Custom contrast steps", exact: true })
      .click();
    await dialog
      .getByRole("button", { name: "Key colors", exact: true })
      .click();
    await expect(hex).not.toHaveValue("#12");
    await expect(dialog.locator(".colorPickerArea")).toBeVisible();
    if (edit === "Hex") {
      const after = await working(page);
      await dialog.focus();
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: "Save", exact: true }).click();
      await expect
        .poll(() =>
          page.evaluate(
            (key) => JSON.parse(localStorage.getItem(key)!).saved.colorSystem,
            AUTHORING_STORAGE_KEY,
          ),
        )
        .toEqual(after.colorSystem);
      await page.reload();
      expect((await working(page)).colorSystem).toEqual(after.colorSystem);
    }
  });
}

test("palette swatches toggle links without changing the displayed color", async ({
  page,
}) => {
  const dialog = page.getByRole("dialog", { name: "Edit Red scale" });
  const palette = dialog.getByRole("radiogroup", { name: "Palette colors" });
  const swatch = palette.getByRole("radio").first();
  await swatch.hover();
  await expect(page.getByRole("tooltip")).toHaveText("Link to palette color");
  await swatch.click();
  await expect(swatch).toBeChecked();
  const hex = dialog.getByRole("textbox", { name: "Hex", exact: true });
  await expect
    .poll(
      async () =>
        (await working(page)).colorSystem.scales.find(
          (scale) => scale.name === "Red",
        )!.stops[0].paletteColorId,
    )
    .toBeTruthy();
  const before = await working(page);
  const { paletteColorId, ...unlinkedStop } = before.colorSystem.scales.find(
    (scale) => scale.name === "Red",
  )!.stops[0];
  const paletteColor = before.colorSystem.palette.find(
    (color) => color.id === paletteColorId,
  )!;
  const linkedHex = await hex.inputValue();
  await page.mouse.move(0, 0);
  await swatch.hover();
  await expect(page.getByRole("tooltip")).toHaveText("Click to unlink");
  await expect(palette).toHaveCount(1);
  await swatch.click();
  await expect(swatch).not.toBeChecked();
  await expect(hex).toHaveValue(linkedHex);
  await expect
    .poll(
      async () =>
        (await working(page)).colorSystem.scales.find(
          (scale) => scale.name === "Red",
        )!.stops[0].paletteColorId,
    )
    .toBeUndefined();
  expect(
    (await working(page)).colorSystem.scales.find(
      (scale) => scale.name === "Red",
    )!.stops[0],
  ).toEqual({
    ...unlinkedStop,
    lightness: paletteColor.lightness,
    chroma: paletteColor.chroma,
    hue: paletteColor.hue,
  });
  expect((await working(page)).colorSystem.palette).toEqual(
    before.colorSystem.palette,
  );
  await page.mouse.move(0, 0);
  await swatch.hover();
  await expect(page.getByRole("tooltip")).toHaveText("Link to palette color");
  await swatch.press("Space");
  await expect(swatch).toBeChecked();
  await swatch.press("Space");
  await expect(swatch).not.toBeChecked();
  await expect(
    dialog.getByRole("button", { name: "Unlink", exact: true }),
  ).toHaveCount(0);
});

test("stop actions and ramp help are visible, and mouse selection tolerates small movements", async ({
  page,
}) => {
  const dialog = page.getByRole("dialog", { name: "Edit Red scale" });
  const add = dialog.getByRole("button", { name: "Add stop", exact: true });
  await expect(
    dialog.getByRole("button", { name: "More options", exact: true }),
  ).toHaveCount(0);
  const remove = dialog.getByRole("button", {
    name: "Remove selected stop",
    exact: true,
  });
  const help = dialog.getByText("Double click ramp to add a stop", {
    exact: true,
  });
  const ramp = dialog.locator('[data-component="GradientStopControl"]');
  await expect(help).toBeVisible();
  const addBounds = (await add.boundingBox())!;
  const removeBounds = (await remove.boundingBox())!;
  expect(removeBounds.y).toBe(addBounds.y);
  expect(removeBounds.x).toBeGreaterThan(addBounds.x);
  expect((await help.boundingBox())!.y).toBeGreaterThanOrEqual(
    (await ramp.boundingBox())!.y + (await ramp.boundingBox())!.height,
  );
  const stop = ramp.getByRole("button").nth(1);
  const before = (await working(page)).colorSystem.scales.find(
    (scale) => scale.name === "Red",
  )!;
  const bounds = (await stop.boundingBox())!;
  const x = bounds.x + bounds.width / 2 + 5;
  const y = bounds.y + bounds.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 3, y + 2);
  await page.mouse.up();
  await expect(stop).toHaveAttribute("aria-pressed", "true");
  expect(
    (await working(page)).colorSystem.scales.find(
      (scale) => scale.name === "Red",
    ),
  ).toEqual(before);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 20, y, { steps: 5 });
  await page.mouse.up();
  await expect
    .poll(
      async () =>
        (await working(page)).colorSystem.scales.find(
          (scale) => scale.name === "Red",
        )!.stops,
    )
    .not.toEqual(before.stops);
  const afterDrag = (await working(page)).colorSystem.scales.find(
    (scale) => scale.name === "Red",
  )!;
  await stop.press("ArrowRight");
  await expect
    .poll(
      async () =>
        (await working(page)).colorSystem.scales.find(
          (scale) => scale.name === "Red",
        )!.stops,
    )
    .not.toEqual(afterDrag.stops);
  await remove.click();
  await expect(ramp.getByRole("button")).toHaveCount(before.stops.length - 1);
});

test("the 32px ramp and both editor layouts fit a narrow popover", async ({
  page,
}) => {
  const dialog = page.getByRole("dialog", { name: "Edit Red scale" });
  await page.setViewportSize({ width: 360, height: 1100 });
  await page
    .getByRole("tabpanel", { name: "Colors", exact: true })
    .getByRole("button", { name: "Red", exact: true })
    .press("Enter");
  const fits = () =>
    dialog.evaluate((node) => ({
      overflow: Math.max(0, node.scrollWidth - node.clientWidth),
      outside: [...node.querySelectorAll("input, button, canvas")]
        .filter((control) => {
          const bounds = control.getBoundingClientRect();
          const parent = node.getBoundingClientRect();
          return (
            bounds.width > 1 &&
            bounds.height > 1 &&
            (bounds.left < parent.left - 1 || bounds.right > parent.right + 1)
          );
        })
        .map(
          (control) => control.getAttribute("aria-label") ?? control.tagName,
        ),
    }));
  await expect.poll(fits).toEqual({ overflow: 0, outside: [] });
  const model = dialog.getByRole("radio", { name: "Cartesian model" });
  await expect(model).toBeChecked();
  await model.click();
  await expect(model).toBeChecked();
  await dialog
    .getByRole("switch", { name: "Use custom contrast steps" })
    .locator("xpath=ancestor::label")
    .click();
  await dialog
    .getByRole("button", { name: "Custom contrast steps", exact: true })
    .click();
  const ramp = dialog.getByRole("img", { name: "Contrast lightness ramp" });
  await expect(ramp).toHaveAttribute("data-ramp-variant", "narrow");
  expect(await ramp.evaluate((node) => getComputedStyle(node).width)).toBe(
    "32px",
  );
  await expect.poll(fits).toEqual({ overflow: 0, outside: [] });
  await expect
    .poll(
      async () =>
        (await working(page)).colorSystem.scales.find(
          (scale) => scale.name === "Red",
        )!.customContrasts,
    )
    .toBeTruthy();
  await dialog.getByRole("slider", { name: "100", exact: true }).press("End");
  await expect
    .poll(
      async () =>
        (await working(page)).colorSystem.scales.find(
          (scale) => scale.name === "Red",
        )!.customContrasts!.steps[0].value,
    )
    .toBe(21);
  const before = (await working(page)).colorSystem.scales.find(
    (scale) => scale.name === "Red",
  )!;
  await dialog.getByRole("button", { name: "Sort", exact: true }).click();
  await expect
    .poll(
      async () =>
        (await working(page)).colorSystem.scales.find(
          (scale) => scale.name === "Red",
        )!.customContrasts,
    )
    .toEqual({
      ...before.customContrasts!,
      steps: [...before.customContrasts!.steps].sort(
        (a, b) => a.value - b.value,
      ),
    });
});
