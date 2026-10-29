// Copyright 2026 Adobe. All rights reserved.
import { expect, test, type Page } from "@playwright/test";
import Color from "colorjs.io";
import {
  createDefaultSnapshot,
  type EditSessionSnapshot,
} from "../../src/features/edit-session/state";
import {
  AUTHORING_RECORD_VERSION,
  AUTHORING_STORAGE_KEY,
  type AuthoringRecord,
} from "../../src/features/edit-session/storage";
import { selectColorPanelSection } from "./colorPanelSection";
import {
  buildColorLibrary,
  sanitizeTokenName,
} from "../../src/features/color-system/cssLibrary";
import { generateColors } from "../../src/features/color-system/dynamicGeneration";
import { buildScaleData } from "../../src/features/color-system/scaleGeneration";
import { parsedOutputLinear } from "../../src/features/color-system/outputContrast";
import {
  outputGamut,
  type ColorOutputSettings,
} from "../../src/features/color-system/outputSettings";
import { serializeOutputColor } from "../../src/features/color-system/outputSerialization";
import {
  resolvedBackgroundLinear,
  surfaceLinear,
} from "../../src/features/color-system/surfaceGeneration";
import { tokenStableKey, tokenUuid } from "../../src/features/tokens/model";
import { generateDocumentTokens } from "../../src/features/changelog/changes";
import {
  contrastStepIndex,
  scaleContrasts,
} from "../../src/features/color-system/contrastSteps";
import {
  contrastRatio,
  luminance,
  type RgbGamut,
} from "../../src/features/color-system/colorMath";

const errors = new WeakMap<Page, string[]>();
test.use({ viewport: { width: 1900, height: 1100 } });
test.beforeEach(({ page }) => {
  const collected: string[] = [];
  errors.set(page, collected);
  page.on("pageerror", (error) => collected.push(error.message));
});
test.afterEach(({ page }) => expect(errors.get(page)).toEqual([]));

function browserLuminance(css: string, gamut: RgbGamut) {
  return luminance(parsedOutputLinear(css, gamut), gamut);
}

function browserNumericColor(css: string) {
  return css
    .replace(/\bnone\b/g, "0")
    .replace(/[-+]?(?:\d*\.?\d+)e[-+]?\d+/gi, (value) =>
      Number(value).toFixed(16),
    );
}

async function seed(
  page: Page,
  snapshot = createDefaultSnapshot(),
  editing = true,
) {
  await page.addInitScript(
    ({ snapshot, editing, key, version }) => {
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
    },
    {
      snapshot,
      editing,
      key: AUTHORING_STORAGE_KEY,
      version: AUTHORING_RECORD_VERSION,
    },
  );
  await page.goto("/");
}
async function navigate(page: Page, name: string) {
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: new RegExp(`^${name}\\b`) })
    .click();
}
async function colors(page: Page, section: string) {
  await navigate(page, "Foundations");
  await page.getByRole("tab", { name: "Colors", exact: true }).click();
  await selectColorPanelSection(page, section);
}
async function choose(page: Page, label: string, option: string) {
  await page.getByRole("button", { name: new RegExp(`${label}$`) }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}
async function record(
  page: Page,
): Promise<AuthoringRecord<EditSessionSnapshot>> {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    AUTHORING_STORAGE_KEY,
  );
}

test("shared settings synchronize, preserve sources, save, cancel and reload", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const initial = createDefaultSnapshot();
  await seed(page, initial);
  await navigate(page, "Platforms");
  await choose(page, "Gamut", "Rec 2020");
  await expect(
    page.getByRole("status").filter({ hasText: "Color format changed to RGB" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Color format$/ }).click();
  await expect(
    page.getByRole("option", { name: "Hex", exact: true }),
  ).toHaveAttribute("aria-disabled", "true");
  await expect(
    page.getByRole("option", { name: "HSL", exact: true }),
  ).toHaveAttribute("aria-disabled", "true");
  await page.keyboard.press("Escape");
  await page
    .getByRole("checkbox", { name: "Map outputs to sRGB" })
    .press("Space");
  await choose(page, "Color format", "Hex");
  await colors(page, "Palette");
  await page
    .getByRole("tabpanel", { name: "Colors", exact: true })
    .getByText("System settings", { exact: true })
    .click();
  await expect(page.getByRole("button", { name: /Gamut$/ })).toContainText(
    "Rec 2020",
  );
  await expect(
    page.getByRole("checkbox", { name: "Map outputs to sRGB" }),
  ).toBeChecked();
  await choose(page, "Gamut", "Display P3");
  await navigate(page, "Platforms");
  await expect(page.getByRole("button", { name: /Gamut$/ })).toContainText(
    "Display P3",
  );
  const working = (await record(page)).working.colorSystem;
  expect(working.palette).toEqual(initial.colorSystem.palette);
  expect(working.scales).toEqual(initial.colorSystem.scales);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await choose(page, "Color format", "OKLCh");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Discard edits" })
    .click();
  expect((await record(page)).working.colorSystem.settings.colorOutput).toEqual(
    {
      authoringGamut: "display-p3",
      outputFormat: "hex",
      mapOutputsToSrgb: true,
    },
  );
  await page.reload();
  await navigate(page, "Platforms");
  await expect(page.getByRole("button", { name: /Gamut$/ })).toHaveCount(0);
  await expect(
    page.getByRole("checkbox", { name: "Map outputs to sRGB" }),
  ).toBeDisabled();
});

