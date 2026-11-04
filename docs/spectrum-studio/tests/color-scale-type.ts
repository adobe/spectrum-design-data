// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import Color from "colorjs.io";
import { createColorDefaults } from "../src/data/defaults";
import { OPACITY_DEFAULTS } from "../src/features/opacity/defaults";
import {
  resolveColorScaleDocument,
  assertColorScaleOutput,
} from "../src/features/color-system/colorScaleResolution";
import { resolveColorDocument } from "../src/features/color-system/resolution";
import { generateColors } from "../src/features/color-system/dynamicGeneration";
import {
  generateSelectedColor,
  isOpacityColorStop,
} from "../src/features/color-system/colorScaleType";
import { buildScaleData } from "../src/features/color-system/scaleGeneration";
import { resolvedBackgroundLinear } from "../src/features/color-system/surfaceGeneration";
import { isColorSystemDocument } from "../src/features/color-system/model";
import { generateDocumentTokens } from "../src/features/changelog/changes";
import { colorFoundationParameters } from "../src/features/impact/sources/colorFoundation";
import { measureOutputContrast } from "../src/features/color-system/outputContrast";
import { outputColorCss } from "../src/features/color-system/colorMath";
import { DEFAULT_COLOR_OUTPUT } from "../src/features/color-system/outputSettings";
import { MODE_SET_DEFAULTS } from "../src/features/modes/model";
import {
  opacityContexts,
  resolveOpacity,
} from "../src/features/opacity/generation";

