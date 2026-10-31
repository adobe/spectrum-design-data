// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import { createColorDefaults } from "../src/data/defaults";
import {
  colorSystemDocumentAtom,
  removeColorScaleAtom,
  updateColorScalePublishingAtom,
} from "../src/features/color-system/state";
import { editModeAtom } from "../src/state/view/editMode";
import { modeSetsAtom } from "../src/features/modes/state";
import { modeSelectionAtom } from "../src/features/modes/selection";
import { previewOverridesAtom } from "../src/features/modes/previewState";
import { createMode, type ModeSet } from "../src/features/modes/model";
import { taxonomyDocumentAtom } from "../src/features/taxonomy/state";
import { rulesAtom } from "../src/features/logic/library";
import { browserTokenEditsAtom } from "../src/features/tokens/browserEdits";
import {
  browserTokenSourcesAtom,
  browserTokensAtom,
} from "../src/features/tokens/browserState";
import { canonicalTokenModeKey } from "../src/features/tokens/browserModel";
import { dataVisMemberId } from "../src/features/color-system/data-vis/identity";
import {
  addContinuousDataVisAtom,
  applyCategoricalDataVisAtom,
  dataVisContextFingerprintAtom,
  dataVisContinuousOutputsAtom,
  dataVisInputDocumentAtom,
  dataVisUiSwatchesAtom,
  editDataVisPointAtom,
  editDataVisStructureAtom,
  removeDataVisScaleAtom,
  restoreDataVisScaleAtom,
} from "../src/features/color-system/data-vis/state";
import { inspectPalette } from "../src/features/color-system/data-vis/categorical";
import {
  suggestionMembers,
  isCurrentSuggestion,
} from "../src/features/color-system/data-vis/requests";
import {
  DEFAULT_CATEGORICAL_PREFERENCES,
  type CategoricalDataVisScale,
} from "../src/features/color-system/data-vis/model";
import { buildCascadeTokenExport } from "../src/features/tokens/cascadeExport";
import {
  canonicalAliasRows,
  completeAliasSource,
} from "../src/features/tokens/aliasTargets";
import {
  assertStoredSnapshot,
  captureSnapshot,
  cancelEditAtom,
  saveEditAtom,
  enterEditModeAtom,
  editSessionSnapshotAtom,
  resetAllAuthoringAtom,
} from "../src/features/edit-session/state";
import { aliasesAtom } from "../src/features/tokens/aliasState";
import { tokenUuid } from "../src/features/tokens/model";
import { colorFoundationParameters } from "../src/features/impact/sources/colorFoundation";
import { modeFoundationParameters } from "../src/features/impact/sources/modeFoundation";
import { savedBrowserConceptIdsAtom } from "../src/features/tokens/browserSavedState";
import { primitiveReferencesAtom } from "../src/features/tokens/primitiveReferenceState";
import { adaptiveClaimsAtom } from "../src/features/modes/adaptive";

const store = createStore(),
  base = createColorDefaults();
store.set(colorSystemDocumentAtom, { ...base, dataVisScales: [] });
const light = { ...createMode(), name: "Light", key: "light" },
  dark = { ...createMode(), name: "Dark", key: "dark" };
const normal = { ...createMode(), name: "Normal", key: "normal" },
  high = { ...createMode(), name: "High", key: "high" };
const geometry: ModeSet = {
  id: "geometry",
  key: "geometry",
  name: "Geometry",
  description: "",
  defaultModeId: light.id,
  authoringCapabilities: [
    "color.scales",
    "color.backgroundScaleId",
    "color.backgroundLightness",
  ],
  modes: [light, dark],
};
const contrast: ModeSet = {
  id: "contrast",
  key: "contrast",
  name: "Contrast",
  description: "",
  defaultModeId: normal.id,
  authoringCapabilities: ["color.contrastMultiplier"],
  modes: [normal, high],
};
store.set(modeSetsAtom, [geometry, contrast]);
store.set(adaptiveClaimsAtom, {});
assert.throws(
  () => store.set(addContinuousDataVisAtom, "sequential"),
  /edit mode/,
);
store.set(editModeAtom, true);
const beforeIds = store.get(browserTokenSourcesAtom).map((token) => token.id);
const sequenceId = store.set(addContinuousDataVisAtom, "sequential");
const sequence = store
  .get(colorSystemDocumentAtom)
  .dataVisScales.find((scale) => scale.id === sequenceId)!;
assert.equal(sequence.kind, "sequential");
if (sequence.kind === "categorical")
  throw new Error("Expected a continuous fixture.");
