// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import {
  availableSwatchIndices,
  assertSwatchIndices,
  parseScaleIndex,
  reindexSwatches,
  swatchIndex,
  swatchIndexOptions,
} from "../src/features/scales/swatchIndices";
import { editModeAtom } from "../src/state/view/editMode";
import { previewOverridesAtom } from "../src/features/modes/previewState";
import { modeSelectionAtom } from "../src/features/modes/selection";
import { modeSetsAtom } from "../src/features/modes/state";
import { taxonomyDocumentAtom } from "../src/features/taxonomy/state";
import {
  addContrastTokenAtom,
  colorSystemDocumentAtom,
  sortContrastTokensAtom,
  updateContrastIndexAtom,
} from "../src/features/color-system/state";
import { editCustomContrastsAtom } from "../src/features/color-system/customContrastState";
import { contrastStepIndex } from "../src/features/color-system/contrastSteps";
import { isColorSystemDocument } from "../src/features/color-system/model";
import {
  addOpacityLevelAtom,
  opacityDocumentAtom,
  opacityResultAtom,
  opacitySourceAtom,
  removeOpacityLevelAtom,
  restoreOpacityLevelAtom,
  sortOpacityLevelsAtom,
  updateOpacityIndexAtom,
} from "../src/features/opacity/state";
import { isOpacityDocument } from "../src/features/opacity/model";
import { opacityChanges } from "../src/features/opacity/changes";
import { browserTokenEditsAtom } from "../src/features/tokens/browserEdits";
import { buildOpacityCss, opacityRows } from "../src/features/opacity/output";
import { buildColorLibrary } from "../src/features/color-system/cssLibrary";
import { buildCascadeTokenExport } from "../src/features/tokens/cascadeExport";
import { aliasesAtom } from "../src/features/tokens/aliasState";
import {
  resolveOpacity,
  opacityContexts,
} from "../src/features/opacity/generation";
import { generateColorTokensForScale } from "../src/features/tokens/generation";
import { resolvedBackgroundLinear } from "../src/features/color-system/surfaceGeneration";
import { resolveColorScaleDocument } from "../src/features/color-system/colorScaleResolution";
import { colorFoundationParameters } from "../src/features/impact/sources/colorFoundation";
import { rulesAtom } from "../src/features/logic/library";
import {
  authoringSnapshotAtom,
  createDefaultSnapshot,
  restoreAuthoringSnapshotAtom,
  editSessionSnapshotAtom,
  saveEditAtom,
  cancelEditAtom,
} from "../src/features/edit-session/state";
import { compareAuthoring } from "../src/features/changelog/registry";
import {
  prepareChangeReset,
  sourceResetPlan,
} from "../src/features/changelog/resetPlans";

assert.deepEqual(
  availableSwatchIndices([100, 500, 550, 600], [500, 600, 1700], 1700),
  [100, 550, 1700],
);
assert.deepEqual(
  swatchIndexOptions([500, 550, 600], [500, 600, 1700], 1700).map(
    (option) => option.id,
  ),
  ["550", "1700"],
);
assert.equal(parseScaleIndex(" 550 "), 550);
assert.equal(parseScaleIndex("12.5"), 12.5);
assert.equal(parseScaleIndex(".25"), 0.25);
for (const value of [
  "",
  " ",
  "no",
  "Infinity",
  "-1",
  "0",
  "0x100",
  "1e3",
  "550abc",
  "5 50",
  ".",
])
  assert.throws(() => parseScaleIndex(value), /positive/);
assert.throws(() => assertSwatchIndices([100, 100]), /already used/);
assert.throws(
  () => reindexSwatches([{ id: "one" }], "missing", 550),
  /no longer/,
);

function editingStore() {
  const store = createStore();
  store.set(editModeAtom, true);
  return store;
}
const shared = editingStore();
const color = shared.get(colorSystemDocumentAtom);
const neighborIndices = new Map(
  color.contrasts.map((step, position) => [
    step.id,
    swatchIndex(step, position),
  ]),
);
const target = color.contrasts.at(-1)!;
assert.ok(
  color.contrasts.some((step, index) => swatchIndex(step, index) === 500),
);
assert.ok(
  color.contrasts.some((step, index) => swatchIndex(step, index) === 600),
);
const rules = shared.get(rulesAtom);
const scale = color.scales.find((item) => !item.customContrasts)!;
const tokensFor = (document: typeof color) =>
  generateColorTokensForScale(
    document.scales.find((item) => item.id === scale.id)!,
    document.contrasts,
    resolvedBackgroundLinear(document),
    document.settings,
    document.settings.colorOutput,
    rules,
  );
