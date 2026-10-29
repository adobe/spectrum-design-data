// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import Color from "colorjs.io";
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
import { createDataVisSnapshot, DATA_VIS_IDS } from "../fixtures/dataVis";
import type {
  CategoricalDataVisScale,
  ContinuousDataVisScale,
} from "../../src/features/color-system/data-vis/model";
import {
  createDataVisRuntime,
  type DataVisSourcePacket,
} from "../../src/features/color-system/data-vis/adapter";
import { selectMode } from "./modeControl";
import { selectColorPanelSection as innerTab } from "./colorPanelSection";
import { dataVisMemberId } from "../../src/features/color-system/data-vis/identity";
import { canonicalTokenModeKey } from "../../src/features/tokens/colorResolution";
import { buildDataVisSourcePacket } from "../../src/features/color-system/data-vis/export";
import { serializeOutputColor } from "../../src/features/color-system/outputSerialization";
import { sequentialDefaults } from "../fixtures/sequentialDefaults";

const errors = new WeakMap<Page, string[]>();
test.use({ viewport: { width: 1600, height: 1000 }, actionTimeout: 15_000 });
test.beforeEach(({ page }) => {
  const collected: string[] = [];
  errors.set(page, collected);
  page.on("pageerror", (error) => collected.push(error.message));
});
test.afterEach(async ({ page }) => {
  expect(errors.get(page)).toEqual([]);
  await expect(page.getByText(/Artifact generation failed:/)).toHaveCount(0);
});

async function seed(
  page: Page,
  snapshot = createDataVisSnapshot(),
  editing = true,
  dark = false,
) {
  const darkId = snapshot.modeSets
    .find((axis) => axis.key === "colorScheme")
    ?.modes.find((mode) => mode.key === "dark")?.id;
  await page.addInitScript(
    ({ key, preferencesKey, snapshot, editing, dark, darkId, version }) => {
      if (localStorage.getItem(key) === null)
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
      if (localStorage.getItem(preferencesKey) === null)
        localStorage.setItem(
          preferencesKey,
          JSON.stringify({
            version: 1,
            appearance: dark ? "dark" : "light",
            modeSelection: dark && darkId ? { colorScheme: darkId } : {},
          }),
        );
    },
    {
      key: AUTHORING_STORAGE_KEY,
      preferencesKey: PREFERENCES_STORAGE_KEY,
      snapshot,
      editing,
      dark,
      darkId,
      version: AUTHORING_RECORD_VERSION,
    },
  );
  await page.goto("/");
  await foundations(page);
  await innerTab(page, "Data vis");
}
async function record(
  page: Page,
): Promise<AuthoringRecord<EditSessionSnapshot>> {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    AUTHORING_STORAGE_KEY,
  );
}
async function foundations(page: Page) {
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations", exact: true })
    .click();
  await page.getByRole("tab", { name: "Colors", exact: true }).click();
}
async function choose(
  page: Page,
  root: Locator,
  label: string,
  option: string | RegExp,
) {
  await root
    .getByRole("button", { name: new RegExp(`^${label}\\b|\\b${label}$`) })
    .click();
  if (label === "UI color swatch" && typeof option === "string")
    await page.keyboard.type(option);
  await page
    .getByRole("option", { name: option, exact: typeof option === "string" })
    .click();
}
async function number(root: Locator, label: string, value: string) {
  const field = root.getByRole("textbox", { name: label, exact: true });
  await field.fill(value);
  await field.press("Tab");
}
async function moreOptions(root: Locator) {
  const button = root.getByRole("button", {
    name: "More options",
    exact: true,
  });
  if ((await button.getAttribute("aria-expanded")) !== "true")
    await button.click();
}
async function toggleStatic(root: Locator) {
  await root.getByText("Static", { exact: true }).click();
}
async function primitive(page: Page, root: Locator, name: string) {
  const field = root.getByRole("combobox", { name: /^Color token\b/ });
  await root.focus();
  await field.focus();
  await field.fill(name);
  await page.getByRole("option", { name: new RegExp(`^${name}\\b`) }).click();
}
async function openScale(page: Page, name: string) {
  await page
    .getByRole("button", { name: `Open ${name} data vis scale`, exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: `Edit ${name} data vis scale`,
    exact: true,
  });
  await expect(dialog).toBeVisible();
  return page.getByRole("dialog", { name: /^Edit .* data vis scale$/ });
}
async function closeScale(page: Page, dialog: Locator) {
  await dialog.focus();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
}
function sequence(snapshot: EditSessionSnapshot): ContinuousDataVisScale {
  const scale = snapshot.colorSystem.dataVisScales.find(
    (scale) => scale.id === DATA_VIS_IDS.sequential,
  );
  if (!scale || scale.kind === "categorical")
    throw new Error("Missing continuous test scale.");
  return scale;
}
function category(snapshot: EditSessionSnapshot): CategoricalDataVisScale {
  const scale = snapshot.colorSystem.dataVisScales.find(
    (scale) => scale.kind === "categorical",
  );
  if (!scale || scale.kind !== "categorical")
    throw new Error("Missing categorical test scale.");
  return scale;
}

