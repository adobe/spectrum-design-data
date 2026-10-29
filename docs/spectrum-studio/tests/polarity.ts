// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { COLOR_SYSTEM_DEFAULTS } from "../src/features/color-system/defaults";
import { buildColorLibrary } from "../src/features/color-system/cssLibrary";
import {
  hydrateColorSystem,
  isColorSystemDocument,
  type ColorSystemDocument,
} from "../src/features/color-system/model";
import {
  applyPolarityCompensation,
  collapsedContrastIds,
  compensatedContrast,
  contrastForEffectiveEdit,
  effectiveContrast,
  polarityContext,
  polarityWeight,
  type PolarityContext,
} from "../src/features/color-system/polarity";
import {
  buildChangeGroups,
  defaultColorDocument,
} from "../src/features/changelog/changes";

const near = (
  actual: number,
  expected: number,
  tolerance: number,
  message: string,
) =>
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${message}: expected ${expected}, got ${actual}`,
  );

// Visible contrast (distance from 1:1) grows most for subtle steps; the top converges on 21:1.
const gain = (ratio: number) =>
  (compensatedContrast(ratio, 1, "light") - 1) / (ratio - 1);
assert.ok(gain(1.06) > 3, "subtle contrasts get a strong boost");
assert.ok(gain(2.6) < 2, "mid contrasts stay moderate");
const lowestGap =
  compensatedContrast(1.15, 1, "light") - compensatedContrast(1.06, 1, "light");
assert.ok(
  lowestGap > 2 * (1.15 - 1.06),
  "the lowest steps spread apart rather than bunching up",
);
for (const [lower, higher] of [
  [1.06, 1.15],
  [1.15, 1.6],
  [1.6, 2.6],
  [2.6, 3.95],
  [3.95, 10],
  [10, 19.5],
]) {
  assert.ok(
    gain(lower) > gain(higher),
    `boost decreases from ${lower} to ${higher}`,
  );
}
near(
  compensatedContrast(19.5, 1, "light"),
  19.5,
  0.5,
  "high contrasts barely change",
);

// Endpoints fixed, zero strength is a no-op, order preserved, dark authoring inverts light authoring.
assert.equal(compensatedContrast(1, 1, "light"), 1);
assert.equal(compensatedContrast(21, 1, "light"), 21);
for (const ratio of COLOR_SYSTEM_DEFAULTS.contrasts) {
  assert.equal(compensatedContrast(ratio, 0, "light"), ratio);
  near(
    compensatedContrast(compensatedContrast(ratio, 0.5, "light"), 0.5, "dark"),
    ratio,
    0.001,
    `round trip ${ratio}`,
  );
}
const boosted = COLOR_SYSTEM_DEFAULTS.contrasts.map((ratio) =>
  compensatedContrast(ratio, 1, "light"),
);
boosted.forEach((ratio, index) => {
  if (index > 0)
    assert.ok(ratio > boosted[index - 1], "compensation preserves order");
  assert.ok(
    ratio >= COLOR_SYSTEM_DEFAULTS.contrasts[index],
    "light authoring never lowers dark contrasts",
  );
});

// Weight follows background lightness.
assert.equal(polarityWeight(1, "light"), 0);
assert.equal(polarityWeight(0, "light"), 1);
assert.equal(polarityWeight(0, "dark"), 0);

// Effective values interpolate; edits round trip on both sides.
const authored = { id: "c", value: 3 };
const full: PolarityContext = { weight: 1, strength: 0.5, reference: "light" };
const none: PolarityContext = { ...full, weight: 0 };
assert.equal(effectiveContrast(authored, none), 3);
near(
  effectiveContrast(authored, full),
  compensatedContrast(3, 0.5, "light"),
  1e-9,
  "full weight",
);
for (const weight of [0.2, 0.7]) {
  const context = { ...full, weight };
  const edited = contrastForEffectiveEdit(authored, 3.6, context);
  near(
    effectiveContrast(edited, context),
    3.6,
    0.001,
    `edit round trip at ${weight}`,
  );
  if (weight >= 0.5)
    assert.equal(edited.value, 3, "opposite-side edits keep authored values");
  else
    assert.equal(
      edited.oppositeValue,
      undefined,
      "authored-side edits keep opposite values unset",
    );
}
near(
  effectiveContrast({ ...authored, oppositeValue: 6 }, full),
  6,
  1e-9,
  "opposite value wins at full weight",
);

// Collapse detection flags merged neighbors only.
assert.deepEqual(
  [
    ...collapsedContrastIds(
      [
        { id: "a", value: 17 },
        { id: "b", value: 19 },
      ],
      [
        { id: "a", value: 21 },
        { id: "b", value: 21 },
      ],
    ),
  ],
  ["a", "b"],
);

// Pre-pass: identity on authored background, compensated on the opposite one, surfaces included.
const document = hydrateColorSystem(COLOR_SYSTEM_DEFAULTS);
const compensated: ColorSystemDocument = {
  ...document,
  settings: { ...document.settings, polarityCompensation: 0.5 },
};
assert.equal(
  applyPolarityCompensation(compensated),
  compensated,
  "white background is the light authoring extreme",
);
const dark = applyPolarityCompensation({
  ...compensated,
  backgroundLightness: 0,
});
near(
  polarityContext({ ...compensated, backgroundLightness: 0 }).weight,
  1,
  0.001,
  "black background weight",
);
dark.contrasts.forEach((contrast, index) =>
  assert.ok(contrast.value >= document.contrasts[index].value),
);
const surface = document.surfaces.find(
  (item) => !item.base && item.contrast !== undefined && item.contrast > 1,
);
if (surface) {
  assert.ok(
    dark.surfaces.find((item) => item.id === surface.id)!.contrast! >
      surface.contrast!,
    "surfaces are compensated",
  );
}

// CSS emits a default root and per-mode blocks, with surface contrasts as variables.
const css = buildColorLibrary(document, [
  { key: "light", isDefault: true, document },
  { key: "dark", isDefault: false, document: dark },
]);
assert.match(css, /\[data-color-scheme="dark"\] \{/);
assert.equal((css.match(/--contrast-100:/g) ?? []).length, 2);
assert.doesNotMatch(
  buildColorLibrary(document),
  /data-color-scheme/,
  "no mode blocks without modes",
);
if (surface)
  assert.match(css, /\.surface-[a-z0-9-]+ \{[^}]*var\(--surface-contrast-/);

// Stored documents without the new fields still load and report no changes.
const legacy = structuredClone(defaultColorDocument);
delete legacy.settings.contrastReference;
delete legacy.settings.polarityCompensation;
assert.ok(isColorSystemDocument(legacy));
assert.ok(
  !isColorSystemDocument({
    ...document,
    settings: { ...document.settings, contrastReference: "sideways" },
  }),
);
const settingsChanges = buildChangeGroups(legacy, [])
  .flatMap((group) => group.items)
  .filter((item) => item.id === "settings");
assert.equal(
  settingsChanges.length,
  0,
  "legacy documents have no settings changes",
);

console.log("Polarity compensation checks passed");