const beforeTokens = new Map(
  tokensFor(color).map((token) => [token.uuid, token.value]),
);
const edits = shared.get(browserTokenEditsAtom);
const aliases = shared.get(aliasesAtom);
shared.set(updateContrastIndexAtom, { id: target.id, scaleIndex: 550 });
const reindexed = shared.get(colorSystemDocumentAtom);
assert.deepEqual(
  reindexed.contrasts.map(swatchIndex),
  [...neighborIndices.values()]
    .filter((value) => value !== neighborIndices.get(target.id))
    .concat(550)
    .sort((a, b) => a - b),
);
assert.equal(reindexed.contrasts[5].id, target.id);
for (const step of reindexed.contrasts) {
  assert.equal(
    step.value,
    color.contrasts.find((item) => item.id === step.id)!.value,
  );
  if (step.id !== target.id)
    assert.equal(step.scaleIndex, neighborIndices.get(step.id));
}
for (const token of tokensFor(reindexed))
  assert.equal(token.value, beforeTokens.get(token.uuid));
const sharedCss = buildColorLibrary(
  reindexed,
  [],
  [],
  shared.get(taxonomyDocumentAtom),
  rules,
);
assert.ok(sharedCss.includes("--contrast-550:"));
assert.ok(sharedCss.includes("color-contrast-550"));
const cascade = buildCascadeTokenExport({
  base: reindexed,
  modeSets: [],
  activeModes: [],
  activeTokens: [],
  overrides: {},
  taxonomy: shared.get(taxonomyDocumentAtom),
  rules,
});
assert.ok(
  cascade.tokens.some(
    (row) => row.name.property === "color" && row.name.scaleIndex === 550,
  ),
);
assert.ok(
  cascade.tokens.some(
    (row) =>
      row.name.property === "contrast-ratio" &&
      row.name.contrastValue === "550",
  ),
);
assert.equal(
  tokensFor(reindexed).find((token) => token.name.contrastValue === "550")
    ?.source.contrastId,
  target.id,
);
assert.deepEqual(shared.get(browserTokenEditsAtom), edits);
assert.deepEqual(shared.get(aliasesAtom), aliases);
assert.ok(
  shared.get(taxonomyDocumentAtom).terms.some((term) => term.value === 550),
);
for (const value of [500, 0, -1, NaN, Infinity]) {
  const before = shared.get(authoringSnapshotAtom);
  assert.throws(
    () =>
      shared.set(updateContrastIndexAtom, { id: target.id, scaleIndex: value }),
    /already used|positive/,
  );
  assert.deepEqual(shared.get(authoringSnapshotAtom), before);
}
shared.set(sortContrastTokensAtom);
assert.equal(
  shared
    .get(colorSystemDocumentAtom)
    .contrasts.find((step) => step.id === target.id)!.scaleIndex,
  550,
);
shared.set(addContrastTokenAtom);
assertSwatchIndices(
  shared.get(colorSystemDocumentAtom).contrasts.map(swatchIndex),
);
assert.ok(isColorSystemDocument(reindexed));
assert.equal(
  isColorSystemDocument({
    ...reindexed,
    contrasts: [{ ...target, scaleIndex: -1 }],
  }),
  false,
);
assert.ok(
  colorFoundationParameters(reindexed).some(
    (item) => item.id.endsWith("/scaleIndex") && item.edited,
  ),
);
assert.equal(
  colorFoundationParameters(reindexed).filter(
    (item) => item.id.endsWith("/scaleIndex") && item.edited,
  ).length,
  1,
);
const sharedComparison = compareAuthoring(createDefaultSnapshot(), {
  ...shared.get(authoringSnapshotAtom),
  colorSystem: reindexed,
});
assert.equal(
  sharedComparison.slots.filter(
    (slot) => slot.category === "color" && slot.changed,
  ).length,
  1,
);