for (const dark of [false, true]) {
  test(`Data vis cards align within populated type groups in ${dark ? "dark" : "light"} mode`, async ({
    page,
  }) => {
    const snapshot = createDataVisSnapshot();
    const shipped = createDefaultSnapshot().colorSystem.dataVisScales;
    snapshot.colorSystem.dataVisScales = [
      category(snapshot),
      ...shipped.filter((scale) => ["Fire", "Meadow"].includes(scale.name)),
    ];
    for (const axis of snapshot.modeSets)
      for (const mode of axis.modes) {
        if (mode.foundations.color) {
          delete mode.foundations.color.dataVisSources;
          delete mode.foundations.color.dataVisContrasts;
        }
      }
    await seed(page, snapshot, true, dark);
    const panel = page.locator('[data-component="DataVisPanel"]');
    await expect(panel.getByRole("heading", { level: 3 })).toHaveText([
      "Sequential",
      "Categorical",
    ]);
    await expect(
      panel.getByRole("heading", { name: "Diverging", exact: true }),
    ).toHaveCount(0);
    await expect(
      panel.getByText("No data vis scales yet.", { exact: true }),
    ).toHaveCount(0);
    const sequential = panel.getByRole("region", {
      name: "Sequential",
      exact: true,
    });
    const categorical = panel.getByRole("region", {
      name: "Categorical",
      exact: true,
    });
    await expect(
      sequential.getByRole("button", { name: /^Open .* data vis scale$/ }),
    ).toHaveText(["Fire", "Meadow"]);
    await expect(
      categorical.getByRole("button", { name: /^Open .* data vis scale$/ }),
    ).toHaveText(["Data categories"]);
    const rows = [];
    for (const name of ["Fire", "Meadow", "Data categories"]) {
      const card = panel.getByRole("button", {
        name: `Open ${name} data vis scale`,
        exact: true,
      });
      const preview = card.getByRole("img", {
        name: `${name} colors`,
        exact: true,
      });
      const title = card.getByText(name, { exact: true });
      const remove = panel.getByRole("button", {
        name: `Delete data vis scale ${name}`,
        exact: true,
      });
      const [cardBox, previewBox, titleBox, removeBox] = await Promise.all(
        [card, preview, title, remove].map((locator) => locator.boundingBox()),
      );
      expect(cardBox).not.toBeNull();
      expect(previewBox).not.toBeNull();
      expect(titleBox).not.toBeNull();
      expect(removeBox).not.toBeNull();
      expect(previewBox!.x - cardBox!.x).toBeGreaterThanOrEqual(8);
      expect(previewBox!.x - cardBox!.x).toBeLessThanOrEqual(10);
      expect(
        titleBox!.x - (previewBox!.x + previewBox!.width),
      ).toBeGreaterThanOrEqual(7);
      expect(
        Math.abs(
          titleBox!.y +
            titleBox!.height / 2 -
            (previewBox!.y + previewBox!.height / 2),
        ),
      ).toBeLessThanOrEqual(1);
      expect(removeBox!.x).toBeGreaterThanOrEqual(cardBox!.x + cardBox!.width);
      expect(
        Math.abs(
          removeBox!.y +
            removeBox!.height / 2 -
            (cardBox!.y + cardBox!.height / 2),
        ),
      ).toBeLessThanOrEqual(1);
      rows.push({
        card: cardBox!,
        preview: previewBox!,
        title: titleBox!,
        remove: removeBox!,
      });
    }
    for (const row of rows.slice(1)) {
      expect(row.card.x).toBeCloseTo(rows[0].card.x, 0);
      expect(row.card.width).toBeCloseTo(rows[0].card.width, 0);
      expect(row.card.height).toBeCloseTo(rows[0].card.height, 0);
      expect(row.title.x).toBeCloseTo(rows[0].title.x, 0);
      expect(row.remove.x).toBeCloseTo(rows[0].remove.x, 0);
    }
    expect((await record(page)).working.colorSystem.dataVisScales).toEqual(
      snapshot.colorSystem.dataVisScales,
    );
    await openScale(page, "Meadow");
  });
}

test("Data vis type groups appear only while populated and return with Undo", async ({
  page,
}) => {
  await seed(page);
  const panel = page.locator('[data-component="DataVisPanel"]');
  await expect(panel.getByRole("heading", { level: 3 })).toHaveText([
    "Sequential",
    "Diverging",
    "Categorical",
  ]);
  await panel
    .getByRole("button", {
      name: "Delete data vis scale Data divergence",
      exact: true,
    })
    .click();
  await expect(
    panel.getByRole("region", { name: "Diverging", exact: true }),
  ).toHaveCount(0);
  await expect(panel.getByRole("heading", { level: 3 })).toHaveText([
    "Sequential",
    "Categorical",
  ]);
  await expect(
    panel.getByText("No data vis scales yet.", { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(panel.getByRole("heading", { level: 3 })).toHaveText([
    "Sequential",
    "Diverging",
    "Categorical",
  ]);
});

test("Read-only Data vis groups retain card alignment without delete controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 960, height: 1000 });
  await seed(page, createDataVisSnapshot(), false);
  const panel = page.locator('[data-component="DataVisPanel"]');
  await expect(panel.getByRole("heading", { level: 3 })).toHaveText([
    "Sequential",
    "Diverging",
    "Categorical",
  ]);
  await expect(
    panel.getByRole("button", { name: /^Delete data vis scale/ }),
  ).toHaveCount(0);
  const cards = panel.getByRole("button", { name: /^Open .* data vis scale$/ });
  await expect(cards).toHaveText([
    "Data sequence",
    "Data divergence",
    "Data categories",
  ]);
  for (const card of await cards.all()) {
    const measurements = await card.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const preview = element
        .querySelector('[role="img"]')!
        .getBoundingClientRect();
      return {
        overflow: element.scrollWidth - element.clientWidth,
        offset: preview.left - box.left,
      };
    });
    expect(measurements.overflow).toBeLessThanOrEqual(1);
    expect(measurements.offset).toBeGreaterThanOrEqual(8);
    expect(measurements.offset).toBeLessThanOrEqual(10);
  }
});

test("An empty Data vis list has no type headings", async ({ page }) => {
  const snapshot = createDefaultSnapshot();
  snapshot.colorSystem.dataVisScales = [];
  await seed(page, snapshot);
  const panel = page.locator('[data-component="DataVisPanel"]');
  await expect(panel.getByRole("heading")).toHaveCount(0);
  await expect(panel.getByRole("region")).toHaveCount(0);
  await expect(
    panel.getByText("No data vis scales yet.", { exact: true }),
  ).toBeVisible();
});

for (const dark of [false, true]) {
  test(`Shipped sequential scales use their five live token links in ${dark ? "dark" : "light"} mode`, async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const snapshot = createDefaultSnapshot();
    await seed(page, snapshot, true, dark);
    const runtime = createDataVisRuntime(buildDataVisSourcePacket(snapshot), {
      modes: { colorScheme: dark ? "dark" : "light" },
    });
    for (const scale of sequentialDefaults) {
      const dialog = await openScale(page, scale.name);
      await expect(
        dialog.getByRole("checkbox", { name: "Static", exact: true }),
      ).not.toBeChecked();
      const gradient = dialog.locator('[data-component="GradientStopControl"]');
      await expect(
        gradient.getByRole("button", { name: /^(Start|Color|End) stop,/ }),
      ).toHaveCount(5);
      for (const [index, [, , tokenName]] of scale.stops.entries()) {
        const label =
          index === 0
            ? "Start"
            : index === scale.stops.length - 1
              ? "End"
              : "Color";
        const stop = gradient.getByRole("button", {
          name: `${label} stop, ${index * 25} percent`,
          exact: true,
        });
        await stop.click();
        await expect(
          dialog.getByRole("combobox", { name: /^Color token\b/ }),
        ).toHaveAccessibleDescription(
          `Selected token: ${tokenName}. Value: ${runtime.continuous(scale.name)(index / 4)}.`,
        );
        await expect(
          dialog.getByRole("textbox", { name: "Hex", exact: true }),
        ).toHaveCount(0);
        const color = await page.evaluate(
          (value) => {
            const probe = document.createElement("span");
            probe.style.backgroundColor = value;
            return probe.style.backgroundColor;
          },
          runtime.continuous(scale.name)(index / 4),
        );
        await expect(stop.locator("span")).toHaveCSS("background-color", color);
      }
      await closeScale(page, dialog);
    }
    for (const view of ["Elements", "Preview", "Analyze", "Code"]) {
      await page.getByRole("radio", { name: view, exact: true }).click();
      await expect(
        page.locator(`[data-view="${view.toLowerCase()}"]`),
      ).toBeVisible();
    }
    await page.reload();
    await foundations(page);
    await innerTab(page, "Data vis");
    for (const scale of sequentialDefaults) {
      await expect(
        page.getByRole("button", {
          name: `Open ${scale.name} data vis scale`,
          exact: true,
        }),
      ).toBeVisible();
    }
    expect((await record(page)).working.colorSystem.dataVisScales).toEqual(
      snapshot.colorSystem.dataVisScales,
    );
  });
}

