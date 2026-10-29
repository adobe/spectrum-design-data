// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createColorDefaults } from "../src/data/defaults";
import { createRule, isRule } from "../src/features/logic/model";
import {
  STANDARD_SCALE_NAMING_RULE,
  scaleNamingIndices,
} from "../src/features/logic/scaleNaming";
import { RULE_DEFAULTS } from "../src/features/logic/defaults";
import {
  contrastStepIndex,
  scaleContrasts,
} from "../src/features/color-system/contrastSteps";
import { isColorSystemDocument } from "../src/features/color-system/model";
import { resolveColorDocument } from "../src/features/color-system/resolution";
import { generateColorTokensForScale } from "../src/features/tokens/generation";
import { resolvedBackgroundLinear } from "../src/features/color-system/surfaceGeneration";
import {
  createMode,
  isModeSetList,
  type ModeSet,
} from "../src/features/modes/model";

const expected = [
  25, 50, 75, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000,
];
assert.deepEqual(
  scaleNamingIndices(STANDARD_SCALE_NAMING_RULE, 13, 3),
  expected,
);
assert.deepEqual(
  scaleNamingIndices(STANDARD_SCALE_NAMING_RULE, 16, 0),
  Array.from({ length: 16 }, (_, index) => (index + 1) * 100),
);
const fixed = {
  ...createRule("scale-naming"),
  below: { kind: "fixed" as const, increment: 25 },
};
assert.ok(isRule(fixed));
assert.deepEqual(scaleNamingIndices(fixed, 13, 3), expected);
assert.throws(
  () =>
    scaleNamingIndices(
      { ...fixed, below: { kind: "fixed", increment: 50 } },
      13,
      3,
    ),
  /positive/,
);
assert.throws(() => scaleNamingIndices(fixed, 13, -1), /base/);
assert.ok(!isRule({ ...fixed, aboveIncrement: Number.NaN }));

const base = createColorDefaults();
base.scales = base.scales.filter((scale) => scale.name !== "Gray");
base.contrasts = Array.from({ length: 16 }, (_, index) => ({
  id: `shared-${index}`,
  value: 1 + index,
}));
const gray = base.scales[0];
gray.customContrasts = {
  steps: Array.from({ length: 13 }, (_, index) => ({
    id: `gray-${index}`,
    value: 1.2 + index,
  })),
  baseContrastId: "gray-3",
  namingRuleId: STANDARD_SCALE_NAMING_RULE.id,
};
assert.ok(isColorSystemDocument(base));
assert.equal(scaleContrasts(base, gray).length, 13);
assert.equal(scaleContrasts(base, base.scales[1]).length, 16);
assert.deepEqual(
  gray.customContrasts.steps.map((_, index) => contrastStepIndex(index, gray)),
  expected,
);
assert.ok(
  !isColorSystemDocument({
    ...base,
    scales: [
      {
        ...gray,
        customContrasts: {
          ...gray.customContrasts,
          baseContrastId: "missing",
        },
      },
    ],
  }),
);
const tokens = generateColorTokensForScale(
  gray,
  base.contrasts,
  resolvedBackgroundLinear(base),
  base.settings,
  "srgb",
);
assert.deepEqual(
  tokens.map((token) => Number(token.name.contrastValue)),
  expected,
);
const ids = tokens.map((token) => token.uuid);
const defaultMode = createMode(),
  high = createMode();
