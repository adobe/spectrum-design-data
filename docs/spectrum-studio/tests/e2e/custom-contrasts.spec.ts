// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Page } from "@playwright/test";
import { createGraySnapshot } from "../fixtures/customContrasts";
import {
  AUTHORING_STORAGE_KEY,
  AUTHORING_RECORD_VERSION,
} from "../../src/features/edit-session/storage";
import { selectMode } from "./modeControl";
import { selectColorPanelSection } from "./colorPanelSection";
import { createStore } from "jotai";
import {
  createDefaultSnapshot,
  restoreAuthoringSnapshotAtom,
} from "../../src/features/edit-session/state";
import {
  grayDarkRatios,
  grayIndices,
  grayLightRatios,
} from "../fixtures/grayDefaults";
import {
  colorSchemeDocumentsAtom,
  contrastModesAtom,
  cssBaseDocumentAtom,
  customContrastModeDocumentsAtom,
  scaleModeDocumentsAtom,
} from "../../src/features/color-system/state";
import { buildColorLibrary } from "../../src/features/color-system/cssLibrary";
import { resolveColorDocument } from "../../src/features/color-system/resolution";
import { generateColors } from "../../src/features/color-system/dynamicGeneration";
import { buildScaleData } from "../../src/features/color-system/scaleGeneration";
import { contrastStepIndex } from "../../src/features/color-system/contrastSteps";
import { hexToLinear } from "../../src/features/color-system/colorMath";
import { decodeAnalysisColor } from "../../src/features/color-system/analysis";
import { STANDARD_SCALE_NAMING_RULE } from "../../src/features/logic/scaleNaming";

const names =
  "Names: 25, 50, 75, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000";
const errors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const messages: string[] = [];
  errors.set(page, messages);
  page.on("pageerror", (error) => messages.push(error.message));
});
test.afterEach(async ({ page }) => {
  expect(errors.get(page)).toEqual([]);
  await expect(page.getByText(/Artifact generation failed:/)).toHaveCount(0);
});
test.use({ viewport: { width: 1600, height: 1000 }, actionTimeout: 15_000 });

async function seed(
  page: Page,
  custom = true,
  snapshot = createGraySnapshot(custom),
) {
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
}
async function foundations(page: Page) {
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations", exact: true })
    .click();
  await page.getByRole("tab", { name: "Colors", exact: true }).click();
}
async function openGray(page: Page) {
  await selectColorPanelSection(page, "Color scales");
  await page
    .getByRole("tabpanel", { name: "Colors", exact: true })
    .getByRole("button", { name: "Gray", exact: true })
    .click();
  const controls = page.getByRole("region", { name: "Custom contrast steps" });
  await expect(controls).toBeVisible();
  return controls;
}
async function closeGray(page: Page) {
  const controls = page.getByRole("region", { name: "Custom contrast steps" });
  await page
    .getByRole("dialog", { name: "Edit Gray scale", exact: true })
    .focus();
  await page.keyboard.press("Escape");
  await expect(controls).toHaveCount(0);
}

test("shipped Gray is first, has the exact Light/Dark ratios, and appears in Evaluation and CSS", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await seed(page, true, createDefaultSnapshot());
  await foundations(page);
  const controls = await openGray(page);
  const color = page.getByRole("tabpanel", { name: "Colors", exact: true });
  for (const [index, label] of grayIndices.entries()) {
    await expect(
      controls.getByRole("textbox", { name: `Contrast ${label}`, exact: true }),
    ).toHaveValue(String(grayLightRatios[index]));
    await expect(
      controls.getByRole("textbox", {
        name: `Opposite contrast ${label}`,
        exact: true,
      }),
    ).toHaveValue(String(grayDarkRatios[index]));
  }
  await closeGray(page);
  await expect(
    color.getByRole("button", { name: "Gray", exact: true }),
  ).toBeVisible();
  await expect(
    color.getByRole("button", { name: "Silver", exact: true }),
  ).toBeVisible();
  const ramp = page.locator(".colorEvaluationScale").first();
  await expect(ramp).toContainText("Gray");
  for (const label of grayIndices)
    await expect(ramp.getByText(String(label), { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Show$/ }).click();
  await page.getByRole("option", { name: "CSS opacity", exact: true }).click();
  await page.keyboard.press("Escape");
  await selectMode(page, "Dark");
  const darkControls = await openGray(page);
  await expect(darkControls).toContainText("Effective 1.27:1");
  await expect(
    darkControls.getByRole("textbox", { name: "Contrast 100", exact: true }),
  ).toHaveValue("1.2");
  await closeGray(page);
  await page.getByRole("radio", { name: "Code", exact: true }).click();
  await expect(page.getByRole("button", { name: "Copy CSS" })).toBeEnabled({
    timeout: 30_000,
  });
  await expect(page.locator('[data-view="code"]')).toContainText(
    "--contrast-gray-75: 1.198;",
  );
  await expect(page.locator('[data-view="code"]')).toContainText(
    "--contrast-gray-1000: 18.883;",
  );
});

