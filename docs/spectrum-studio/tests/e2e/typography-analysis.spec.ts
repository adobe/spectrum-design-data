// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Page } from "@playwright/test";
import { createDefaultSnapshot } from "../../src/features/edit-session/state";
import { AUTHORING_STORAGE_KEY } from "../../src/features/edit-session/storage";
import { generateTypography } from "../../src/features/typography/typographyGeneration";
import { expectChartColumns, expectFixedChartSizing } from "./chartSizing";

const errors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const collected: string[] = [];
  errors.set(page, collected);
  page.on("pageerror", (error) => collected.push(error.message));
});
test.afterEach(({ page }) => {
  expect(errors.get(page)).toEqual([]);
});

async function openAnalysis(page: Page, editing = false) {
  const snapshot = createDefaultSnapshot();
  snapshot.typography.outputUnit = "px";
  snapshot.typography.textZoom = 2;
  const set = snapshot.modeSets.find((set) =>
    set.authoringCapabilities?.includes("typography.textZoom"),
  )!;
  const baseline = set.modes.find((mode) => mode.id === set.defaultModeId)!;
  set.modes = [
    baseline,
    ...[
      ["Smaller", 0],
      ["Larger", 4],
      ["Equal size", 4],
    ].map(([name, textZoom]) => ({
      ...baseline,
      id: `analysis-${name}`,
      key: String(name).toLowerCase().replaceAll(" ", "-"),
      name: String(name),
      foundations: { typography: { textZoom: Number(textZoom) } },
    })),
  ];
  snapshot.adaptiveClaims["typography.textZoom"] = set.id;
  await page.addInitScript(
    ({ key, snapshot, editing, setId }) => {
      if (localStorage.getItem(key) === null)
        localStorage.setItem(
          key,
          JSON.stringify({
            version: 1,
            working: snapshot,
            saved: snapshot,
            isEditing: editing,
            attachments: { [setId]: ["typography"] },
            savedAttachments: { [setId]: ["typography"] },
          }),
        );
    },
    { key: AUTHORING_STORAGE_KEY, snapshot, editing, setId: set.id },
  );
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations", exact: true })
    .dispatchEvent("click");
  await page
    .getByRole("tab", { name: "Typography", exact: true })
    .dispatchEvent("click");
  await page
    .getByRole("radio", { name: "Analyze", exact: true })
    .dispatchEvent("click");
  return { snapshot, set, baseline };
}