defaultMode.key = "normal";
defaultMode.name = "Normal";
high.key = "high";
high.name = "High contrast";
high.foundations.color = {
  scaleContrasts: { [gray.id]: { "gray-3": 4.5 } },
  contrastMultiplier: 1.5,
};
const axis: ModeSet = {
  id: "contrast-owner",
  key: "contrast",
  name: "Contrast",
  description: "",
  defaultModeId: defaultMode.id,
  modes: [defaultMode, high],
  authoringCapabilities: ["color.contrastMultiplier"],
};
for (const scaleContrasts of [
  [],
  { [gray.id]: [] },
  { [gray.id]: { "gray-3": Number.NaN } },
  { [gray.id]: { "gray-3": 0 } },
  { [gray.id]: { "gray-3": 22 } },
]) {
  assert.ok(
    !isModeSetList([
      {
        ...axis,
        modes: [{ ...high, foundations: { color: { scaleContrasts } } }],
      },
    ]),
    "Custom mode patches require record-shaped data and finite ratios between 1 and 21.",
  );
}
const resolved = resolveColorDocument(base, [high], undefined, {
  modeSets: [axis],
});
assert.equal(resolved.scales[0].customContrasts!.steps[3].value, 6.25);
assert.equal(base.scales[0].customContrasts!.steps[3].value, 4.2);
assert.deepEqual(
  generateColorTokensForScale(
    resolved.scales[0],
    resolved.contrasts,
    resolvedBackgroundLinear(resolved),
    resolved.settings,
    "srgb",
  ).map((token) => token.uuid),
  ids,
);
assert.equal(
  resolveColorDocument(base, [defaultMode], undefined, { modeSets: [axis] })
    .scales[0].customContrasts!.steps[3].value,
  4.2,
);
assert.equal(
  resolveColorDocument(base, [high], undefined, {
    modeSets: [{ ...axis, authoringCapabilities: ["color.scales"] }],
  }).scales[0].customContrasts!.steps[3].value,
  4.2,
);
const simultaneous = structuredClone(high);
simultaneous.foundations.color!.scaleStops = {
  [gray.id]: { [gray.stops[0].id]: { lightness: 0.35 } },
  [base.scales[1].id]: { [base.scales[1].stops[0].id]: { lightness: 0.4 } },
};
const simultaneousDocument = resolveColorDocument(
  base,
  [simultaneous],
  undefined,
  {
    modeSets: [
      {
        ...axis,
        modes: [defaultMode, simultaneous],
        authoringCapabilities: ["color.scales", "color.contrastMultiplier"],
      },
    ],
  },
);
assert.equal(simultaneousDocument.scales[0].stops[0].lightness, 0.35);
assert.equal(simultaneousDocument.scales[1].stops[0].lightness, 0.4);
assert.equal(
  simultaneousDocument.scales[0].customContrasts!.steps[3].value,
  6.25,
);
const zero = resolveColorDocument(base, [], { "color.contrastMultiplier": 0 });
assert.ok(
  zero.scales[0].customContrasts!.steps.every((step) => step.value === 1),
);
const namedRule = {
  ...fixed,
  id: "custom-naming",
  baseLabel: 200,
  aboveIncrement: 200,
};
const renamed = {
  ...gray,
  customContrasts: { ...gray.customContrasts, namingRuleId: namedRule.id },
};
assert.equal(contrastStepIndex(3, renamed, [...RULE_DEFAULTS, namedRule]), 200);
assert.throws(() => contrastStepIndex(0, renamed), /unavailable/);
console.log(
  "Custom contrasts: naming, ownership, inheritance, identity and adaptation passed.",
);

const { createStore } = await import("jotai");
const {
  colorSystemDocumentAtom,
  customContrastModeDocumentsAtom,
  cssBaseDocumentAtom,
  colorSchemeDocumentsAtom,
  contrastModesAtom,
  scaleModeDocumentsAtom,
  removeColorScaleAtom,
  restoreColorScaleAtom,
} = await import("../src/features/color-system/state");
const { editCustomContrastsAtom, restoreCustomContrastsAtom } =
  await import("../src/features/color-system/customContrastState");
const { editModeAtom } = await import("../src/state/view/editMode");
const { modeSetsAtom } = await import("../src/features/modes/state");
const { adaptiveClaimsAtom } = await import("../src/features/modes/adaptive");
const { modeSelectionAtom } = await import("../src/features/modes/selection");
const { previewOverridesAtom } =
  await import("../src/features/modes/previewState");
const { addRuleAtom, replaceRuleAtom, removeRuleAtom } =
  await import("../src/features/logic/state");