test("author the 13-step Gray list, Save/reload, and preserve a shared 16-step scale", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await seed(page, false);
  await foundations(page);
  const controls = await openGray(page);
  await controls
    .getByRole("checkbox", { name: "Use custom contrast steps" })
    .focus();
  await controls
    .getByRole("checkbox", { name: "Use custom contrast steps" })
    .press("Space");
  await controls.getByRole("button", { name: /Base swatch$/ }).click();
  await page.getByRole("option", { name: /^400 \(/ }).click();
  for (const label of [1300, 1200, 1100])
    await controls
      .getByRole("button", { name: `Remove ${label}`, exact: true })
      .click();
  await expect(controls.getByText(names, { exact: true })).toBeVisible();
  await expect(
    controls.getByRole("button", { name: "Remove 100", exact: true }),
  ).toBeDisabled();
  await closeGray(page);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        (key) =>
          JSON.parse(localStorage.getItem(key)!).saved.colorSystem.scales[0]
            .customContrasts.steps.length,
        AUTHORING_STORAGE_KEY,
      ),
    )
    .toBe(13);
  await page.reload();
  await foundations(page);
  await expect(
    (await openGray(page)).getByText(names, { exact: true }),
  ).toBeVisible();
  await closeGray(page);
  const state = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).saved,
    AUTHORING_STORAGE_KEY,
  );
  expect(state.colorSystem.contrasts).toHaveLength(16);
  expect(state.colorSystem.scales[1].customContrasts).toBeUndefined();
  await expect(
    page.getByRole("heading", { name: "Color ramps", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Show$/ }).click();
  await page.getByRole("option", { name: "CSS opacity", exact: true }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("radio", { name: "Analyze", exact: true }).click();
  const analysis = page.locator('[data-component="ColorAnalyze"]');
  await analysis.getByRole("tab", { name: "Lightness", exact: true }).click();
  await analysis
    .getByRole("button", { name: "Show values", exact: true })
    .click();
  await expect(
    analysis
      .getByRole("table", { name: "Gray output values" })
      .getByRole("row"),
  ).toHaveCount(14);
  await expect(
    analysis.getByRole("table", { name: "Gray output values" }),
  ).toContainText("25");
  await page.getByRole("radio", { name: "Code", exact: true }).click();
  await expect(page.getByRole("button", { name: "Copy CSS" })).toBeEnabled({
    timeout: 30_000,
  });
  await expect(page.locator('[data-view="code"]')).toContainText(
    "--contrast-gray-25",
  );
  await page.getByRole("radio", { name: "Preview", exact: true }).click();
  await expect(page.locator('[data-component="PreviewToolbar"]')).toBeVisible();
});