test("Shipped Fire follows a Palette color edit without changing its token choice", async ({
  page,
}) => {
  await seed(page, createDefaultSnapshot());
  await innerTab(page, "Palette");
  await page
    .getByRole("button", {
      name: "Edit value of Illustrator Orange",
      exact: true,
    })
    .click();
  const hex = page.getByRole("textbox", { name: "Hex", exact: true });
  await hex.fill("#336699");
  await hex.press("Tab");
  await page.mouse.click(1500, 900);
  await expect(hex).toHaveCount(0);
  await innerTab(page, "Data vis");
  const dialog = await openScale(page, "Fire");
  const stop = dialog.getByRole("button", {
    name: "Color stop, 25 percent",
    exact: true,
  });
  await stop.click();
  await expect(
    dialog.getByRole("combobox", { name: /^Color token\b/ }),
  ).toHaveAccessibleDescription(
    "Selected token: illustrator-orange-color. Value: #336699.",
  );
  await expect(stop.locator("span")).toHaveCSS(
    "background-color",
    "rgb(51, 102, 153)",
  );
  await page.reload();
  await foundations(page);
  await innerTab(page, "Data vis");
  const reopened = await openScale(page, "Fire");
  await expect(
    reopened
      .getByRole("button", { name: "Color stop, 25 percent", exact: true })
      .locator("span"),
  ).toHaveCSS("background-color", "rgb(51, 102, 153)");
});

test("Shipped sequential sources require replacement before deleting a UI scale", async ({
  page,
}) => {
  await seed(page, createDefaultSnapshot());
  const before = (await record(page)).working;
  await innerTab(page, "Color scales");
  await page
    .getByRole("button", { name: "Delete scale Magenta", exact: true })
    .click();
  await expect(
    page.getByText(/Choose replacement colors first.*Fire/),
  ).toBeVisible();
  expect((await record(page)).working).toEqual(before);
  await innerTab(page, "Data vis");
  const dialog = await openScale(page, "Fire");
  await dialog
    .getByRole("button", { name: "Color stop, 75 percent", exact: true })
    .click();
  await expect(
    dialog.getByRole("combobox", { name: /^Color token\b/ }),
  ).toHaveAccessibleDescription(
    "Selected token: magenta-color-1200. Value: #870532.",
  );
});

test("An empty saved design can create each kind; the real worker honors requested counts and saves no preview data", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const empty = createDefaultSnapshot();
  empty.colorSystem.dataVisScales = [];
  await seed(page, empty);
  await expect(
    page.getByText("No data vis scales yet.", { exact: true }),
  ).toBeVisible();
  for (const kind of ["Sequential", "Diverging"]) {
    await page
      .getByRole("button", { name: "Add data vis scale", exact: true })
      .click();
    await page.getByRole("menuitem", { name: kind, exact: true }).click();
    await expect
      .poll(
        async () =>
          (await record(page)).working.colorSystem.dataVisScales.filter(
            (scale) => scale.kind === kind.toLowerCase(),
          ).length,
      )
      .toBe(1);
    const editor = page.getByRole("dialog", {
      name: /^Edit .* data vis scale$/,
    });
    await expect(
      editor.getByRole("combobox", { name: "Scale name", exact: true }),
    ).toBeFocused();
    await closeScale(page, editor);
    await expect(
      page
        .locator('[data-component="DataVisPanel"]')
        .getByRole("heading", { name: kind, exact: true }),
    ).toBeVisible();
  }
  await page
    .getByRole("button", { name: "Add data vis scale", exact: true })
    .click();
  await page
    .getByRole("menuitem", { name: "Categorical", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "New categorical scale",
    exact: true,
  });
  await dialog
    .getByRole("textbox", { name: "Scale name", exact: true })
    .fill("Chart categories");
  await choose(page, dialog, "Palette size", "Requested count");
  await number(dialog, "Requested colors", "2");
  const suggestions = dialog.getByRole("button", {
    name: /^Choose (balanced|bold)$/,
  });
  await expect(suggestions.first()).toBeEnabled({ timeout: 45_000 });
  await suggestions.first().click();
  await expect(
    dialog.getByRole("heading", { name: "Selected colors (2)", exact: true }),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "Move color 1 later", exact: true })
    .click();
  await dialog.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect
    .poll(
      async () => (await record(page)).working.colorSystem.dataVisScales.length,
    )
    .toBe(3);
  const authored = (await record(page)).working.colorSystem.dataVisScales;
  expect(authored).toHaveLength(3);
  const created = authored.find((scale) => scale.kind === "categorical")!;
  expect(created.kind).toBe("categorical");
  if (created.kind !== "categorical")
    throw new Error("Expected categorical definition.");
  expect(created.members).toHaveLength(2);
  expect(created.preferences.size).toEqual({ kind: "count", count: 2 });
  expect(
    created.members.every((member) => member.source.kind === "ui-swatch"),
  ).toBe(true);
  expect(JSON.stringify(authored)).not.toMatch(
    /candidatePool|functionSamples|searchResults|aestheticScore/,
  );
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Save", exact: true })
    .click();
  await expect
    .poll(
      async () => (await record(page)).saved.colorSystem.dataVisScales.length,
    )
    .toBe(3);
  await page.reload();
  await foundations(page);
  await innerTab(page, "Data vis");
  await expect(
    page.getByRole("button", {
      name: "Open Chart categories data vis scale",
      exact: true,
    }),
  ).toBeVisible();
});

