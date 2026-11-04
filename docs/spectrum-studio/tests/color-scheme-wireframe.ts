// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createDefaultSnapshot } from "../src/features/edit-session/state";
import {
  adjustKeyColor,
  applyScaleAdjustment,
  DEFAULT_ABSOLUTE_COLOR,
  isScaleAdjustment,
  normalizedAdjustment,
  type ScaleAdjustment,
} from "../src/features/color-system/scaleAdjustment";
import { resolveColorDocument } from "../src/features/color-system/resolution";
import { buildScaleData } from "../src/features/color-system/scaleGeneration";
import { generateColors } from "../src/features/color-system/dynamicGeneration";
import { generateScaleColorTokens } from "../src/features/tokens/colorGeneration";
import { paletteColorHex } from "../src/features/color-system/paletteValue";
import { isModeSetList } from "../src/features/modes/model";
import { resolvedBackgroundLinear } from "../src/features/color-system/surfaceGeneration";
import type { DataVisPoint } from "../src/features/color-system/data-vis/model";

const key = { lightness: 0.5, chroma: 40, hue: 350 };
assert.equal(adjustKeyColor(key, { method: "relative", hue: 20 }).hue, 10);
assert.equal(adjustKeyColor(key, { method: "relative", hue: -360 }).hue, 350);
assert.equal(
  adjustKeyColor(key, { method: "relative", chroma: 50 }).chroma,
  20,
);
assert.equal(
  adjustKeyColor(key, { method: "relative", chroma: 400 }).chroma,
  100,
);
assert.equal(adjustKeyColor(key, { method: "relative", chroma: 0 }).chroma, 0);
assert.deepEqual(adjustKeyColor(key, { method: "relative" }), key);
const absolute: ScaleAdjustment = {
  method: "absolute",
  color: { ...DEFAULT_ABSOLUTE_COLOR },
};
assert.deepEqual(adjustKeyColor(key, absolute), DEFAULT_ABSOLUTE_COLOR);
assert.equal(paletteColorHex(DEFAULT_ABSOLUTE_COLOR, "srgb"), "#486ec2");
assert.equal(
  normalizedAdjustment({ method: "relative", hue: 0, chroma: 100 }),
  undefined,
);
assert.deepEqual(
  normalizedAdjustment({ method: "relative", hue: 0, chroma: 0 }),
  {
    method: "relative",
    chroma: 0,
  },
);
assert.equal(normalizedAdjustment(absolute), absolute);
assert.ok(isScaleAdjustment(absolute));
assert.ok(isScaleAdjustment({ method: "relative" }));
for (const invalid of [
  {},
  [],
  { method: "tint" },
  { method: "relative", hue: NaN },
  { method: "absolute" },
  { method: "absolute", color: { ...key, lightness: 2 } },
  { method: "absolute", color: { ...key, chroma: 126 } },
  { method: "absolute", color: { ...key, hue: Infinity } },
  { hue: { method: "absolute", value: 264 } },
])
  assert.ok(!isScaleAdjustment(invalid), JSON.stringify(invalid));

const snapshot = createDefaultSnapshot();
const original = structuredClone(snapshot);
const scheme = snapshot.modeSets.find((set) => set.key === "colorScheme")!;
const wireframeMode = scheme.modes.find((mode) => mode.key === "wireframe")!;
assert.deepEqual(wireframeMode.foundations.color!.scaleAdjustment, absolute);
assert.ok(isModeSetList(snapshot.modeSets));
assert.equal(
  applyScaleAdjustment(snapshot.colorSystem, undefined),
  snapshot.colorSystem,
);
assert.equal(
  applyScaleAdjustment(snapshot.colorSystem, { method: "relative", hue: 0 }),
  snapshot.colorSystem,
);

