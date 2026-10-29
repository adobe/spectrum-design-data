// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Page } from "@playwright/test";
import {
  createDefaultSnapshot,
  type EditSessionSnapshot,
} from "../../src/features/edit-session/state";
import {
  AUTHORING_RECORD_VERSION,
  AUTHORING_STORAGE_KEY,
  PREFERENCES_STORAGE_KEY,
  type AuthoringRecord,
} from "../../src/features/edit-session/storage";
import { DIMENSION_ARTIFACT_STORAGE_KEY } from "../../src/features/design-data/dimensionArtifactRepository";
import { buildDimensionComparisons } from "../../src/features/scales/dimensionComparisons";
import { resolveModeParameterValues } from "../../src/features/modes/parameterResolution";
import { generateSpacingScale } from "../../src/features/spacing/generate";
import { dimensionExampleInput } from "../fixtures/dimension-foundations";
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

async function seed(
  page: Page,
  snapshot = createDefaultSnapshot(),
  editing = true,
) {
  await page.addInitScript(
    ({ key, snapshot, editing, version }) => {
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
    {
      key: AUTHORING_STORAGE_KEY,
      snapshot,
      editing,
      version: AUTHORING_RECORD_VERSION,
    },
  );
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto("/");
}
async function record(
  page: Page,
): Promise<AuthoringRecord<EditSessionSnapshot>> {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    AUTHORING_STORAGE_KEY,
  );
}
async function foundation(
  page: Page,
  name: "Spacing" | "Size",
  view = "Elements",
) {
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations", exact: true })
    .dispatchEvent("click");
  await page.getByRole("tab", { name, exact: true }).dispatchEvent("click");
  await page
    .getByRole("radio", { name: view, exact: true })
    .dispatchEvent("click");
}
async function number(
  page: Page,
  scaleId: string,
  label: string,
  value: string,
) {
  const field = page
    .locator(`[data-dimension-scale="${scaleId}"]`)
    .getByRole("textbox", { name: label, exact: true });
  await field.fill(value);
  await field.press("Tab");
}

