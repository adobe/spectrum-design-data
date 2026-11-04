// Copyright 2026 Adobe. All rights reserved.
import { expect, test } from "@playwright/test";
import Color from "colorjs.io";
import { createDefaultSnapshot } from "../../src/features/edit-session/state";
import { modeSetDefaultMode } from "../../src/features/modes/model";
import {
  buildColorLibrary,
  sanitizeTokenName,
} from "../../src/features/color-system/cssLibrary";
import { resolveColorScaleDocument } from "../../src/features/color-system/colorScaleResolution";
import {
  generateSelectedColor,
  type OpacityColorStop,
} from "../../src/features/color-system/colorScaleType";
import { buildScaleData } from "../../src/features/color-system/scaleGeneration";
import { resolvedBackgroundLinear } from "../../src/features/color-system/surfaceGeneration";
import { DEFAULT_COLOR_OUTPUT } from "../../src/features/color-system/outputSettings";
import {
  scaleContrasts,
  contrastStepIndex,
} from "../../src/features/color-system/contrastSteps";
import { selectColorPanelSection } from "./colorPanelSection";
import {
  AUTHORING_STORAGE_KEY,
  AUTHORING_RECORD_VERSION,
} from "../../src/features/edit-session/storage";
import { encodeStructureSource } from "../../src/features/edit-session/structureSourceCodec";

test("scale type controls and synced measured contrasts use the existing Opacity editor", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const snapshot = createDefaultSnapshot();
  snapshot.colorSystem.dataVisScales = [];
  const encoded = encodeStructureSource(snapshot);
  await page.addInitScript(
    ({ key, record }) => localStorage.setItem(key, JSON.stringify(record)),
    {
      key: AUTHORING_STORAGE_KEY,
      record: {
        version: AUTHORING_RECORD_VERSION,
        working: encoded,
        saved: encoded,
        isEditing: false,
        attachments: {},
        savedAttachments: {},
      },
    },
  );
  await page.setViewportSize({ width: 1900, height: 1100 });
  await page.goto("/");
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Navigation", exact: true })
    .getByRole("link", { name: "Foundations", exact: true })
    .click();
  await page.getByRole("tab", { name: "Colors", exact: true }).click();
  await page
    .getByRole("button", { name: "System settings", exact: true })
    .click();
  const choose = async (option: string) => {
    await page.getByRole("button", { name: /Color scale type$/ }).click();
    await page.getByRole("option", { name: option, exact: true }).click();
  };
  await expect(
    page.getByRole("slider", { name: "Background blend", exact: true }),
  ).toBeVisible();
  await choose("Opaque");
  await expect(
    page.getByRole("slider", { name: "Background blend", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("slider", { name: "Source curve offset", exact: true }),
  ).toHaveCount(0);
  await choose("Transparent");
  await expect(
    page.getByRole("slider", { name: "Source curve offset", exact: true }),
  ).toBeVisible();
  const sync = page.getByRole("checkbox", {
    name: "Sync default stops with opacity scale",
    exact: true,
  });
  await sync.focus();
  await sync.press("Space");
  await expect(sync).toBeChecked();
  await selectColorPanelSection(page, "Contrasts");
  await expect(
    page.getByRole("list", { name: "Measured color contrasts", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Add contrast", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Edit opacity", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Opacity swatches", exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Colors", exact: true }).click();
  await selectColorPanelSection(page, "Color scales");
  await page
    .getByRole("tabpanel", { name: "Colors", exact: true })
    .getByRole("button", { name: "Red", exact: true })
    .click();
  await expect(page.locator(".colorPickerCanvas").first()).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("radio", { name: "Elements", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Color ramps", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

for (const gamut of ["srgb", "display-p3", "rec2020"] as const) {
  test(`exported ${gamut} scale types match generation and respond to opacity variables`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const source = createDefaultSnapshot();
    source.colorSystem.settings.colorOutput = {
      ...DEFAULT_COLOR_OUTPUT,
      authoringGamut: gamut,
    };
    const scale = source.colorSystem.scales.find(
      (item) =>
        !item.customContrasts &&
        !buildScaleData(item, source.colorSystem.settings.colorOutput).neutral,
    )!;
    expect(scale).toBeTruthy();
    delete scale.customContrasts;
    delete scale.disabledCustomContrasts;
    const modes = source.modeSets
      .map(modeSetDefaultMode)
      .filter((mode) => mode !== undefined);
    for (const type of ["dynamic-blend", "opaque", "transparent"] as const) {
      for (const sync of type === "transparent" ? [false, true] : [false]) {
        source.colorSystem.settings.colorScaleType = type;
        source.colorSystem.settings.syncDefaultStopsWithOpacity = sync;
        const document = resolveColorScaleDocument(
          source.colorSystem,
          modes,
          undefined,
          {
            modeSets: source.modeSets,
            opacity: source.opacity,
            browserTokenEdits: source.browserTokenEdits,
          },
        );
        const css = buildColorLibrary(
          document,
          [],
          [],
          source.taxonomy,
          source.rules,
          [],
          source,
        );
        const stops = scaleContrasts(document, scale);
        const stopIndex = Math.min(7, stops.length - 1);
        const stop = stops[stopIndex];
        const index = contrastStepIndex(stopIndex, scale, source.rules);
        const expected = generateSelectedColor(
          buildScaleData(scale, document.settings.colorOutput),
          resolvedBackgroundLinear(document),
          stop,
          document.settings,
        );
        await page.setContent(`<style>${css}</style><div id="sample"
          class="color-scale-${sanitizeTokenName(scale.name)} color-contrast-${index} color-system-tint-bg">Sample</div>`);
        const actualCss = await page
          .locator("#sample")
          .evaluate((element) => getComputedStyle(element).backgroundColor);
        const actual = new Color(actualCss.replace(/\bnone\b/g, "0"));
        const wanted = new Color(expected.css);
        expect(
          Number(actual.alpha),
          `${type}, sync ${sync}: ${actualCss}`,
        ).toBeCloseTo(Number(wanted.alpha), sync ? 5 : 1);
        expect(
          actual.deltaE(wanted, "OK"),
          `${type}, sync ${sync}: ${actualCss} versus ${expected.css}`,
        ).toBeLessThan(0.035);
        if (sync) {
          const opacityName = `--opacity-${(stopIndex + 1) * 100}`;
          for (const opacity of [0, 0.37, 1]) {
            await page.locator("#sample").evaluate(
              (element, { name, opacity }) => {
                (element as HTMLElement).style.setProperty(
                  name,
                  String(opacity),
                );
              },
              { name: opacityName, opacity },
            );
            const editedCss = await page
              .locator("#sample")
              .evaluate((element) => getComputedStyle(element).backgroundColor);
            expect(Number(new Color(editedCss).alpha)).toBeCloseTo(opacity, 5);
            const editedStop: OpacityColorStop = {
              ...stop,
              kind: "opacity",
              opacity,
            };
            const changed = generateSelectedColor(
              buildScaleData(scale, document.settings.colorOutput),
              resolvedBackgroundLinear(document),
              editedStop,
              document.settings,
            );
            expect(
              new Color(editedCss).deltaE(new Color(changed.css), "OK"),
            ).toBeLessThan(0.035);
          }
        }
      }
    }
    expect(errors).toEqual([]);
  });
}