const { rulesAtom } = await import("../src/features/logic/library");
const { taxonomyDocumentAtom } = await import("../src/features/taxonomy/state");
const { buildColorLibrary } =
  await import("../src/features/color-system/cssLibrary");
const { captureSnapshot, assertStoredSnapshot, createDefaultSnapshot } =
  await import("../src/features/edit-session/state");
const { upgradeCustomContrastSnapshot } =
  await import("../src/features/edit-session/customContrastUpgrade");
const { generatedColorTokensAtom } =
  await import("../src/features/tokens/state");
const { tokenOverridesAtom } = await import("../src/features/tokens/overrides");
const { browserTokenEditsAtom } =
  await import("../src/features/tokens/browserEdits");
const { aliasesAtom } = await import("../src/features/tokens/aliasState");
const { tokenUuid, tokenStableKey } =
  await import("../src/features/tokens/model");
const { canonicalAliasRows, completeAliasSource } =
  await import("../src/features/tokens/aliasTargets");
const { colorFoundationParameters } =
  await import("../src/features/impact/sources/colorFoundation");
const { modeFoundationParameters } =
  await import("../src/features/impact/sources/modeFoundation");
const { buildCascadeTokenExport } =
  await import("../src/features/tokens/cascadeExport");
const { buildOutputProfile } =
  await import("../src/features/color-system/analysis");
const { canonicalDesignSystemDataset, composeDesignSystemDefaults } =
  await import("../src/features/design-data/validation");
const { designSystemDefaults } = await import("../src/data/defaults");
const store = createStore();
store.set(colorSystemDocumentAtom, base);
store.set(modeSetsAtom, [axis]);
store.set(adaptiveClaimsAtom, {});
assert.throws(
  () => store.set(editCustomContrastsAtom, { kind: "add", scaleId: gray.id }),
  /edit mode/,
);
store.set(editModeAtom, true);
assert.throws(
  () =>
    store.set(editCustomContrastsAtom, {
      kind: "remove",
      scaleId: gray.id,
      stepId: "gray-3",
    }),
  /another base/,
);
store.set(modeSelectionAtom, { contrast: high.id });
store.set(editCustomContrastsAtom, {
  kind: "value",
  scaleId: gray.id,
  stepId: "gray-4",
  value: 7,
});
assert.equal(
  store.get(modeSetsAtom)[0].modes[1].foundations.color!.scaleContrasts![
    gray.id
  ]["gray-4"],
  7,
);
assert.throws(
  () => store.set(editCustomContrastsAtom, { kind: "add", scaleId: gray.id }),
  /default Contrast/,
);
store.set(editCustomContrastsAtom, {
  kind: "reset",
  scaleId: gray.id,
  stepId: "gray-4",
});
assert.equal(
  store.get(modeSetsAtom)[0].modes[1].foundations.color!.scaleContrasts![
    gray.id
  ]["gray-4"],
  undefined,
);
store.set(modeSelectionAtom, {});
const undo = store.set(editCustomContrastsAtom, {
  kind: "remove",
  scaleId: gray.id,
  stepId: "gray-0",
})!;
assert.equal(
  store.get(colorSystemDocumentAtom).scales[0].customContrasts!.steps.length,
  12,
);
store.set(restoreCustomContrastsAtom, undo);
assert.equal(
  store.get(colorSystemDocumentAtom).scales[0].customContrasts!.steps.length,
  13,
);
const undoStore = createStore();
undoStore.set(colorSystemDocumentAtom, structuredClone(base));
undoStore.set(modeSetsAtom, [structuredClone(axis)]);
undoStore.set(editModeAtom, true);
undoStore.set(modeSelectionAtom, { contrast: high.id });
for (const stepId of ["gray-0", "gray-1"])
  undoStore.set(editCustomContrastsAtom, {
    kind: "value",
    scaleId: gray.id,
    stepId,
    value: 6,
  });