test("custom CSS matches generated colors in Light/Dark, explicit Contrast modes and OS preference", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const snapshot = createGraySnapshot();
  const store = createStore();
  store.set(restoreAuthoringSnapshotAtom, snapshot);
  const css = buildColorLibrary(
    store.get(cssBaseDocumentAtom),
    store.get(colorSchemeDocumentsAtom),
    store.get(contrastModesAtom),
    store.get(scaleModeDocumentsAtom),
    snapshot.taxonomy,
    snapshot.rules,
    store.get(customContrastModeDocumentsAtom),
  );
  const scheme = snapshot.modeSets.find((axis) => axis.key === "colorScheme")!;
  const contrast = snapshot.modeSets.find((axis) => axis.key === "contrast")!;
  for (const dark of [false, true])
    for (const high of [false, true])
      for (const osPreference of [false, true]) {
        const schemeMode = scheme.modes.find(
          (mode) => mode.key === (dark ? "dark" : "light"),
        )!;
        const contrastMode = contrast.modes.find((mode) =>
          high ? mode.key === "high" : mode.id === contrast.defaultModeId,
        )!;
        await page.emulateMedia({
          contrast: osPreference ? "more" : "no-preference",
        });
        const document = resolveColorDocument(
          snapshot.colorSystem,
          [schemeMode, contrastMode],
          undefined,
          { modeSets: snapshot.modeSets },
        );
        const scale = document.scales[0],
          background = dark ? "#000000" : "#ffffff";
        const probes = scale.customContrasts!.steps.map((step, index) => ({
          step,
          label: contrastStepIndex(index, scale, snapshot.rules),
        }));
        await page.setContent(`<html data-color-scheme="${schemeMode.key}" data-contrast="${contrastMode.key}"><head><style>${css}</style></head><body>
      ${probes.map(({ label }, index) => `<div id="probe-${index}" class="color-scale-gray color-contrast-${label} color-system-tint-bg" style="--bg:${background}"></div>`).join("")}
      </body></html>`);
        const computed = await page
          .locator("[id^=probe-]")
          .evaluateAll((nodes) =>
            nodes.map((node) => getComputedStyle(node).backgroundColor),
          );
        probes.forEach(({ step }, index) => {
          const expected = generateColors(
            buildScaleData(scale),
            hexToLinear(background),
            step.value,
            document.settings,
          ).dynamic.linear;
          const actual = decodeAnalysisColor(computed[index], "srgb");
          expect(
            Math.max(
              ...actual.map((value, channel) =>
                Math.abs(value - expected[channel]),
              ),
            ),
          ).toBeLessThanOrEqual(0.005);
        });
        if (high && osPreference) {
          await page
            .locator("html")
            .evaluate((node) => node.removeAttribute("data-contrast"));
          const preferred = await page
            .locator("#probe-3")
            .evaluate((node) => getComputedStyle(node).backgroundColor);
          expect(preferred).toBe(computed[3]);
        }
      }
  const fractional = structuredClone(snapshot.colorSystem);
  const rule = {
    ...STANDARD_SCALE_NAMING_RULE,
    id: "fractional-naming",
    baseLabel: 1,
    aboveIncrement: 1,
  };
  fractional.scales[0].customContrasts!.namingRuleId = rule.id;
  const fractionalCss = buildColorLibrary(fractional, [], [], [], undefined, [
    ...snapshot.rules!,
    rule,
  ]);
  await page.setContent(
    `<style>${fractionalCss}</style><div id="fractional" class="color-scale-gray color-contrast-0-25 color-system-tint-bg" style="--bg:#ffffff"></div>`,
  );
  const computed = await page
    .locator("#fractional")
    .evaluate((node) => getComputedStyle(node).backgroundColor);
  const expected = generateColors(
    buildScaleData(fractional.scales[0]),
    hexToLinear("#ffffff"),
    fractional.scales[0].customContrasts!.steps[0].value,
    fractional.settings,
  ).dynamic.linear;
  expect(
    Math.max(
      ...decodeAnalysisColor(computed, "srgb").map((value, channel) =>
        Math.abs(value - expected[channel]),
      ),
    ),
  ).toBeLessThanOrEqual(0.005);
});

