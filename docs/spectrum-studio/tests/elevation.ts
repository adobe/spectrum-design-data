// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import Color from "colorjs.io";
import { createStore } from "jotai";
import { ELEVATION_DEFAULTS } from "../src/features/elevation/defaults";
import { ELEVATION_LINEAR_FORMULA_ID } from "../src/features/elevation/formulas";
import {
  generateElevation,
  hasDuplicateElevationLevels,
  shadowCss,
} from "../src/features/elevation/generate";
import { resolveElevationDocument } from "../src/features/elevation/resolution";
import {
  elevationDocumentAtom,
  addShadowLayerAtom,
  updateShadowLayerAtom,
  removeShadowLayerAtom,
  restoreShadowLayerAtom,
  moveShadowLayerAtom,
  updateElevationAtom,
  updateElevationModeParameterAtom,
  setShadowModeOpacityAtom,
} from "../src/features/elevation/state";
import { editModeAtom } from "../src/state/view/editMode";
import { designSystemDefaults } from "../src/data/defaults";
import { upgradeElevationSnapshot } from "../src/features/edit-session/elevationUpgrade";
import {
  createDefaultSnapshot,
  assertStoredSnapshot,
} from "../src/features/edit-session/state";
import { browserTokenImpactRecordsAtom } from "../src/features/tokens/browserSavedState";
import { browserTokensAtom } from "../src/features/tokens/browserState";
import { modeSetsAtom } from "../src/features/modes/state";
import { buildElevationCss } from "../src/features/elevation/output";
import {
  elevationComparisonOwner,
  elevationComparisonSeries,
} from "../src/features/elevation/comparisons";
import {
  canBulkEditValue,
  parseBrowserTokenValue,
} from "../src/features/tokens/browserModel";
import {
  changeGroupsAtom,
  revertChangeItemAtom,
} from "../src/features/changelog/state";
import { taxonomyDocumentAtom } from "../src/features/taxonomy/state";
import { editFoundationNameAtom } from "../src/features/taxonomy/sourceState";
import { previewOverridesAtom } from "../src/features/modes/previewState";
import { detachFoundationModeSetAtom } from "../src/features/modes/foundationAttachments";
import { modeSelectionAtom } from "../src/features/modes/selection";
import { LEGACY_TYPOGRAPHY_METRICS } from "./fixtures/legacyTypography";
import { registeredSourceName } from "../src/features/taxonomy/naming";

const document = structuredClone(ELEVATION_DEFAULTS);
const levels = generateElevation(document);
assert.deepEqual(
  levels.map((level) => level.shadows[0].blur),
  [4, 8, 16],
);
assert.deepEqual(
  levels.map((level) => level.shadows[0].offsetY),
  [4, 8, 16],
);
assert.deepEqual(
  levels.map((level) => level.step),
  [100, 200, 300],
);
assert.equal(Number(new Color(levels[0].shadows[0].color).alpha), 0.2);
assert.deepEqual(
  generateElevation({ ...document, depth: 50 }).map(
    (level) => level.shadows[0].offsetY,
  ),
  [2, 4, 8],
);
assert.deepEqual(
  generateElevation({ ...document, depth: 0 }).map(
    (level) => level.shadows[0].blur,
  ),
  [4, 8, 16],
);
const layer = document.layers[0];
assert.deepEqual(
  generateElevation({
    ...document,
    layers: [{ ...layer, scaleTypeId: ELEVATION_LINEAR_FORMULA_ID, scale: 2 }],
  }).map((level) => level.shadows[0].blur),
  [4, 6, 8],
);
assert.deepEqual(
  generateElevation({ ...document, layers: [{ ...layer, scale: 1 }] }).map(
    (level) => level.shadows[0].blur,
  ),
  [4, 4, 4],
);
assert(
  hasDuplicateElevationLevels(
    generateElevation({ ...document, layers: [{ ...layer, scale: 1 }] }),
  ),
);
assert(!hasDuplicateElevationLevels(multipleConstantComposition()));
function multipleConstantComposition() {
  return generateElevation({
    ...document,
    layers: [
      { ...layer, scale: 1 },
      { ...layer, id: crypto.randomUUID(), label: "Changing", scale: 2 },
    ],
  });
}
assert.deepEqual(generateElevation({ ...document, layers: [] }), []);
for (const patch of [
  { scale: 0.5 },
  { base: -1 },
  { opacity: 101 },
  { base: Infinity },
  { scaleTypeId: "missing" },
]) {
  assert.throws(() =>
    generateElevation({ ...document, layers: [{ ...layer, ...patch }] }),
  );
}
assert.throws(() =>
  generateElevation({ ...document, color: "rgba(0,0,0,0.5)" }),
);
assert.throws(() => generateElevation({ ...document, above: 41 }));
assert.throws(() =>
  generateElevation({
    ...document,
    below: 3,
    layers: [{ ...layer, scaleTypeId: ELEVATION_LINEAR_FORMULA_ID }],
  }),
);
assert.throws(() =>
  generateElevation({
    ...document,
    layers: [{ ...layer, base: Number.MAX_VALUE }],
  }),
);
const extended = generateElevation({ ...document, below: 2 });
for (const level of levels)
  assert.equal(
    extended.find((candidate) => candidate.index === level.index)?.id,
    level.id,
  );