test("Continuous points preserve arbitrary ratios, opposite targets, exact links, independent keys and scoped Undo", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await seed(page);
  let dialog = await openScale(page, "Data sequence");
  await expect(
    dialog.getByRole("button", { name: /Control point/ }),
  ).toHaveCount(0);
  await expect(
    dialog.getByRole("textbox", { name: "Opposite contrast", exact: true }),
  ).toHaveCount(0);
  await number(dialog, "Contrast", "3.14159");
  await moreOptions(dialog);
  await number(dialog, "Opposite contrast", "5.469");
  await expect
    .poll(async () => sequence((await record(page)).working).points[0].contrast)
    .toEqual({ value: 3.14159, oppositeValue: 5.469 });
  await dialog
    .getByRole("button", { name: "Add color stop", exact: true })
    .click();
  await expect
    .poll(async () => sequence((await record(page)).working).points.length)
    .toBe(4);
  await expect(
    dialog
      .locator('[data-component="GradientStopControl"]')
      .getByRole("button", { pressed: true }),
  ).toHaveAttribute("aria-label", "Color stop, 25 percent");
  const pointId = sequence((await record(page)).working).points.find(
    (point) => point.position === 0.25,
  )!.id;
  await moreOptions(dialog);
  await number(dialog, "Position", "26.123456");
  await expect
    .poll(
      async () =>
        sequence((await record(page)).working).points.find(
          (point) => point.id === pointId,
        )!.position,
    )
    .toBe(0.26123456);
  await choose(page, dialog, "Color source", "Color token");
  for (const source of [
    "illustrator-orange-color",
    "data-categories-color-1",
    "blue-color-900",
  ])
    await primitive(page, dialog, source);
  await expect(
    dialog.getByRole("textbox", { name: "Contrast", exact: true }),
  ).toHaveCount(0);
  await dialog
    .getByRole("button", { name: "Remove selected color stop", exact: true })
    .click();
  await closeScale(page, dialog);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect
    .poll(async () =>
      sequence((await record(page)).working).points.some(
        (point) => point.id === pointId,
      ),
    )
    .toBe(true);
  dialog = await openScale(page, "Data sequence");
  await dialog
    .getByRole("button", { name: "End stop, 100 percent", exact: true })
    .click();
  await expect(
    dialog.getByRole("textbox", { name: "Hex", exact: true }),
  ).toBeVisible();
  await dialog
    .getByRole("textbox", { name: "Hex", exact: true })
    .fill("#336699");
  await expect(
    dialog.getByRole("textbox", { name: "Hex", exact: true }),
  ).toHaveValue("#336699");
  await expect(dialog.getByText(/Generated point:/)).toHaveCount(0);
  await closeScale(page, dialog);
  const continuous = sequence((await record(page)).working);
  expect(
    continuous.points.find((point) => point.id === "end")!.source.kind,
  ).toBe("key-color");
  expect(
    continuous.points.find((point) => point.id === pointId)!.source.kind,
  ).toBe("primitive-token");
});

test("Source and contrast modes inherit, reset and require a destination for temporary edits", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const snapshot = createDataVisSnapshot();
  snapshot.adaptiveClaims = {
    ...snapshot.adaptiveClaims,
    "color.contrastMultiplier": snapshot.modeSets.find(
      (axis) => axis.key === "contrast",
    )!.id,
  };
  await seed(page, snapshot);
  await selectMode(page, "Dark");
  await page.getByRole("radio", { name: "Elements", exact: true }).click();
  let dialog = await openScale(page, "Data divergence");
  await dialog
    .getByRole("button", { name: "End stop, 100 percent", exact: true })
    .click();
  await expect(
    dialog.getByRole("button", { name: / Color source$/ }),
  ).toBeEnabled();
  await expect(
    dialog.getByRole("button", { name: / Color source$/ }),
  ).toContainText("Green");
  await moreOptions(dialog);
  await dialog
    .getByRole("button", { name: "Use inherited source", exact: true })
    .click();
  await expect(
    dialog.getByRole("button", { name: / Color source$/ }),
  ).toContainText("Orange");
  await expect
    .poll(
      async () =>
        (await record(page)).working.modeSets
          .find((axis) => axis.key === "colorScheme")!
          .modes.find((mode) => mode.key === "dark")!.foundations.color
          ?.dataVisSources,
    )
    .toBeUndefined();
  await closeScale(page, dialog);
  dialog = await openScale(page, "Data sequence");
  await dialog
    .getByRole("button", { name: "Color stop, 50 percent", exact: true })
    .click();
  for (const source of [
    "illustrator-orange-color",
    "data-categories-color-1",
  ]) {
    await primitive(page, dialog, source);
    await expect(
      dialog.getByRole("combobox", { name: /^Color token\b/ }),
    ).toHaveAccessibleName(`Color token ${source}`);
    await expect
      .poll(
        async () =>
          (await record(page)).working.modeSets
            .find((axis) => axis.key === "colorScheme")!
            .modes.find((mode) => mode.key === "dark")!.foundations.color
            ?.dataVisSources?.[DATA_VIS_IDS.sequential]?.named?.tokenId,
      )
      .toBeTruthy();
    expect(
      sequence((await record(page)).working).points.find(
        (point) => point.id === "named",
      )!.source.kind,
    ).toBe("ui-swatch");
  }
  await moreOptions(dialog);
  await dialog
    .getByRole("button", { name: "Use inherited source", exact: true })
    .click();
  await expect(
    dialog.getByRole("combobox", { name: /^Color token\b/ }),
  ).toHaveAccessibleName("Color token blue-color-900");
  await closeScale(page, dialog);
  await selectMode(page, "Light");
  await selectMode(page, "High");
  await page.getByRole("radio", { name: "Elements", exact: true }).click();
  dialog = await openScale(page, "Data sequence");
  await expect(
    dialog.getByRole("textbox", { name: "Contrast", exact: true }),
  ).toHaveValue("2.4");
  await number(dialog, "Contrast", "3.23456");
  await expect
    .poll(
      async () =>
        (await record(page)).working.modeSets
          .find((axis) => axis.key === "contrast")!
          .modes.find((mode) => mode.key === "high")!.foundations.color!
          .dataVisContrasts![DATA_VIS_IDS.sequential].start,
    )
    .toBe(3.23456);
  expect(sequence((await record(page)).working).points[0].contrast!.value).toBe(
    1.3,
  );
  await moreOptions(dialog);
  await dialog
    .getByRole("button", { name: "Use inherited contrast", exact: true })
    .click();
  await expect(
    dialog.getByRole("textbox", { name: "Contrast", exact: true }),
  ).toHaveValue("1.3");
  await closeScale(page, dialog);
  await page.getByRole("radio", { name: "Preview", exact: true }).click();
  await page
    .getByRole("button", { name: "Adaptive controls", exact: true })
    .click();
  const adaptive = page.getByRole("dialog", {
    name: "Adaptive controls",
    exact: true,
  });
  const contrast = adaptive.getByRole("slider", {
    name: "Overall contrast",
    exact: true,
  });
  await expect(contrast).toHaveValue("2");
  await contrast.press("ArrowLeft");
  await expect(contrast).toHaveValue("1.99");
  await adaptive.focus();
  await page.keyboard.press("Escape");
  await page.getByRole("radio", { name: "Elements", exact: true }).click();
  const before = (await record(page)).working;
  dialog = await openScale(page, "Data sequence");
  await number(dialog, "Contrast", "4.12345");
  const destination = page.getByRole("dialog", {
    name: "Choose mode for data vis edit",
    exact: true,
  });
  await expect(destination).toBeVisible();
  expect((await record(page)).working).toEqual(before);
  await destination
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await expect(destination).toHaveCount(0);
  expect((await record(page)).working).toEqual(before);
  await expect(dialog).toBeVisible();
  await number(dialog, "Contrast", "4.12345");
  await expect(destination).toBeVisible();
  await choose(page, destination, "Apply to mode", "New mode");
  await destination
    .getByRole("textbox", { name: "New mode name", exact: true })
    .fill("Chart detail");
  await destination.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(destination).toHaveCount(0);
  await expect
    .poll(
      async () =>
        (await record(page)).working.modeSets
          .find((axis) => axis.key === "contrast")!
          .modes.find((mode) => mode.name === "Chart detail")?.foundations
          .color,
    )
    .toMatchObject({
      contrastMultiplier: 1.99,
      dataVisContrasts: { [DATA_VIS_IDS.sequential]: { start: 4.12345 } },
    });
});

