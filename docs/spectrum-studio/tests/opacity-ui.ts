// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import {
  transparencyBackground,
  transparencyRampBackground,
} from "../src/components/transparencyBackground";
import { measureOutputContrast } from "../src/features/color-system/outputContrast";
import type { ColorOutputSettings } from "../src/features/color-system/outputSettings";
import type { OpacityResult } from "../src/features/opacity/generation";
import {
  formatOpacityPercent,
  opacityEditDescription,
  opacityObservations,
  opacitySwatchStyle,
} from "../src/views/opacity/opacityPresentation";

const settings: ColorOutputSettings = {
  authoringGamut: "srgb",
  outputFormat: "rgb",
  mapOutputsToSrgb: false,
};
const result: OpacityResult = {
  weight: 0,
  modeKey: "[]",
  issues: [],
  levels: [0, 0.19212345, 1].map((value, index) => ({
    id: `level-${index}`,
    scaleIndex: (index + 1) * 100,
    name: `opacity-${(index + 1) * 100}`,
    value,
    generatedValue: value,
    overridden: index === 1,
    stale: index === 1,
  })),
};
const before = structuredClone(result);
const light = opacityObservations(result, settings);
const dark = opacityObservations({ ...result, weight: 1 }, settings);
assert.equal(light.background, "#ffffff");
assert.equal(dark.background, "#000000");
assert.equal(light.levels[0].contrast, 1);
assert.equal(light.levels[2].contrast, 21);
assert.equal(dark.levels[0].contrast, 1);
assert.equal(dark.levels[2].contrast, 21);
assert.match(light.levels[1].css, /^rgb\(0 0 0 \/ 0\.19212345\)$/);
assert.match(dark.levels[1].css, /^rgb\(255 255 255 \/ 0\.19212345\)$/);
for (const profile of [light, dark]) {
  assert.deepEqual(
    profile.levels.map((level) => level.id),
    result.levels.map((level) => level.id),
  );
  assert.equal(profile.levels[1].value, 0.19212345);
  assert.equal(profile.levels[1].overridden, true);
  assert.equal(profile.levels[1].stale, true);
  assert.equal(
    profile.levels[1].contrast,
    measureOutputContrast(profile.levels[1].css, profile.background, "srgb"),
  );
}
assert.notEqual(light.levels[1].contrast, dark.levels[1].contrast);
assert.deepEqual(result, before);

for (const outputFormat of ["rgb", "hex", "hsl", "oklch"] as const) {
  const profile = opacityObservations(result, { ...settings, outputFormat });
  assert.equal(profile.levels[1].value, result.levels[1].value);
  assert.equal(
    profile.levels[1].contrast,
    measureOutputContrast(profile.levels[1].css, "#ffffff", "srgb"),
  );
}
assert.deepEqual(
  opacityObservations({ ...result, levels: [] }, settings).levels,
  [],
);
assert.throws(() =>
  opacityObservations(
    {
      ...result,
      levels: [{ ...result.levels[0], value: Number.NaN }],
    },
    settings,
  ),
);
assert.match(formatOpacityPercent(0), /0%/);
assert.match(formatOpacityPercent(1), /100%/);
assert.match(formatOpacityPercent(0.19212345), /^19%$/);
assert.match(formatOpacityPercent(0.195), /^20%$/);
for (const value of [0, 0.19, 1])
  assert.deepEqual(opacitySwatchStyle(value), {
    backgroundColor:
      "var(--elements-preview-foreground, light-dark(black, white))",
    opacity: value,
  });
assert.equal(opacityEditDescription(result.levels[0]), "Generated");
assert.equal(
  opacityEditDescription(result.levels[1]),
  "Out of date manual override",
);
assert.equal(
  opacityEditDescription({ overridden: true, stale: false }),
  "Manual override",
);

const transparent = transparencyBackground("black", 0);
for (const alpha of [0, 0.5, 1]) {
  for (const ink of ["black", "white"] as const) {
    const channels = ink === "black" ? "0 0 0" : "255 255 255";
    assert.ok(
      String(transparencyBackground(ink, alpha).backgroundImage).includes(
        `rgb(${channels} / ${alpha})`,
      ),
      "The overlay retains the original ink and exact alpha.",
    );
  }
}
assert.equal(transparent.backgroundSize, "100% 100%, 16px 16px");
assert.match(String(transparent.backgroundImage), /rgb\(0 0 0 \/ 0\)/);
assert.match(
  String(transparent.backgroundImage),
  /repeating-conic-gradient\(var\(--checkerboard-alternate, var\(--checkerboard-theme-alternate\)\) 0% 25%, var\(--checkerboard-base, var\(--checkerboard-theme-base\)\) 0% 50%\)/,
);
assert.match(
  String(transparencyBackground("white", 1).backgroundImage),
  /rgb\(255 255 255 \/ 1\)/,
);
assert.match(
  String(transparencyRampBackground("black").backgroundImage),
  /to bottom, rgb\(0 0 0 \/ 1\) 0%, transparent 100%/,
);
console.log("Opacity UI presentation checks passed.");