undoStore.set(modeSelectionAtom, {});
const scopedUndo = undoStore.set(editCustomContrastsAtom, {
  kind: "remove",
  scaleId: gray.id,
  stepId: "gray-0",
})!;
undoStore.set(modeSelectionAtom, { contrast: high.id });
undoStore.set(editCustomContrastsAtom, {
  kind: "value",
  scaleId: gray.id,
  stepId: "gray-1",
  value: 7,
});
undoStore.set(editCustomContrastsAtom, {
  kind: "reset",
  scaleId: gray.id,
  stepId: "gray-3",
});
undoStore.set(restoreCustomContrastsAtom, scopedUndo);
assert.deepEqual(
  undoStore.get(modeSetsAtom)[0].modes[1].foundations.color!.scaleContrasts![
    gray.id
  ],
  { "gray-0": 6, "gray-1": 7 },
  "Undo restores the deleted patch without reverting later edits or resets on surviving steps.",
);
store.set(addRuleAtom, namedRule);
store.set(editCustomContrastsAtom, {
  kind: "rule",
  scaleId: gray.id,
  ruleId: namedRule.id,
});
assert.equal(
  store
    .get(generatedColorTokensAtom)
    .find(
      (token) =>
        token.source.scaleId === gray.id &&
        token.source.contrastId === "gray-3",
    )!.name.contrastValue,
  "200",
);
assert.throws(
  () => store.set(removeRuleAtom, namedRule.id),
  /names color steps/,
);
assert.throws(
  () =>
    store.set(replaceRuleAtom, {
      ...namedRule,
      below: { kind: "fixed", increment: 100 },
    }),
  /positive/,
);
store.set(replaceRuleAtom, { ...namedRule, aboveIncrement: 250 });
assert.equal(
  store
    .get(generatedColorTokensAtom)
    .find(
      (token) =>
        token.source.scaleId === gray.id &&
        token.source.contrastId === "gray-4",
    )!.name.contrastValue,
  "450",
);
store.set(previewOverridesAtom, { "color.contrastMultiplier": 1.2 });
assert.throws(
  () => store.set(editCustomContrastsAtom, { kind: "add", scaleId: gray.id }),
  /saved mode/,
);
store.set(previewOverridesAtom, {});
store.set(editCustomContrastsAtom, {
  kind: "rule",
  scaleId: gray.id,
  ruleId: STANDARD_SCALE_NAMING_RULE.id,
});
assertStoredSnapshot(captureSnapshot(store.get));
const oldSnapshot = createDefaultSnapshot();
oldSnapshot.colorSystem.scales = oldSnapshot.colorSystem.scales.filter(
  (scale) => scale.name !== "Gray",
);
oldSnapshot.rules = oldSnapshot.rules!.filter(
  (rule) => rule.type !== "scale-naming",
);
const upgraded = upgradeCustomContrastSnapshot(oldSnapshot, 6);
assert.equal(
  upgraded.rules!.filter((rule) => rule.type === "scale-naming").length,
  1,
);
assert.deepEqual(upgraded.colorSystem, oldSnapshot.colorSystem);
assert.deepEqual(upgraded.modeSets, oldSnapshot.modeSets);
assert.equal(
  oldSnapshot.rules!.filter((rule) => rule.type === "scale-naming").length,
  0,
);
const css = buildColorLibrary(
  store.get(cssBaseDocumentAtom),
  store.get(colorSchemeDocumentsAtom),
  store.get(contrastModesAtom),
  store.get(scaleModeDocumentsAtom),
  store.get(taxonomyDocumentAtom),
  store.get(rulesAtom),
  store.get(customContrastModeDocumentsAtom),
);
assert.match(css, /color-contrast-25/);
assert.match(css, /--contrast-silver-25/);
assert.match(css, /\[data-contrast="[^"]+"\]/);
assert.ok(
  css.includes("@media (prefers-contrast: more)") ===
    (high.key === "high" || high.key === "more"),
);
const baseRows = buildCascadeTokenExport({
  base: store.get(colorSystemDocumentAtom),
  modeSets: [axis],
  activeModes: [defaultMode],
  activeTokens: [],
  overrides: {},
  taxonomy: store.get(taxonomyDocumentAtom),
  rules: store.get(rulesAtom),
});
const customTokenIds = new Set(ids);
assert.equal(
  baseRows.tokens.filter((row) => customTokenIds.has(row.uuid)).length,
  13,
);
assert.ok(
  colorFoundationParameters(store.get(colorSystemDocumentAtom)).some(
    (row) => row.id.endsWith("customContrasts") && row.edited,
  ),
);
assert.ok(
  modeFoundationParameters(store.get(modeSetsAtom)).some(
    (row) => row.id.endsWith("color.scaleContrasts") && row.edited,
  ),
);
assert.equal(
  buildOutputProfile(base, gray, base.surfaces[0], gray.customContrasts.steps)
    .length,
  13,
);
const dataset = structuredClone(designSystemDefaults);
dataset.system.foundations.color = store.get(colorSystemDocumentAtom);
dataset.system.taxonomy = store.get(taxonomyDocumentAtom);
dataset.system.rules = store.get(rulesAtom);
assert.doesNotThrow(() =>
  composeDesignSystemDefaults(
    canonicalDesignSystemDataset(dataset),
    dataset.system.scaleTypes,
  ),
);
const { defaultsAnalysisInput, projectAuthoringDataset } =
  await import("../src/features/design-data/projection");
const { canonicalJson } =
  await import("../src/features/design-data/comparison");
const withUnusedNaming = structuredClone(designSystemDefaults);
withUnusedNaming.system.rules.push({
  ...STANDARD_SCALE_NAMING_RULE,
  id: "unreferenced-naming-test",
});
const shipped = defaultsAnalysisInput(),
  prior = projectAuthoringDataset(withUnusedNaming, shipped.source);
assert.deepEqual(prior.errors, []);
assert.equal(
  canonicalJson(prior.records.filter((record) => record.category === "tokens")),
  canonicalJson(
    shipped.records.filter((record) => record.category === "tokens"),
  ),
  "An unreferenced naming definition does not alter any shipped token ID, value, name or context.",
);
const fractionalRule = {
  ...STANDARD_SCALE_NAMING_RULE,
  id: "fractional-naming",
  baseLabel: 1,
  aboveIncrement: 1,
};
const fractionalColor = structuredClone(base);
fractionalColor.scales[0].customContrasts!.namingRuleId = fractionalRule.id;
const fractionalCss = buildColorLibrary(
  fractionalColor,
  [],
  [],
  [],
  undefined,
  [fractionalRule],
);
assert.match(fractionalCss, /--contrast-silver-0-25:/);
assert.match(fractionalCss, /\.color-contrast-0-25 \{/);
assert.ok(!fractionalCss.includes(".color-contrast-0.25"));
const disabled = store.set(editCustomContrastsAtom, {
  kind: "disable",
  scaleId: gray.id,
})!;
assert.equal(
  store.get(colorSystemDocumentAtom).scales[0].customContrasts,
  undefined,
);
assert.equal(
  store.get(modeSetsAtom)[0].modes[1].foundations.color?.scaleContrasts,
  undefined,
);
store.set(restoreCustomContrastsAtom, disabled);
assert.equal(
  store.get(modeSetsAtom)[0].modes[1].foundations.color!.scaleContrasts![
    gray.id
  ]["gray-3"],
  4.5,
);
const aliasTarget = canonicalAliasRows(
  completeAliasSource(captureSnapshot(store.get)),
).find((row) => row.id === ids[0])!;
store.set(aliasesAtom, {
  schemaVersion: 1,
  tokens: [
    {
      id: tokenUuid("custom-test-alias"),
      name: "old-gray-name",
      $ref: ids[0],
      contexts: [aliasTarget.context],
    },
  ],
});
store.set(tokenOverridesAtom, {
  [ids[0]]: {
    value: "#333333",
    editedAt: "2026-10-12T00:00:00Z",
    baseline: { name: tokens[0].name, value: tokens[0].value },
  },
});
store.set(browserTokenEditsAtom, {
  [ids[0]]: { description: "Keep on Undo", values: {} },
});
const deletion = store.set(removeColorScaleAtom, gray.id);
assert.ok(deletion.ok && deletion.removedScale);
assert.equal(
  store.get(modeSetsAtom)[0].modes[1].foundations.color?.scaleContrasts,
  undefined,
);
assert.equal(store.get(tokenOverridesAtom)[ids[0]], undefined);
assert.equal(store.get(browserTokenEditsAtom)[ids[0]], undefined);
assert.equal(store.get(aliasesAtom).tokens.length, 0);
store.set(restoreColorScaleAtom, deletion.removedScale);
assert.equal(
  store.get(modeSetsAtom)[0].modes[1].foundations.color!.scaleContrasts![
    gray.id
  ]["gray-3"],
  4.5,
);
assert.equal(
  store.get(browserTokenEditsAtom)[ids[0]].description,
  "Keep on Undo",
);
assert.equal(store.get(aliasesAtom).tokens.length, 1);
const removedStep = store.set(editCustomContrastsAtom, {
  kind: "remove",
  scaleId: gray.id,
  stepId: "gray-0",
})!;
assert.equal(store.get(tokenOverridesAtom)[ids[0]], undefined);
assert.equal(store.get(aliasesAtom).tokens.length, 0);
store.set(restoreCustomContrastsAtom, removedStep);
assert.equal(store.get(tokenOverridesAtom)[ids[0]].value, "#333333");
const beforeDetachment = store.set(editCustomContrastsAtom, {
  kind: "disable",
  scaleId: gray.id,
})!;
const { detachFoundationModeSetAtom } =
  await import("../src/features/modes/foundationAttachments");
store.set(detachFoundationModeSetAtom, {
  modeSetId: axis.id,
  foundation: "color",
});
assert.throws(
  () => store.set(restoreCustomContrastsAtom, beforeDetachment),
  /ownership changed/,
);
assert.equal(
  store.get(colorSystemDocumentAtom).scales[0].customContrasts,
  undefined,
  "A failed Undo does not partially restore the list.",
);
console.log(
  "Custom contrasts: editing, cleanup/Undo, rule validation, schema, CSS, impact and v6 upgrade passed.",
);

const { createGraySnapshot } = await import("./fixtures/customContrasts");
const { browserTokenImpactRecordsAtom, savedBrowserConceptIdsAtom } =
  await import("../src/features/tokens/browserSavedState");
const {
  restoreAuthoringSnapshotAtom,
  editSessionSnapshotAtom: savedSnapshotAtom,
} = await import("../src/features/edit-session/state");
const { changeGroupsAtom, revertChangeTopicAtom, revertChangeItemAtom } =
  await import("../src/features/changelog/state");
const accounting = createStore();
const sharedSnapshot = createGraySnapshot(false);
const {
  buildDimensionArtifacts,
  captureDimensionSource,
  validateDimensionBundle,
} = await import("../src/features/design-data/dimensionArtifacts");
const dimensionBaseline = await buildDimensionArtifacts(
  captureDimensionSource(sharedSnapshot),
);
const dimensionWithCustomColor = await buildDimensionArtifacts(
  captureDimensionSource(createGraySnapshot()),
);
assert.deepEqual(
  dimensionWithCustomColor.tokens,
  dimensionBaseline.tokens,
  "Custom color mode patches do not change dimension output.",
);
assert.deepEqual(
  await validateDimensionBundle(
    JSON.parse(canonicalJson(dimensionWithCustomColor)),
  ),
  dimensionWithCustomColor,
  "Native schemas and composed artifacts accept nested custom-ratio mode patches.",
);
accounting.set(restoreAuthoringSnapshotAtom, sharedSnapshot);
accounting.set(savedSnapshotAtom, sharedSnapshot);
accounting.set(editModeAtom, true);
const savedCount = accounting.get(savedBrowserConceptIdsAtom).size;
const grayId = sharedSnapshot.colorSystem.scales[0].id;
accounting.set(editCustomContrastsAtom, { kind: "enable", scaleId: grayId });
accounting.set(editCustomContrastsAtom, {
  kind: "base",
  scaleId: grayId,
  stepId: sharedSnapshot.colorSystem.contrasts[3].id,
});
for (const step of sharedSnapshot.colorSystem.contrasts.slice(13)) {
  accounting.set(editCustomContrastsAtom, {
    kind: "remove",
    scaleId: grayId,
    stepId: step.id,
  });
}
assert.equal(
  accounting.get(savedBrowserConceptIdsAtom).size,
  savedCount,
  "Unsaved structures do not replace the saved concept baseline.",
);
accounting.set(savedSnapshotAtom, captureSnapshot(accounting.get));
assert.equal(
  accounting.get(savedBrowserConceptIdsAtom).size,
  savedCount - 3,
  "Saving 13 instead of 16 swatches removes exactly three saved concepts.",
);
const scopedIds = new Set(
  sharedSnapshot.colorSystem.contrasts
    .slice(0, 13)
    .map((step) => tokenUuid(tokenStableKey(grayId, step.id))),
);
const colorImpact = () =>
  accounting
    .get(browserTokenImpactRecordsAtom)
    .filter((record) => scopedIds.has(record.tokenId));
const beforeRule = colorImpact();
assert.equal(beforeRule.length, 13);
assert.ok(
  beforeRule.every((record) => !record.manuallyOverridden),
  "Authored custom lists remain generated, not manual assignments.",
);
accounting.set(addRuleAtom, namedRule);
accounting.set(editCustomContrastsAtom, {
  kind: "rule",
  scaleId: grayId,
  ruleId: namedRule.id,
});
assert.deepEqual(
  colorImpact().map((record) => [record.tokenId, record.modeValues.length]),
  beforeRule.map((record) => [record.tokenId, record.modeValues.length]),
  "A naming-rule change does not add concepts or mode values.",
);
assert.throws(
  () => accounting.set(revertChangeTopicAtom, "logic"),
  /shipped naming rule/,
);
const authoredImpact = structuredClone(colorImpact());
accounting.set(previewOverridesAtom, { "color.contrastMultiplier": 1.8 });
assert.deepEqual(
  colorImpact(),
  authoredImpact,
  "Temporary comparison previews do not change saved impact accounting.",
);
accounting.set(previewOverridesAtom, {});
const scaleChange = accounting
  .get(changeGroupsAtom)
  .flatMap((group) => group.items)
  .find((item) => item.sourceKind === "scale" && item.id === grayId)!;
assert.ok(scaleChange.fields.some((field) => field.key === "Custom Contrasts"));
accounting.set(revertChangeItemAtom, scaleChange);
assert.equal(
  accounting.get(colorSystemDocumentAtom).scales[0].customContrasts,
  undefined,
);
assert.ok(
  accounting
    .get(modeSetsAtom)
    .every((axis) =>
      axis.modes.every(
        (mode) => !mode.foundations.color?.scaleContrasts?.[grayId],
      ),
    ),
);
accounting.set(revertChangeTopicAtom, "logic");
assert.ok(!accounting.get(rulesAtom).some((rule) => rule.id === namedRule.id));
console.log(
  "Custom contrasts: saved concept counts, generated mode-value accounting, temporary previews and source/Logic reverts passed.",
);

class MemoryStorage implements Storage {
  data = new Map<string, string>();
  get length() {
    return this.data.size;
  }
  clear() {
    throw new Error("Broad clearing is prohibited.");
  }
  key(index: number) {
    return [...this.data.keys()][index] ?? null;
  }
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
}
const storage = new MemoryStorage(),
  events = new EventTarget();
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    localStorage: storage,
    sessionStorage: new MemoryStorage(),
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
  },
});
const { AUTHORING_STORAGE_KEY, AUTHORING_RECORD_VERSION } =
  await import("../src/features/edit-session/storage");