test("Categorical editing retains renames, requires acknowledgment and protects final UI sources", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await seed(page);
  let dialog = await openScale(page, "Data categories");
  const name = dialog.getByRole("combobox", {
    name: "Scale name",
    exact: true,
  });
  await name.fill("Review categories");
  await name.press("Enter");
  await number(dialog, "Minimum background contrast", "21");
  if (
    await dialog
      .getByRole("button", { name: "Refresh selection", exact: true })
      .isVisible()
  )
    await dialog
      .getByRole("button", { name: "Refresh selection", exact: true })
      .click();
  await expect(
    dialog.getByRole("button", { name: "Apply", exact: true }),
  ).toBeDisabled();
  await dialog
    .getByRole("checkbox", {
      name: "Apply this manual selection despite the unmet targets",
      exact: true,
    })
    .press("Space");
  await dialog.getByRole("button", { name: "Apply", exact: true }).click();
  await expect(
    page.locator('[data-component="CategoricalChooser"]'),
  ).toHaveCount(0);
  await expect
    .poll(async () => category((await record(page)).working).name)
    .toBe("Review categories");
  expect(
    category((await record(page)).working).members.map((member) => member.id),
  ).toEqual(["blue-member", "orange-member"]);
  await innerTab(page, "Color scales");
  await page
    .getByRole("tabpanel", { name: "Colors", exact: true })
    .getByRole("button", { name: "Blue", exact: true })
    .click();
  dialog = page.getByRole("dialog", { name: "Edit Blue scale", exact: true });
  const visibility = dialog.getByRole("checkbox", {
    name: "Hide from publishing",
    exact: true,
  });
  await visibility.press("Space");
  await expect(visibility).not.toBeChecked();
  await expect(page.getByText(/Choose replacement colors first/)).toBeVisible();
  await closeScale(page, dialog);
  await innerTab(page, "Data vis");
  await expect(
    page.getByRole("button", {
      name: "Open Review categories data vis scale",
      exact: true,
    }),
  ).toBeVisible();
});

