// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createStore } from "jotai";
import { designSystemDefaults } from "../src/data/defaults";
import {
  changeGroupsAtom,
  resetAllChangeDataAtom,
  revertChangeItemAtom,
} from "../src/features/changelog/state";
import {
  cancelEditAtom,
  enterEditModeAtom,
} from "../src/features/edit-session/state";
import {
  foundationImpactSummaryAtom,
  tokenImpactSummaryAtom,
} from "../src/features/impact/state";
import { SPACING_DEFAULTS } from "../src/features/spacing/defaults";
import {
  generateSpacingScale,
  spacingScaleIssues,
} from "../src/features/spacing/generate";
import { resolveRule, roundingFactorFor } from "../src/features/logic/evaluate";
import { RULE_DEFAULTS } from "../src/features/logic/defaults";
import type { RoundingRule } from "../src/features/logic/model";
import { isSpacingDocument } from "../src/features/spacing/model";
import {
  addScaleTypeAtom,
  scaleTypesAtom,
} from "../src/features/logic/scaleTypeLibrary";
import {
  deleteScaleTypeAtom,
  normalizeScaleTypeReferencesAtom,
  removeScaleTypeWithFallbackAtom,
  scaleTypeConsumersAtom,
} from "../src/features/logic/scaleTypeReferences";
import {
  createScaleType,
  SIZE_SCALE_TYPE_ID,
  SPACING_SCALE_TYPE_ID,
  TYPOGRAPHY_SCALE_TYPE_ID,
} from "../src/features/scales/scaleType";
import { BASE_BINDING_KEY } from "../src/features/scales/generate";
import { createBinding, setBindingPoint } from "../src/features/scales/binding";
import { BINDABLE_PARAMETER_RANGES } from "../src/features/modes/parameters";
import {
  modeParameterValuesAtom,
  resolveModeParameterValues,
} from "../src/features/modes/parameterValues";
import { MODE_SET_DEFAULTS } from "../src/features/modes/model";
import { setPreviewParameterAtom } from "../src/features/modes/previewState";
import { savedBrowserTokensAtom } from "../src/features/tokens/browserSavedState";
import { TYPOGRAPHY_DEFAULTS } from "../src/features/typography/defaults";
import {
  addSpacingScaleAtom,
  generatedSpacingAtom,
  removeSpacingScaleAtom,
  restoreSpacingScaleAtom,
  spacingDocumentAtom,
  updateSpacingScaleAtom,
} from "../src/features/spacing/state";

const EXPECTED: number[] = JSON.parse(
  readFileSync(
    new URL("./fixtures/spacing-global.json", import.meta.url),
    "utf8",
  ),
);
const SCALE_TYPES_WITHOUT_CUSTOM = <T extends { id: string }>(
  items: T[],
  id: string,
) => items.filter((item) => item.id !== id);
const global = SPACING_DEFAULTS.scales[0];

// Defaults come from the dataset JSON.
assert.deepEqual(
  SPACING_DEFAULTS,
  designSystemDefaults.system.foundations.spacing,
);
assert.deepEqual(
  {
    name: global.name,
    scaleTypeId: global.scaleTypeId,
    base: global.base,
    below: global.below,
    above: global.above,
    parameters: global.parameters,
  },
  {
    name: "Global",
    scaleTypeId: SPACING_SCALE_TYPE_ID,
    base: undefined,
    below: 4,
    above: 13,
    parameters: {},
  },
);

// The scale type with the fixed rounding steps reproduces the reference values.
const values = generateSpacingScale(global);
assert.deepEqual(
  values.map((value) => value.value),
  EXPECTED,
);
assert.equal(
  values[0].name,
  "spacing-global-20",
  "the smallest of four smaller values",
);
assert.deepEqual(
  values.slice(0, 4).map((value) => value.step),
  [20, 40, 60, 80],
);
assert.equal(
  values.find((value) => value.index === 0)!.name,
  "spacing-global-100",
  "the base is step 100",
);
assert.equal(values.find((value) => value.index === 0)!.value, 8);
assert.equal(values.at(-1)!.name, "spacing-global-1400");
assert.deepEqual(spacingScaleIssues(values), []);

const extended = generateSpacingScale({ ...global, above: 22 }).map(
  (value) => value.value,
);
assert.equal(extended.length, 27);
assert.deepEqual(
  extended.slice(0, 18),
  EXPECTED,
  "extending the range keeps the existing values",
);
assert.ok(
  extended.every(
    (value, index) => value > 0 && (index === 0 || value > extended[index - 1]),
  ),
  "values stay positive and increasing",
);