const customStore = editingStore();
const initialCustomDocument = customStore.get(colorSystemDocumentAtom);
const customScale = initialCustomDocument.scales.find(
  (item) => item.customContrasts,
)!;
const custom = customScale.customContrasts!;
const customTarget = custom.steps.at(-1)!;
const initialCustomIndices = new Map(
  custom.steps.map((step, position) => [
    step.id,
    contrastStepIndex(position, customScale, rules),
  ]),
);
customStore.set(editCustomContrastsAtom, {
  kind: "index",
  scaleId: customScale.id,
  stepId: customTarget.id,
  scaleIndex: 550,
});
const indexedCustom = customStore
  .get(colorSystemDocumentAtom)
  .scales.find((item) => item.id === customScale.id)!;
assert.equal(
  indexedCustom.customContrasts!.baseContrastId,
  custom.baseContrastId,
);
assert.equal(
  indexedCustom.customContrasts!.steps.find(
    (step) => step.id === customTarget.id,
  )!.scaleIndex,
  550,
);
for (const step of indexedCustom.customContrasts!.steps) {
  assert.equal(
    step.value,
    custom.steps.find((item) => item.id === step.id)!.value,
  );
  if (step.id !== customTarget.id)
    assert.equal(step.scaleIndex, initialCustomIndices.get(step.id));
}
assert.deepEqual(
  customStore.get(colorSystemDocumentAtom).contrasts,
  initialCustomDocument.contrasts,
);
assert.deepEqual(
  customStore
    .get(colorSystemDocumentAtom)
    .scales.filter((item) => item.id !== customScale.id),
  initialCustomDocument.scales.filter((item) => item.id !== customScale.id),
);
const customBeforeDuplicate = customStore.get(authoringSnapshotAtom);
assert.throws(
  () =>
    customStore.set(editCustomContrastsAtom, {
      kind: "index",
      scaleId: customScale.id,
      stepId: customTarget.id,
      scaleIndex: 500,
    }),
  /already used/,
);
assert.deepEqual(customStore.get(authoringSnapshotAtom), customBeforeDuplicate);
assert.throws(
  () =>
    customStore.set(editCustomContrastsAtom, {
      kind: "disable",
      scaleId: customScale.id,
    }),
  /no longer published or available/,
  "Existing dependent components still protect custom-only swatches.",
);
const withoutDependents = customStore.get(authoringSnapshotAtom);
withoutDependents.components = {
  ...withoutDependents.components!,
  components: [],
};
customStore.set(restoreAuthoringSnapshotAtom, withoutDependents);
customStore.set(editCustomContrastsAtom, {
  kind: "disable",
  scaleId: customScale.id,
});
assert.equal(
  customStore
    .get(colorSystemDocumentAtom)
    .scales.find((item) => item.id === customScale.id)!
    .disabledCustomContrasts!.steps.find((step) => step.id === customTarget.id)!
    .scaleIndex,
  550,
);
customStore.set(editCustomContrastsAtom, {
  kind: "enable",
  scaleId: customScale.id,
});
customStore.set(editCustomContrastsAtom, {
  kind: "add",
  scaleId: customScale.id,
});
assertSwatchIndices(
  customStore
    .get(colorSystemDocumentAtom)
    .scales.find((item) => item.id === customScale.id)!
    .customContrasts!.steps.map(swatchIndex),
);

const opacityStore = editingStore();
const initialOpacity = opacityStore.get(opacityDocumentAtom);
const opacityId = initialOpacity.levels.at(-1)!.id;
const initialSource = opacityStore.get(opacitySourceAtom);
const originalContexts = opacityContexts(initialSource).map((context) => ({
  ...context,
  values: new Map(
    resolveOpacity(initialSource, context.modes).levels.map((level) => [
      level.id,
      level,
    ]),
  ),
}));
opacityStore.set(updateOpacityIndexAtom, { id: opacityId, scaleIndex: 550 });
const indexedOpacity = opacityStore.get(opacityDocumentAtom);
assert.equal(
  opacityRows(opacityStore.get(opacitySourceAtom)).find(
    (row) => row.conceptId === opacityId,
  )!.scaleIndex,
  550,
);
assert.ok(
  buildOpacityCss(
    opacityStore.get(opacitySourceAtom),
    opacityStore.get(taxonomyDocumentAtom),
  ).includes("--opacity-550:"),
);
assert.equal(indexedOpacity.levels[5].id, opacityId);
for (const level of indexedOpacity.levels) {
  const original = initialOpacity.levels.find((item) => item.id === level.id)!;
  assert.equal(level.value, original.value);
  assert.deepEqual(level.rows, original.rows);
}
for (const context of originalContexts)
  for (const level of resolveOpacity(
    opacityStore.get(opacitySourceAtom),
    context.modes,
  ).levels) {
    assert.equal(level.value, context.values.get(level.id)!.value);
    assert.equal(level.uuid, context.values.get(level.id)!.uuid);
    if (level.id === opacityId) {
      assert.equal(level.name, "opacity-550");
      assert.equal(level.scaleIndex, 550);
    }
  }