test("Final source and member-token overrides reach Elements, Analyze, panel previews and native Browser rows", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await seed(page);
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Tokens", exact: true })
    .click();
  await page.getByRole("radio", { name: "Colors", exact: true }).click();
  const search = page.getByRole("searchbox", {
    name: "Search tokens",
    exact: true,
  });
  await search.fill("blue-color-900");
  await page
    .getByRole("button", { name: "Open blue-color-900", exact: true })
    .click();
  let dialog = page.getByRole("dialog");
  await dialog
    .getByRole("textbox", { name: "Value", exact: true })
    .fill("#123456");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await search.fill("data-categories-color-1");
  await page
    .getByRole("button", { name: "Open data-categories-color-1", exact: true })
    .click();
  dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("textbox", { name: "Value", exact: true }),
  ).toHaveValue("#123456");
  await dialog
    .getByRole("textbox", { name: "Value", exact: true })
    .fill("#654321");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await foundations(page);
  await innerTab(page, "Data vis");
  await page.getByRole("radio", { name: "Elements", exact: true }).click();
  const elements = page.locator('[data-component="DataVisElements"]');
  await expect(
    elements.getByRole("img", { name: /1: #654321$/ }),
  ).toBeVisible();
  await expect(
    elements.getByRole("img", { name: /50%: #123456$/ }),
  ).toBeVisible();
  await expect(
    elements.getByRole("img", { name: "Data sequence colors", exact: true }),
  ).toHaveCSS("background-image", /in oklch/);
  await expect(
    page
      .getByRole("button", {
        name: "Open Data sequence data vis scale",
        exact: true,
      })
      .getByRole("img", { name: "Data sequence colors", exact: true }),
  ).toHaveCSS("background-image", /in oklch/);
  dialog = await openScale(page, "Data categories");
  await expect(
    dialog.getByText(
      "A direct token value override is active. Edit or reset it in Tokens.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    dialog.getByRole("img", {
      name: "Selected categorical colors",
      exact: true,
    }),
  ).toHaveCSS("background-image", /rgb\(101, 67, 33\)/);
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("radio", { name: "Analyze", exact: true }).click();
  const analysis = page.locator('[data-component="DataVisAnalyze"]');
  await choose(page, analysis, "Data vis scale", "Data categories");
  await expect(analysis.getByRole("meter")).toHaveCount(2);
  await expect(
    analysis.getByRole("img", { name: "Color 1", exact: true }),
  ).toHaveCSS("background-color", "rgb(101, 67, 33)");
  await page.getByRole("radio", { name: "Code", exact: true }).click();
  await expect(page.locator('[data-component="DataVisCode"]')).toContainText(
    "--data-categories-color-1: #654321;",
  );
});

for (const dark of [false, true])
  test(`Elements, comparison controls and pagination remain usable in ${dark ? "dark" : "light"} mode`, async ({
    page,
  }, info) => {
    test.setTimeout(90_000);
    await seed(page, createDataVisSnapshot(12), false, dark);
    await page.getByRole("radio", { name: "Elements", exact: true }).click();
    const elements = page.locator('[data-component="DataVisElements"]');
    await expect(elements).toHaveAttribute("data-elements-surface", "true");
    await expect(
      elements.getByRole("img", {
        name: "Data sequence heatmap example",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      elements.getByRole("img", {
        name: "Data divergence heatmap example",
        exact: true,
      }),
    ).toBeVisible();
    await elements
      .getByRole("button", { name: "Sample values", exact: true })
      .first()
      .click();
    await expect(
      elements.getByRole("grid", {
        name: "Data sequence sample values",
        exact: true,
      }),
    ).toBeVisible();
    expect(
      await elements.evaluate(
        (element) => getComputedStyle(element).backgroundColor,
      ),
    ).toBe(
      await elements
        .locator('[aria-label="Data sequence swatches"]')
        .evaluate((element) => getComputedStyle(element).backgroundColor),
    );
    const readOnly = await openScale(page, "Data sequence");
    await expect(
      readOnly.getByRole("textbox", { name: "Contrast", exact: true }),
    ).toHaveAttribute("readonly", "");
    await closeScale(page, readOnly);
    await expect(
      page.getByRole("button", { name: "Add data vis scale", exact: true }),
    ).toHaveCount(0);
    await page.getByRole("radio", { name: "Analyze", exact: true }).click();
    const analysis = page.locator('[data-component="DataVisAnalyze"]');
    for (const option of ["Chroma", "Hue", "Background contrast", "Lightness"])
      await choose(page, analysis, "Chart measurement", option);
    await choose(page, analysis, "Compare against", "All color pairs");
    await expect(
      analysis.getByText("36 comparisons; page 1 of 1.", { exact: true }),
    ).toBeVisible();
    await expect(
      analysis.getByRole("button", { name: "Next comparisons", exact: true }),
    ).toHaveCount(0);
    await choose(page, analysis, "Data vis scale", "Data categories");
    await choose(page, analysis, "Compare against", "All color pairs");
    const grid = analysis.getByRole("grid", {
      name: "Data vis color comparisons",
      exact: true,
    });
    await expect(grid).toHaveAttribute("aria-rowcount", "51");
    await expect(
      analysis.getByText("66 comparisons; page 1 of 2.", { exact: true }),
    ).toBeVisible();
    await analysis
      .getByRole("button", { name: "Next comparisons", exact: true })
      .click();
    await expect(
      analysis.getByText("66 comparisons; page 2 of 2.", { exact: true }),
    ).toBeVisible();
    await expect(grid).toHaveAttribute("aria-rowcount", "17");
    for (const profile of [
      "Protanopia",
      "Deuteranopia",
      "Tritanopia",
      "Grayscale approximation",
    ]) {
      await choose(page, analysis, "Vision profile", profile);
      await expect(
        analysis
          .getByText("Simulation, not a WCAG result", { exact: true })
          .first(),
      ).toBeVisible();
      await expect(analysis.getByText(/^(Pass|Fail) \(3:1\)$/)).toHaveCount(0);
    }
    await choose(page, analysis, "Compare against", "Adjacent colors");
    await expect(
      analysis.getByText("11 comparisons; page 1 of 1.", { exact: true }),
    ).toBeVisible();
    await expect(
      analysis.getByText(
        "Each marker is a saved categorical member; there is no continuous curve.",
        { exact: true },
      ),
    ).toBeVisible();
    await page.setViewportSize({ width: 740, height: 1000 });
    await page.getByRole("button", { name: "Collapse", exact: true }).click();
    await choose(page, analysis, "Vision profile", "Normal vision");
    await choose(page, analysis, "Compare against", "UI background");
    await expect(
      analysis.getByText("12 comparisons; page 1 of 1.", { exact: true }),
    ).toBeVisible();
    await grid.scrollIntoViewIfNeeded();
    expect(
      await grid.evaluate((element) => element.clientHeight),
    ).toBeGreaterThanOrEqual(300);
    await grid.evaluate((element) => {
      element.scrollLeft = element.scrollWidth;
    });
    await expect(
      grid.getByRole("columnheader", { name: "Delta E 2000", exact: true }),
    ).toBeVisible();
    await expect(grid.getByRole("meter").first()).toBeVisible();
    expect(
      await analysis.evaluate(
        (element) => element.scrollWidth - element.clientWidth,
      ),
    ).toBeLessThanOrEqual(1);
    expect(
      await page
        .locator("body")
        .evaluate((element) => element.scrollWidth - window.innerWidth),
    ).toBeLessThanOrEqual(1);
    await page.screenshot({
      path: info.outputPath("data-vis-analysis-narrow.png"),
      animations: "disabled",
    });
  });

test("Downloads use the actual compiled adapter and preserve mode/fluid parity; Save, Cancel, reload and Reset all retain their boundaries", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await seed(page);
  await page.getByRole("radio", { name: "Code", exact: true }).click();
  const code = page.locator('[data-component="DataVisCode"]');
  const sourceDownload = page.waitForEvent("download");
  await code
    .getByRole("button", { name: "Download source packet", exact: true })
    .click();
  const source = await sourceDownload;
  const packet: DataVisSourcePacket = JSON.parse(
    await readFile((await source.path())!, "utf8"),
  );
  expect(source.suggestedFilename()).toBe("data-vis.json");
  expect(packet.color.dataVisScales).toHaveLength(3);
  const cssDownload = page.waitForEvent("download");
  await code
    .getByRole("button", { name: "Download categorical CSS", exact: true })
    .click();
  const css = await cssDownload;
  expect(await readFile((await css.path())!, "utf8")).toContain(
    "--data-categories-color-1:",
  );
  const jsDownload = page.waitForEvent("download");
  await code
    .getByRole("button", { name: "Download JavaScript adapter", exact: true })
    .click();
  const js = await jsDownload;
  expect(await readFile((await js.path())!, "utf8")).toContain(
    "Copyright (c) 2021 Lea Verou, Chris Lilley",
  );
  const runtime = await page.evaluate(async (packet) => {
    const url = new URL("/data-vis/data-vis.js", location.href).href;
    const module: typeof import("../../src/features/color-system/data-vis/adapter") =
      await import(url);
    const current = module.createDataVisRuntime(packet);
    const dark = current.withContext({ modes: { colorScheme: "dark" } });
    const fluid = current.withContext({ contrastMultiplier: 1.18 });
    const widePacket = structuredClone(packet);
    widePacket.color.settings.colorOutput = {
      authoringGamut: "display-p3",
      outputFormat: "rgb",
      mapOutputsToSrgb: false,
    };
    const wide = module
      .createDataVisRuntime(widePacket)
      .continuous("Data sequence")(0.37);
    return {
      definitions: current.definitions.length,
      center: current.continuous("Data divergence")(0.5),
      colors: current.categorical("Data categories"),
      darkColors: dark.categorical("Data categories"),
      base: current.continuous("Data sequence")(0),
      fluid: fluid.continuous("Data sequence")(0),
      wide,
      validWideColor: CSS.supports("color", wide),
    };
  }, packet);
  expect(runtime.definitions).toBe(3);
  expect(runtime.colors).toHaveLength(2);
  expect(runtime.darkColors).not.toEqual(runtime.colors);
  expect(runtime.fluid).not.toBe(runtime.base);
  expect(runtime.wide).toMatch(/^color\(display-p3 /);
  expect(runtime.validWideColor).toBe(true);
  await page.getByRole("radio", { name: "Elements", exact: true }).click();
  const center = page
    .locator('[aria-label="Data divergence swatches"]')
    .getByRole("img", { name: /^50%: / });
  await expect(center).toHaveAttribute("aria-label", `50%: ${runtime.center}`);
  const dialog = await openScale(page, "Data sequence");
  await number(dialog, "Contrast", "2.61803399");
  await closeScale(page, dialog);
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Save", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        sequence((await record(page)).saved).points[0].contrast!.value,
    )
    .toBe(2.61803399);
  await page
    .getByRole("button", {
      name: "Delete data vis scale Data sequence",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Open Data sequence data vis scale",
      exact: true,
    }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Open Data sequence data vis scale",
      exact: true,
    }),
  ).toBeVisible();
  const edit = await openScale(page, "Data sequence");
  await number(edit, "Contrast", "3.45678");
  await closeScale(page, edit);
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
        sequence((await record(page)).working).points[0].contrast!.value,
    )
    .toBe(2.61803399);
  await page.reload();
  await foundations(page);
  await innerTab(page, "Data vis");
  await expect(
    page.getByRole("button", {
      name: "Open Data sequence data vis scale",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  await expect(
    page.getByRole("banner").getByRole("button", { name: "Save", exact: true }),
  ).toBeVisible();
  const changeLog = page.getByRole("complementary", {
    name: "Change log",
    exact: true,
  });
  if (!(await changeLog.isVisible()))
    await page.getByRole("button", { name: /^Change log/ }).click();
  await expect(changeLog).toBeVisible();
  await changeLog
    .getByRole("button", { name: "Reset all", exact: true })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Reset all", exact: true })
    .click();
  await expect
    .poll(async () => (await record(page)).working.colorSystem.dataVisScales)
    .toEqual(createDefaultSnapshot().colorSystem.dataVisScales);
  await expect
    .poll(async () => (await record(page)).saved.colorSystem.dataVisScales)
    .toEqual(createDefaultSnapshot().colorSystem.dataVisScales);
});

test("Gradient stops support selection, keyboard and pointer movement while protecting endpoints and the center", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await seed(page);
  let dialog = await openScale(page, "Data sequence");
  const gradient = dialog.locator('[data-component="GradientStopControl"]');
  await expect(gradient.locator(":scope > div")).toHaveCSS(
    "background-image",
    /in oklch/,
  );
  await gradient
    .getByRole("button", { name: "Color stop, 50 percent", exact: true })
    .click();
  await dialog.getByRole("combobox", { name: /^Color token\b/ }).focus();
  await expect(
    dialog.getByRole("combobox", { name: /^Color token\b/ }),
  ).toBeVisible();
  const selected = gradient.getByRole("button", { pressed: true });
  await selected.press("ArrowRight");
  await selected.press("Shift+ArrowLeft");
  await expect
    .poll(
      async () =>
        sequence((await record(page)).working).points.find(
          (point) => point.id === "named",
        )!.position,
    )
    .toBe(0.509);
  const track = await gradient.locator(":scope > div").boundingBox();
  const handle = await selected.boundingBox();
  if (!track || !handle)
    throw new Error("The gradient and its handle must be visible.");
  await page.mouse.move(
    handle.x + handle.width / 2,
    handle.y + handle.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    track.x + track.width * 0.62,
    track.y + track.height / 2,
    { steps: 4 },
  );
  await page.mouse.up();
  await expect
    .poll(
      async () =>
        sequence((await record(page)).working).points.find(
          (point) => point.id === "named",
        )!.position,
    )
    .toBeCloseTo(0.62, 2);
  await gradient
    .getByRole("button", { name: "Start stop, 0 percent", exact: true })
    .click();
  await gradient.getByRole("button", { pressed: true }).press("ArrowRight");
  await expect(
    dialog.getByRole("button", {
      name: "Remove selected color stop",
      exact: true,
    }),
  ).toBeDisabled();
  expect(sequence((await record(page)).working).points[0].position).toBe(0);
  await closeScale(page, dialog);
  dialog = await openScale(page, "Data divergence");
  await dialog
    .getByRole("button", { name: "Center stop, 50 percent", exact: true })
    .click();
  await dialog
    .locator('[data-component="GradientStopControl"]')
    .getByRole("button", { pressed: true })
    .press("ArrowRight");
  await expect(
    dialog.getByRole("button", {
      name: "Remove selected color stop",
      exact: true,
    }),
  ).toBeDisabled();
  await closeScale(page, dialog);
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Save", exact: true })
    .click();
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  const discard = page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Discard edits", exact: true });
  if (await discard.isVisible()) await discard.click();
  dialog = await openScale(page, "Data sequence");
  await dialog
    .locator('[data-component="GradientStopControl"]')
    .getByRole("button", { name: /^Color stop,/ })
    .click();
  await expect(
    dialog.getByRole("combobox", { name: /^Color token\b/ }),
  ).toBeDisabled();
  await expect(
    dialog.getByRole("button", { name: "Add color stop", exact: true }),
  ).toHaveCount(0);
});

test("Static choices cancel without edits and all three types restore their retained Adaptive settings", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await seed(page);
  for (const [name, id] of [
    ["Data sequence", DATA_VIS_IDS.sequential],
    ["Data divergence", DATA_VIS_IDS.diverging],
    ["Data categories", DATA_VIS_IDS.categorical],
  ]) {
    let dialog = await openScale(page, name);
    const before = (await record(page)).working;
    await toggleStatic(dialog);
    const choice = page.getByRole("dialog", {
      name: "Use Static colors",
      exact: true,
    });
    await expect(
      choice.getByRole("radio", { name: "Current colors", exact: true }),
    ).toBeChecked();
    await choice.getByRole("button", { name: "Cancel", exact: true }).click();
    expect((await record(page)).working).toEqual(before);
    await expect(
      dialog.getByRole("checkbox", { name: "Static", exact: true }),
    ).not.toBeChecked();
    await toggleStatic(dialog);
    await choice
      .getByRole("button", { name: "Use Static", exact: true })
      .click();
    await expect(
      dialog.getByRole("checkbox", { name: "Static", exact: true }),
    ).toBeChecked();
    await expect(
      dialog.getByRole("textbox", { name: "Contrast", exact: true }),
    ).toHaveCount(0);
    await expect
      .poll(
        async () =>
          (await record(page)).working.colorSystem.dataVisScales.find(
            (scale) => scale.id === id,
          )?.staticColors,
      )
      .toHaveLength(id === DATA_VIS_IDS.categorical ? 2 : 3);
    const frozen = (await record(page)).working.colorSystem.dataVisScales.find(
      (scale) => scale.id === id,
    )!.staticColors!;
    expect(frozen).toHaveLength(id === DATA_VIS_IDS.categorical ? 2 : 3);
    await closeScale(page, dialog);
    await selectMode(page, "Dark");
    await selectMode(page, "High");
    await page.getByRole("radio", { name: "Elements", exact: true }).click();
    const swatches = page.locator(`[aria-label="${name} swatches"]`);
    for (const color of frozen) {
      const label =
        id === DATA_VIS_IDS.categorical
          ? `Color ${frozen.findIndex((member) => member.id === color.id) + 1}: ${color.value}`
          : `${color.position! * 100}%: ${color.value}`;
      await expect(
        swatches.getByRole("img", { name: label, exact: true }),
      ).toBeVisible();
    }
    dialog = await openScale(page, name);
    await toggleStatic(dialog);
    await expect
      .poll(async () =>
        (await record(page)).working.colorSystem.dataVisScales.find(
          (scale) => scale.id === id,
        ),
      )
      .toEqual(
        before.colorSystem.dataVisScales.find((scale) => scale.id === id),
      );
    const after = (await record(page)).working;
    expect(
      after.colorSystem.dataVisScales.find((scale) => scale.id === id),
    ).toEqual(
      before.colorSystem.dataVisScales.find((scale) => scale.id === id),
    );
    expect(after.modeSets).toEqual(before.modeSets);
    await closeScale(page, dialog);
    await selectMode(page, "Light");
    await selectMode(page, "Regular");
  }
});