const { initializeAuthoringPersistence } =
  await import("../src/features/edit-session/persistence");
const {
  saveEditAtom,
  cancelEditAtom,
  editSessionSnapshotAtom,
  resetAllAuthoringAtom,
} = await import("../src/features/edit-session/state");
const { flushPersistedState } = await import("../src/state/persist");
const v6Saved = createDefaultSnapshot();
v6Saved.colorSystem.scales = v6Saved.colorSystem.scales.filter(
  (scale) => scale.name !== "Gray",
);
v6Saved.rules = v6Saved.rules!.filter((rule) => rule.type !== "scale-naming");
v6Saved.modeSets = v6Saved.modeSets.filter(
  (axis) => axis.key !== "colorScheme",
);
const v6Working = structuredClone(v6Saved);
v6Working.colorSystem.settings.extOffset = 0.32;
storage.setItem(
  AUTHORING_STORAGE_KEY,
  JSON.stringify({
    version: 6,
    working: v6Working,
    saved: v6Saved,
    isEditing: true,
    attachments: {},
    savedAttachments: {},
  }),
);
const lifecycle = createStore();
let dispose = initializeAuthoringPersistence(lifecycle);
assert.equal(lifecycle.get(colorSystemDocumentAtom).settings.extOffset, 0.32);
assert.equal(
  lifecycle.get(editSessionSnapshotAtom)!.colorSystem.settings.extOffset,
  v6Saved.colorSystem.settings.extOffset,
);
assert.ok(
  !lifecycle.get(modeSetsAtom).some((axis) => axis.key === "colorScheme"),
);
assert.equal(
  JSON.parse(storage.getItem(AUTHORING_STORAGE_KEY)!).version,
  AUTHORING_RECORD_VERSION,
);
const lifecycleScaleId = lifecycle.get(colorSystemDocumentAtom).scales[0].id;
lifecycle.set(editCustomContrastsAtom, {
  kind: "enable",
  scaleId: lifecycleScaleId,
});
lifecycle.set(editCustomContrastsAtom, {
  kind: "base",
  scaleId: lifecycleScaleId,
  stepId: lifecycle.get(colorSystemDocumentAtom).contrasts[3].id,
});
for (let index = 0; index < 3; index++)
  lifecycle.set(editCustomContrastsAtom, {
    kind: "remove",
    scaleId: lifecycleScaleId,
    stepId: lifecycle
      .get(colorSystemDocumentAtom)
      .scales[0].customContrasts!.steps.at(-1)!.id,
  });
