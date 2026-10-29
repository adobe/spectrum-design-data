// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import {
  createDefaultSnapshot,
  assertStoredSnapshot,
  authoringSnapshotAtom,
  editSessionSnapshotAtom,
  restoreAuthoringSnapshotAtom,
} from "../src/features/edit-session/state";
import {
  canonicalTokenModeKey,
  resolveBrowserTokens,
  type BrowserTokenSource,
} from "../src/features/tokens/browserModel";
import {
  sourceResetPlan,
  itemResetPlan,
  generatedResetOptions,
  generatedOverrideReason,
  manualTokenResetPlan,
  hasManualTokenEdits,
  prepareChangeReset,
  applyChangeResetPlanAtom,
  resetSnapshotAtom,
  sourceForResetContext,
  type ResetSnapshot,
  type OverrideResetPlan,
} from "../src/features/changelog/resetPlans";
import { editModeAtom } from "../src/state/view/editMode";
import { foundationModeAttachmentsAtom } from "../src/state/view/foundationModeAttachments";
import type {
  ChangeField,
  ChangeItem,
} from "../src/features/changelog/changes";
import { createDataVisSnapshot, DATA_VIS_IDS } from "./fixtures/dataVis";
import { dataVisMemberId } from "../src/features/color-system/data-vis/identity";
import { browserSourcesForSnapshot } from "../src/features/tokens/browserSavedState";
import { tokenUuid } from "../src/features/tokens/model";
import { compareAuthoring } from "../src/features/changelog/registry";
import { comparePrimitiveTokens } from "../src/features/changelog/tokenComparison";

const defaults = createDefaultSnapshot();
const initial: ResetSnapshot = {
  ...structuredClone(defaults),
  attachments: {},
};
assertStoredSnapshot(initial);
const scale = initial.spacing!.scales[0];
const path = [
  "spacing",
  "scales",
  { key: "id" as const, id: scale.id },
  "base",
];
scale.base = 12;
scale.above += 1;
initial.typography.textZoom = defaults.typography.textZoom + 1;
const untouched = structuredClone(initial);
const plan = sourceResetPlan("Base", [{ path, expected: 12 }]);
const restored = prepareChangeReset(initial, plan);
assert.equal(
  restored.spacing!.scales[0].base,
  defaults.spacing!.scales[0].base,
);
assert.equal(
  restored.spacing!.scales[0].above,
  scale.above,
  "exact field reset preserves another edit on the same object",
);
assert.equal(
  restored.typography.textZoom,
  initial.typography.textZoom,
  "other domains are retained",
);
assert.deepEqual(
  initial,
  untouched,
  "preflight and cancellation do not mutate working data",
);
assert.throws(
  () => prepareChangeReset(initial, plan, [], false),
  /Enter edit mode/,
);
assert.throws(
  () => sourceResetPlan("Unregistered", []),
  /no registered reset address/,
);
assert.throws(
  () =>
    prepareChangeReset(
      {
        ...initial,
        spacing: { ...initial.spacing!, scales: [{ ...scale, base: 13 }] },
      },
      plan,
    ),
  /updated/,
);

const documentCard: ChangeItem = {
  id: "spacing",
  title: "Spacing",
  topic: "foundations",
  sourceKind: "spacing-scale",
  kind: "modified",
  fields: [{ id: "base", key: "Base", address: { path, expected: 12 } }],
  addresses: [{ path, expected: 12 }],
};
assert.deepEqual(
  prepareChangeReset(initial, itemResetPlan(documentCard)),
  restored,
  "composite document cards restore changed addresses, not a whole foundation",
);
const failed = structuredClone(initial);
failed.colorSystem.backgroundScaleId = "unavailable";
assert.throws(() => prepareChangeReset(failed, plan), /unavailable/);
assert.equal(
  failed.spacing!.scales[0].base,
  12,
  "validation rejects the entire candidate atomically",
);