assert.deepEqual(
  store.get(browserTokenSourcesAtom).map((token) => token.id),
  beforeIds,
  "Continuous recipes add zero native token concepts.",
);
assert.equal(store.get(dataVisContinuousOutputsAtom)[0].status, "ready");
assert.ok(
  colorFoundationParameters(store.get(colorSystemDocumentAtom)).some(
    (record) => record.id.startsWith(`data-vis/${sequenceId}`) && record.edited,
  ),
);
store.set(editDataVisPointAtom, {
  scaleId: sequenceId,
  pointId: sequence.points[0].id,
  contrast: { value: 2.4, oppositeValue: 3.23 },
  scope: "base",
});
store.set(modeSelectionAtom, { contrast: high.id });
store.set(editDataVisPointAtom, {
  scaleId: sequenceId,
  pointId: sequence.points[0].id,
  contrast: { value: 4.88, oppositeValue: 3.23 },
  scope: "mode",
});
const rawHigh = store.get(dataVisInputDocumentAtom).dataVisScales[0];
assert.ok(rawHigh.kind !== "categorical");
assert.equal(rawHigh.points[0].contrast!.value, 4.88);
assert.equal(rawHigh.points[0].contrast!.oppositeValue, 3.23);
assert.ok(
  modeFoundationParameters(store.get(modeSetsAtom)).some(
    (record) => record.id.endsWith("dataVisContrasts") && record.edited,
  ),
);
store.set(editDataVisPointAtom, {
  scaleId: sequenceId,
  pointId: sequence.points[0].id,
  reset: "contrast",
  scope: "mode",
});
store.set(modeSelectionAtom, {});
const savedBeforeReset = structuredClone(store.get(colorSystemDocumentAtom));
store.set(editDataVisPointAtom, {
  scaleId: sequenceId,
  pointId: sequence.points[0].id,
  reset: "contrast",
  scope: "base",
});
assert.equal(
  savedBeforeReset.dataVisScales[0].kind !== "categorical" &&
    savedBeforeReset.dataVisScales[0].points[0].contrast!.oppositeValue,
  3.23,
  "Reset cannot mutate a prior snapshot through an aliased contrast object.",
);
store.set(editDataVisStructureAtom, { scaleId: sequenceId, kind: "add-point" });
assert.equal(
  store.get(colorSystemDocumentAtom).dataVisScales[0].kind !== "categorical" &&
    store.get(colorSystemDocumentAtom).dataVisScales[0].points.length,
  3,
);
const swatches = store.get(dataVisUiSwatchesAtom);
assert.ok(swatches.length);
assert.ok(
  swatches.every((swatch) =>
    base.scales.some((scale) => scale.id === swatch.source.scaleId),
  ),
);
const selected = swatches.find(
  (swatch) => swatch.source.scaleId === base.scales[0].id,
)!;
const categorical: CategoricalDataVisScale = {
  id: "categories",
  name: "Categories",
  kind: "categorical",
  members: [{ id: "first", source: selected.source }],
  preferences: {
    ...DEFAULT_CATEGORICAL_PREFERENCES,
    minimumBackgroundContrast: 1,
    minimumDeltaE: 0,
    cvdProfiles: [],
  },
};
const one = inspectPalette([selected], categorical.preferences, "#ffffff");
assert.equal(one.minimumDeltaE, null);
assert.equal(one.pairCount, 0);
const fingerprint = store.get(dataVisContextFingerprintAtom);
store.set(modeSelectionAtom, { geometry: dark.id });
assert.throws(
  () =>
    store.set(applyCategoricalDataVisAtom, {
      scale: categorical,
      fingerprint,
      acknowledgeFailures: false,
    }),
  /changed/,
);
store.set(modeSelectionAtom, {});
store.set(applyCategoricalDataVisAtom, {
  scale: categorical,
  fingerprint: store.get(dataVisContextFingerprintAtom),
  acknowledgeFailures: false,
});
const id = dataVisMemberId(categorical.id, "first");
assert.ok(store.get(browserTokenSourcesAtom).some((token) => token.id === id));
assert.ok(
  store
    .get(primitiveReferencesAtom)
    .some((reference) => reference.id === id && reference.family === "color"),
);
const native = store.get(browserTokensAtom).find((token) => token.id === id)!;
assert.equal(native.value, selected.value);
assert.equal(native.valueOverridden, false);
assert.equal(native.projection!.flat.number, 1);
assert.equal(native.projection!.flat.scaleIndex, undefined);
const sourceToken = store
  .get(browserTokensAtom)
  .find(
    (token) =>
      token.groupId === selected.source.scaleId &&
      token.value === selected.value,
  )!;