const saveResult = lifecycle.set(saveEditAtom);
assert.ok(
  saveResult.skippedAliases.length > 0,
  "Only names reused by other reindexed swatches skip compatibility aliases.",
);
const savedCustom = structuredClone(lifecycle.get(editSessionSnapshotAtom));
lifecycle.set(editCustomContrastsAtom, {
  kind: "value",
  scaleId: lifecycleScaleId,
  stepId: lifecycle.get(colorSystemDocumentAtom).scales[0].customContrasts!
    .steps[0].id,
  value: 2,
});
flushPersistedState();
dispose();
const reload = createStore();
dispose = initializeAuthoringPersistence(reload);
assert.equal(
  reload.get(colorSystemDocumentAtom).scales[0].customContrasts!.steps[0].value,
  2,
);
assert.deepEqual(reload.get(editSessionSnapshotAtom), savedCustom);
reload.set(cancelEditAtom);
assert.deepEqual(captureSnapshot(reload.get), savedCustom);
reload.set(resetAllAuthoringAtom);
assert.deepEqual(captureSnapshot(reload.get), createDefaultSnapshot());
dispose();
Reflect.deleteProperty(globalThis, "window");
console.log(
  "Custom contrasts: durable v6/v7 migration, saved/working separation, Save/Cancel/reload/reset and unambiguous aliases passed.",
);