const modeKey = canonicalTokenModeKey(
  Object.fromEntries(
    initial.modeSets.map((axis) => [axis.id, axis.modes[0].id]),
  ),
);
const otherModeKey = canonicalTokenModeKey(
  Object.fromEntries(
    initial.modeSets.map((axis, index) => [
      axis.id,
      axis.modes[index === 0 ? 1 : 0].id,
    ]),
  ),
);
const source: BrowserTokenSource = {
  id: `spacing-${scale.id}-100`,
  type: "spacing",
  groupId: scale.id,
  groupLabel: "Global",
  name: "space",
  generatedName: "space",
  value: 14,
  generatedValue: 14,
  unit: "px",
};
const field: ChangeField = {
  id: "value",
  key: "Value",
  generated: true,
  context: { key: modeKey, label: "Light" },
  tokenValue: { tokenId: source.id, modeKey, shippedValue: 8 },
};
const generated: ChangeItem = {
  id: source.id,
  title: "Space",
  topic: "tokens",
  sourceKind: "token",
  kind: "modified",
  fields: [field],
  upstream: [
    { title: "Global / Base", address: { path, expected: 12 } },
    {
      title: "Global / Above",
      address: {
        path: ["spacing", "scales", { key: "id", id: scale.id }, "above"],
        expected: scale.above,
      },
    },
  ],
};
const options = generatedResetOptions(generated, field, source, initial);
assert.equal(
  options.length,
  3,
  "multiple actual sources remain explicit choices",
);
assert.deepEqual(
  options.slice(1).map((choice) => choice.label),
  ["Restore Global / Base", "Restore Global / Above"],
);
const override = options[0].plan as OverrideResetPlan;
const pinned = prepareChangeReset(initial, override, [source]);
assert.deepEqual(pinned.browserTokenEdits?.[source.id].values, {
  [modeKey]: { value: 8, baseline: 14 },
});
assert.deepEqual(
  pinned.spacing,
  initial.spacing,
  "shipped override does not restore its generating source",
);
const withOtherEdit = structuredClone(initial);
withOtherEdit.browserTokenEdits![source.id] = {
  description: "Retain this",
  values: { [otherModeKey]: { value: 11, baseline: 14 } },
};
const pinnedOther = prepareChangeReset(withOtherEdit, override, [source]);
assert.equal(
  pinnedOther.browserTokenEdits![source.id].description,
  "Retain this",
);
assert.equal(
  pinnedOther.browserTokenEdits![source.id].values[otherModeKey].value,
  11,
  "other contexts survive",
);
assert.throws(
  () =>
    prepareChangeReset(initial, override, [{ ...source, generatedValue: 16 }]),
  /changed/,
);
assert.throws(
  () =>
    prepareChangeReset(initial, { ...override, shippedValue: -1 }, [source]),
  /non-negative/,
);
assert.deepEqual(
  initial,
  untouched,
  "rejected overrides do not mutate any authoring state",
);
const staleModes = structuredClone(initial);
staleModes.modeSets[0].modes = staleModes.modeSets[0].modes.filter(
  (mode) => mode.id !== staleModes.modeSets[0].modes[0].id,
);
assert.throws(
  () => prepareChangeReset(staleModes, override, [source]),
  /modes changed/,
);
const clearValue = sourceResetPlan("Clear value", [
  {
    path: ["browserTokenEdits", source.id, "values", modeKey],
    expected: { value: 8, baseline: 14 },
  },
]);
const unpinned = prepareChangeReset(pinned, clearValue);
assert.equal(
  resolveBrowserTokens([source], unpinned.browserTokenEdits!, modeKey)[0].value,
  14,
  "direct manual reset reveals current generation, not shipped output",
);

assert.match(
  generatedOverrideReason(
    { ...generated, sourceKind: "semantic-token" },
    field,
    source,
    initial,
  )!,
  /Semantic/,
);
assert.match(
  generatedOverrideReason(
    generated,
    field,
    { ...source, paletteColorId: "palette" },
    initial,
  )!,
  /write through/,
);
assert.match(
  generatedOverrideReason(
    generated,
    field,
    {
      ...source,
      dataVis: {
        static: true,
        hidden: false,
        ordinal: 0,
        scaleId: "s",
        memberId: "m",
        source: { kind: "ui-swatch", scaleId: "s", contrastId: "c" },
      },
    },
    initial,
  )!,
  /shared across all modes/,
);
assert.match(
  generatedOverrideReason(
    generated,
    field,
    { ...source, type: "elevation" },
    initial,
  )!,
  /Complete shadows/,
);
assert.match(
  generatedOverrideReason(
    { ...generated, kind: "new" },
    field,
    source,
    initial,
  )!,
  /no shipped counterpart/,
);
assert.match(
  generatedOverrideReason(
    { ...generated, kind: "removed" },
    field,
    source,
    initial,
  )!,
  /no longer available/,
);
assert.match(
  generatedOverrideReason(
    generated,
    { ...field, tokenValue: undefined },
    source,
    initial,
  )!,
  /no shipped counterpart|no independently editable/,
);
assert.match(
  generatedOverrideReason(
    generated,
    {
      ...field,
      tokenValue: { ...field.tokenValue!, shippedValue: "not a number" },
    },
    source,
    initial,
  )!,
  /numeric/,
);
for (const [candidateItem, candidateField, candidateSource] of [
  [generated, { ...field, tokenValue: undefined }, source],
  [
    { ...generated, sourceKind: "semantic-token" as const },
    { ...field, tokenValue: undefined },
    undefined,
  ],
  [generated, field, { ...source, id: "different-token" }],
  [generated, field, { ...source, paletteColorId: "shared-palette" }],
] as const) {
  const choice = generatedResetOptions(
    candidateItem,
    candidateField,
    candidateSource,
    initial,
  )[0];
  assert.equal(
    choice.plan,
    undefined,
    "an override requires tokenValue and matching independent runtime source capability",
  );
  assert.ok(
    choice.disabledReason,
    "unsupported overrides have a visible reason",
  );
}
const locked = structuredClone(initial);
locked.scaleTypes!.find(
  (formula) => formula.id === scale.scaleTypeId,
)!.base.overridable = false;
assert.match(
  generatedOverrideReason(generated, field, source, locked)!,
  /locked formula/,
);