test("Shared controls protect the authored default and transpose exact values without saving comparisons", async ({
  page,
}, info) => {
  const { snapshot, baseline } = await openAnalysis(page);
  const root = page.locator('[data-component="TypographyComparisonView"]');
  await expect(root).toHaveAttribute("data-comparison-source", "modes");
  await expect(root.getByRole("img", { name: /by size setting$/ })).toHaveCount(
    3,
  );
  await expect(root.getByRole("table")).toHaveCount(0);
  await expect(root.locator('g[data-baseline="true"]')).toHaveCount(3);
  const stored = await page.evaluate(
    (key) => localStorage.getItem(key),
    AUTHORING_STORAGE_KEY,
  );
  await root.getByRole("button", { name: /Lines$/ }).click();
  const required = page.getByRole("option", { name: /always visible/ });
  await expect(required).toHaveAttribute("aria-disabled", "true");
  await page.getByRole("option", { name: /Equal size/ }).click();
  await page.keyboard.press("Escape");
  await expect(
    root.locator('g[data-series-id="analysis-Equal size"]'),
  ).toHaveCount(3);
  await root.getByRole("button", { name: "Show values", exact: true }).click();
  const expected = generateTypography(snapshot.typography);
  const defaultValues = await root
    .locator(`tr[data-setting-id="${baseline.id}"] [data-metric="font-size"]`)
    .evaluateAll((cells) =>
      cells.map((cell) => Number(cell.getAttribute("data-value"))),
    );
  expect(defaultValues).toEqual(expected.map((token) => token.fontSize));
  const beforeIcon = await root
    .getByRole("img", { name: "Icon size by size setting" })
    .locator("polyline")
    .evaluateAll((lines) => lines.map((line) => line.getAttribute("points")));
  await root.getByRole("button", { name: /Line height$/ }).click();
  await page
    .getByRole("option", { name: "Heading line height", exact: true })
    .click();
  await expect(
    root.getByRole("img", { name: "Heading line height by size setting" }),
  ).toBeVisible();
  expect(
    await root
      .getByRole("img", { name: "Icon size by size setting" })
      .locator("polyline")
      .evaluateAll((lines) => lines.map((line) => line.getAttribute("points"))),
  ).toEqual(beforeIcon);
  await root
    .getByRole("radio", { name: "By token", exact: true })
    .press("Space");
  await expect(root).toHaveAttribute("data-chart-view", "tokens");
  await expect(root.locator("g[data-series-id]")).toHaveCount(
    expected.length * 3,
  );
  await expect(
    root.locator('g[data-series-id="100"][data-baseline="true"]'),
  ).toHaveCount(3);
  await expect(
    root.getByRole("img", { name: "Font size by token" }),
  ).toBeVisible();
  const crossValues = await root
    .locator('tr[data-step-id="100"] [data-metric="font-size"]')
    .evaluateAll((cells) =>
      cells.map((cell) => Number(cell.getAttribute("data-value"))),
    );
  expect(crossValues).toEqual(
    [0, 2, 4, 4].map(
      (zoom) =>
        generateTypography(snapshot.typography, zoom).find(
          (token) => token.position === 0,
        )!.fontSize,
    ),
  );
  await root
    .getByRole("radio", { name: "By size setting", exact: true })
    .click();
  await expect(
    root.locator('g[data-series-id="analysis-Equal size"]'),
  ).toHaveCount(3);
  const baselinePath = root
    .getByRole("img", { name: "Font size by size setting" })
    .locator('g[data-baseline="true"] polyline');
  const originalPath = await baselinePath.getAttribute("points");
  await root.getByRole("button", { name: /Lines$/ }).click();
  await page.getByRole("option", { name: /Equal size/ }).click();
  await page.keyboard.press("Escape");
  await expect(
    root.locator('g[data-series-id="analysis-Equal size"]'),
  ).toHaveCount(0);
  await expect(baselinePath).toHaveAttribute("points", originalPath!);
  await root.getByRole("button", { name: /Compare$/ }).click();
  await page.getByRole("option", { name: "Zoom steps", exact: true }).click();
  await expect(root).toHaveAttribute("data-comparison-source", "zoom");
  await expect(
    root.locator('g[data-series-id="zoom:2"][data-baseline="true"]'),
  ).toHaveCount(3);
  expect(
    await page.evaluate(
      (key) => localStorage.getItem(key),
      AUTHORING_STORAGE_KEY,
    ),
  ).toBe(stored);
  await page.screenshot({
    path: info.outputPath("typography-analysis-desktop.png"),
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Dark app appearance" }).click();
  await page.setViewportSize({ width: 480, height: 900 });
  await root
    .getByRole("img", { name: "Icon size by size setting" })
    .scrollIntoViewIfNeeded();
  await expect(
    root.getByRole("img", { name: "Icon size by size setting" }),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("typography-analysis-narrow-dark.png"),
    animations: "disabled",
  });
  await page.reload();
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations", exact: true })
    .dispatchEvent("click");
  await page
    .getByRole("tab", { name: "Typography", exact: true })
    .dispatchEvent("click");
  await page
    .getByRole("radio", { name: "Analyze", exact: true })
    .dispatchEvent("click");
  await expect(root).toHaveAttribute("data-comparison-source", "modes");
  await expect(root.getByRole("table")).toHaveCount(0);
});

test("Named text-size overrides coexist with adaptation and retain Save, Cancel and stable identities", async ({
  page,
}) => {
  const { baseline } = await openAnalysis(page, true);
  await page.getByRole("button", { name: "Mode sets", exact: true }).click();
  await page
    .getByRole("button", { name: "Edit Larger for typography" })
    .click();
  const slider = page
    .getByRole("dialog")
    .getByRole("slider", { name: "Text size", exact: true });
  await slider.press("ArrowRight");
  await page.keyboard.press("Escape");
  const root = page.locator('[data-component="TypographyComparisonView"]');
  await root.getByRole("button", { name: "Show values" }).click();
  const read = () =>
    page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!),
      AUTHORING_STORAGE_KEY,
    );
  await expect
    .poll(
      async () =>
        (await read()).working.modeSets
          .flatMap(
            (set: {
              modes: {
                id: string;
                foundations: { typography?: { textZoom: number } };
              }[];
            }) => set.modes,
          )
          .find((mode: { id: string }) => mode.id === "analysis-Larger")
          .foundations.typography.textZoom,
    )
    .toBe(5);
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Save", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Edit Larger for typography" })
    .click();
  await slider.press("ArrowRight");
  await page.keyboard.press("Escape");
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Discard edits", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (await read()).working.modeSets
          .flatMap(
            (set: {
              modes: {
                id: string;
                foundations: { typography?: { textZoom: number } };
              }[];
            }) => set.modes,
          )
          .find((mode: { id: string }) => mode.id === "analysis-Larger")
          .foundations.typography.textZoom,
    )
    .toBe(5);
  await page.getByRole("radio", { name: "Preview", exact: true }).click();
  await page
    .getByRole("button", { name: "Adaptive controls", exact: true })
    .click();
  await expect(
    page.getByRole("slider", { name: "Text size", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.reload();
  const record = await read();
  const ids = record.working.modeSets.flatMap(
    (set: { modes: { id: string }[] }) => set.modes.map((mode) => mode.id),
  );
  expect(ids).toContain(baseline.id);
  expect(ids).toContain("analysis-Larger");
  expect(record.working.adaptiveClaims["typography.textZoom"]).toBeTruthy();
});

test("Type scale formula preview shares chart controls and responds to temporary range and rounding", async ({
  page,
}) => {
  await openAnalysis(page);
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Logic", exact: true })
    .click();
  await page.getByRole("tab", { name: "Formulas", exact: true }).click();
  await page
    .getByRole("button", { name: "View formula Type scale", exact: true })
    .click();
  const root = page.locator('[data-component="TypographyComparisonView"]');
  await expect(root.getByRole("img", { name: /by size setting$/ })).toHaveCount(
    1,
  );
  await root.getByRole("radio", { name: "By token", exact: true }).click();
  await expect(root.locator("g[data-series-id]")).toHaveCount(17);
  await expect(
    root.getByRole("img", { name: "Font size by token" }),
  ).toBeVisible();
  await expectChartColumns(root, 1);
  await expectFixedChartSizing(root);
  await page
    .getByRole("textbox", { name: "Larger values", exact: true })
    .fill("5");
  await page
    .getByRole("textbox", { name: "Larger values", exact: true })
    .press("Tab");
  await root
    .getByRole("radio", { name: "By size setting", exact: true })
    .click();
  await root.getByRole("button", { name: "Show values", exact: true }).click();
  await expect(root.locator('tr[data-default-setting="true"]')).toHaveCount(10);
  await page.getByRole("button", { name: /Rounding$/ }).click();
  await page
    .getByRole("option", { name: "Whole numbers", exact: true })
    .click();
  const values = await root
    .locator('tr[data-default-setting="true"] [data-value]')
    .evaluateAll((cells) =>
      cells.map((cell) => Number(cell.getAttribute("data-value"))),
    );
  expect(values.every(Number.isInteger)).toBe(true);
});

test("Spacing and Size show every static scale without adaptive comparison controls", async ({
  page,
}) => {
  await openAnalysis(page);
  for (const foundation of ["Spacing", "Size"]) {
    await page.getByRole("tab", { name: foundation, exact: true }).click();
    await page.getByRole("radio", { name: "Analyze", exact: true }).click();
    const root = page.locator('[data-view="analyze"]');
    await expect(root.getByRole("img").first()).toBeVisible();
    await expect(root.locator("g[data-series-id]")).toHaveCount(
      foundation === "Spacing" ? 3 : 1,
    );
    await expect(root.getByRole("table")).toHaveCount(0);
    await expect(
      root.getByRole("radio", { name: "By token", exact: true }),
    ).toHaveCount(0);
    await root
      .getByRole("button", { name: "Show values", exact: true })
      .first()
      .click();
    await expect(root.getByRole("table")).toHaveCount(1);
    await expectFixedChartSizing(root);
  }
});

test("Charts share rows responsively while retaining pixel-sized text, lines and markers", async ({
  page,
}, info) => {
  const { snapshot } = await openAnalysis(page);
  const root = page.locator('[data-component="TypographyComparisonView"]');
  for (const width of [1280, 2560, 1600]) {
    await page.setViewportSize({ width, height: 900 });
    for (const view of ["By size setting", "By token"]) {
      await root.getByRole("radio", { name: view, exact: true }).click();
      const gridWidth = await root
        .locator("[data-chart-grid]")
        .evaluate((element) => element.getBoundingClientRect().width);
      const columns = gridWidth >= 1682 ? 3 : gridWidth >= 1116 ? 2 : 1;
      await expectChartColumns(root, columns);
      await expectFixedChartSizing(root);
      if (view === "By token")
        await expect(root.locator("g[data-series-id]")).toHaveCount(
          generateTypography(snapshot.typography).length * 3,
        );
    }
    await page.screenshot({
      path: info.outputPath(`chart-pixel-sizing-${width}.png`),
      animations: "disabled",
    });
  }
  await root.getByRole("button", { name: /Lines$/ }).click();
  await page.getByRole("option", { name: "50", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(root.locator('g[data-series-id="50"]')).toHaveCount(0);
  await root
    .getByRole("radio", { name: "By size setting", exact: true })
    .click();
  await root.getByRole("radio", { name: "By token", exact: true }).click();
  await expect(root.locator('g[data-series-id="50"]')).toHaveCount(0);
});

test("Typography chart cards wrap at their 550px minimum using the actual grid width", async ({
  page,
}, info) => {
  await openAnalysis(page);
  await page.setViewportSize({ width: 2400, height: 900 });
  const root = page.locator('[data-component="TypographyComparisonView"]');
  for (const width of [
    320, 549, 550, 551, 1000, 1115, 1116, 1117, 1681, 1682, 1683, 549,
  ]) {
    await root.evaluate((element, width) => {
      element.style.width = `${width}px`;
    }, width);
    await expect(root.locator("[data-chart-grid]")).toHaveCSS(
      "width",
      `${width}px`,
    );
    for (const view of ["By size setting", "By token"]) {
      await root.getByRole("radio", { name: view, exact: true }).click();
      const columns = width >= 1682 ? 3 : width >= 1116 ? 2 : 1;
      await expectChartColumns(root, columns);
      const cards = await root
        .locator("[data-chart-grid] > section")
        .evaluateAll((elements) =>
          elements.map((element) => element.getBoundingClientRect().width),
        );
      expect(
        cards.every((cardWidth) => cardWidth >= Math.min(width, 550)),
      ).toBe(true);
      expect(
        await root
          .locator("[data-chart-grid]")
          .evaluate((element) => element.scrollWidth <= element.clientWidth),
      ).toBe(true);
      await expectFixedChartSizing(root);
      const fits = await root
        .getByRole("region", { name: / plot$/ })
        .evaluateAll((plots) =>
          plots.every(
            (plot) =>
              plot.querySelector("svg")!.getBoundingClientRect().width <=
              Math.max(360, plot.clientWidth) + 1,
          ),
        );
      expect(fits).toBe(true);
    }
    if ([320, 1115, 1116, 1682].includes(width)) {
      await root.screenshot({
        path: info.outputPath(`typography-chart-grid-${width}.png`),
        animations: "disabled",
      });
    }
  }
});