// Rounding factor at every step boundary.
const boundaries: [number, number][] = [
  [1.99, 1],
  [2, 2],
  [9.99, 2],
  [10, 4],
  [27.99, 4],
  [28, 8],
  [55.99, 8],
  [56, 16],
  [95.99, 16],
  [96, 24],
  [255.99, 24],
  [256, 32],
  [499, 32],
  [500, 32],
  [10_000, 32],
];
for (const [raw, factor] of boundaries)
  assert.equal(
    roundingFactorFor(
      resolveRule(RULE_DEFAULTS, global.roundingRuleId) as RoundingRule,
      raw,
    ),
    factor,
    `factor at ${raw}`,
  );

// Duplicates after rounding are reported.
assert.ok(
  spacingScaleIssues(
    generateSpacingScale({
      ...global,
      parameters: { ratio: 1.0001, offset: 0 },
    }),
  ).includes("duplicate"),
);

// Add, rename, delete with undo, and unique names.
{
  const store = createStore();
  const id = store.set(addSpacingScaleAtom);
  assert.equal(
    store.get(spacingDocumentAtom).scales.length,
    SPACING_DEFAULTS.scales.length + 1,
  );
  assert.equal(
    store.set(updateSpacingScaleAtom, { id, patch: { name: "global" } }),
    false,
    "names are unique by token slug",
  );
  assert.equal(
    store.set(updateSpacingScaleAtom, { id, patch: { name: "Layout" } }),
    true,
  );
  assert.equal(
    store.get(generatedSpacingAtom).find((entry) => entry.scale.id === id)!
      .values[0].name,
    "spacing-layout-20",
  );
  store.set(updateSpacingScaleAtom, { id, patch: { above: 999, below: 99 } });
  assert.equal(
    store.get(spacingDocumentAtom).scales.find((scale) => scale.id === id)!
      .above,
    40,
    "larger count is clamped",
  );
  assert.equal(
    store.get(spacingDocumentAtom).scales.find((scale) => scale.id === id)!
      .below,
    9,
    "smaller count is clamped",
  );
  const removed = store
    .get(spacingDocumentAtom)
    .scales.find((scale) => scale.id === id)!;
  store.set(removeSpacingScaleAtom, id);
  assert.equal(
    store.get(spacingDocumentAtom).scales.length,
    SPACING_DEFAULTS.scales.length,
  );
  for (const scale of store
    .get(spacingDocumentAtom)
    .scales.filter((scale) => scale.id !== global.id))
    store.set(removeSpacingScaleAtom, scale.id);
  store.set(removeSpacingScaleAtom, global.id);
  assert.equal(
    store.get(spacingDocumentAtom).scales.length,
    1,
    "the last scale cannot be removed",
  );
  store.set(restoreSpacingScaleAtom, { scale: removed, index: 1 });
  assert.equal(
    store.get(spacingDocumentAtom).scales[1].name,
    "Layout",
    "undo restores the scale",
  );
}

// Saved documents validate; malformed ones fall back.
assert.ok(isSpacingDocument(SPACING_DEFAULTS));
assert.ok(
  !isSpacingDocument({
    schemaVersion: 2,
    scales: [{ id: "x", name: "X", formula: "power" }],
  }),
  "v2 documents reset to defaults",
);

// Change log, impact, and revert.
{
  const store = createStore();
  assert.equal(store.get(changeGroupsAtom).length, 0);
  store.set(updateSpacingScaleAtom, { id: global.id, patch: { base: 9 } });
  const foundations = store
    .get(changeGroupsAtom)
    .find((group) => group.id === "foundations")!;
  const item = foundations.items.find(
    (candidate) => candidate.sourceKind === "spacing-scale",
  )!;
  assert.deepEqual(
    item.fields.map((field) => field.key),
    ["Base"],
  );
  const spacingEdits = store
    .get(foundationImpactSummaryAtom)
    .categories.find((category) => category.category === "spacing")!;
  assert.equal(spacingEdits.affected.count, 1, "one authored parameter edited");
  const spacingTokens = store
    .get(tokenImpactSummaryAtom)
    .categories.find((category) => category.category === "spacing")!;
  assert.ok(
    spacingTokens.affected.count > 0 && spacingTokens.affected.count <= 18,
  );
  store.set(revertChangeItemAtom, item);
  assert.deepEqual(
    store.get(spacingDocumentAtom).scales,
    SPACING_DEFAULTS.scales,
  );
  assert.equal(store.get(changeGroupsAtom).length, 0);

  store.set(addSpacingScaleAtom);
  assert.equal(
    store
      .get(foundationImpactSummaryAtom)
      .categories.find((category) => category.category === "spacing")!.affected
      .count,
    9,
    "a new scale counts all nine authored fields",
  );
  store.set(resetAllChangeDataAtom);
  assert.equal(
    store.get(spacingDocumentAtom).scales.length,
    SPACING_DEFAULTS.scales.length,
  );
}