test("Default-mode capture differs from current Dark colors and remains usable in a narrow editor", async ({
  page,
}, info) => {
  test.setTimeout(60_000);
  await seed(page, createDataVisSnapshot(), true, true);
  const before = (await record(page)).working;
  const expected = await page.evaluate(async (packet) => {
    const { createDataVisRuntime } = await import(
      new URL("/data-vis/data-vis.js", location.href).href
    );
    const runtime = createDataVisRuntime(packet);
    return {
      default: runtime.continuous("Data sequence")(0),
      dark: runtime
        .withContext({ modes: { colorScheme: "dark" } })
        .continuous("Data sequence")(0),
    };
  }, buildDataVisSourcePacket(before));
  expect(expected.dark).not.toBe(expected.default);
  let dialog = await openScale(page, "Data sequence");
  await toggleStatic(dialog);
  const choice = page.getByRole("dialog", {
    name: "Use Static colors",
    exact: true,
  });
  await choice.getByText("Default-mode colors", { exact: true }).click();
  await choice.getByRole("button", { name: "Use Static", exact: true }).click();
  await expect
    .poll(
      async () =>
        sequence((await record(page)).working).staticColors?.[0]?.value,
    )
    .toBe(expected.default);
  await closeScale(page, dialog);
  await page.getByRole("button", { name: "Dismiss", exact: true }).click();
  const changeLog = page.getByRole("complementary", {
    name: "Change log",
    exact: true,
  });
  if (await changeLog.isVisible())
    await page
      .getByRole("banner")
      .getByRole("button", { name: /^Change log/ })
      .click();
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.getByRole("button", { name: "Collapse", exact: true }).click();
  dialog = await openScale(page, "Data sequence");
  await expect
    .poll(async () => {
      const bounds = await dialog.boundingBox();
      return bounds !== null && bounds.x >= 0 && bounds.x + bounds.width <= 390;
    })
    .toBe(true);
  expect(
    await dialog.evaluate(
      (element) => element.scrollWidth - element.clientWidth,
    ),
  ).toBeLessThanOrEqual(1);
  const hex = dialog.getByRole("textbox", { name: "Hex", exact: true });
  await hex.scrollIntoViewIfNeeded();
  await expect(hex).toBeInViewport({ ratio: 1 });
  await page.screenshot({
    path: info.outputPath("static-editor-dark-narrow.png"),
    animations: "disabled",
  });
});

