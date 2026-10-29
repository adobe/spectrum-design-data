// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Page } from "@playwright/test";
import {
  createDefaultSnapshot,
  type EditSessionSnapshot,
} from "../../src/features/edit-session/state";
import {
  AUTHORING_RECORD_VERSION,
  AUTHORING_STORAGE_KEY,
  type AuthoringRecord,
} from "../../src/features/edit-session/storage";
import { expectFixedChartSizing } from "./chartSizing";
import { openTaxonomyCell } from "./taxonomyCell";

const errors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const collected: string[] = [];
  errors.set(page, collected);
  page.on("pageerror", (error) => collected.push(error.message));
});
test.afterEach(({ page }) => {
  expect(errors.get(page)).toEqual([]);
});
async function seed(
  page: Page,
  snapshot = createDefaultSnapshot(),
  editing = true,
  version = AUTHORING_RECORD_VERSION,
) {
  await page.addInitScript(
    ({ snapshot, editing, version, key }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(
          key,
          JSON.stringify({
            version,
            working: snapshot,
            saved: snapshot,
            isEditing: editing,
            attachments: {},
            savedAttachments: {},
          }),
        );
    },
    { snapshot, editing, version, key: AUTHORING_STORAGE_KEY },
  );
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto("/");
}
async function elevation(page: Page, view = "Elements") {
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations", exact: true })
    .dispatchEvent("click");
  await page
    .getByRole("tab", { name: "Elevation", exact: true })
    .dispatchEvent("click");
  await page
    .getByRole("radio", { name: view, exact: true })
    .dispatchEvent("click");
}
async function record(
  page: Page,
): Promise<AuthoringRecord<EditSessionSnapshot>> {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    AUTHORING_STORAGE_KEY,
  );
}
async function number(page: Page, label: string, value: string) {
  const field = page
    .locator('[data-component="ElevationEditor"]')
    .getByRole("textbox", { name: label, exact: true })
    .first();
  await field.fill(value);
  await field.press("Tab");
}
test("Defaults render complete shadows, read-only restrictions and label-only visibility", async ({
  page,
}, info) => {
  await seed(page, createDefaultSnapshot(), false);
  await elevation(page);
  const samples = page.locator(
    '[data-component="ElevationElements"] [data-shadow-sample]',
  );
  await expect(samples).toHaveCount(3);
  const geometry = await samples.evaluateAll((elements) =>
    elements.map((element) => {
      const rect = element.getBoundingClientRect(),
        style = getComputedStyle(element);
      return {
        width: rect.width,
        height: rect.height,
        shadow: style.boxShadow,
        background: style.backgroundColor,
      };
    }),
  );
  expect(geometry.map((sample) => [sample.width, sample.height])).toEqual([
    [96, 72],
    [96, 72],
    [96, 72],
  ]);
  expect(geometry[0].shadow).toContain("4px 4px");
  expect(geometry[0].shadow).toContain("0.2");
  expect(geometry.map((sample) => sample.background)).toEqual(
    Array(3).fill("rgb(255, 255, 255)"),
  );
  await expect(
    page.getByRole("button", { name: "Add shadow", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Delete Shadow/ })).toHaveCount(
    0,
  );
  const show = page.getByRole("checkbox", { name: "Show values", exact: true });
  await show.press("Space");
  expect(
    await samples.evaluateAll((elements) =>
      elements.map((element) => getComputedStyle(element).boxShadow),
    ),
  ).toEqual(geometry.map((sample) => sample.shadow));
  const wrapper = page.locator(
    '[data-component="ElevationElements"] [data-elements-surface]',
  );
  const wrapperBackground = await wrapper.evaluate(
    (element) => getComputedStyle(element).backgroundColor,
  );
  const beforeAppearance = await record(page);
  await page
    .getByRole("button", { name: "Dark app appearance", exact: true })
    .click();
  await expect(samples.first()).toHaveCSS(
    "background-color",
    "rgb(91, 91, 91)",
  );
  expect(
    await samples.evaluateAll((elements) =>
      elements.map((element) => getComputedStyle(element).backgroundColor),
    ),
  ).toEqual(Array(3).fill("rgb(91, 91, 91)"));
  await expect(wrapper).toHaveCSS("background-color", wrapperBackground);
  expect((await record(page)).working).toEqual(beforeAppearance.working);
  expect((await record(page)).saved).toEqual(beforeAppearance.saved);
  expect(
    await samples.evaluateAll((elements) =>
      elements.map((element) => {
        const rect = element.getBoundingClientRect();
        return [rect.width, rect.height, getComputedStyle(element).boxShadow];
      }),
    ),
  ).toEqual(
    geometry.map((sample) => [sample.width, sample.height, sample.shadow]),
  );
  await page
    .locator('[data-component="ElevationElements"]')
    .screenshot({ path: info.outputPath("elevation-elements-desktop.png") });
  await page.setViewportSize({ width: 800, height: 1000 });
  await page
    .locator('[data-component="ElevationElements"]')
    .screenshot({ path: info.outputPath("elevation-elements-narrow.png") });
});
test("Layer edits, ordering, deletion and Undo preserve complete values and UUIDs", async ({
  page,
}) => {
  await seed(page);
  await elevation(page);
  const original = (await record(page)).working.elevation!;
  await number(page, "Base blur (px)", "6");
  await page.getByRole("button", { name: "Add shadow", exact: true }).click();
  await expect
    .poll(async () => (await record(page)).working.elevation!.layers.length)
    .toBe(2);
  const added = (await record(page)).working.elevation!.layers[1].id;
  await page.getByRole("button", { name: "Move Shadow 2 up" }).click();
  await expect
    .poll(async () => (await record(page)).working.elevation!.layers[0].id)
    .toBe(added);
  const samples = page.locator(
    '[data-component="ElevationElements"] [data-shadow-sample]',
  );
  expect(
    (
      await samples
        .first()
        .evaluate((element) => getComputedStyle(element).boxShadow)
    ).match(/(?:rgba?|color)\(/g),
  ).toHaveLength(2);
  await page
    .getByRole("button", { name: "Delete Shadow 1", exact: true })
    .click();
  await expect
    .poll(async () => (await record(page)).working.elevation!.layers.length)
    .toBe(1);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect
    .poll(async () => (await record(page)).working.elevation!.layers.length)
    .toBe(2);
  expect((await record(page)).working.elevation!.layers[1].id).toBe(
    original.layers[0].id,
  );
  expect(
    (await record(page)).working.modeSets[0].modes[1].foundations.elevation
      ?.layerOpacities?.[original.layers[0].id],
  ).toBe(50);
});
test("Save, Cancel, reload and older records keep independent working and saved state", async ({
  page,
}) => {
  const old = createDefaultSnapshot();
  delete old.elevation;
  old.modeSets.forEach((set) => {
    set.authoringCapabilities = set.authoringCapabilities?.filter(
      (capability) => !capability.startsWith("elevation."),
    );
    set.modes.forEach((mode) => {
      delete mode.foundations.elevation;
    });
  });
  await seed(page, old, true, 2);
  await elevation(page);
  await expect
    .poll(async () => (await record(page)).version)
    .toBe(AUTHORING_RECORD_VERSION);
  await number(page, "Base blur (px)", "6");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect
    .poll(async () => (await record(page)).saved.elevation!.layers[0].base)
    .toBe(6);
  await number(page, "Base blur (px)", "8");
  const label = page
    .locator('[data-component="ElevationEditor"]')
    .getByRole("textbox", { name: "Shadow name", exact: true });
  await label.fill("");
  await label.press("Tab");
  await expect(label).toHaveAttribute("aria-invalid", "true");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Discard edits", exact: true })
    .click();
  await expect
    .poll(async () => (await record(page)).working.elevation!.layers[0].base)
    .toBe(6);
  await expect(
    page
      .locator('[data-component="ElevationEditor"]')
      .getByRole("group", { name: "Shadow 1", exact: true })
      .getByText("Shadow 1", { exact: true }),
  ).toBeVisible();
  await expect(label).toHaveCount(0);
  await expect(
    page.locator('[data-component="ElevationEditor"]').getByRole("alert"),
  ).toHaveCount(0);
  const id = (await record(page)).working.elevation!.layers[0].id;
  await page.reload();
  await elevation(page);
  expect((await record(page)).working.elevation!.layers[0].id).toBe(id);
  expect((await record(page)).working.elevation!.layers[0].base).toBe(6);
});
test("Owned opacity uses the mode popover, chart controls stay temporary and CSS is complete", async ({
  page,
}) => {
  await seed(page);
  await elevation(page);
  await expect(
    page
      .locator('[data-component="ElevationEditor"]')
      .getByRole("textbox", { name: "Opacity (%)" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Mode sets", exact: true }).click();
  await page.getByRole("button", { name: "Edit Dark for elevation" }).click();
  const dialog = page.getByRole("dialog", {
    name: "Edit Dark for elevation",
    exact: true,
  });
  const opacity = dialog.getByRole("textbox", {
    name: "Shadow 1 opacity (%)",
    exact: true,
  });
  await opacity.fill("60");
  await opacity.press("Tab");
  await expect
    .poll(
      async () =>
        (await record(page)).working.modeSets[0].modes[1].foundations.elevation!
          .layerOpacities![createDefaultSnapshot().elevation!.layers[0].id],
    )
    .toBe(60);
  await page.keyboard.press("Escape");
  await elevation(page, "Analyze");
  const before = (await record(page)).working;
  const chart = page.locator('[data-component="ElevationComparison"]');
  await expect(chart.locator('svg[role="img"]:has(polyline)')).toHaveCount(1);
  await expectFixedChartSizing(chart);
  await expect(
    chart.getByRole("checkbox", { name: "Compare named modes" }),
  ).toHaveCount(0);
  await chart.getByRole("button", { name: /Metric$/ }).click();
  await page.getByRole("option", { name: "Opacity", exact: true }).click();
  await chart
    .getByRole("checkbox", { name: "Compare named modes" })
    .press("Space");
  await chart.getByRole("button", { name: /Modes$/ }).click();
  await expect(
    page.getByRole("option", { name: "Light - always visible", exact: true }),
  ).toHaveAttribute("aria-disabled", "true");
  await page.getByRole("option", { name: "Dark", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(chart.locator("polyline")).toHaveCount(2);
  await page.getByRole("button", { name: "Show values", exact: true }).click();
  await expect(
    page.getByRole("table", { name: "Elevation comparison values" }),
  ).toBeVisible();
  await expect(chart.getByRole("table")).toContainText("20%");
  await expect(chart.getByRole("table")).toContainText("60%");
  expect((await record(page)).working).toEqual(before);
  await elevation(page);
  await page.getByRole("button", { name: "Add shadow", exact: true }).click();
  await expect
    .poll(async () => (await record(page)).working.elevation!.layers.length)
    .toBe(2);
  const layered = (await record(page)).working;
  await elevation(page, "Analyze");
  await expect(chart.getByRole("button", { name: /Shadows$/ })).toHaveCount(0);
  await expect(chart.locator("polyline")).toHaveCount(2);
  await chart.getByRole("button", { name: /Metric$/ }).click();
  await page
    .getByRole("option", { name: "Vertical offset", exact: true })
    .click();
  await expect(
    chart.getByRole("checkbox", { name: "Compare named modes" }),
  ).toBeVisible();
  expect((await record(page)).working).toEqual(layered);
  await elevation(page, "Code");
  const code = page.locator('[data-component="ElevationCssExport"]');
  await expect(code).toContainText("--surface-shadow-100");
  await expect(code).toContainText('data-color-scheme="dark"');
  const css = await code.locator("pre").innerText();
  const declarations = await page.evaluate((css) => {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    return [...sheet.cssRules].flatMap((rule) =>
      rule instanceof CSSStyleRule
        ? [...rule.style].map((name) => ({
            selector: rule.selectorText,
            name,
            value: rule.style.getPropertyValue(name),
            supported: CSS.supports(
              "box-shadow",
              rule.style.getPropertyValue(name),
            ),
          }))
        : [],
    );
  }, css);
  expect(declarations).toHaveLength(6);
  expect(declarations.every((declaration) => declaration.supported)).toBe(true);
  expect(
    declarations.every(
      (declaration) =>
        declaration.value.match(/(?:rgba?|rgb|color)\(/g)?.length === 2,
    ),
  ).toBe(true);
  expect(
    declarations.find((declaration) => declaration.selector.includes('"dark"'))!
      .value,
  ).toContain("0.6");
});

test("Analysis automatically includes added shadows and removes deleted shadows", async ({
  page,
}) => {
  await seed(page);
  await elevation(page, "Analyze");
  const chart = page.locator('[data-component="ElevationComparison"]');
  await expect(chart.getByRole("button", { name: /Shadows$/ })).toHaveCount(0);
  await expect(chart.locator("polyline")).toHaveCount(1);
  await page.getByRole("button", { name: "Add shadow", exact: true }).click();
  await expect(chart.locator("polyline")).toHaveCount(2);
  await expect(
    chart.getByText("Shadow 2 - Current modes", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Delete Shadow 1", exact: true })
    .click();
  await expect(chart.locator("polyline")).toHaveCount(1);
  await expect(
    chart.getByText("Shadow 1 - Current modes", { exact: true }),
  ).toHaveCount(0);
  await expect(
    chart.getByText("Shadow 2 - Current modes", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Delete Shadow 2", exact: true })
    .click();
  await expect(chart.locator("polyline")).toHaveCount(0);
  await expect(
    chart.getByText("No shadows to compare.", { exact: true }),
  ).toBeVisible();
});
test("Shadow names cancel cleanly, invalid progressions are rejected, duplicates are informative and eight is the limit", async ({
  page,
}) => {
  await seed(page);
  await elevation(page);
  const editor = page.locator('[data-component="ElevationEditor"]');
  const original = (await record(page)).working.elevation!;
  const name = editor.getByRole("textbox", {
    name: "Shadow name",
    exact: true,
  });
  await name.fill("Ambient");
  await name.press("Escape");
  await expect(name).toHaveValue("Shadow 1");
  await name.fill("Ambient");
  await name.press("Enter");
  await expect
    .poll(async () => (await record(page)).working.elevation!.layers[0].label)
    .toBe("Ambient");
  expect((await record(page)).working.elevation!.layers[0].id).toBe(
    original.layers[0].id,
  );
  await number(page, "Scale (ratio)", "1");
  await expect(
    editor.getByRole("alert").getByLabel("Information", { exact: true }),
  ).toBeVisible();
  await number(page, "Scale (ratio)", "2");
  await number(page, "Smaller sizes", "3");
  await editor
    .getByRole("button", { name: "Power Formula", exact: true })
    .click();
  await page.getByRole("option", { name: "Linear", exact: true }).click();
  await expect(
    editor.getByRole("alert").getByLabel("Error", { exact: true }),
  ).toBeVisible();
  expect((await record(page)).working.elevation!.layers[0].scaleTypeId).toBe(
    original.layers[0].scaleTypeId,
  );
  for (let count = 2; count <= 8; count++) {
    await editor
      .getByRole("button", { name: "Add shadow", exact: true })
      .click();
    await expect
      .poll(async () => (await record(page)).working.elevation!.layers.length)
      .toBe(count);
  }
  await expect(
    editor.getByRole("button", { name: "Add shadow", exact: true }),
  ).toBeDisabled();
  expect(
    new Set(
      (await record(page)).working.elevation!.layers.map((layer) => layer.id),
    ).size,
  ).toBe(8);
});
test("Deleting every layer creates an empty state with no output, and publishing leaves previews", async ({
  page,
}) => {
  await seed(page);
  await elevation(page);
  await page
    .getByRole("button", { name: "Delete Shadow 1", exact: true })
    .click();
  await expect(
    page.locator('[data-component="ElevationElements"] [data-shadow-sample]'),
  ).toHaveCount(0);
  await elevation(page, "Code");
  await expect(page.getByRole("button", { name: "Copy CSS" })).toBeDisabled();
  await elevation(page);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(
    page.locator('[data-component="ElevationElements"] [data-shadow-sample]'),
  ).toHaveCount(3);
  await page
    .locator('[data-component="ElevationEditor"]')
    .getByRole("checkbox", { name: "Hide from publishing" })
    .press("Space");
  await expect(
    page.locator('[data-component="ElevationElements"] [data-shadow-sample]'),
  ).toHaveCount(3);
  await elevation(page, "Code");
  await expect(page.getByRole("button", { name: "Copy CSS" })).toBeDisabled();
});
test("Registry renames propagate through Elements and Tokens without changing shadow identities or values", async ({
  page,
}) => {
  await seed(page);
  await elevation(page);
  const before = (await record(page)).working;
  const samples = page.locator(
    '[data-component="ElevationElements"] [data-shadow-sample]',
  );
  const values = await samples.evaluateAll((elements) =>
    elements.map((element) => getComputedStyle(element).boxShadow),
  );
  const ids = await page
    .locator("[data-elevation-id]")
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("data-elevation-id")),
    );
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Registry", exact: true })
    .dispatchEvent("click");
  await page
    .getByRole("radio", { name: "Foundation scale", exact: true })
    .press("Space");
  const sourceName = String(
    before.taxonomy!.terms.find(
      (term) => term.id === before.elevation!.name.termId,
    )!.value,
  );
  const term = await openTaxonomyCell(page, sourceName, "term");
  await term.fill("Layered depth");
  await term.press("Enter");
  await expect
    .poll(
      async () =>
        (await record(page)).working.taxonomy!.terms.find(
          (term) => term.id === before.elevation!.name.termId,
        )!.value,
    )
    .toBe("Layered depth");
  await elevation(page);
  await expect(samples.first()).toHaveAttribute(
    "aria-label",
    "layered-depth-100 shadow",
  );
  expect((await record(page)).working.elevation).toEqual(before.elevation);
  expect(
    (await record(page)).working.taxonomy!.terms.map((term) => term.id),
  ).toEqual(before.taxonomy!.terms.map((term) => term.id));
  expect(
    await samples.evaluateAll((elements) =>
      elements.map((element) => getComputedStyle(element).boxShadow),
    ),
  ).toEqual(values);
  expect(
    await page
      .locator("[data-elevation-id]")
      .evaluateAll((elements) =>
        elements.map((element) => element.getAttribute("data-elevation-id")),
      ),
  ).toEqual(ids);
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Tokens", exact: true })
    .dispatchEvent("click");
  await page
    .getByRole("radio", { name: "Elevation", exact: true })
    .dispatchEvent("click");
  await page
    .getByRole("searchbox", { name: "Search tokens", exact: true })
    .fill("layered-depth-100");
  await expect(
    page.getByRole("button", { name: "Open layered-depth-100", exact: true }),
  ).toBeVisible();
});