// Cancel in edit mode restores spacing.
{
  const store = createStore();
  store.set(enterEditModeAtom);
  store.set(updateSpacingScaleAtom, { id: global.id, patch: { base: 10 } });
  store.set(cancelEditAtom);
  assert.equal(
    store.get(spacingDocumentAtom).scales[0].base,
    undefined,
    "cancel returns to the formula's base",
  );
}

// Formulas: changing formula resets overrides; a formula in use cannot be deleted; missing ones fall back.
{
  const store = createStore();
  store.set(updateSpacingScaleAtom, {
    id: global.id,
    patch: { scaleTypeId: SIZE_SCALE_TYPE_ID },
  });
  const linear = store.get(spacingDocumentAtom).scales[0];
  assert.deepEqual(
    linear.parameters,
    {},
    "a new formula starts from its own defaults",
  );
  assert.deepEqual(
    store
      .get(generatedSpacingAtom)[0]
      .values.filter((value) => value.index >= 0)
      .slice(0, 3)
      .map((value) => value.raw),
    [24, 32, 40],
  );

  const custom = { ...createScaleType(), name: "Custom grid" };
  store.set(addScaleTypeAtom, custom);
  store.set(updateSpacingScaleAtom, {
    id: global.id,
    patch: { scaleTypeId: custom.id },
  });
  assert.deepEqual(
    store
      .get(scaleTypeConsumersAtom)
      .map((consumer) => [consumer.scaleTypeId, consumer.label]),
    [
      [TYPOGRAPHY_SCALE_TYPE_ID, "Typography › Font sizes"],
      [custom.id, "Spacing › Global"],
      [TYPOGRAPHY_SCALE_TYPE_ID, "Spacing › Base horizontal spacing"],
      [TYPOGRAPHY_SCALE_TYPE_ID, "Spacing › Base gap"],
      [SIZE_SCALE_TYPE_ID, "Size › Global"],
      [
        designSystemDefaults.system.foundations.radius.scales[0].scaleTypeId,
        "Radius › Global",
      ],
      [
        designSystemDefaults.system.foundations.elevation.layers[0].scaleTypeId,
        "Elevation › Shadow 1",
      ],
    ],
  );
  assert.equal(
    store.set(deleteScaleTypeAtom, custom.id),
    null,
    "a formula in use cannot be deleted",
  );
  assert.ok(
    store.get(scaleTypesAtom).some((scaleType) => scaleType.id === custom.id),
  );
  assert.ok(
    store.set(removeScaleTypeWithFallbackAtom, custom.id),
    "reverting a saved addition still removes it",
  );
  assert.equal(
    store.get(spacingDocumentAtom).scales[0].scaleTypeId,
    SPACING_SCALE_TYPE_ID,
  );
  assert.deepEqual(store.get(spacingDocumentAtom).scales[0].parameters, {});

  store.set(addScaleTypeAtom, custom);
  store.set(updateSpacingScaleAtom, {
    id: global.id,
    patch: { scaleTypeId: custom.id },
  });
  store.set(
    scaleTypesAtom,
    SCALE_TYPES_WITHOUT_CUSTOM(store.get(scaleTypesAtom), custom.id),
  );
  assert.equal(
    store.set(normalizeScaleTypeReferencesAtom),
    true,
    "missing formulas are corrected",
  );
  assert.equal(
    store.get(spacingDocumentAtom).scales[0].scaleTypeId,
    SPACING_SCALE_TYPE_ID,
  );
  assert.equal(store.set(normalizeScaleTypeReferencesAtom), false);
}