const negative = generateElevation({ ...document, below: 1 })[0];
assert.equal(
  generateElevation({ ...document, below: 2 }).find(
    (level) => level.index === -1,
  )?.id,
  negative.id,
);
const multiple = generateElevation({
  ...document,
  layers: [
    layer,
    { ...layer, id: crypto.randomUUID(), label: "Second", base: 2 },
  ],
});
assert.equal(multiple.length, 3);
assert.equal(multiple[0].id, levels[0].id);
assert.equal(multiple[0].shadows.length, 2);
assert.equal(shadowCss(multiple[0]).split(", ").length, 2);
const sets = structuredClone(designSystemDefaults.system.modeSets);
const dark = sets[0].modes.find((mode) => mode.id === "mode-dark")!;
assert.equal(
  generateElevation(resolveElevationDocument(document, [dark], sets))[0]
    .shadows[0].opacity,
  0.5,
);
assert.equal(
  generateElevation(
    resolveElevationDocument(document, [sets[0].modes[0]], sets),
  )[0].shadows[0].opacity,
  0.2,
);
const store = createStore();
assert.equal(
  store.get(browserTokensAtom).filter((token) => token.type === "elevation")
    .length,
  3,
);
assert.equal(
  store
    .get(browserTokenImpactRecordsAtom)
    .filter((record) => record.category === "elevation")
    .flatMap((record) => record.modeValues).length,
  6,
);
assert.equal(store.get(changeGroupsAtom).length, 0);
const token = store
  .get(browserTokensAtom)
  .find((token) => token.type === "elevation")!;
assert(!canBulkEditValue([token]));
assert.throws(() => parseBrowserTokenValue(token, "8"), /Elevation/);
const css = buildElevationCss(
  document,
  designSystemDefaults.system.taxonomy,
  sets,
);
assert(css.includes("--surface-shadow-100: 0 4px 4px 0"));
assert(css.includes('[data-color-scheme="light"]'));
assert(css.includes('[data-color-scheme="dark"]'));
assert.equal(
  buildElevationCss(
    { ...document, hideFromPublishing: true },
    designSystemDefaults.system.taxonomy,
    sets,
  ),
  "",
);
assert.equal(
  buildElevationCss(
    { ...document, layers: [] },
    designSystemDefaults.system.taxonomy,
    sets,
  ),
  "",
);
assert.equal(elevationComparisonOwner("blur", sets), undefined);
assert.equal(elevationComparisonOwner("opacity", sets)?.id, sets[0].id);
const comparison = elevationComparisonSeries(
  document,
  sets,
  [dark],
  "opacity",
  [layer.id],
  true,
  [dark.id],
);
assert.equal(comparison.length, 2);
assert.deepEqual(
  comparison.map((line) => line.points[0].value),
  [20, 50],
);
const extra = structuredClone(sets[1]);
extra.id = "unrelated-axis";
extra.key = "unrelated";
extra.authoringCapabilities = [];
store.set(modeSetsAtom, [...store.get(modeSetsAtom), extra]);
assert.equal(
  store
    .get(browserTokenImpactRecordsAtom)
    .filter((record) => record.category === "elevation")
    .flatMap((record) => record.modeValues).length,
  6,
  "An unrelated axis cannot multiply shadow mode values.",
);
store.set(modeSetsAtom, structuredClone(sets));
assert.throws(() => store.set(addShadowLayerAtom));
store.set(editModeAtom, true);
const added = store.set(addShadowLayerAtom);
store.set(updateShadowLayerAtom, {
  id: added,
  patch: { label: "Ambient", base: 2 },
});
assert.equal(
  store
    .get(browserTokenImpactRecordsAtom)
    .filter((record) => record.category === "elevation").length,
  3,
  "Adding layers changes values, not concepts.",
);
store.set(moveShadowLayerAtom, { id: added, direction: -1 });
assert.equal(store.get(elevationDocumentAtom).layers[0].id, added);
const removed = store.set(removeShadowLayerAtom, layer.id);
store.set(restoreShadowLayerAtom, removed);
assert.equal(
  store.get(elevationDocumentAtom).layers[removed.index].id,
  layer.id,
);
while (store.get(elevationDocumentAtom).layers.length < 8)
  store.set(addShadowLayerAtom);