test("Inline cards keep the specified order, compact previews, formula-specific fields and read-only controls", async ({
  page,
}, info) => {
  await seed(page, createDefaultSnapshot(), false);
  for (const name of ["Spacing", "Size"] as const) {
    await foundation(page, name);
    const cards = page.locator('[data-component="DimensionScaleCard"]');
    await expect(cards).toHaveCount(name === "Spacing" ? 3 : 1);
    const card = cards.first();
    await expect(
      card.getByRole("textbox", { name: "Name", exact: true }),
    ).toHaveAttribute("readonly", "");
    await expect(
      page.getByRole("button", {
        name: `Add ${name.toLowerCase()} scale`,
        exact: true,
      }),
    ).toHaveCount(0);
    await expect(card.getByRole("button", { name: /^Delete/ })).toHaveCount(0);
    await expect(
      card.getByRole("checkbox", { name: "Hide from publishing" }),
    ).toBeDisabled();
    await expect(
      card.getByRole("button", { name: / Formula$/ }),
    ).toBeDisabled();
    await expect(
      card.getByRole("button", { name: / Rounding$/ }),
    ).toBeDisabled();
    await expect(
      card.getByRole("textbox", { name: "Base value", exact: true }),
    ).not.toBeEditable();
    await expect(
      card.getByRole("button", { name: "Formula variables" }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(
      await card
        .getByRole("textbox")
        .evaluateAll((fields) =>
          fields.map((field) =>
            (
              field.getAttribute("aria-label") ??
              document.querySelector(`label[for="${field.id}"]`)?.textContent
            )?.trim(),
          ),
        ),
    ).toEqual(
      name === "Spacing"
        ? [
            "Name",
            "Base value",
            "Ratio",
            "Offset",
            "Smaller values",
            "Larger values",
          ]
        : ["Name", "Base value", "Step", "Smaller values", "Larger values"],
    );
    expect(
      await card
        .getByRole("img", { name: /preview:/ })
        .evaluate((element) => element.getBoundingClientRect().height),
    ).toBe(32);
    await expect(
      card.getByRole("button", { name: /Ratio preset/ }),
    ).toHaveCount(0);
    await expect(card.getByRole("checkbox", { name: /adaptive/ })).toHaveCount(
      0,
    );
    await expect(card.getByText(/Advanced settings|Field key/)).toHaveCount(0);
    await card
      .getByRole("button", { name: "Formula variables" })
      .press("Space");
    await expect(
      card.getByRole("button", { name: "Formula variables" }),
    ).toHaveAttribute("aria-expanded", "false");
    await expect(
      card.getByRole("button", { name: / Rounding$/ }),
    ).toBeVisible();
    if (name === "Spacing")
      await expect(
        cards.nth(1).getByRole("button", { name: "Formula variables" }),
      ).toHaveAttribute("aria-expanded", "true");
    await card
      .getByRole("button", { name: "Formula variables" })
      .press("Enter");
    await card.screenshot({
      path: info.outputPath(`${name.toLowerCase()}-inline-readonly.png`),
    });
  }
});

test("Locked formula values stay visible in Edit mode without editable overrides", async ({
  page,
}) => {
  const snapshot = createDefaultSnapshot();
  const formula = snapshot.scaleTypes!.find(
    (formula) => formula.id === snapshot.spacing!.scales[0].scaleTypeId,
  )!;
  formula.base.overridable = false;
  formula.parameters.find((part) => part.id === "ratio")!.overridable = false;
  formula.parameters.reverse();
  await seed(page, snapshot);
  await foundation(page, "Spacing");
  const card = page.locator('[data-component="DimensionScaleCard"]').first();
  await expect(
    card.getByRole("textbox", { name: "Name", exact: true }),
  ).toBeEditable();
  await expect(
    card.getByRole("textbox", { name: "Base value", exact: true }),
  ).not.toBeEditable();
  await expect(
    card.getByRole("textbox", { name: "Ratio", exact: true }),
  ).not.toBeEditable();
  await expect(
    card.getByRole("textbox", { name: "Offset", exact: true }),
  ).toBeEditable();
  expect(
    await card
      .getByRole("textbox")
      .evaluateAll((fields) =>
        fields.map((field) =>
          (
            field.getAttribute("aria-label") ??
            document.querySelector(`label[for="${field.id}"]`)?.textContent
          )?.trim(),
        ),
      ),
  ).toEqual([
    "Name",
    "Base value",
    "Ratio",
    "Offset",
    "Smaller values",
    "Larger values",
  ]);
});

for (const name of ["Spacing", "Size"] as const)
  test(`${name} supports local overrides, Revert, publishing, Delete, Undo and Save/Cancel without changing identities`, async ({
    page,
  }) => {
    const scope = name === "Spacing" ? "spacing" : "size";
    const snapshot = createDefaultSnapshot();
    await seed(page, snapshot);
    await foundation(page, name);
    await page
      .getByRole("button", { name: `Add ${scope} scale`, exact: true })
      .click();
    await expect
      .poll(async () => (await record(page)).working[scope]!.scales.length)
      .toBe(snapshot[scope]!.scales.length + 1);
    const added = (await record(page)).working[scope]!.scales[0];
    const card = page.locator(`[data-dimension-scale="${added.id}"]`);
    const sourceName = card.getByRole("textbox", { name: "Name", exact: true });
    await sourceName.fill(`Layout ${scope}`);
    await sourceName.press("Enter");
    await expect(card).toHaveAccessibleName(`Layout ${scope} ${scope} scale`);
    await number(page, added.id, "Base value", "20");
    await card.getByRole("button", { name: "Revert", exact: true }).click();
    await expect
      .poll(
        async () =>
          (await record(page)).working[scope]!.scales.find(
            (scale) => scale.id === added.id,
          )!.base,
      )
      .toBeUndefined();
    await number(
      page,
      added.id,
      name === "Spacing" ? "Ratio" : "Step",
      name === "Spacing" ? "1.5" : "12",
    );
    await expect
      .poll(
        async () =>
          (await record(page)).working[scope]!.scales.find(
            (scale) => scale.id === added.id,
          )!.parameters,
      )
      .toEqual(name === "Spacing" ? { ratio: 1.5 } : { step: 12 });
    expect((await record(page)).working.scaleTypes).toEqual(
      snapshot.scaleTypes,
    );
    await card.getByRole("button", { name: / Rounding$/ }).click();
    await page
      .getByRole("option", { name: "No rounding", exact: true })
      .click();
    await expect(
      card.getByRole("button", { name: / Rounding$/ }),
    ).toContainText("No rounding");
    await card
      .getByRole("checkbox", { name: "Hide from publishing", exact: true })
      .press("Space");
    await expect
      .poll(async () => {
        const scale = (await record(page)).working[scope]!.scales.find(
          (scale) => scale.id === added.id,
        )!;
        return [scale.roundingRuleId, scale.hideFromPublishing];
      })
      .toEqual(["rule-no-rounding", true]);
    const accepted = (await record(page)).working[scope]!.scales.find(
      (scale) => scale.id === added.id,
    )!;
    expect(accepted.roundingRuleId).toBe("rule-no-rounding");
    expect(accepted.hideFromPublishing).toBe(true);
    expect(accepted.nameRef).toEqual(added.nameRef);
    await page
      .getByRole("navigation", { name: "Navigation", exact: true })
      .getByRole("link", { name: "Tokens", exact: true })
      .dispatchEvent("click");
    await page.getByRole("radio", { name, exact: true }).dispatchEvent("click");
    await page
      .getByRole("searchbox", { name: "Search tokens", exact: true })
      .fill(`layout-${scope}`);
    await expect(
      page.getByRole("button", { name: new RegExp(`^Open layout-${scope}`) }),
    ).toHaveCount(0);
    await foundation(page, name);
    await card
      .getByRole("button", {
        name: `Delete ${scope} scale Layout ${scope}`,
        exact: true,
      })
      .click();
    await expect(card).toHaveCount(0);
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(card).toBeVisible();
    await expect
      .poll(async () =>
        (await record(page)).working[scope]!.scales.find(
          (scale) => scale.id === added.id,
        ),
      )
      .toEqual(accepted);
    await page
      .getByRole("banner")
      .getByRole("button", { name: "Save", exact: true })
      .click();
    await number(page, added.id, "Base value", "28");
    await sourceName.fill("GLOBAL");
    await sourceName.press("Enter");
    await expect(sourceName).toHaveAttribute("aria-invalid", "true");
    await page
      .getByRole("banner")
      .getByRole("button", { name: "Cancel", exact: true })
      .click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Discard edits", exact: true })
      .click();
    await expect(sourceName).toHaveValue(`Layout ${scope}`);
    await expect(sourceName).not.toHaveAttribute("aria-invalid", "true");
    await expect
      .poll(async () =>
        (await record(page)).working[scope]!.scales.find(
          (scale) => scale.id === added.id,
        ),
      )
      .toEqual(accepted);
    await page.reload();
    await foundation(page, name);
    await expect(sourceName).toHaveValue(`Layout ${scope}`);
    expect(
      (await record(page)).saved[scope]!.scales.find(
        (scale) => scale.id === added.id,
      ),
    ).toEqual(accepted);
  });

test("Shared Registry-backed renames update Spacing and Size while UUIDs and generated values stay fixed", async ({
  page,
}) => {
  await seed(page);
  await foundation(page, "Spacing");
  const snapshot = (await record(page)).working;
  const global = snapshot.spacing!.scales[0];
  const values = await page
    .getByRole("list", { name: "Global spacing values" })
    .locator('[data-testid="spacing-bar"]')
    .evaluateAll((bars) =>
      bars.map((bar) => bar.getBoundingClientRect().width),
    );
  const name = page
    .locator(`[data-dimension-scale="${global.id}"]`)
    .getByRole("textbox", { name: "Name", exact: true });
  await name.fill("Shared layout");
  await name.press("Enter");
  await expect(
    page.getByRole("list", { name: "Shared layout spacing values" }),
  ).toBeVisible();
  expect(
    await page
      .getByRole("list", { name: "Shared layout spacing values" })
      .locator('[data-testid="spacing-bar"]')
      .evaluateAll((bars) =>
        bars.map((bar) => bar.getBoundingClientRect().width),
      ),
  ).toEqual(values);
  await foundation(page, "Size");
  await expect(
    page
      .getByRole("region", { name: "Shared layout size scale" })
      .getByRole("textbox", { name: "Name", exact: true }),
  ).toHaveValue("Shared layout");
  const current = (await record(page)).working;
  expect(current.spacing!.scales[0]).toEqual({
    ...global,
    name: "Shared layout",
  });
  expect(current.size!.scales[0]).toEqual({
    ...snapshot.size!.scales[0],
    name: "Shared layout",
  });
  expect(current.taxonomy!.terms.map((term) => term.id)).toEqual(
    snapshot.taxonomy!.terms.map((term) => term.id),
  );
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Tokens", exact: true })
    .dispatchEvent("click");
  await page
    .getByRole("radio", { name: "Size", exact: true })
    .dispatchEvent("click");
  await page
    .getByRole("searchbox", { name: "Search tokens" })
    .fill("shared-layout-100");
  await expect(
    page.getByRole("button", { name: "Open shared-layout-100", exact: true }),
  ).toBeVisible();
});

test("All shipped spacing examples stay visible, keep exact lengths and switch columns at the container boundary", async ({
  page,
}, info) => {
  await seed(page, createDefaultSnapshot(), false);
  await foundation(page, "Spacing");
  const elements = page.locator('[data-component="SpacingElements"]');
  await expect(elements.getByRole("list")).toHaveCount(3);
  for (const [name, values] of [
    ["Base horizontal spacing", [8, 8, 10, 12, 12]],
    ["Base gap", [5, 5, 6, 7, 8]],
  ] as const) {
    const list = elements.getByRole("list", {
      name: `${name} spacing values`,
      exact: true,
    });
    expect(
      await list
        .locator('[data-testid="spacing-bar"]')
        .evaluateAll((bars) =>
          bars.map((bar) => bar.getBoundingClientRect().width),
        ),
    ).toEqual(values);
    await expect(list.getByRole("listitem")).toHaveCount(5);
  }
  await page.setViewportSize({ width: 2400, height: 900 });
  const container = page.locator('section[data-component="Foundations"]');
  for (const width of [999, 1000, 1001, 999]) {
    await container.evaluate((element, width) => {
      element.style.flex = "0 0 auto";
      element.style.width = `${width}px`;
    }, width);
    const expected = width >= 1000 ? 2 : 1;
    const grid = elements.locator("[data-scale-grid]");
    await expect
      .poll(() =>
        grid.evaluate(
          (element) =>
            getComputedStyle(element).gridTemplateColumns.split(" ").length,
        ),
      )
      .toBe(expected);
    const cards = await grid
      .locator(":scope > section")
      .evaluateAll((elements) =>
        elements.map((element) => ({
          x: element.getBoundingClientRect().x,
          y: element.getBoundingClientRect().y,
          width: element.getBoundingClientRect().width,
        })),
      );
    expect(cards[1].y === cards[0].y).toBe(expected === 2);
    expect(cards[2].y).toBeGreaterThan(cards[0].y);
    expect(
      await grid.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true);
    await page.getByRole("radio", { name: "Analyze", exact: true }).click();
    const analysis = page.locator('[data-component="SpacingAnalyze"]');
    await expect(
      analysis.locator('[data-component="DimensionScaleComparison"]'),
    ).toHaveCount(3);
    await expectChartColumns(analysis, expected);
    await expectFixedChartSizing(analysis);
    await expect(analysis.getByRole("radio", { name: "By token" })).toHaveCount(
      0,
    );
    await page.getByRole("radio", { name: "Elements", exact: true }).click();
  }
  await container.evaluate((element) => {
    element.style.removeProperty("flex");
    element.style.removeProperty("width");
  });
  await page.setViewportSize({ width: 480, height: 900 });
  await page.getByRole("button", { name: "Collapse", exact: true }).click();
  await page
    .getByRole("button", { name: "Dark app appearance", exact: true })
    .click();
  const panel = page.locator('[data-component="FoundationsSpacingPanel"]');
  await panel.screenshot({
    path: info.outputPath("spacing-cards-narrow-dark.png"),
  });
  await page.screenshot({
    path: info.outputPath("spacing-elements-narrow-dark.png"),
  });
});

test("Adaptive Spacing and Size compare one variable at a time without changing authoring, previews or counts", async ({
  page,
}) => {
  const snapshot = createDefaultSnapshot();
  const input = dimensionExampleInput(true, true);
  snapshot.typography.textZoom = 2;
  snapshot.spacing!.scales[0].bindings = structuredClone(input.scale.bindings);
  snapshot.size!.scales[0].bindings = {
    base: structuredClone(input.scale.bindings!.base),
  };
  await seed(page, snapshot);
  await foundation(page, "Spacing", "Analyze");
  const chart = page
    .locator('[data-component="DimensionScaleComparison"]')
    .first();
  await expect(chart).toHaveAttribute("data-comparison-source", "modes");
  const originalRecord = await page.evaluate(
    (key) => localStorage.getItem(key),
    AUTHORING_STORAGE_KEY,
  );
  const originalPreferences = await page.evaluate(
    (key) => localStorage.getItem(key),
    PREFERENCES_STORAGE_KEY,
  );
  const counts = page.locator(
    '[data-component="ChangelogPanel"] [data-metric]',
  );
  const originalCounts = await counts.allTextContents();
  expect(originalCounts.length).toBeGreaterThan(0);
  const originalArtifact = await page.evaluate(
    (key) => localStorage.getItem(key),
    DIMENSION_ARTIFACT_STORAGE_KEY,
  );
  await chart.getByRole("button", { name: /Lines$/ }).click();
  await expect(
    page.getByRole("option", { name: /always visible/ }),
  ).toHaveAttribute("aria-disabled", "true");
  await page.keyboard.press("Escape");
  await chart.getByRole("button", { name: "Show values", exact: true }).click();
  const documents = {
    color: snapshot.colorSystem,
    typography: snapshot.typography,
  };
  const current = resolveModeParameterValues(documents, [], undefined, {
    modeSets: snapshot.modeSets,
  });
  const values = generateSpacingScale(
    snapshot.spacing!.scales[0],
    snapshot.rules,
    snapshot.scaleTypes,
    current,
  );
  const expectedInput = {
    ...input,
    scale: snapshot.spacing!.scales[0],
    documents,
    current,
    values,
    modeSets: snapshot.modeSets,
    scaleTypes: snapshot.scaleTypes!,
    rules: snapshot.rules!,
  };
  const expected = buildDimensionComparisons(expectedInput);
  const owner = snapshot.modeSets.find((set) =>
    set.authoringCapabilities?.includes("typography.textZoom"),
  )!;
  await expect(
    chart.locator(`tr[data-setting-id="${owner.defaultModeId}"]`),
  ).toHaveCount(18);
  expect(
    await chart
      .locator(`tr[data-setting-id="${owner.defaultModeId}"] [data-value]`)
      .evaluateAll((cells) =>
        cells.map((cell) => Number(cell.getAttribute("data-value"))),
      ),
  ).toEqual(
    expected.modes!.metrics[0].rows[
      expected.modes!.settings.findIndex((setting) => setting.isRequired)
    ].map((point) => point.value),
  );
  await chart.getByRole("radio", { name: "By token", exact: true }).click();
  await expect(
    chart.locator('g[data-series-id="100"][data-baseline="true"]'),
  ).toHaveCount(1);
  await expect(chart.locator("g[data-series-id]")).toHaveCount(18);
  await chart.getByRole("button", { name: /Lines$/ }).click();
  await page.getByRole("option", { name: "20", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(chart.locator('g[data-series-id="20"]')).toHaveCount(0);
  await chart.getByRole("button", { name: /Compare$/ }).click();
  await page
    .getByRole("option", { name: "Adaptive settings", exact: true })
    .click();
  await expect(chart).toHaveAttribute("data-comparison-source", "range");
  await expect(chart.locator('tr[data-step-id="100"]')).toHaveCount(13);
  expect(
    await chart
      .locator('tr[data-step-id="100"] [data-value]')
      .evaluateAll((cells) =>
        cells.map((cell) => Number(cell.getAttribute("data-value"))),
      ),
  ).toEqual(
    expected.range.metrics[0].rows.map(
      (row) => row[values.findIndex((value) => value.index === 0)].value,
    ),
  );
  await chart.getByRole("button", { name: /Connected variable$/ }).click();
  await page
    .getByRole("option", { name: "Overall contrast", exact: true })
    .click();
  await expect(chart.getByRole("img", { name: /by token$/ })).toBeVisible();
  await expect(chart.locator('tr[data-step-id="100"]')).toHaveCount(61);
  await expectFixedChartSizing(chart);
  const staticChart = page
    .locator('[data-component="DimensionScaleComparison"]')
    .nth(1);
  await expect(staticChart.getByRole("radio")).toHaveCount(0);
  await foundation(page, "Size", "Analyze");
  const sizeChart = page.locator('[data-component="DimensionScaleComparison"]');
  await expect(sizeChart).toHaveAttribute("data-comparison-source", "modes");
  await expect(
    sizeChart.getByRole("button", { name: /Connected variable$/ }),
  ).toHaveCount(0);
  await sizeChart.getByRole("radio", { name: "By token" }).click();
  await expect(
    sizeChart.locator('g[data-series-id="100"][data-baseline="true"]'),
  ).toHaveCount(1);
  expect(
    await page.evaluate(
      (key) => localStorage.getItem(key),
      AUTHORING_STORAGE_KEY,
    ),
  ).toBe(originalRecord);
  expect(
    await page.evaluate(
      (key) => localStorage.getItem(key),
      PREFERENCES_STORAGE_KEY,
    ),
  ).toBe(originalPreferences);
  expect(
    await page.evaluate(
      (key) => localStorage.getItem(key),
      DIMENSION_ARTIFACT_STORAGE_KEY,
    ),
  ).toBe(originalArtifact);
  expect(await counts.allTextContents()).toEqual(originalCounts);
  await foundation(page, "Spacing");
  const card = page.locator('[data-component="DimensionScaleCard"]').first();
  await expect(card.getByRole("checkbox", { name: /adaptive/ })).toHaveCount(0);
  await number(page, snapshot.spacing!.scales[0].id, "Base value", "10");
  await expect
    .poll(
      async () =>
        (
          await record(page)
        ).working.spacing!.scales[0].bindings!.base.points.find(
          (point) => point.at === 0,
        )!.value,
    )
    .toBe(10);
  const bound = (await record(page)).working.spacing!.scales[0].bindings!;
  expect(bound.ratio).toEqual(snapshot.spacing!.scales[0].bindings!.ratio);
  expect(bound.base.points.find((point) => point.at === 0)!.value).toBe(10);
  expect(bound.base.modeParameterId).toBe("typography.textZoom");
});

test("Existing saved systems are not merged with new samples; only explicit Reset all restores them", async ({
  page,
}) => {
  const snapshot = createDefaultSnapshot();
  const removed = snapshot.spacing!.scales.slice(1);
  const termIds = removed.map((scale) => scale.nameRef!.termId);
  const customRules = new Set(
    removed
      .map((scale) => scale.roundingRuleId)
      .filter((id) => id.startsWith("rule-custom")),
  );
  snapshot.spacing!.scales = snapshot.spacing!.scales.slice(0, 1);
  snapshot.taxonomy!.terms = snapshot.taxonomy!.terms.filter(
    (term) => !termIds.includes(term.id),
  );
  snapshot.rules = snapshot.rules!.filter((rule) => !customRules.has(rule.id));
  await seed(page, snapshot);
  await foundation(page, "Spacing");
  await expect(
    page.locator('[data-component="DimensionScaleCard"]'),
  ).toHaveCount(1);
  expect((await record(page)).working).toEqual(snapshot);
  expect((await record(page)).saved).toEqual(snapshot);
  await page.reload();
  await foundation(page, "Spacing");
  await expect(
    page.locator('[data-component="DimensionScaleCard"]'),
  ).toHaveCount(1);
  await page
    .locator('[data-component="ChangelogPanel"]')
    .getByRole("button", { name: "Reset all", exact: true })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Reset all", exact: true })
    .click();
  await expect(
    page.locator('[data-component="DimensionScaleCard"]'),
  ).toHaveCount(3);
  expect((await record(page)).working.spacing).toEqual(
    createDefaultSnapshot().spacing,
  );
  expect((await record(page)).saved.spacing).toEqual(
    createDefaultSnapshot().spacing,
  );
});