test("wide defaults reach palette, scale, data vis and elevation pickers and all color views", async ({
  page,
}) => {
  const snapshot = createDefaultSnapshot();
  snapshot.colorSystem.settings.colorOutput = {
    authoringGamut: "rec2020",
    outputFormat: "oklch",
    mapOutputsToSrgb: false,
  };
  await seed(page, snapshot);
  await colors(page, "Palette");
  await page
    .getByRole("button", { name: /^Edit value of / })
    .first()
    .click();
  await expect(page.getByRole("button", { name: /Color space/ })).toContainText(
    "OKLCH",
  );
  await expect(page.getByRole("radio", { name: "Polar model" })).toBeChecked();
  await page.keyboard.press("Escape");
  await selectColorPanelSection(page, "Color scales");
  await page
    .getByRole("tabpanel", { name: "Colors", exact: true })
    .getByRole("button", { name: "Red", exact: true })
    .click();
  await expect(page.getByRole("radio", { name: "Polar model" })).toBeChecked();
  await expect(page.getByText("C × H", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  for (const view of ["Elements", "Preview", "Analyze", "Code"]) {
    await page.getByRole("radio", { name: view, exact: true }).click();
    await expect(
      page.locator(`[data-view="${view.toLowerCase()}"]`),
    ).toBeVisible();
  }
  await selectColorPanelSection(page, "Data vis");
  await page
    .getByRole("button", { name: "Open Fire data vis scale", exact: true })
    .click();
  const dataVis = page.getByRole("dialog", {
    name: "Edit Fire data vis scale",
    exact: true,
  });
  await expect(dataVis).toBeVisible();
  const editorHeight = await dataVis.evaluate(
    (element) => element.clientHeight,
  );
  await dataVis.getByRole("button", { name: /Color source$/ }).click();
  await page.getByRole("option", { name: "Custom color", exact: true }).click();
  await expect(dataVis.getByRole("button", { name: /Gamut/ })).toContainText(
    "Rec 2020",
  );
  await expect(
    dataVis.getByRole("radio", { name: "Polar model" }),
  ).toBeChecked();
  await expect
    .poll(() => dataVis.evaluate((element) => element.clientHeight))
    .toBe(editorHeight);
  expect(
    await dataVis.evaluate(
      (element) => element.scrollHeight > element.clientHeight,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 1900, height: 600 });
  await expect
    .poll(() =>
      dataVis.evaluate((element) => element.getBoundingClientRect().height),
    )
    .toBeLessThanOrEqual(576);
  await page.setViewportSize({ width: 1900, height: 1100 });
  await dataVis.focus();
  await page.keyboard.press("Escape");
  await page.getByRole("tab", { name: "Elevation", exact: true }).click();
  await page.getByRole("button", { name: "Mode sets", exact: true }).click();
  await page
    .getByRole("button", { name: "Edit Dark for elevation", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Edit shadow color", exact: true })
    .click();
  await expect(page.getByRole("button", { name: /Color space/ })).toContainText(
    "OKLCH",
  );
  await expect(page.getByRole("radio", { name: "Polar model" })).toBeChecked();
  await page.getByRole("button", { name: /Color space/ }).focus();
  await page.keyboard.press("Escape");
  const modeDialog = page.getByRole("dialog", {
    name: "Edit Dark for elevation",
    exact: true,
  });
  await modeDialog.focus();
  await page.keyboard.press("Escape");
  await expect(modeDialog).toHaveCount(0);
  await navigate(page, "Tokens");
  await expect(
    page.getByRole("searchbox", { name: "Search tokens" }),
  ).toBeVisible();
  await navigate(page, "Design");
  await expect(page.locator("main")).toBeVisible();
});

test("adaptive CSS preserves nested surface references in light and dark contexts", async ({
  page,
}) => {
  const configurations: ColorOutputSettings[] = [
    { authoringGamut: "srgb", outputFormat: "rgb", mapOutputsToSrgb: false },
    {
      authoringGamut: "display-p3",
      outputFormat: "rgb",
      mapOutputsToSrgb: false,
    },
    { authoringGamut: "rec2020", outputFormat: "rgb", mapOutputsToSrgb: false },
  ];
  for (const settings of configurations)
    for (const backgroundLightness of [0, 1]) {
      const document = createDefaultSnapshot().colorSystem;
      document.settings.colorOutput = settings;
      document.backgroundLightness = backgroundLightness;
      const parent = {
        ...document.surfaces.find((surface) => !surface.base)!,
        id: "css-parent",
        name: "CSS parent",
        source: "base",
        sourceScaleId: undefined,
        reference: "base" as const,
        contrast: 1.1,
        forceDark: false,
      };
      const child = {
        ...parent,
        id: "css-child",
        name: "CSS child",
        reference: "parent" as const,
        contrast: 1.3,
      };
      document.surfaces = [
        document.surfaces.find((surface) => surface.base)!,
        parent,
        child,
      ];
      const gamut = outputGamut(settings);
      const base = resolvedBackgroundLinear(document),
        parentColor = surfaceLinear(parent, document);
      const expectedChild = surfaceLinear(child, document, parentColor);
      await page.setContent(`<style>${buildColorLibrary(document)}</style><div id="parent" class="surface-css-parent">
      <div id="child" class="surface-css-child"></div></div>`);
      const measured = await page
        .locator("#parent, #child")
        .evaluateAll((elements, gamut) => {
          for (const element of elements)
            (element as HTMLElement).style.color =
              `color(from var(--surface-color) ${gamut} r g b)`;
          return elements.map((element) => getComputedStyle(element).color);
        }, gamut);
      for (const [index, expected] of [parentColor, expectedChild].entries()) {
        const actual = parsedOutputLinear(
          browserNumericColor(measured[index]),
          gamut,
        );
        expect(
          Math.max(
            ...actual.map((channel, i) => Math.abs(channel - expected[i])),
          ),
          `${JSON.stringify(settings)} ${backgroundLightness}: ${measured[index]}`,
        ).toBeLessThanOrEqual(0.005);
        expect(
          contrastRatio(
            luminance(actual, gamut),
            luminance(
              index === 0
                ? base
                : parsedOutputLinear(browserNumericColor(measured[0]), gamut),
              gamut,
            ),
          ),
        ).toBeGreaterThanOrEqual((index === 0 ? 1.1 : 1.3) - 0.00002);
      }
    }
});

test("failed manual output retains navigation, Save and recovery controls", async ({
  page,
}) => {
  const snapshot = createDefaultSnapshot(),
    scale = snapshot.colorSystem.scales[0];
  const contrast = (
    scale.customContrasts?.steps ?? snapshot.colorSystem.contrasts
  ).find((contrast) => contrast.value >= 3)!;
  const id = tokenUuid(tokenStableKey(scale.id, contrast.id));
  const generated = generateDocumentTokens(snapshot.colorSystem).find(
    (token) => token.uuid === id,
  )!;
  snapshot.tokenOverrides[id] = {
    value: "#ffffff",
    editedAt: "2026-01-01T00:00:00.000Z",
    baseline: { name: generated.name, value: generated.value },
  };
  await seed(page, snapshot);
  await expect(
    page.getByRole("button", { name: "Save", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Token impact", exact: true })
      .getByRole("alert"),
  ).toContainText("Token impact is unavailable");
  await expect(
    page
      .getByRole("region", { name: "System impact", exact: true })
      .getByRole("img", { name: /^System impact:/ }),
  ).toBeVisible();
  await navigate(page, "Platforms");
  await expect(page.getByRole("button", { name: /Gamut$/ })).toBeVisible();
  await page.getByRole("tab", { name: "Log", exact: true }).click();
  const card = page.locator("[data-change-id]");
  await expect(card).toHaveCount(1);
  await card
    .getByRole("button", { name: /^Reset / })
    .first()
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Reset selected change", exact: true })
    .click();
  await expect
    .poll(async () => (await record(page)).working.tokenOverrides[id])
    .toBeUndefined();
  await navigate(page, "Tokens");
  await expect(
    page.getByRole("searchbox", { name: "Search tokens" }),
  ).toBeVisible();
});

test("adaptive CSS follows native gamut math without blending contrast sides at the threshold", async ({
  page,
}) => {
  const configurations: ColorOutputSettings[] = [
    { authoringGamut: "srgb", outputFormat: "rgb", mapOutputsToSrgb: false },
    {
      authoringGamut: "display-p3",
      outputFormat: "rgb",
      mapOutputsToSrgb: false,
    },
    { authoringGamut: "rec2020", outputFormat: "rgb", mapOutputsToSrgb: false },
    {
      authoringGamut: "rec2020",
      outputFormat: "oklch",
      mapOutputsToSrgb: true,
    },
    { authoringGamut: "srgb", outputFormat: "hsl", mapOutputsToSrgb: false },
  ];
  for (const settings of configurations) {
    const document = createDefaultSnapshot().colorSystem;
    document.settings.colorOutput = settings;
    const namingRuleId = document.scales[0].customContrasts!.namingRuleId;
    for (const scale of document.scales.filter((scale) =>
      ["Gray", "Red"].includes(scale.name),
    )) {
      const steps = [1, 1.06, 1.31, 1.7, 3, 4.5, 21].map((value, index) => ({
        id: `css-target-${index}`,
        value,
      }));
      scale.customContrasts = {
        steps,
        namingRuleId,
        baseContrastId: steps[3].id,
      };
    }
    const gamut = outputGamut(settings),
      css = buildColorLibrary(document);
    const backgrounds = [
      "#ffffff",
      "#000000",
      "#777777",
      "color(srgb-linear 0.1791045 0.1791045 0.1791045)",
    ];
    const probes = document.scales
      .filter((scale) => ["Gray", "Red"].includes(scale.name))
      .flatMap((scale) =>
        backgrounds.flatMap((background) =>
          scaleContrasts(document, scale).flatMap((contrast, index) =>
            contrast.value === 21 &&
            !["#ffffff", "#000000"].includes(background)
              ? []
              : [
                  {
                    scale,
                    background: serializeOutputColor(
                      new Color(background),
                      settings,
                    ),
                    index,
                  },
                ],
          ),
        ),
      );
    await page.setContent(
      `<style>${css}</style>${probes
        .map(
          (probe, index) =>
            `<div id="probe-${index}" class="color-scale-${sanitizeTokenName(probe.scale.name)} color-contrast-${contrastStepIndex(probe.index, probe.scale)} color-system-tint-bg" style="--bg: ${probe.background}"></div>`,
        )
        .join("")}`,
    );
    const computed = await page
      .locator("[id^=probe-]")
      .evaluateAll((elements) =>
        elements.map((element) => getComputedStyle(element).backgroundColor),
      );
    await page.locator("[id^=probe-]").evaluateAll(
      (elements, space) => {
        for (const element of elements) {
          (element as HTMLElement).style.color =
            `color(from var(--color-system-tint) ${space} r g b)`;
          (element as HTMLElement).style.outlineColor =
            `color(from var(--bg) ${space} r g b)`;
        }
      },
      gamut === "srgb" ? "srgb-linear" : gamut,
    );
    const measured = await page
      .locator("[id^=probe-]")
      .evaluateAll((elements) =>
        elements.map((element) => getComputedStyle(element).color),
      );
    const references = await page
      .locator("[id^=probe-]")
      .evaluateAll((elements) =>
        elements.map((element) => getComputedStyle(element).outlineColor),
      );
    probes.forEach((probe, index) => {
      const target = scaleContrasts(document, probe.scale)[probe.index].value;
      const expected = generateColors(
        buildScaleData(probe.scale, settings),
        parsedOutputLinear(probe.background, gamut),
        target,
        document.settings,
      );
      const actual = parsedOutputLinear(
        browserNumericColor(computed[index]),
        gamut,
      );
      // Browser conversion can choose the other feasible side at the branch boundary; contrast is still required there.
      if (
        Math.abs(
          luminance(parsedOutputLinear(probe.background, gamut), gamut) -
            0.1791,
        ) > 0.00005
      ) {
        expect(
          Math.max(
            ...actual.map((channel, i) =>
              Math.abs(channel - expected.dynamic.linear[i]),
            ),
          ),
          `${JSON.stringify(settings)} ${probe.scale.name} ${probe.background} target ${target}: ${computed[index]}`,
        ).toBeLessThanOrEqual(0.005);
      }
      expect(
        contrastRatio(
          browserLuminance(measured[index], gamut),
          browserLuminance(references[index], gamut),
        ),
        `${JSON.stringify(settings)} ${computed[index]} ${measured[index]} ${references[index]} ${target}:1`,
      ).toBeGreaterThanOrEqual(target - 0.00002);
    });
  }
});