assert.throws(() => store.set(addShadowLayerAtom));
const older = createDefaultSnapshot();
delete older.elevation;
const missingGroups = new Set(["element", "attribute"]);
const removedCategories = new Set(
  older
    .taxonomy!.categories.filter((category) => missingGroups.has(category.key))
    .map((category) => category.id),
);
older.taxonomy!.categories = older.taxonomy!.categories.filter(
  (category) => !removedCategories.has(category.id),
);
older.taxonomy!.order = older.taxonomy!.order.filter(
  (id) => !removedCategories.has(id),
);
older.taxonomy!.terms = older.taxonomy!.terms.filter(
  (term) => !removedCategories.has(term.categoryId),
);
for (const [metric, termId] of LEGACY_TYPOGRAPHY_METRICS) {
  const categoryId = "3b8d399b-9a38-4c85-b3da-fa242530b721";
  older.taxonomy!.terms.push({
    id: termId,
    categoryId,
    value: metric,
    description: "",
  });
  older.typography.metricNames[metric] = { categoryId, termId };
  assert.equal(
    registeredSourceName(
      older.taxonomy!,
      older.typography.metricNames[metric],
      "typography",
    ),
    metric,
  );
}
const serialized = JSON.stringify(older);
const upgraded = upgradeElevationSnapshot(older, 2);
assert.deepEqual(upgraded.elevation?.name, document.name);
for (const [categoryId, termId] of Object.entries(
  document.name.classification!,
)) {
  assert(
    upgraded.taxonomy!.categories.some(
      (category) =>
        category.id === categoryId && category.scopes.includes("elevation"),
    ),
  );
  assert(
    upgraded.taxonomy!.terms.some(
      (term) => term.id === termId && term.categoryId === categoryId,
    ),
    "Adding Elevation to an old catalog installs all explicit name dependencies.",
  );
}
const completeUpgrade = upgradeElevationSnapshot(
  { ...createDefaultSnapshot(), elevation: undefined },
  2,
);
assertStoredSnapshot(completeUpgrade);
assert.equal(
  JSON.stringify(older),
  serialized,
  "Upgrade reads must not mutate old data.",
);
assert.deepEqual(upgraded.radius, older.radius);
const missingScheme = structuredClone(older);
missingScheme.modeSets = missingScheme.modeSets.filter(
  (set) => set.key !== "colorScheme",
);
assert.equal(
  upgradeElevationSnapshot(missingScheme, 2).modeSets.length,
  missingScheme.modeSets.length,
);
assert.throws(() => assertStoredSnapshot(older), /incomplete/);
const revertStore = createStore();
revertStore.set(editModeAtom, true);
revertStore.set(addShadowLayerAtom);
const change = revertStore
  .get(changeGroupsAtom)
  .flatMap((group) => group.items)
  .find((item) => item.sourceKind === "elevation")!;
assert(change);
revertStore.set(revertChangeItemAtom, change);
assert.deepEqual(revertStore.get(elevationDocumentAtom), ELEVATION_DEFAULTS);
const emptyStore = createStore();
emptyStore.set(editModeAtom, true);
emptyStore.set(removeShadowLayerAtom, layer.id);
emptyStore.set(updateElevationAtom, { above: 40 });
emptyStore.set(addShadowLayerAtom);
assert.equal(
  emptyStore
    .get(browserTokensAtom)
    .filter((token) => token.type === "elevation").length,
  41,
  "The first layer registers steps after editing an empty range.",
);
assert(
  emptyStore
    .get(taxonomyDocumentAtom)
    .terms.some((term) => term.value === 4100),
);
const modeStore = createStore();
modeStore.set(editModeAtom, true);
modeStore.set(updateElevationAtom, { above: 0 });
modeStore.set(updateShadowLayerAtom, {
  id: layer.id,
  patch: { base: Number.MAX_VALUE },
});
modeStore.set(modeSelectionAtom, { colorScheme: dark.id });
assert.throws(
  () =>
    modeStore.set(updateElevationModeParameterAtom, {
      parameterId: "elevation.depth",
      value: 200,
    }),
  /could not be calculated/,
);
assert.equal(
  modeStore.get(modeSetsAtom)[0].modes[1].foundations.elevation?.depth,
  undefined,
  "Rejected mode edits are atomic.",
);
modeStore.set(updateShadowLayerAtom, { id: layer.id, patch: { base: 4 } });
modeStore.set(updateElevationModeParameterAtom, {
  parameterId: "elevation.depth",
  value: 200,
});
assert.throws(
  () =>
    modeStore.set(updateShadowLayerAtom, {
      id: layer.id,
      patch: { base: Number.MAX_VALUE },
    }),
  /could not be calculated/,
);
assert.equal(
  modeStore.get(elevationDocumentAtom).layers[0].base,
  4,
  "A layer cannot invalidate a different mode.",
);
modeStore.set(setShadowModeOpacityAtom, {
  modeSetId: sets[0].id,
  modeId: dark.id,
  layerId: layer.id,
  opacity: 60,
});
const savedOpacity =
  modeStore.get(modeSetsAtom)[0].modes[1].foundations.elevation!
    .layerOpacities![layer.id];