// Adaptive bindings: helpers, mode parameter resolution, generation, and saved tokens per mode.
{
  const textZoom = BINDABLE_PARAMETER_RANGES["typography.textZoom"];
  const binding = createBinding("typography.textZoom", textZoom, 1.2);
  assert.deepEqual(
    binding.points.map((point) => point.at),
    [-4, 0, 8],
  );
  assert.ok(
    binding.points.every((point) => point.value === 1.2),
    "enabling adaptivity changes nothing yet",
  );
  assert.deepEqual(
    createBinding(
      "color.backgroundLightness",
      BINDABLE_PARAMETER_RANGES["color.backgroundLightness"],
      5,
    ).points.map((point) => point.at),
    [0, 1],
    "neutral at the maximum is not duplicated",
  );
  assert.equal(setBindingPoint(binding, 8, 1.4).points[2].value, 1.4);
  const retargeted = createBinding(
    "color.contrastMultiplier",
    BINDABLE_PARAMETER_RANGES["color.contrastMultiplier"],
    1.3,
    "cosine",
  );
  assert.equal(retargeted.modeParameterId, "color.contrastMultiplier");
  assert.equal(retargeted.method, "cosine");
  assert.deepEqual(
    retargeted.points.map((point) => point.at),
    [0, 1, 3],
  );

  const largest = MODE_SET_DEFAULTS.flatMap((modeSet) => modeSet.modes).find(
    (mode) => mode.id === "mode-text-scaling-largest",
  )!;
  const modeSets = [...MODE_SET_DEFAULTS];
  assert.equal(
    resolveModeParameterValues(
      { typography: TYPOGRAPHY_DEFAULTS },
      [largest],
      undefined,
      { modeSets },
    )["typography.textZoom"],
    4,
  );
  assert.equal(
    resolveModeParameterValues(
      { typography: TYPOGRAPHY_DEFAULTS },
      [],
      undefined,
      { modeSets },
    )["typography.textZoom"],
    0,
  );
  assert.equal(
    resolveModeParameterValues(
      { typography: TYPOGRAPHY_DEFAULTS },
      [],
      { "typography.textZoom": 99 },
      { modeSets },
    )["typography.textZoom"],
    8,
    "values clamp to the parameter range",
  );

  const store = createStore();
  const defaults = store
    .get(generatedSpacingAtom)[0]
    .values.map((value) => value.value);
  store.set(updateSpacingScaleAtom, {
    id: global.id,
    patch: {
      bindings: {
        ratio: {
          modeParameterId: "typography.textZoom",
          method: "linear",
          points: [
            { at: -4, value: 1.1 },
            { at: 0, value: 1.2025 },
            { at: 8, value: 1.4 },
          ],
        },
        [BASE_BINDING_KEY]: {
          modeParameterId: "typography.textZoom",
          method: "exponential",
          points: [
            { at: -4, value: 4 },
            { at: 0, value: 8 },
            { at: 8, value: 16 },
          ],
        },
      },
    },
  });
  assert.deepEqual(
    store.get(generatedSpacingAtom)[0].values.map((value) => value.value),
    defaults,
    "at the neutral position nothing changes",
  );
  assert.equal(store.get(modeParameterValuesAtom)["typography.textZoom"], 0);
  store.set(setPreviewParameterAtom, {
    parameterId: "typography.textZoom",
    value: 8,
  });
  const zoomed = store.get(generatedSpacingAtom)[0].values;
  assert.equal(
    zoomed.find((value) => value.index === 0)!.raw,
    16,
    "the base follows text size",
  );
  assert.notDeepEqual(
    zoomed.map((value) => value.value),
    defaults,
  );

  const combinations = store.get(savedBrowserTokensAtom);
  const spacingValues = (label: string) =>
    combinations
      .find((combination) => combination.label.includes(label))!
      .sources.filter((source) => source.type === "spacing")
      .map((source) => source.value);
  assert.notDeepEqual(
    spacingValues("Largest"),
    spacingValues("Default"),
    "saved spacing tokens differ in the Largest mode",
  );

  store.set(updateSpacingScaleAtom, { id: global.id, patch: { bindings: {} } });
  assert.equal(
    store.get(spacingDocumentAtom).scales[0].bindings,
    undefined,
    "clearing every binding removes the field",
  );
  store.set(updateSpacingScaleAtom, {
    id: global.id,
    patch: { bindings: { ratio: binding } },
  });
  store.set(updateSpacingScaleAtom, {
    id: global.id,
    patch: { scaleTypeId: SIZE_SCALE_TYPE_ID },
  });
  assert.equal(
    store.get(spacingDocumentAtom).scales[0].bindings,
    undefined,
    "a new formula drops bindings of the old one",
  );
}

console.log(
  "spacing: generation, rounding, scale editing, change log, impact, and cancel passed",
);