for (const value of [500, 0, NaN, Infinity]) {
  const before = opacityStore.get(authoringSnapshotAtom);
  assert.throws(
    () =>
      opacityStore.set(updateOpacityIndexAtom, {
        id: opacityId,
        scaleIndex: value,
      }),
    /already used|positive/,
  );
  assert.deepEqual(opacityStore.get(authoringSnapshotAtom), before);
}
const linked = resolveColorScaleDocument(
  {
    ...opacityStore.get(colorSystemDocumentAtom),
    settings: {
      ...opacityStore.get(colorSystemDocumentAtom).settings,
      colorScaleType: "transparent",
      syncDefaultStopsWithOpacity: true,
    },
  },
  [],
  undefined,
  {
    opacity: indexedOpacity,
    modeSets: opacityStore.get(modeSetsAtom),
  },
);
assert.equal(
  linked.contrasts.find((step) => step.id === opacityId)?.scaleIndex,
  550,
);
const linkedScale = linked.scales.find((item) => !item.customContrasts)!;
assert.equal(contrastStepIndex(5, linkedScale, rules, linked.contrasts), 550);
const added = opacityStore.set(addOpacityLevelAtom);
assertSwatchIndices(
  opacityStore.get(opacityDocumentAtom).levels.map(swatchIndex),
);
const removed = opacityStore.set(removeOpacityLevelAtom, added);
opacityStore.set(restoreOpacityLevelAtom, removed);
assert.equal(
  opacityStore
    .get(opacityDocumentAtom)
    .levels.find((level) => level.id === added)!.scaleIndex,
  removed.level.scaleIndex,
);
opacityStore.set(sortOpacityLevelsAtom);
assert.equal(
  opacityStore
    .get(opacityDocumentAtom)
    .levels.find((level) => level.id === opacityId)!.scaleIndex,
  550,
);
assert.ok(isOpacityDocument(indexedOpacity));
assert.equal(
  isOpacityDocument({
    ...indexedOpacity,
    levels: [{ ...indexedOpacity.levels[0], scaleIndex: Infinity }],
  }),
  false,
);

const shipped = createDefaultSnapshot();
const collisionSnapshot = opacityStore.get(authoringSnapshotAtom);
const collisionField = compareAuthoring(shipped, collisionSnapshot)
  .groups.flatMap((group) => group.items)
  .flatMap((item) => item.fields)
  .find(
    (field) =>
      field.address?.path[0] === "opacity" &&
      field.address.path.at(-1) === "scaleIndex" &&
      field.after === "550",
  )!;
assert.throws(
  () =>
    prepareChangeReset(
      { ...collisionSnapshot, attachments: {} },
      sourceResetPlan("Colliding reset", [collisionField.address!]),
    ),
  /already used/,
);
assert.deepEqual(opacityStore.get(authoringSnapshotAtom), collisionSnapshot);
opacityStore.set(removeOpacityLevelAtom, added);
const snapshot = opacityStore.get(authoringSnapshotAtom);
const field = compareAuthoring(shipped, snapshot)
  .groups.flatMap((group) => group.items)
  .flatMap((item) => item.fields)
  .find(
    (field) =>
      field.address?.path[0] === "opacity" &&
      field.address.path.at(-1) === "scaleIndex" &&
      field.after === "550",
  )!;