// Different stop counts, positions and interpolation methods must all converge.
snapshot.colorSystem.scales[1].interpolation = "oklch";
const palette = snapshot.colorSystem.palette[0];
assert.ok(palette);
snapshot.colorSystem.scales[2].stops[0].paletteColorId = palette.id;
for (const outputFormat of ["rgb", "hex", "oklch"] as const) {
  for (const backgroundLightness of [0, 0.17, 1]) {
    const base = {
      ...snapshot.colorSystem,
      backgroundLightness,
      settings: {
        ...snapshot.colorSystem.settings,
        colorOutput: {
          ...snapshot.colorSystem.settings.colorOutput,
          outputFormat,
        },
      },
    };
    const document = resolveColorDocument(base, [wireframeMode], undefined, {
      modeSets: snapshot.modeSets,
    });
    const adjusted = applyScaleAdjustment(base, absolute);
    const background = resolvedBackgroundLinear(document);
    const output = document.settings.colorOutput;
    const standard = document.scales.filter((scale) => !scale.customContrasts);
    const expected = buildScaleData(standard[0], output);
    for (const scale of document.scales) {
      assert.equal(scale.interpolation, "rgb");
      assert.deepEqual(scale.stops, [
        {
          id: base.scales.find((item) => item.id === scale.id)!.stops[0].id,
          ...DEFAULT_ABSOLUTE_COLOR,
        },
      ]);
      assert.deepEqual(
        adjusted.scales.find((item) => item.id === scale.id)!.customContrasts,
        base.scales.find((item) => item.id === scale.id)!.customContrasts,
      );
      assert.equal(scale.stops[0].paletteColorId, undefined);
      assert.deepEqual(buildScaleData(scale, output).ramp, expected.ramp);
    }
    const expectedValues = document.contrasts.map(
      (contrast) =>
        generateColors(expected, background, contrast.value, document.settings)
          .dynamic.css,
    );
    for (const scale of standard) {
      const data = buildScaleData(scale, output);
      assert.deepEqual(
        document.contrasts.map(
          (contrast) =>
            generateColors(data, background, contrast.value, document.settings)
              .dynamic.css,
        ),
        expectedValues,
        `${scale.name}: matching steps must be identical`,
      );
      assert.deepEqual(
        generateScaleColorTokens(
          scale,
          document.contrasts,
          background,
          document.settings,
          output,
          snapshot.rules!,
        ).map((token) => token.value),
        expectedValues,
        `${scale.name}: tokens match preview`,
      );
    }
  }
}
const relative = applyScaleAdjustment(snapshot.colorSystem, {
  method: "relative",
  hue: 20,
});
const continuous = snapshot.colorSystem.dataVisScales.find(
  (scale) => scale.kind !== "categorical",
)!;
assert.ok(continuous && continuous.kind !== "categorical");
const points: DataVisPoint[] = [
  {
    id: "owned",
    position: 0,
    contrast: { value: 3 },
    source: { kind: "key-color", color: key },
  },
  {
    id: "scale-reference",
    position: 0.5,
    contrast: { value: 3 },
    source: { kind: "ui-scale", scaleId: snapshot.colorSystem.scales[2].id },
  },
  {
    id: "swatch-reference",
    position: 1,
    source: {
      kind: "ui-swatch",
      scaleId: snapshot.colorSystem.scales[2].id,
      contrastId: snapshot.colorSystem.contrasts[7].id,
    },
  },
];
const dataVis = applyScaleAdjustment(
  {
    ...snapshot.colorSystem,
    dataVisScales: [{ ...continuous, points }],
  },
  absolute,
).dataVisScales[0];
assert.ok(dataVis.kind !== "categorical");
assert.deepEqual(dataVis.points[0], {
  ...points[0],
  source: { kind: "key-color", color: DEFAULT_ABSOLUTE_COLOR },
});
assert.equal(dataVis.points[1], points[1]);
assert.equal(dataVis.points[2], points[2]);
assert.deepEqual(points[0].source, { kind: "key-color", color: key });
for (const [index, scale] of relative.scales.entries()) {
  const base = snapshot.colorSystem.scales[index];
  assert.equal(scale.interpolation, base.interpolation);
  assert.equal(scale.stops.length, base.stops.length);
  for (const [stopIndex, stop] of scale.stops.entries()) {
    assert.equal(stop.lightness, base.stops[stopIndex].lightness);
    assert.equal(stop.chroma, base.stops[stopIndex].chroma);
  }
}
const light = resolveColorDocument(original.colorSystem, [], undefined, {
  modeSets: original.modeSets,
});
resolveColorDocument(original.colorSystem, [wireframeMode], undefined, {
  modeSets: original.modeSets,
});
assert.deepEqual(
  resolveColorDocument(original.colorSystem, [], undefined, {
    modeSets: original.modeSets,
  }),
  light,
);
assert.deepEqual(
  original,
  createDefaultSnapshot(),
  "Resolution must not mutate authored data.",
);
assert.notDeepEqual(light.scales[2].stops, [DEFAULT_ABSOLUTE_COLOR]);
console.log(
  "Wireframe: exact shared-key/ramp/step equality, relative behavior, contrast preservation and token/preview agreement pass.",
);
