// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Page } from "@playwright/test";
import { selectMode } from "./modeControl";
import { AUTHORING_STORAGE_KEY } from "../../src/features/edit-session/storage";
import type { EditSessionSnapshot } from "../../src/features/edit-session/state";
import type { CascadeTokenExport } from "../../src/features/tokens/cascadeExport";

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
});
test.afterEach(async ({ page }) => {
  expect(errors.get(page)).toEqual([]);
});

async function edit(page: Page) {
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  await openModeSets(page);
}
async function openModeSets(page: Page) {
  const heading = page.getByRole("button", { name: "Mode sets", exact: true });
  if ((await heading.getAttribute("aria-expanded")) === "false")
    await heading.click();
}
async function closeChangeLog(page: Page) {
  const heading = page
    .getByRole("complementary", { name: "Change log" })
    .getByRole("heading", { name: "Changes", exact: true });
  if (await heading.isVisible())
    await page
      .getByRole("banner")
      .getByRole("button", { name: /^Change log,/ })
      .click();
  await expect(heading).toHaveCount(0);
}
async function openColorScaleEditor(page: Page, name: string) {
  const tab = page.getByRole("tab", { name: "Color scales", exact: true });
  if (await tab.isVisible()) await tab.click();
  else {
    await page.getByRole("button", { name: /Color system controls$/ }).click();
    await page
      .getByRole("option", { name: "Color scales", exact: true })
      .click();
  }
  await page.getByRole("button", { name, exact: true }).first().click();
}
async function cancel(page: Page) {
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Discard edits", exact: true })
    .click();
}
async function backgroundLightness(page: Page, value: number) {
  const slider = page
    .getByRole("dialog")
    .getByRole("slider", { name: "Background lightness" });
  await slider.press("Home");
  for (let index = 0; index < Math.floor(value / 10); index++)
    await slider.press("PageUp");
  for (let index = 0; index < value % 10; index++)
    await slider.press("ArrowRight");
}
async function working(page: Page): Promise<EditSessionSnapshot> {
  await expect
    .poll(async () =>
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

async function colorOutput(page: Page): Promise<CascadeTokenExport> {
  return page.evaluate(async () => {
    const path = "/src/features/tokens/state.ts";
    const source = await (await fetch(path)).text();
    const jotaiUrl = source
      .split('"')
      .find(
        (entry) => entry.split("?")[0] === "/node_modules/.vite/deps/jotai.js",
      );
    if (!jotaiUrl) throw new Error("Missing public Jotai module.");
    const [jotai, tokens] = await Promise.all([import(jotaiUrl), import(path)]);
    return JSON.parse(jotai.getDefaultStore().get(tokens.colorTokenJsonAtom));
  });
}

test("configured foundation deletion clears overrides, flattens output and survives Save and Cancel", async ({
  page,
}, info) => {
  test.setTimeout(60_000);
  await expect(
    page.getByRole("button", { name: "Remove Color scheme from color" }),
  ).toHaveCount(0);
  await edit(page);
  const initial = await working(page);
  const configured = structuredClone(initial);
  const shared = configured.modeSets.find((set) => set.key === "colorScheme")!;
  const contrast = configured.modeSets.find((set) => set.key === "contrast")!;
  const typography = configured.modeSets.find(
    (set) => set.key === "textScaling",
  )!;
  shared.authoringCapabilities = [
    ...(shared.authoringCapabilities ?? []).filter(
      (id) => !id.startsWith("color.") && !id.startsWith("typography."),
    ),
    "color.backgroundLightness",
    "color.backgroundScaleId",
    "color.scales",
    "typography.textZoom",
  ];
  shared.modes[1].foundations.typography = { textZoom: 2 };
  shared.modes[1].foundations.color = {
    backgroundLightness: 0.2,
    backgroundScaleId: configured.colorSystem.scales[1].id,
    scaleStops: {
      [configured.colorSystem.scales[0].id]: {
        [configured.colorSystem.scales[0].stops[0].id]: { lightness: 0.3 },
      },
    },
  };
  typography.authoringCapabilities = [];
  typography.modes.forEach((mode) => {
    mode.foundations = {};
  });
  configured.adaptiveClaims = {
    ...configured.adaptiveClaims,
    "color.backgroundLightness": shared.id,
    "typography.textZoom": shared.id,
    "color.contrastMultiplier": contrast.id,
  };
  await page.evaluate(
    ({ key, source, id }) => {
      const record = JSON.parse(localStorage.getItem(key)!);
      record.working = source;
      record.saved = source;
      record.attachments = { [id]: ["color", "typography"] };
      record.savedAttachments = record.attachments;
      localStorage.setItem(key, JSON.stringify(record));
    },
    { key: AUTHORING_STORAGE_KEY, source: configured, id: shared.id },
  );
  await page.reload();
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations", exact: true })
    .click();
  await openModeSets(page);
  await selectMode(page, "Dark");
  const card = page.getByRole("region", { name: "Color scheme mode set" });
  await expect(
    card.getByRole("button", { name: "Remove Color scheme from color" }),
  ).toBeEnabled();
  await card
    .getByRole("button", { name: "Remove Color scheme from color" })
    .click();
  await expect(card).toHaveCount(0);
  await expect
    .poll(
      async () =>
        (await working(page)).modeSets.find((set) => set.id === shared.id)!
          .authoringCapabilities,
    )
    .toEqual(
      shared.authoringCapabilities.filter((id) => !id.startsWith("color.")),
    );
  const partial = await working(page);
  expect(
    partial.modeSets
      .find((set) => set.id === shared.id)!
      .modes.every((mode) => !mode.foundations.color),
  ).toBe(true);
  expect(
    partial.modeSets.find((set) => set.id === shared.id)!.modes[1].foundations
      .typography?.textZoom,
  ).toBe(2);
  expect(partial.adaptiveClaims!["color.backgroundLightness"]).toBeUndefined();
  expect(partial.adaptiveClaims!["typography.textZoom"]).toBe(shared.id);
  expect(partial.colorSystem).toEqual(configured.colorSystem);
  expect(partial.taxonomy).toEqual(configured.taxonomy);
  expect(
    (await colorOutput(page)).tokens.every((row) => !row.name.colorScheme),
  ).toBe(true);
  await page.getByRole("tab", { name: "Contrasts", exact: true }).click();
  await expect(
    page
      .getByRole("tabpanel", { name: "Contrasts", exact: true })
      .getByRole("slider", { name: "100", exact: true }),
  ).toBeEnabled();
  await page.getByRole("tab", { name: "Typography", exact: true }).click();
  await page.getByRole("button", { name: "Mode sets", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Edit Dark for typography" }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Colors", exact: true }).click();
  await cancel(page);
  await openModeSets(page);
  await expect(card).toBeVisible();
  expect(await working(page)).toEqual(configured);
  await edit(page);
  await page
    .getByRole("button", { name: "Remove Color scheme from color" })
    .click();
  await page
    .getByRole("button", { name: "Remove Contrast from color" })
    .click();
  await expect(
    page.getByText("Color has no mode sets. Add one to create options.", {
      exact: true,
    }),
  ).toBeVisible();
  const flat = await colorOutput(page);
  expect(flat.modeSets).toEqual([]);
  expect(new Set(flat.tokens.map((row) => row.conceptId)).size).toBe(
    flat.tokens.length,
  );
  expect(
    flat.tokens.every(
      (row) => !row.name.colorScheme && !row.name.contrast && !("sets" in row),
    ),
  ).toBe(true);
  await closeChangeLog(page);
  await openColorScaleEditor(page, "Cyan");
  await expect(
    page
      .getByRole("dialog")
      .getByRole("combobox", { name: "Color scale name", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("radio", { name: "Elements", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /Copy resolved background color/ }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "System settings", exact: true })
    .click();
  await page.getByRole("button", { name: /Output gamut$/ }).click();
  await page.getByRole("option", { name: "Display P3", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /Copy resolved background color/ }),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("removed-modes-evaluation.png"),
    animations: "disabled",
  });
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Save", exact: true })
    .click();
  const saved = await working(page);
  await page.reload();
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations", exact: true })
    .click();
  await openModeSets(page);
  await expect(
    page.getByText("Color has no mode sets. Add one to create options.", {
      exact: true,
    }),
  ).toBeVisible();
  expect(await working(page)).toEqual(saved);
  expect((await colorOutput(page)).modeSets).toEqual([]);
  await cancel(page);
  expect(await working(page)).toEqual(saved);
  await expect(
    page.getByRole("button", { name: /^Remove .* from color$/ }),
  ).toHaveCount(0);
  await page.getByRole("tab", { name: "Typography", exact: true }).click();
  await page.getByRole("button", { name: "Mode sets", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Color scheme mode set" }),
  ).toBeVisible();
});

test("Typography retains its unclaimed Text size control and empty rendering does not edit authoring data", async ({
  page,
}) => {
  await edit(page);
  await page.getByRole("tab", { name: "Typography", exact: true }).click();
  await openModeSets(page);
  const remove = page.getByRole("button", {
    name: /^Remove .* from typography$/,
  });
  while (await remove.count()) await remove.first().click();
  const message = page.locator('[data-component="FoundationModeEmptyState"]');
  await expect(message).toHaveText(
    "Typography has no mode sets. Add one to create options.",
  );
  await expect(
    page.getByRole("textbox", { name: "Text size", exact: true }),
  ).toBeVisible();
  const snapshot = await working(page);
  const toggle = page.getByRole("button", { name: "Mode sets", exact: true });
  await toggle.click();
  await expect(message).not.toBeVisible();
  await toggle.click();
  await expect(message).toBeVisible();
  expect(await working(page)).toEqual(snapshot);
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Save", exact: true })
    .click();
  await cancel(page);
  await openModeSets(page);
  await expect(message).toHaveText(
    "Typography has no mode sets. Select Edit to add one.",
  );
  await expect(page.getByText("Text size", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Text size", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Add mode set to typography" }),
  ).toHaveCount(0);
  expect(await working(page)).toEqual(snapshot);
});

for (const width of [1280, 800])
  test(`preview toolbar and independent appearance at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await page.getByRole("radio", { name: "Preview", exact: true }).click();
    const toolbar = page.locator('[data-component="PreviewToolbar"]');
    await expect(toolbar).toBeVisible();
    await expect(
      page
        .getByRole("banner")
        .getByRole("button", { name: "Adaptive controls" }),
    ).toHaveCount(0);
    await selectMode(page, "Dark");
    await expect(page.locator(".sampleApp")).toHaveAttribute(
      "data-scheme",
      "dark",
    );
    const previewColor = await page
      .locator(".sampleApp")
      .evaluate((node) => getComputedStyle(node).backgroundColor);
    const appearance = page.getByRole("button", {
      name: "Dark app appearance",
    });
    await expect(appearance).toHaveAttribute("aria-pressed", "false");
    await appearance.click();
    await expect(appearance).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".sampleApp")).toHaveAttribute(
      "data-scheme",
      "dark",
    );
    expect(
      await page
        .locator(".sampleApp")
        .evaluate((node) => getComputedStyle(node).backgroundColor),
    ).toBe(previewColor);
    await selectMode(page, "Light");
    await expect(appearance).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".sampleApp")).toHaveAttribute(
      "data-scheme",
      "light",
    );
    expect(
      await page
        .locator(".sampleApp")
        .evaluate((node) => getComputedStyle(node).backgroundColor),
    ).not.toBe(previewColor);
    await page.screenshot({
      path: info.outputPath(`foundation-preview-${width}-light.png`),
      animations: "disabled",
    });
    await selectMode(page, "Dark");
    const box = await toolbar.boundingBox();
    const view = await page.locator('[data-view="preview"]').boundingBox();
    expect(box).not.toBeNull();
    expect(view).not.toBeNull();
    expect(
      Math.abs(box!.x + box!.width / 2 - view!.x - view!.width / 2),
    ).toBeLessThan(2);
    expect(box!.x).toBeGreaterThanOrEqual(view!.x);
    expect(box!.x + box!.width).toBeLessThanOrEqual(view!.x + view!.width + 1);
    await page.screenshot({
      path: info.outputPath(`foundation-preview-${width}.png`),
      animations: "disabled",
    });
    await page.reload();
    await page
      .getByRole("navigation", { name: "Navigation", exact: true })
      .getByRole("link", { name: "Foundations", exact: true })
      .click();
    await page.getByRole("radio", { name: "Preview", exact: true }).click();
    await expect(appearance).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".sampleApp")).toHaveAttribute(
      "data-scheme",
      "dark",
    );
    await page.evaluate(async () => {
      // Design has no sidebar entry; use the page's existing public state.
      const source = await (
        await fetch("/src/pages/BrowsingContext.tsx")
      ).text();
      const dependency = (path: string) => {
        const url = source
          .split('"')
          .find((entry) => entry.split("?")[0] === path);
        if (!url) throw new Error(`Missing browser module ${path}.`);
        return url;
      };
      const [jotai, navigation] = await Promise.all([
        import(dependency("/node_modules/.vite/deps/jotai.js")),
        import(dependency("/src/state/view/navigation.ts")),
      ]);
      jotai.getDefaultStore().set(navigation.activePageAtom, "design");
    });
    await page.getByRole("radio", { name: "Preview", exact: true }).click();
    await expect(toolbar).toBeVisible();
    await expect(page.locator(".sampleApp")).toHaveAttribute(
      "data-scheme",
      "dark",
    );
  });

test("mode editing uses live overrides, saves, cancels and restores through refresh", async ({
  page,
}) => {
  await edit(page);
  await page.getByRole("button", { name: "Edit Dark for color" }).click();
  await backgroundLightness(page, 25);
  await expect
    .poll(
      async () =>
        (await working(page)).modeSets[0].modes[1].foundations.color
          ?.backgroundLightness,
    )
    .toBe(0.25);
  const changed = await working(page);
  const termIds = changed.taxonomy!.terms.map((term) => term.id);
  await page.keyboard.press("Escape");
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Save", exact: true })
    .click();
  await page.getByRole("button", { name: "Edit Dark for color" }).click();
  await backgroundLightness(page, 35);
  await page.keyboard.press("Escape");
  await page.reload();
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations", exact: true })
    .click();
  await expect(
    page.getByRole("banner").getByRole("button", { name: "Save", exact: true }),
  ).toBeVisible();
  await cancel(page);
  await expect
    .poll(
      async () =>
        (await working(page)).modeSets[0].modes[1].foundations.color
          ?.backgroundLightness,
    )
    .toBe(0.25);
  expect((await working(page)).taxonomy!.terms.map((term) => term.id)).toEqual(
    termIds,
  );
  await expect(
    page.getByRole("button", { name: "Edit Dark for color" }),
  ).toHaveCount(0);
  await selectMode(page, "Light");
  expect((await working(page)).colorSystem.backgroundLightness).toBe(1);
  await expect(
    page
      .getByRole("tabpanel", { name: "Colors", exact: true })
      .first()
      .getByText("Background lightness", { exact: true }),
  ).toHaveCount(0);
});

test("enabled variables appear only in mode popovers including shared defaults", async ({
  page,
}) => {
  await edit(page);
  const original = await working(page);
  const colorPanel = page
    .getByRole("tabpanel", { name: "Colors", exact: true })
    .first();
  await expect(
    colorPanel.getByText("Background lightness", { exact: true }),
  ).toHaveCount(0);
  await expect(
    colorPanel.getByText("Overall contrast", { exact: true }),
  ).toHaveCount(0);
  await expect(
    colorPanel.getByRole("button", { name: /Base color scale$/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Edit Light for color" }).click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("heading", { name: "Light", exact: true }),
  ).toBeVisible();
  await backgroundLightness(page, 80);
  await expect
    .poll(async () => (await working(page)).colorSystem.backgroundLightness)
    .toBe(0.8);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Edit Regular for color" }).click();
  const contrast = page
    .getByRole("dialog")
    .getByRole("slider", { name: "Overall contrast" });
  await contrast.press("ArrowLeft");
  await expect(contrast).toHaveValue("0.99");
  await expect
    .poll(
      async () => (await working(page)).colorSystem.settings.contrastMultiplier,
    )
    .toBe(0.99);
  await page.keyboard.press("Escape");
  await page.getByRole("tab", { name: "Typography", exact: true }).click();
  await page.getByRole("button", { name: "Mode sets", exact: true }).click();
  const typographyPanel = page.getByRole("tabpanel", {
    name: "Typography",
    exact: true,
  });
  await expect(
    typographyPanel.getByRole("textbox", { name: "Text size", exact: true }),
  ).toHaveCount(0);
  await expect(
    typographyPanel.getByRole("slider", { name: "Text size", exact: true }),
  ).toHaveCount(0);
  await expect(
    typographyPanel.getByRole("button", {
      name: "Text size Follows",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    typographyPanel.getByRole("button", { name: "Font sizes", exact: true }),
  ).toHaveAttribute("aria-expanded", "true");
  await typographyPanel
    .getByRole("button", { name: /^Edit .* for typography$/ })
    .first()
    .click();
  const textDefault = original.modeSets.find(
    (set) => set.key === "textScaling",
  )!;
  await expect(
    page.getByRole("dialog").getByRole("heading", {
      name: textDefault.modes.find(
        (mode) => mode.id === textDefault.defaultModeId,
      )!.name,
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("slider", { name: "Text size", exact: true })
    .press("ArrowRight");
  await expect
    .poll(async () => (await working(page)).typography.textZoom)
    .toBe(1);
  await page.keyboard.press("Escape");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Modes", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Edit mode set Color scheme", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByText("Base color scale", { exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save", exact: true })
    .click();
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations", exact: true })
    .click();
  await page.getByRole("tab", { name: "Colors", exact: true }).click();
  await openModeSets(page);
  await expect(
    colorPanel.getByText("Base color scale", { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Edit Light for color" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Background scale$/ })
    .click();
  await page.getByRole("option", { name: "Cyan", exact: true }).click();
  await expect
    .poll(async () => (await working(page)).colorSystem.backgroundScaleId)
    .toBe(
      original.colorSystem.scales.find((scale) => scale.name === "Cyan")!.id,
    );
  const changed = await working(page);
  const defaultMode = original.modeSets.find(
    (set) => set.key === "colorScheme",
  )!.modes[0];
  expect(
    changed.modeSets.find((set) => set.key === "colorScheme")!.modes[0],
  ).toEqual(defaultMode);
  expect(changed.taxonomy).toEqual(original.taxonomy);
  await page
    .getByRole("dialog")
    .getByRole("slider", { name: "Background lightness" })
    .press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await cancel(page);
  await expect(
    colorPanel.getByText("Base color scale", { exact: true }),
  ).toBeVisible();
  await expect(
    colorPanel.getByText("Background lightness", { exact: true }),
  ).toHaveCount(0);
  expect((await working(page)).colorSystem).toEqual(original.colorSystem);
});

test("variable setup stays staged until Apply and mode Edit exposes values only", async ({
  page,
}, info) => {
  await edit(page);
  const initial = await working(page);
  const textSet = initial.modeSets.find((set) => set.key === "textScaling")!;
  const trigger = page.getByRole("button", { name: "Add mode set to color" });
  const card = page.getByRole("region", { name: `${textSet.name} mode set` });
  const setup = page.getByRole("dialog").filter({
    has: page.getByRole("heading", {
      name: "Select mode-specific variables",
      exact: true,
    }),
  });
  await trigger.click();
  await page.getByRole("menuitem", { name: textSet.name, exact: true }).click();
  await setup.getByText("Base color scale", { exact: true }).click();
  await expect(
    setup.getByRole("checkbox", { name: "Base color scale", exact: true }),
  ).toBeChecked();
  await expect(card).toHaveCount(0);
  expect(await working(page)).toEqual(initial);
  await page.screenshot({
    path: info.outputPath("variable-setup-desktop.png"),
    animations: "disabled",
  });
  await page.setViewportSize({ width: 390, height: 900 });
  const box = await setup.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  expect(
    await setup.evaluate((node) => node.scrollWidth <= node.clientWidth),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("variable-setup-narrow.png"),
    animations: "disabled",
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await setup.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(setup).toHaveCount(0);
  await expect(card).toHaveCount(0);
  expect(await working(page)).toEqual(initial);
  await trigger.click();
  await page.getByRole("menuitem", { name: textSet.name, exact: true }).click();
  await expect(
    setup.getByRole("checkbox", { name: "Base color scale", exact: true }),
  ).not.toBeChecked();
  await setup.getByText("Base color scale", { exact: true }).click();
  await setup.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(card).toBeVisible();
  await expect
    .poll(
      async () =>
        (await working(page)).modeSets.find((set) => set.id === textSet.id)!
          .authoringCapabilities,
    )
    .toEqual(["typography.textZoom", "color.backgroundScaleId"]);
  expect(
    (await working(page)).modeSets.find((set) => set.id === textSet.id)!.modes,
  ).toEqual(textSet.modes);
  await card
    .getByRole("button", { name: /^Edit / })
    .first()
    .click();
  const editor = page.getByRole("dialog");
  await expect(
    editor.getByRole("button", { name: /Background scale$/ }),
  ).toBeVisible();
  await expect(
    editor.getByRole("heading", {
      name: "Select mode-specific variables",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    editor.getByRole("button", { name: "Apply", exact: true }),
  ).toHaveCount(0);
  await expect(editor.getByRole("checkbox")).toHaveCount(0);
});

test("attaching shared sets and enabling variables synchronizes with Modes", async ({
  page,
}) => {
  await edit(page);
  await page.getByRole("tab", { name: "Typography", exact: true }).click();
  await page.getByRole("button", { name: "Mode sets", exact: true }).click();
  await page
    .getByRole("button", { name: "Add mode set to typography" })
    .click();
  const add = page.getByRole("menu", { name: "Add mode set to typography" });
  await expect(add.getByRole("menuitem")).toHaveText([
    "Color scheme",
    "Contrast",
    "Create new mode set",
  ]);
  await expect(add.getByRole("separator")).toHaveCount(1);
  await add
    .getByRole("menuitem", { name: "Color scheme", exact: true })
    .click();
  await expect(add).toHaveCount(0);
  const setup = page.getByRole("dialog").filter({
    has: page.getByRole("heading", {
      name: "Select mode-specific variables",
      exact: true,
    }),
  });
  await expect(setup).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Color scheme mode set" }),
  ).toHaveCount(0);
  await expect(
    setup.getByRole("checkbox", { name: /Text size/ }),
  ).toBeDisabled();
  await setup.getByRole("button", { name: "Apply", exact: true }).click();
  const sharedCard = page.getByRole("region", {
    name: "Color scheme mode set",
  });
  await expect(sharedCard).toBeVisible();
  await expect(sharedCard.getByRole("button", { name: /^Edit / })).toHaveCount(
    0,
  );
  await sharedCard.getByRole("row", { name: "Dark", exact: true }).click();
  await expect(
    sharedCard.getByRole("row", { name: "Dark", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Modes", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Edit mode set Color scheme", exact: true })
    .click();
  await expect(
    page.getByRole("dialog").getByRole("button", { name: /Foundations$/ }),
  ).toContainText("Typography");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations", exact: true })
    .click();
  await page.getByRole("tab", { name: "Colors", exact: true }).click();
  const beforeCreation = await page.evaluate(
    (key) => localStorage.getItem(key),
    AUTHORING_STORAGE_KEY,
  );
  await page.getByRole("button", { name: "Add mode set to color" }).click();
  await page
    .getByRole("menuitem", { name: "Create new mode set", exact: true })
    .click();
  const create = page
    .getByRole("dialog")
    .filter({ has: page.getByRole("heading", { name: "New mode set" }) });
  await create
    .getByRole("textbox", { name: "Mode set name" })
    .fill("Background presets");
  await create.getByRole("button", { name: "Save", exact: true }).click();
  const card = page.getByRole("region", {
    name: "Background presets mode set",
  });
  await expect(card).toHaveCount(0);
  const choices = page.getByRole("dialog").filter({
    has: page.getByRole("heading", {
      name: "Select mode-specific variables",
    }),
  });
  await expect(choices).toBeVisible();
  expect(
    (await working(page)).modeSets.some(
      (set) => set.name === "Background presets",
    ),
  ).toBe(false);
  await choices.getByText("Base color scale", { exact: true }).click();
  await choices.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(card).toHaveCount(0);
  expect(
    (await working(page)).modeSets.some(
      (set) => set.name === "Background presets",
    ),
  ).toBe(false);
  await expect
    .poll(() =>
      page.evaluate((key) => localStorage.getItem(key), AUTHORING_STORAGE_KEY),
    )
    .toBe(beforeCreation);
  await page.getByRole("button", { name: "Add mode set to color" }).click();
  await page
    .getByRole("menuitem", { name: "Create new mode set", exact: true })
    .click();
  await create
    .getByRole("textbox", { name: "Mode set name" })
    .fill("Background presets");
  await create.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    choices.getByRole("checkbox", { name: "Base color scale", exact: true }),
  ).not.toBeChecked();
  await choices.getByText("Base color scale", { exact: true }).click();
  await expect(
    choices.getByRole("checkbox", { name: "Base color scale", exact: true }),
  ).toBeChecked();
  await choices.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(card).toBeVisible();
  await card
    .getByRole("button", { name: /^Edit .* for color/ })
    .first()
    .click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("heading", { name: "Select mode-specific variables" }),
  ).toHaveCount(0);
  await expect(page.getByRole("dialog").getByRole("checkbox")).toHaveCount(0);
  await expect(
    page
      .getByRole("tabpanel", { name: "Colors", exact: true })
      .first()
      .getByText("Base color scale", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("dialog").getByRole("button", { name: /Background scale$/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("dialog").getByRole("button", { name: /Background scale$/ }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await card
    .getByRole("button", {
      name: "Remove Background presets from color",
      exact: true,
    })
    .click();
  await expect(card).toHaveCount(0);
  await expect(
    page
      .getByRole("tabpanel", { name: "Colors", exact: true })
      .first()
      .getByRole("button", { name: /Base color scale$/ }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Modes", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Background presets", exact: true }),
  ).toBeVisible();
});

test("read-only selection and default-only contrast editing preserve polarity", async ({
  page,
}) => {
  await expect(
    page.getByRole("button", { name: "Add mode set to color" }),
  ).toHaveCount(0);
  await selectMode(page, "Dark");
  await expect(
    page.getByRole("button", { name: "Edit Dark for color" }),
  ).toHaveCount(0);
  await edit(page);
  await page.getByRole("tab", { name: "Contrasts", exact: true }).click();
  const controls = page.getByRole("tabpanel", {
    name: "Contrasts",
    exact: true,
  });
  await expect(
    controls.getByRole("slider", { name: "100", exact: true }),
  ).toBeDisabled();
  await expect(
    controls.getByRole("button", { name: "Add contrast", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: /^Contrasts authored for/ }),
  ).toHaveCount(0);
  await expect(page.getByText(/Editing .* background values/)).toHaveCount(0);
  await selectMode(page, "Light");
  await expect(
    controls.getByRole("slider", { name: "100", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "System settings", exact: true })
    .click();
  await expect(
    page.getByRole("slider", {
      name: "Polarity compensation (dark modes)",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("slider", { name: "Background blend", exact: true }),
  ).toHaveCount(1);
  await expect(
    page.getByRole("slider", { name: "Source curve offset", exact: true }),
  ).toHaveCount(1);
  await page.getByRole("button", { name: /Output gamut$/ }).click();
  await page.getByRole("option", { name: "Display P3", exact: true }).click();
  await page.getByRole("tab", { name: "Color scales", exact: true }).click();
  await page
    .getByRole("button", { name: /^Cyan$/ })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("radio", { name: "Elements", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /Copy resolved background color/ }),
  ).toBeVisible();
});

test("mode-specific scale stops preserve base values and source identities", async ({
  page,
}, info) => {
  await edit(page);
  const original = await working(page);
  await page.getByRole("button", { name: "Add mode set to color" }).click();
  await page
    .getByRole("menuitem", { name: "Create new mode set", exact: true })
    .click();
  const create = page
    .getByRole("dialog")
    .filter({ has: page.getByRole("heading", { name: "New mode set" }) });
  await create
    .getByRole("textbox", { name: "Mode set name" })
    .fill("Stop presets");
  await create.getByRole("textbox", { name: "Name", exact: true }).fill("Base");
  await create.getByRole("button", { name: "Add mode", exact: true }).click();
  await create
    .getByRole("textbox", { name: "Name", exact: true })
    .last()
    .fill("Alternate");
  await create.getByRole("button", { name: "Save", exact: true }).click();
  const card = page.getByRole("region", { name: "Stop presets mode set" });
  await expect(card).toHaveCount(0);
  const setup = page.getByRole("dialog").filter({
    has: page.getByRole("heading", {
      name: "Select mode-specific variables",
    }),
  });
  await setup.getByText("Color scale stops", { exact: true }).click();
  await setup.getByRole("button", { name: "Apply", exact: true }).click();
  await card.getByRole("button", { name: "Edit Alternate for color" }).click();
  const editor = page.getByRole("dialog", { name: "Edit Alternate for color" });
  const picker = editor.getByRole("button", { name: /Color scale$/ });
  await expect(picker).toBeVisible();
  await expect(picker).toBeFocused();
  await expect(
    editor.getByRole("heading", { name: "Alternate", exact: true }),
  ).toBeVisible();
  await expect(
    editor.getByRole("textbox", { name: "Color scale name" }),
  ).toHaveCount(0);
  await expect(
    editor.getByRole("checkbox", { name: "Hide from publishing" }),
  ).toHaveCount(0);
  await expect(
    editor.getByRole("button", {
      name: /Add stop|Remove stop|Remove selected stop|Edit base/,
    }),
  ).toHaveCount(0);
  await picker.click();
  await page.getByRole("option", { name: "Cyan", exact: true }).click();
  const lightness = editor.getByRole("textbox", { name: /^Lightness/ });
  await expect(lightness).toBeVisible();
  const initialLightness = await lightness.inputValue();
  await lightness.press("ArrowDown");
  await expect(lightness).not.toHaveValue(initialLightness);
  const nextLightness = Number.parseFloat(await lightness.inputValue()) / 100;
  await expect
    .poll(async () => {
      const set = (await working(page)).modeSets.find(
        (set) => set.name === "Stop presets",
      );
      return Object.keys(
        set?.modes.find((mode) => mode.name === "Alternate")?.foundations.color
          ?.scaleStops ?? {},
      ).length;
    })
    .toBe(1);
  const scale = original.colorSystem.scales.find(
    (scale) => scale.name === "Cyan",
  )!;
  await expect
    .poll(
      async () =>
        (await working(page)).modeSets
          .find((set) => set.name === "Stop presets")!
          .modes.find((mode) => mode.name === "Alternate")!.foundations.color!
          .scaleStops![scale.id][scale.stops[0].id].lightness,
    )
    .toBeCloseTo(nextLightness, 3);
  const changed = await working(page);
  expect(changed.colorSystem).toEqual(original.colorSystem);
  expect(changed.taxonomy).toEqual(original.taxonomy);
  await page.screenshot({
    path: info.outputPath("color-stop-mode-editor-desktop.png"),
    animations: "disabled",
  });
  await page.setViewportSize({ width: 800, height: 900 });
  const box = await editor.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(800);
  expect(
    await editor.evaluate((node) => node.scrollWidth <= node.clientWidth),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("color-stop-mode-editor-narrow.png"),
    animations: "disabled",
  });
  await page.keyboard.press("Escape");
  await expect(
    card.getByRole("row", { name: "Alternate", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await card.getByRole("button", { name: "Edit Base for color" }).click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("heading", { name: "Base", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("dialog").getByText("All modes", { exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await card.getByRole("button", { name: "Edit Alternate for color" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Color scale$/ })
    .click();
  await page.getByRole("option", { name: "Cyan", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Remove stop override", exact: true })
    .click();
  await expect(
    page.getByRole("dialog").getByRole("textbox", { name: /^Lightness/ }),
  ).toHaveValue(initialLightness);
  await expect
    .poll(
      async () =>
        (await working(page)).modeSets
          .find((set) => set.name === "Stop presets")
          ?.modes.find((mode) => mode.name === "Alternate")?.foundations.color
          ?.scaleStops,
    )
    .toBeUndefined();
  expect((await working(page)).colorSystem).toEqual(original.colorSystem);
  await page.keyboard.press("Escape");
  await closeChangeLog(page);
  await openColorScaleEditor(page, "Cyan");
  const structure = page.getByRole("dialog");
  await expect(
    structure.getByRole("combobox", { name: "Color scale name", exact: true }),
  ).toBeVisible();
  await expect(
    structure.getByRole("button", { name: "Add stop", exact: true }),
  ).toBeVisible();
  await expect(
    structure.getByRole("textbox", { name: /^Lightness/ }),
  ).toHaveCount(0);
  await expect(
    structure.getByRole("listbox", { name: "Palette colors" }),
  ).toHaveCount(0);
  await expect(
    structure.getByRole("button", { name: "Edit base", exact: true }),
  ).toHaveCount(0);
  const handle = await structure
    .getByRole("button", { name: /^Stop 1,/ })
    .boundingBox();
  expect(handle).not.toBeNull();
  await page.mouse.move(
    handle!.x + handle!.width / 2,
    handle!.y + handle!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(handle!.x - 40, handle!.y + handle!.height / 2);
  await page.mouse.up();
  expect((await working(page)).colorSystem).toEqual(original.colorSystem);
});

test("temporary adaptive previews do not enter saved source or survive refresh", async ({
  page,
}) => {
  await edit(page);
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Save", exact: true })
    .click();
  const source = await working(page);
  await page.getByRole("radio", { name: "Preview", exact: true }).click();
  await page
    .locator('[data-component="PreviewToolbar"]')
    .getByRole("button", { name: "Adaptive controls" })
    .click();
  const slider = page
    .getByRole("dialog")
    .getByRole("slider", { name: "Text size" });
  await slider.press("ArrowRight");
  await expect(slider).toHaveValue("1");
  await page.keyboard.press("Escape");
  expect(await working(page)).toEqual(source);
  await page.reload();
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations", exact: true })
    .click();
  await page.getByRole("radio", { name: "Preview", exact: true }).click();
  await page
    .locator('[data-component="PreviewToolbar"]')
    .getByRole("button", { name: "Adaptive controls" })
    .click();
  await expect(slider).toHaveValue("0");
  expect(await working(page)).toEqual(source);
});

test("confirmed Reset all recovers invalid storage and establishes a durable default baseline", async ({
  page,
}) => {
  const invalid = '{"version":1,"working":"broken"}';
  await page.evaluate(
    ({ key, invalid }) => localStorage.setItem(key, invalid),
    { key: AUTHORING_STORAGE_KEY, invalid },
  );
  await page.reload();
  await expect(
    page.getByText(/Stored authoring data has an unsupported format/).first(),
  ).toBeVisible();
  expect(
    await page.evaluate(
      (key) => localStorage.getItem(key),
      AUTHORING_STORAGE_KEY,
    ),
  ).toBe(invalid);
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  const reset = page
    .locator('[data-component="ChangelogPanel"]')
    .getByRole("button", { name: "Reset all", exact: true });
  await expect(reset).toBeEnabled();
  await reset.click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Reset all", exact: true })
    .click();
  const source = await working(page);
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).saved,
      AUTHORING_STORAGE_KEY,
    ),
  ).toEqual(source);
  await page.reload();
  expect(await working(page)).toEqual(source);
  await cancel(page);
  expect(await working(page)).toEqual(source);
});