test("Contrast modes edit only ratios, reset inheritance, and disable/Undo/Cancel remain scoped", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await seed(page);
  await foundations(page);
  await selectMode(page, "High");
  const controls = await openGray(page);
  await expect(
    controls.getByRole("textbox", { name: "Contrast 100", exact: true }),
  ).toHaveValue("5.5");
  await expect(
    controls.getByRole("button", { name: /Base swatch$/ }),
  ).toBeDisabled();
  await controls
    .getByRole("textbox", { name: "Contrast 100", exact: true })
    .fill("6");
  await controls
    .getByRole("textbox", { name: "Contrast 100", exact: true })
    .press("Tab");
  await expect(
    controls.getByText("Mode override", { exact: false }).first(),
  ).toBeVisible();
  await controls
    .getByRole("button", { name: "Reset 100", exact: true })
    .click();
  await expect(
    controls.getByRole("button", { name: "Reset 100", exact: true }),
  ).toBeDisabled();
  await closeGray(page);
  await selectMode(page, "Regular");
  await openGray(page);
  await page
    .getByRole("region", { name: "Custom contrast steps" })
    .getByRole("button", { name: "Use shared contrast steps" })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Use shared steps" })
    .click();
  await expect(
    page.getByRole("checkbox", { name: "Use custom contrast steps" }),
  ).toBeVisible();
  await closeGray(page);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(
    (await openGray(page)).getByText(names, { exact: true }),
  ).toBeVisible();
  await closeGray(page);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Discard edits" })
    .click();
  await selectMode(page, "High");
  await expect(
    (await openGray(page)).getByRole("textbox", {
      name: "Contrast 100",
      exact: true,
    }),
  ).toHaveValue("5.5");
});

test("editable Logic naming rules reach custom colors and reject invalid consumer ranges", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await seed(page);
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Logic" })
    .click();
  await page.getByRole("button", { name: "Add rule" }).click();
  const dialog = page
    .getByRole("dialog")
    .filter({ has: page.locator('[data-component="RuleEditorDialog"]') });
  await dialog
    .getByRole("textbox", { name: "Name", exact: true })
    .fill("Gray naming");
  await dialog.getByRole("button", { name: /Type$/ }).click();
  await page.getByRole("option", { name: "Scale naming", exact: true }).click();
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await foundations(page);
  const controls = await openGray(page);
  await controls.getByRole("button", { name: /Naming rule$/ }).click();
  await page.getByRole("option", { name: "Gray naming", exact: true }).click();
  await closeGray(page);
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Logic" })
    .click();
  await page.getByRole("button", { name: "Edit rule Gray naming" }).click();
  await expect(dialog).toContainText("Gray");
  await dialog.getByRole("button", { name: /Below-base spacing$/ }).click();
  await page
    .getByRole("option", { name: "Fixed increment", exact: true })
    .click();
  await dialog
    .getByRole("textbox", { name: "Below-base increment", exact: true })
    .fill("50");
  await dialog
    .getByRole("textbox", { name: "Below-base increment", exact: true })
    .press("Tab");
  await expect(
    dialog.getByRole("button", { name: "Save", exact: true }),
  ).toBeDisabled();
  await expect(dialog).toContainText("positive");
  await dialog
    .getByRole("textbox", { name: "Below-base increment", exact: true })
    .fill("25");
  await dialog
    .getByRole("textbox", { name: "Below-base increment", exact: true })
    .press("Tab");
  await dialog
    .getByRole("textbox", { name: "Above-base increment" })
    .fill("200");
  await dialog
    .getByRole("textbox", { name: "Above-base increment" })
    .press("Tab");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await page
    .getByRole("button", { name: "Delete rule Gray naming", exact: true })
    .click();
  await expect(page.getByText(/names color steps/)).toBeVisible();
  await expect(
    page.getByRole("article", { name: "Gray naming", exact: true }),
  ).toBeVisible();
  await foundations(page);
  await expect(
    (await openGray(page)).getByText(/Names: 25, 50, 75, 100, 300, 500/),
  ).toBeVisible();
  await closeGray(page);
  const changes = page.getByRole("complementary", {
    name: "Change log",
    exact: true,
  });
  if (await changes.isVisible())
    await page
      .getByRole("banner")
      .getByRole("button", { name: /^Change log,/ })
      .click();
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("button", { name: "Collapse", exact: true })
    .click();
  await page.setViewportSize({ width: 390, height: 900 });
  const narrowControls = await openGray(page);
  const input = narrowControls.getByRole("textbox", {
    name: "Contrast 100",
    exact: true,
  });
  await input.scrollIntoViewIfNeeded();
  await expect(input).toBeInViewport();
  await input.fill("1.7");
  await input.press("Tab");
  await expect(input).toHaveValue("1.7");
  const bounds = await page
    .getByRole("dialog", { name: "Edit Gray scale", exact: true })
    .boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: `${test.info().outputDir}/gray-custom-narrow.png`,
  });
});