const original = createColorDefaults();
const opacity = structuredClone(OPACITY_DEFAULTS);
opacity.polarityCompensation = 0;
const source = structuredClone(original);
const scale = source.scales.find((item) => item.name !== "gray")!;
const background = resolvedBackgroundLinear(source);
const data = buildScaleData(scale, source.settings.colorOutput);
for (const type of ["dynamic-blend", "opaque", "transparent"] as const) {
  const settings = { ...source.settings, colorScaleType: type };
  const expected = generateColors(data, background, 3, settings);
  const selected = generateSelectedColor(
    data,
    background,
    { id: "test", value: 3 },
    settings,
  );
  assert.deepEqual(
    selected,
    type === "dynamic-blend" ? expected.dynamic : expected[type],
  );
}
const old = structuredClone(original);
delete old.settings.colorScaleType;
delete old.settings.syncDefaultStopsWithOpacity;
assert(isColorSystemDocument(old));
assert.deepEqual(generateDocumentTokens(old), generateDocumentTokens(original));
assert(
  !colorFoundationParameters(old).some(
    (field) => field.id.startsWith("settings/") && field.edited,
  ),
);
for (const value of ["invalid", 0, null]) {
  const invalid = {
    ...source,
    settings: { ...source.settings, colorScaleType: value },
  };
  assert(!isColorSystemDocument(invalid));
}
source.settings.colorScaleType = "transparent";
source.settings.syncDefaultStopsWithOpacity = true;
const savedContrasts = structuredClone(source.contrasts);
const customScale = source.scales[1];
customScale.customContrasts = {
  steps: [{ id: "custom", value: 3 }],
  baseContrastId: "custom",
  namingRuleId: "standard-scale-naming",
};
for (const alpha of [0, 0.1, 0.5, 1]) {
  opacity.levels[0].value = alpha;
  for (const gamut of ["srgb", "display-p3", "rec2020"] as const) {
    source.settings.colorOutput = {
      ...DEFAULT_COLOR_OUTPUT,
      authoringGamut: gamut,
    };
    for (const format of gamut === "srgb"
      ? (["rgb", "hex", "hsl", "oklch"] as const)
      : (["rgb", "oklch"] as const)) {
      source.settings.colorOutput.outputFormat = format;
      const resolved = resolveColorScaleDocument(source, [], undefined, {
        opacity,
      });
      assert.equal(resolved.contrasts.length, opacity.levels.length);
      assert.equal(resolved.contrasts[0].id, opacity.levels[0].id);
      assert(isOpacityColorStop(resolved.contrasts[0]));
      assert.equal(resolved.contrasts[0].opacity, alpha);
      assert.deepEqual(source.contrasts, savedContrasts);
      assert.equal(resolved.scales[1].customContrasts!.steps[0].value, 3);
      const bg = resolvedBackgroundLinear(resolved);
      const color = generateSelectedColor(
        buildScaleData(resolved.scales[0], resolved.settings.colorOutput),
        bg,
        resolved.contrasts[0],
        resolved.settings,
      );
      assert.equal(Number(new Color(color.css).alpha), alpha);
      assert(
        Math.abs(
          color.measuredContrast -
            measureOutputContrast(
              color.css,
              outputColorCss(bg, resolved.settings.colorOutput),
              gamut,
            ),
        ) < 1e-10,
      );
    }
  }
}
source.settings.contrastMultiplier = 2;
const a = resolveColorScaleDocument(source, [], undefined, { opacity });
source.settings.contrastMultiplier = 0;
const b = resolveColorScaleDocument(source, [], undefined, { opacity });
assert.deepEqual(a.contrasts, b.contrasts);
assert.notEqual(
  a.scales[1].customContrasts!.steps[0].value,
  b.scales[1].customContrasts!.steps[0].value,
);
const linked = {
  colorSystem: source,
  opacity: structuredClone(OPACITY_DEFAULTS),
  modeSets: structuredClone([...MODE_SET_DEFAULTS]),
  browserTokenEdits: {},
};
linked.opacity.polarityCompensation = 1;
const dark = opacityContexts(linked).find((context) =>
  context.modes.some((mode) => mode.id === "mode-dark"),
)!;
const level = resolveOpacity(linked, dark.modes).levels[7];
const edits = {
  [level.id]: {
    values: { [dark.key]: { value: 0.37, baseline: level.generatedValue } },
  },
};
for (const preview of [undefined, { "color.backgroundLightness": 0.15 }]) {
  const resolvedOpacity = resolveOpacity(
    { ...linked, browserTokenEdits: edits },
    dark.modes,
    preview,
  );
  const resolved = resolveColorScaleDocument(source, dark.modes, preview, {
    modeSets: linked.modeSets,
    opacity: linked.opacity,
    browserTokenEdits: edits,
  });
  assert.deepEqual(
    resolved.contrasts.map((stop) =>
      isOpacityColorStop(stop) ? stop.opacity : undefined,
    ),
    resolvedOpacity.levels.map((stop) => stop.value),
  );
  assert.equal(
    isOpacityColorStop(resolved.contrasts[7]) && resolved.contrasts[7].opacity,
    0.37,
  );
}
const inventory = structuredClone(opacity);
const addedId = "5d75c4cb-30a8-470c-a2e4-f70000000001";
inventory.levels.push({
  id: addedId,
  value: 0.45,
  rows: Object.fromEntries(
    Object.keys(inventory.levels[0].rows).map((key) => [
      key,
      crypto.randomUUID(),
    ]),
  ),
});
assert.equal(
  resolveColorScaleDocument(source, [], undefined, {
    opacity: inventory,
  }).contrasts.at(-1)!.id,
  addedId,
);
inventory.levels.splice(2, 1);
assert.equal(
  resolveColorScaleDocument(source, [], undefined, { opacity: inventory })
    .contrasts.length,
  opacity.levels.length,
);
source.settings.syncDefaultStopsWithOpacity = false;
assert.deepEqual(
  resolveColorScaleDocument(source, [], undefined, { opacity }).contrasts,
  resolveColorDocument(source, []).contrasts,
);
assert.throws(
  () =>
    assertColorScaleOutput(
      resolveColorScaleDocument(
        {
          ...source,
          settings: { ...source.settings, syncDefaultStopsWithOpacity: true },
        },
        [],
      ),
    ),
  /Opacity data is unavailable/,
);
console.log(
  "Color scale types: compatibility, selection, exact alpha, formats, stop identity and custom contrast isolation passed.",
);