const previewBaseline = structuredClone(modeStore.get(elevationDocumentAtom));
modeStore.set(previewOverridesAtom, { "elevation.depth": 50 });
assert.deepEqual(modeStore.get(elevationDocumentAtom), previewBaseline);
assert.equal(
  modeStore.get(modeSetsAtom)[0].modes[1].foundations.elevation!
    .layerOpacities![layer.id],
  savedOpacity,
);
const offsetLines = elevationComparisonSeries(
  previewBaseline,
  modeStore.get(modeSetsAtom),
  [dark],
  "offsetY",
  [layer.id],
  true,
  [dark.id],
  { "elevation.depth": 50 },
);
assert.deepEqual(
  offsetLines.map((line) => line.points[0].value),
  [4, 8],
  "Named comparisons discard temporary overrides only for the compared parameter.",
);
const preservedColor = structuredClone(
  modeStore.get(modeSetsAtom)[0].modes[1].foundations.color,
);
modeStore.set(detachFoundationModeSetAtom, {
  modeSetId: sets[0].id,
  foundation: "elevation",
});
assert.equal(
  modeStore.get(modeSetsAtom)[0].modes[1].foundations.elevation,
  undefined,
);
assert.deepEqual(
  modeStore.get(modeSetsAtom)[0].modes[1].foundations.color,
  preservedColor,
);
assert.equal(modeStore.get(previewOverridesAtom)["elevation.depth"], undefined);
const renameStore = createStore();
renameStore.set(editModeAtom, true);
const beforeRename = renameStore
  .get(browserTokensAtom)
  .filter((token) => token.type === "elevation");
renameStore.set(editFoundationNameAtom, {
  id: `elevation:${document.id}`,
  value: "Layered depth",
});
const afterRename = renameStore
  .get(browserTokensAtom)
  .filter((token) => token.type === "elevation");
assert.deepEqual(
  afterRename.map((token) => [token.id, token.value]),
  beforeRename.map((token) => [token.id, token.value]),
);
assert(afterRename.every((token) => token.name.startsWith("layered-depth-")));
assert.deepEqual(
  renameStore.get(elevationDocumentAtom),
  document,
  "Names project from Registry without changing source or layer identities.",
);
const tokenRevertStore = createStore();
tokenRevertStore.set(editModeAtom, true);
const newLayerId = tokenRevertStore.set(addShadowLayerAtom);
assert.equal(
  resolveElevationDocument(
    tokenRevertStore.get(elevationDocumentAtom),
    [dark],
    sets,
  ).layers.find((layer) => layer.id === newLayerId)!.opacity,
  20,
  "New layers do not acquire invented Dark overrides.",
);
const modifiedModes = structuredClone(tokenRevertStore.get(modeSetsAtom));
modifiedModes[0].modes[1].foundations.color!.backgroundLightness = 0.25;
tokenRevertStore.set(modeSetsAtom, modifiedModes);
tokenRevertStore.set(setShadowModeOpacityAtom, {
  modeSetId: sets[0].id,
  modeId: dark.id,
  layerId: layer.id,
  opacity: 60,
});
const generatedChange = tokenRevertStore
  .get(changeGroupsAtom)
  .flatMap((group) => group.items)
  .find((item) => item.topic === "tokens" && item.id.startsWith("elevation-"))!;
assert(generatedChange);
tokenRevertStore.set(revertChangeItemAtom, generatedChange);
assert.deepEqual(tokenRevertStore.get(elevationDocumentAtom), document);
assert.equal(
  tokenRevertStore.get(modeSetsAtom)[0].modes[1].foundations.elevation!
    .layerOpacities![layer.id],
  50,
);
assert.equal(
  tokenRevertStore.get(modeSetsAtom)[0].modes[1].foundations.color!
    .backgroundLightness,
  0.25,
  "Generated-shadow revert preserves other foundations.",
);
console.log(
  "Elevation math, identity, mode, lifecycle and upgrade checks passed.",
);
