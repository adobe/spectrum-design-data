// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createColorDefaults } from "../src/data/defaults";
import { MODE_SET_DEFAULTS } from "../src/features/modes/model";
import { canonicalTokenModeKey } from "../src/features/tokens/browserModel";
import { OPACITY_DEFAULTS } from "../src/features/opacity/defaults";
import {
  opacityAxes,
  opacityContexts,
  resolveOpacity,
  synchronizeOpacityRows,
  type OpacitySource,
} from "../src/features/opacity/generation";

const source: OpacitySource = {
  opacity: structuredClone(OPACITY_DEFAULTS),
  colorSystem: createColorDefaults(),
  modeSets: structuredClone([...MODE_SET_DEFAULTS]),
  browserTokenEdits: {},
};
const contexts = opacityContexts(source);
assert.equal(contexts.length, 2);
assert.deepEqual(
  opacityAxes(source).map((axis) => axis.id),
  ["mode-set-color-scheme"],
);
assert.equal(synchronizeOpacityRows(source), source.opacity);
const light = contexts.find((context) =>
  context.modes.some((mode) => mode.id === "mode-light"),
)!;
const dark = contexts.find((context) =>
  context.modes.some((mode) => mode.id === "mode-dark"),
)!;
const values = contexts.map((context) => resolveOpacity(source, context.modes));
for (const result of values) {
  assert.deepEqual(result.issues, []);
  assert.deepEqual(
    result.levels.map((level) => level.value),
    OPACITY_DEFAULTS.levels.map((level) => level.value),
  );
  assert.deepEqual(
    result.levels.map((level) => level.scaleIndex),
    Array.from({ length: 17 }, (_, i) => (i + 1) * 100),
  );
}
assert.equal(
  new Set(values.flatMap((result) => result.levels.map((level) => level.uuid)))
    .size,
  34,
);
assert.deepEqual(resolveOpacity(source, [...dark.modes].reverse()), values[1]);
assert.equal(resolveOpacity(source, []).modeKey, light.key);
assert.deepEqual(
  resolveOpacity({ ...source, opacity: undefined }, dark.modes).levels,
  [],
);
assert.ok(
  resolveOpacity({ ...source, opacity: undefined }, dark.modes).issues.length,
);

source.opacity!.polarityCompensation = 1;
const boosted = resolveOpacity(source, dark.modes, {
  "color.backgroundLightness": 0,
});
const base = resolveOpacity(source, light.modes, {
  "color.backgroundLightness": 1,
});
assert.deepEqual(
  base.levels.map((level) => level.value),
  OPACITY_DEFAULTS.levels.map((level) => level.value),
);
assert.ok(boosted.levels[7].value > 0.2);
const fractional = structuredClone(source);
fractional.opacity!.polarityCompensation = 0;
const roundedInputs = [
  [0, 0],
  [0.004, 0],
  [0.005, 0.01],
  [0.1949, 0.19],
  [0.195, 0.2],
  [0.995, 1],
  [1, 1],
];
for (const [input, expected] of roundedInputs) {
  fractional.opacity!.levels[0].value = input;
  for (const context of contexts) {
    const level = resolveOpacity(fractional, context.modes).levels[0];
    assert.equal(level.generatedValue, expected);
    assert.equal(level.value, expected);
  }
  assert.equal(fractional.opacity!.levels[0].value, input);
}
fractional.opacity!.levels[0].value = 0.1;
fractional.opacity!.polarityCompensation = 1;
const roundedCompensation = resolveOpacity(fractional, dark.modes, {
  "color.backgroundLightness": 0,
}).levels[0];
assert.equal(roundedCompensation.generatedValue, 0.19);
fractional.browserTokenEdits = {
  [roundedCompensation.id]: {
    values: {
      [dark.key]: { value: 0.234567, baseline: 0.1921151485433343 },
    },
  },
};
const roundedOverride = resolveOpacity(fractional, dark.modes, {
  "color.backgroundLightness": 0,
}).levels[0];
assert.equal(roundedOverride.value, 0.23);
assert.equal(roundedOverride.stale, false);
assert.equal(roundedOverride.overridden, true);
const independent = {
  ...source,
  colorSystem: {
    ...source.colorSystem,
    settings: {
      ...source.colorSystem.settings,
      polarityCompensation: 1,
      contrastMultiplier: 3,
    },
  },
};
assert.deepEqual(
  resolveOpacity(independent, dark.modes),
  resolveOpacity(source, dark.modes),
);
const id = source.opacity!.levels[0].id;
source.browserTokenEdits = {
  [id]: {
    values: {
      [dark.key]: { value: 0.44, baseline: boosted.levels[0].generatedValue },
    },
  },
};
const manual = resolveOpacity(source, dark.modes, {
  "color.backgroundLightness": 0,
});
assert.equal(manual.levels[0].value, 0.44);
assert.equal(manual.levels[0].overridden, true);
assert.equal(manual.levels[0].stale, false);
assert.equal(manual.levels[0].overrideKey, dark.key);
assert.equal(resolveOpacity(source, light.modes).levels[0].overridden, false);

const extra = source.modeSets.find(
  (set) => set.id !== "mode-set-color-scheme",
)!;
const extraMode = extra.modes[0];
const scopedKey = canonicalTokenModeKey({
  "mode-set-color-scheme": "mode-dark",
  [extra.id]: extraMode.id,
});
source.browserTokenEdits[id].values[scopedKey] = { value: 0.5, baseline: 0.02 };
const synchronized = synchronizeOpacityRows(source)!;
assert.ok(
  synchronized.levels.every((level) =>
    Object.values(level.rows).every(Boolean),
  ),
);
for (const original of OPACITY_DEFAULTS.levels)
  assert.deepEqual(
    Object.fromEntries(
      Object.keys(original.rows).map((key) => [
        key,
        synchronized.levels.find((level) => level.id === original.id)!.rows[
          key
        ],
      ]),
    ),
    original.rows,
  );
source.opacity = synchronized;
assert.equal(synchronizeOpacityRows(source), source.opacity);
assert.equal(
  resolveOpacity(source, [...dark.modes, extraMode]).levels[0].value,
  0.5,
);
source.browserTokenEdits[id].values[scopedKey] = {
  value: "invalid",
  baseline: 0.02,
};
assert.ok(resolveOpacity(source, [...dark.modes, extraMode]).issues.length);
source.browserTokenEdits[id].values = {
  malformed: { value: 0.2, baseline: 0.02 },
};
assert.ok(resolveOpacity(source, dark.modes).issues.length);
console.log(
  "Opacity generation: modes, row identity, independence, scoped overrides and unavailable data pass.",
);