test("Static categorical Tokens edits are shared, survive reload and preserve dormant mode-specific values", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const snapshot = createDataVisSnapshot(),
    id = dataVisMemberId(DATA_VIS_IDS.categorical, "blue-member");
  const manualCss = "color(display-p3 0.12 0.23 0.34 / 0.45)";
  const manualOutput = serializeOutputColor(
    new Color(manualCss),
    snapshot.colorSystem.settings.colorOutput,
  );
  const scheme = snapshot.modeSets.find((axis) => axis.key === "colorScheme")!;
  const dark = scheme.modes.find((mode) => mode.key === "dark")!;
  const darkKey = canonicalTokenModeKey(
    Object.fromEntries(
      snapshot.modeSets.map((axis) => [
        axis.id,
        axis.id === scheme.id ? dark.id : axis.defaultModeId,
      ]),
    ),
  );
  snapshot.browserTokenEdits[id] = {
    values: { [darkKey]: { value: "#123456", baseline: "#445566" } },
  };
  await seed(page, snapshot);
  let dialog = await openScale(page, "Data categories");
  await toggleStatic(dialog);
  await page
    .getByRole("dialog", { name: "Use Static colors", exact: true })
    .getByRole("button", { name: "Use Static", exact: true })
    .click();
  await closeScale(page, dialog);
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Tokens", exact: true })
    .click();
  await page.getByRole("radio", { name: "Colors", exact: true }).click();
  const search = page.getByRole("searchbox", {
    name: "Search tokens",
    exact: true,
  });
  await search.fill("data-categories-color-1");
  await page
    .getByRole("button", { name: "Open data-categories-color-1", exact: true })
    .click();
  dialog = page.getByRole("dialog");
  await expect(
    dialog.getByText("Value scope: All modes (Static)", { exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByText("Captured Static color", { exact: true }),
  ).toBeVisible();
  await dialog
    .getByRole("textbox", { name: "Value", exact: true })
    .fill(manualCss);
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect
    .poll(
      async () =>
        category((await record(page)).working).staticColors![0].overrideValue,
    )
    .toBe(manualCss);
  expect((await record(page)).working.browserTokenEdits[id].values).toEqual(
    snapshot.browserTokenEdits[id].values,
  );
  await selectMode(page, "Dark");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Tokens", exact: true })
    .click();
  await search.fill("data-categories-color-1");
  await page
    .getByRole("button", { name: "Open data-categories-color-1", exact: true })
    .click();
  dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("textbox", { name: "Value", exact: true }),
  ).toHaveValue(manualOutput);
  await dialog.focus();
  await page.keyboard.press("Escape");
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Save", exact: true })
    .click();
  await page.reload();
  await foundations(page);
  await innerTab(page, "Data vis");
  await expect
    .poll(
      async () =>
        category((await record(page)).saved).staticColors![0].overrideValue,
    )
    .toBe(manualCss);
  dialog = await openScale(page, "Data categories");
  await expect(
    dialog.getByRole("checkbox", { name: "Static", exact: true }),
  ).toBeChecked();
  await toggleStatic(dialog);
  await expect
    .poll(async () => category((await record(page)).working).staticColors)
    .toBeUndefined();
  expect((await record(page)).working.browserTokenEdits[id].values).toEqual(
    snapshot.browserTokenEdits[id].values,
  );
  await closeScale(page, dialog);
  const elements = page.locator('[data-component="DataVisElements"]');
  await expect(
    elements.getByRole("img", { name: "Color 1: #123456", exact: true }),
  ).toBeVisible();
});