const modeKey = canonicalTokenModeKey({
  geometry: light.id,
  contrast: normal.id,
});
store.set(browserTokenEditsAtom, {
  [sourceToken.id]: {
    values: { [modeKey]: { value: "#111111", baseline: selected.value } },
  },
});
assert.equal(
  store.get(browserTokensAtom).find((token) => token.id === id)!.value,
  "#111111",
);
assert.equal(
  store.get(browserTokensAtom).find((token) => token.id === id)!
    .valueOverridden,
  false,
  "An upstream manual edit is not a direct categorical override.",
);
assert.equal(
  store.get(dataVisUiSwatchesAtom).some((swatch) => swatch.id === id),
  false,
  "Data vis outputs never enter the candidate pool.",
);
const aliases = canonicalAliasRows(
  completeAliasSource(captureSnapshot(store.get)),
);
assert.ok(
  aliases.some((row) => row.id === id && row.token.value === "#111111"),
);
const rows = buildCascadeTokenExport({
  base: store.get(colorSystemDocumentAtom),
  modeSets: store.get(modeSetsAtom),
  activeModes: [light, normal],
  activeTokens: [],
  overrides: {},
  browserEdits: store.get(browserTokenEditsAtom),
  taxonomy: store.get(taxonomyDocumentAtom),
  rules: store.get(rulesAtom),
});
assert.equal(
  new Set(
    rows.tokens
      .filter((row) => row.conceptId === tokenUuid(`concept:${id}`))
      .map((row) => row.conceptId),
  ).size,
  1,
);
assert.equal(rows.tokens.find((row) => row.uuid === id)!.value, "#111111");
assert.equal(
  rows.tokens.some((row) => row.name.colorFamily === "sequential-1"),
  false,
);
assertStoredSnapshot(captureSnapshot(store.get));
const beforeRemoval = captureSnapshot(store.get);
const blocked = store.set(removeColorScaleAtom, selected.source.scaleId);
assert.equal(blocked.ok, false);
assert.deepEqual(
  captureSnapshot(store.get),
  beforeRemoval,
  "A blocked source removal cannot clear token records or mode data.",
);
assert.throws(
  () =>
    store.set(updateColorScalePublishingAtom, {
      scaleId: selected.source.scaleId,
      hideFromPublishing: true,
    }),
  /replacement/,
);
const alias = {
  id: tokenUuid("data-vis-test-alias"),
  name: "old-category",
  $ref: id,
  contexts: aliases.filter((row) => row.id === id).map((row) => row.context),
};
store.set(aliasesAtom, { schemaVersion: 1, tokens: [alias] });
assert.throws(
  () => store.set(removeDataVisScaleAtom, categorical.id),
  /alias targets/,
);
store.set(aliasesAtom, { schemaVersion: 1, tokens: [] });
const undo = store.set(removeDataVisScaleAtom, sequenceId);
const divergingId = store.set(addContinuousDataVisAtom, "diverging");
store.set(restoreDataVisScaleAtom, undo);
assert.ok(
  store
    .get(colorSystemDocumentAtom)
    .dataVisScales.some((scale) => scale.id === divergingId),
  "Undo preserves a later unrelated recipe.",
);
const replacements = suggestionMembers(
  [swatches[1].id, selected.id],
  swatches,
  categorical.members,
  () => "new-member",
);
assert.equal(
  replacements[1].id,
  "first",
  "Source identities keep their members when reordered.",
);
assert.equal(replacements[0].id, "new-member");
assert.equal(
  isCurrentSuggestion(
    { requestId: 2, fingerprint: "new" },
    { requestId: 1, fingerprint: "old" },
  ),
  false,
);
assert.equal(
  isCurrentSuggestion(
    { requestId: 2, fingerprint: "new" },
    { requestId: 2, fingerprint: "new" },
  ),
  true,
);
store.set(previewOverridesAtom, { "color.contrastMultiplier": 1.2 });
assert.throws(
  () =>
    store.set(applyCategoricalDataVisAtom, {
      scale: categorical,
      fingerprint: store.get(dataVisContextFingerprintAtom),
      acknowledgeFailures: true,
    }),
  /saved mode/,
);
store.set(previewOverridesAtom, {});
store.set(saveEditAtom);
assert.ok(store.get(savedBrowserConceptIdsAtom).has(id));
const saved = structuredClone(store.get(editSessionSnapshotAtom));
store.set(enterEditModeAtom);
store.set(removeDataVisScaleAtom, sequenceId);
store.set(cancelEditAtom);
assert.deepEqual(store.get(editSessionSnapshotAtom), saved);
assert.ok(
  store
    .get(colorSystemDocumentAtom)
    .dataVisScales.some((scale) => scale.id === sequenceId),
);
store.set(resetAllAuthoringAtom);
assert.deepEqual(
  store.get(colorSystemDocumentAtom).dataVisScales,
  createColorDefaults().dataVisScales,
);
console.log(
  "Data vis integration: native tokens, scoped modes, stable members, source protection, exact overrides, aliases, stale Apply, Save/Cancel/reset and scoped Undo passed.",
);