assert.ok(field.address);
const fieldAddress = field.address;
assert.equal(field.afterPreview, undefined);
assert.equal(
  compareAuthoring(shipped, snapshot).slots.filter(
    (slot) =>
      slot.category === "opacity" &&
      slot.changed &&
      slot.id.includes("scaleIndex"),
  ).length,
  1,
);
const legacyIndexField = opacityChanges(
  shipped.opacity,
  snapshot.opacity,
)[0].fields.find((field) => field.key.endsWith(`${opacityId}/scaleIndex`))!;
assert.equal(legacyIndexField.address?.path.at(-1), "scaleIndex");
assert.equal(legacyIndexField.afterPreview, undefined);
const reset = prepareChangeReset(
  { ...snapshot, attachments: {} },
  sourceResetPlan("Restore index", [field.address]),
);
const originalPosition = shipped.opacity!.levels.findIndex(
  (level) => level.id === opacityId,
);
assert.equal(
  reset.opacity!.levels.find((level) => level.id === opacityId)!.scaleIndex,
  (originalPosition + 1) * 100,
);
assert.equal(
  reset.opacity!.levels.find((level) => level.id === opacityId)!.value,
  indexedOpacity.levels.find((level) => level.id === opacityId)!.value,
);
assert.equal(
  compareAuthoring(shipped, {
    ...snapshot,
    opacity: reset.opacity,
  }).slots.filter(
    (slot) =>
      slot.category === "opacity" &&
      slot.changed &&
      slot.id.includes("scaleIndex"),
  ).length,
  0,
);
assert.throws(
  () =>
    prepareChangeReset(
      { ...reset, attachments: {} },
      sourceResetPlan("Stale", [fieldAddress]),
    ),
  /updated/,
);
const reloaded = createStore();
reloaded.set(
  restoreAuthoringSnapshotAtom,
  JSON.parse(JSON.stringify(snapshot)),
);
assert.deepEqual(reloaded.get(opacityDocumentAtom), snapshot.opacity);
assert.deepEqual(
  reloaded
    .get(opacityResultAtom)
    .levels.map((level) => [level.id, level.scaleIndex]),
  opacityStore
    .get(opacityResultAtom)
    .levels.map((level) => [level.id, level.scaleIndex]),
);
const old = createStore();
old.set(restoreAuthoringSnapshotAtom, shipped);
assert.deepEqual(old.get(opacityDocumentAtom), shipped.opacity);
const saved = editingStore();
saved.set(editSessionSnapshotAtom, createDefaultSnapshot());
saved.set(updateOpacityIndexAtom, { id: opacityId, scaleIndex: 550 });
saved.set(updateContrastIndexAtom, { id: target.id, scaleIndex: 550 });
saved.set(saveEditAtom);
const savedBaseline = saved.get(editSessionSnapshotAtom)!;
assert.equal(
  savedBaseline.opacity!.levels.find((level) => level.id === opacityId)!
    .scaleIndex,
  550,
);
assert.equal(
  savedBaseline.colorSystem.contrasts.find((step) => step.id === target.id)!
    .scaleIndex,
  550,
);
saved.set(editModeAtom, true);
saved.set(updateOpacityIndexAtom, { id: opacityId, scaleIndex: 525 });
saved.set(updateContrastIndexAtom, { id: target.id, scaleIndex: 525 });
saved.set(cancelEditAtom);
assert.equal(
  saved.get(opacityDocumentAtom).levels.find((level) => level.id === opacityId)!
    .scaleIndex,
  550,
);
assert.equal(
  saved
    .get(colorSystemDocumentAtom)
    .contrasts.find((step) => step.id === target.id)!.scaleIndex,
  550,
);

const locked = createStore();
assert.throws(
  () => locked.set(updateOpacityIndexAtom, { id: opacityId, scaleIndex: 550 }),
  /edit mode/,
);
assert.throws(
  () => locked.set(updateContrastIndexAtom, { id: target.id, scaleIndex: 550 }),
  /edit mode/,
);
locked.set(editModeAtom, true);
locked.set(previewOverridesAtom, { "color.backgroundLightness": 0.3 });
assert.throws(
  () => locked.set(updateOpacityIndexAtom, { id: opacityId, scaleIndex: 550 }),
  /saved mode/,
);
assert.throws(
  () => locked.set(updateContrastIndexAtom, { id: target.id, scaleIndex: 550 }),
  /default Color modes/,
);
locked.set(previewOverridesAtom, {});
locked.set(modeSelectionAtom, { colorScheme: "mode-dark" });
assert.throws(
  () =>
    locked.set(editCustomContrastsAtom, {
      kind: "index",
      scaleId: customScale.id,
      stepId: customTarget.id,
      scaleIndex: 550,
    }),
  /reference color scheme/,
);
console.log(
  "Swatch indices: filtering, validation, atomic edits, ordering, stable identities/values, linked colors, Changes, reset and snapshot round trips pass.",
);