const attachments: ResetSnapshot = {
  ...structuredClone(defaults),
  attachments: { [defaults.modeSets[0].id]: ["color"] },
};
const detach = sourceResetPlan("Detach", [
  { path: ["attachments", defaults.modeSets[0].id], expected: ["color"] },
]);
assert.deepEqual(prepareChangeReset(attachments, detach).attachments, {});
assert.throws(
  () =>
    prepareChangeReset(
      { ...attachments, attachments: { missing: ["color"] } },
      sourceResetPlan("Text zoom", [
        {
          path: ["typography", "textZoom"],
          expected: defaults.typography.textZoom,
        },
      ]),
    ),
  /unavailable mode set/,
);

const fixture: ResetSnapshot = { ...createDataVisSnapshot(), attachments: {} };
fixture.components!.components = [];
const categorical = fixture.colorSystem.dataVisScales.find(
  (item) => item.id === DATA_VIS_IDS.categorical,
)!;
assert.equal(categorical.kind, "categorical");
if (categorical.kind !== "categorical")
  throw new Error("Expected categorical fixture");
categorical.staticColors = categorical.members.map((member) => ({
  id: member.id,
  value: "#123456",
  overrideValue: "#654321",
}));
const dormantId = dataVisMemberId(categorical.id, categorical.members[0].id);
fixture.browserTokenEdits = {
  [dormantId]: {
    description: "clear active metadata",
    values: { [modeKey]: { value: "#ff0000", baseline: "#123456" } },
  },
  [source.id]: {
    description: "clear this",
    values: { [modeKey]: { value: 10, baseline: 14 } },
  },
};
fixture.tokenOverrides = {
  [dormantId]: {
    value: "#abcdef",
    editedAt: "2026-10-14",
    baseline: {
      name: { colorName: "test", contrastValue: "" },
      value: "#123456",
    },
  },
};
fixture.aliases = {
  schemaVersion: 1,
  tokens: [
    {
      id: tokenUuid("reset-preserved-alias"),
      name: "old-chart-color-reset",
      $ref: dormantId,
      contexts: ["[]"],
    },
  ],
};
assert.equal(hasManualTokenEdits(fixture), true);
const manualPlan = manualTokenResetPlan(fixture);
const manual = prepareChangeReset(fixture, manualPlan);
assert.deepEqual(manual.browserTokenEdits, {
  [dormantId]: { values: fixture.browserTokenEdits[dormantId].values },
});
assert.deepEqual(
  manual.tokenOverrides,
  fixture.tokenOverrides,
  "dormant legacy edits survive Static clearing",
);
assert.deepEqual(
  manual.aliases,
  fixture.aliases,
  "clearing overrides does not delete compatibility aliases",
);
assert.ok(
  manual.colorSystem.dataVisScales.every(
    (item) =>
      item.kind !== "categorical" ||
      item.staticColors?.every((color) => color.overrideValue === undefined),
  ),
);
assert.equal(hasManualTokenEdits(manual), false, "only dormant edits remain");
const { attachments: fixtureAttachments, ...fixtureSource } = fixture;
assert.deepEqual(fixtureAttachments, {});
const staticBaseline = structuredClone(fixtureSource);
staticBaseline.browserTokenEdits = {};
staticBaseline.tokenOverrides = {};
for (const scale of staticBaseline.colorSystem.dataVisScales)
  if (scale.kind === "categorical") {
    for (const color of scale.staticColors ?? []) delete color.overrideValue;
  }
const staticComparison = comparePrimitiveTokens(
  staticBaseline,
  fixtureSource,
  compareAuthoring(staticBaseline, fixtureSource),
);
const staticValue = staticComparison.items
  .find((item) => item.id === dormantId)!
  .fields.find((field) => field.key === "Value")!;
assert.deepEqual(
  staticValue.address?.path,
  [
    "colorSystem",
    "dataVisScales",
    { key: "id", id: categorical.id },
    "staticColors",
    { key: "id", id: categorical.members[0].id },
    "overrideValue",
  ],
  "an active shared Static reset addresses its source, never a dormant mode edit",
);
const updatedManual = structuredClone(fixture);
updatedManual.browserTokenEdits![source.id].description = "A later edit";
assert.throws(
  () => prepareChangeReset(updatedManual, manualPlan),
  /Manual token edits changed/,
);
assert.equal(
  updatedManual.browserTokenEdits![source.id].description,
  "A later edit",
);

const store = createStore();
store.set(restoreAuthoringSnapshotAtom, structuredClone(initial));
store.set(editModeAtom, false);
const saved = store.get(editSessionSnapshotAtom);
assert.throws(
  () => store.set(applyChangeResetPlanAtom, plan),
  /Enter edit mode/,
);
assert.deepEqual(store.get(authoringSnapshotAtom).spacing, initial.spacing);
store.set(editModeAtom, true);
store.set(applyChangeResetPlanAtom, plan);
assert.deepEqual(store.get(resetSnapshotAtom).spacing, restored.spacing);
assert.deepEqual(
  store.get(editSessionSnapshotAtom),
  saved,
  "precise resets do not replace the saved baseline",
);
store.set(foundationModeAttachmentsAtom, attachments.attachments);
store.set(applyChangeResetPlanAtom, detach);
assert.deepEqual(store.get(foundationModeAttachmentsAtom), {});
const generatedSource = browserSourcesForSnapshot(
  store.get(authoringSnapshotAtom),
  store.get(authoringSnapshotAtom).modeSets.map((axis) => axis.modes[0]),
).find((item) => item.type === "spacing")!;
assert.ok(
  generatedSource,
  "the real browser generation owner is available to the reset integration",
);
store.set(restoreAuthoringSnapshotAtom, structuredClone(initial));
const realSource = sourceForResetContext(initial, modeKey, source.id)!;
assert.ok(realSource);
const realOverride = generatedResetOptions(
  generated,
  field,
  realSource,
  initial,
)[0].plan!;
store.set(applyChangeResetPlanAtom, realOverride);
assert.equal(
  store.get(authoringSnapshotAtom).browserTokenEdits![source.id].values[modeKey]
    .value,
  8,
  "the application atom validates and applies the selected context without using current view modes",
);
assert.deepEqual(store.get(editSessionSnapshotAtom), saved);
const increasedContrast = structuredClone(defaults);
const red = increasedContrast.colorSystem.scales.find(
  (scale) => scale.name === "Red",
)!;
const contrast = (red.customContrasts?.steps ??
  increasedContrast.colorSystem.contrasts)[0];
const originalColors = browserSourcesForSnapshot(
  defaults,
  defaults.modeSets.map((set) => set.modes[0]),
);
const originalColor = originalColors.find(
  (source) =>
    source.groupId === red.id && source.taxonomySource?.stepId === contrast.id,
)!;
assert.ok(originalColor);
contrast.value += 0.5;
const updatedColor = sourceForResetContext(
  increasedContrast,
  modeKey,
  originalColor.id,
)!;
const colorField: ChangeField = {
  key: "Value",
  generated: true,
  tokenValue: {
    tokenId: originalColor.id,
    modeKey,
    shippedValue: originalColor.value,
  },
};
const colorItem: ChangeItem = {
  id: originalColor.id,
  topic: "tokens",
  sourceKind: "token",
  title: originalColor.name,
  kind: "modified",
  fields: [colorField],
};
const rejectedPin = generatedResetOptions(
  colorItem,
  colorField,
  updatedColor,
  increasedContrast,
)[0].plan!;
const retainedContrast = structuredClone(increasedContrast);
assert.throws(
  () =>
    prepareChangeReset({ ...increasedContrast, attachments: {} }, rejectedPin, [
      updatedColor,
    ]),
  /contrast/i,
  "a shipped color pin must still meet the selected working context's contrast target",
);
assert.deepEqual(
  increasedContrast,
  retainedContrast,
  "rejected final output leaves every authored source untouched",
);
console.log(
  "Changes resets: exact source/card scope, stale contexts, current generation, independent overrides, unsupported reasons, dormant edits, attachment validation, cancellation and atomic lifecycle passed.",
);
