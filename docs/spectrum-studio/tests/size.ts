// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import { designSystemDefaults } from "../src/data/defaults";
import {
  changeGroupsAtom,
  resetAllChangeDataAtom,
} from "../src/features/changelog/state";
import {
  applyChangeResetPlanAtom,
  itemResetPlan,
} from "../src/features/changelog/resetPlans";
import { editModeAtom } from "../src/state/view/editMode";
import {
  cancelEditAtom,
  enterEditModeAtom,
} from "../src/features/edit-session/state";
import {
  foundationImpactSummaryAtom,
  tokenImpactSummaryAtom,
} from "../src/features/impact/state";
import { SIZE_DEFAULTS } from "../src/features/size/defaults";
import {
  generateSizeScale,
  sizeScaleIssues,
} from "../src/features/size/generate";
import { isSizeDocument } from "../src/features/size/model";
import {
  addSizeScaleAtom,
  generatedSizeAtom,
  isSizeScaleNameTaken,
  removeSizeScaleAtom,
  restoreSizeScaleAtom,
  sizeDocumentAtom,
  updateSizeScaleAtom,
} from "../src/features/size/state";
import { addScaleTypeAtom } from "../src/features/logic/scaleTypeLibrary";
import {
  deleteScaleTypeAtom,
  removeScaleTypeWithFallbackAtom,
  scaleTypeConsumersAtom,
} from "../src/features/logic/scaleTypeReferences";
import { ruleConsumersAtom } from "../src/features/logic/state";
import {
  createScaleType,
  SIZE_SCALE_TYPE_ID,
} from "../src/features/scales/scaleType";
import { browserTokensAtom } from "../src/features/tokens/browserState";
import { componentsDocumentAtom } from "../src/features/components/documentState";

const global = SIZE_DEFAULTS.scales[0];

// Defaults come from the dataset JSON.
assert.deepEqual(SIZE_DEFAULTS, designSystemDefaults.system.foundations.size);
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
    scaleTypeId: SIZE_SCALE_TYPE_ID,
    base: undefined,
    below: 2,
    above: 12,
    parameters: {},
  },
);
assert.ok(isSizeDocument(SIZE_DEFAULTS));

// Generation: a linear ramp of whole numbers with the base at step 100.
const values = generateSizeScale(global);
assert.equal(values.length, global.below + 1 + global.above);
assert.deepEqual(
  values.map((value) => value.value),
  Array.from({ length: values.length }, (_, index) => 8 * (index + 1)),
);
assert.equal(
  values.find((value) => value.index === 0)!.name,
  "size-global-100",
);
assert.equal(values.find((value) => value.index === 0)!.value, 24);
assert.ok(values.every((value) => value.name.startsWith("size-global-")));
assert.deepEqual(sizeScaleIssues(values), []);

// Scale editing, naming, and deletion.
{
  const store = createStore();
  store.set(updateSizeScaleAtom, { id: global.id, patch: { base: 16 } });
  assert.equal(
    store.get(generatedSizeAtom)[0].values.find((value) => value.index === 0)!
      .value,
    16,
  );
  assert.ok(
    isSizeScaleNameTaken(store.get(sizeDocumentAtom), " global ", "other"),
  );
  assert.ok(
    !isSizeScaleNameTaken(store.get(sizeDocumentAtom), "Global", global.id),
  );

  const addedId = store.set(addSizeScaleAtom);
  assert.equal(store.get(sizeDocumentAtom).scales.length, 2);
  const added = store
    .get(sizeDocumentAtom)
    .scales.find((scale) => scale.id === addedId)!;
  assert.ok(
    store
      .get(browserTokensAtom)
      .some((token) => token.type === "size" && token.groupId === added.id),
  );

  store.set(removeSizeScaleAtom, added.id);
  assert.equal(store.get(sizeDocumentAtom).scales.length, 1);
  store.set(restoreSizeScaleAtom, { scale: added, index: 1 });
  assert.equal(store.get(sizeDocumentAtom).scales.length, 2);
}

// Tokens: size tokens are published in the browser unless the scale is hidden.
{
  const store = createStore();
  store.set(componentsDocumentAtom, { schemaVersion: 2, components: [] });
  const sizeTokens = () =>
    store.get(browserTokensAtom).filter((token) => token.type === "size");
  assert.equal(sizeTokens().length, values.length);
  assert.ok(sizeTokens().every((token) => token.unit === "px"));
  store.set(updateSizeScaleAtom, {
    id: global.id,
    patch: { hideFromPublishing: true },
  });
  assert.equal(sizeTokens().length, 0);
}

// Change log, impact, and revert.
{
  const store = createStore();
  assert.equal(store.get(changeGroupsAtom).length, 0);
  store.set(editModeAtom, true);
  store.set(updateSizeScaleAtom, { id: global.id, patch: { base: 28 } });
  const foundations = store
    .get(changeGroupsAtom)
    .find((group) => group.id === "foundations")!;
  const item = foundations.items.find(
    (candidate) => candidate.sourceKind === "size-scale",
  )!;
  assert.deepEqual(
    item.fields.map((field) => field.key),
    ["Base"],
  );
  const sizeEdits = store
    .get(foundationImpactSummaryAtom)
    .categories.find((category) => category.category === "size")!;
  assert.equal(sizeEdits.affected.count, 1, "one authored parameter edited");
  const sizeTokens = store
    .get(tokenImpactSummaryAtom)
    .categories.find((category) => category.category === "size")!;
  assert.ok(
    sizeTokens.affected.count > 0 && sizeTokens.affected.count <= values.length,
  );
  assert.equal(
    store
      .get(foundationImpactSummaryAtom)
      .categories.find((category) => category.category === "spacing")!.affected
      .count,
    0,
  );
  store.set(applyChangeResetPlanAtom, itemResetPlan(item));
  assert.deepEqual(store.get(sizeDocumentAtom).scales, SIZE_DEFAULTS.scales);
  assert.equal(store.get(changeGroupsAtom).length, 0);

  store.set(addSizeScaleAtom);
  assert.deepEqual(
    store
      .get(changeGroupsAtom)
      .map((group) => group.id)
      .sort(),
    ["foundations", "registry", "tokens"],
  );
  store.set(resetAllChangeDataAtom);
  assert.equal(store.get(sizeDocumentAtom).scales.length, 1);
}

// Cancel in edit mode restores size.
{
  const store = createStore();
  store.set(enterEditModeAtom);
  store.set(updateSizeScaleAtom, { id: global.id, patch: { base: 30 } });
  store.set(cancelEditAtom);
  assert.equal(store.get(sizeDocumentAtom).scales[0].base, undefined);
}

// Formulas and rules: size scales are consumers; a formula in use cannot be deleted, and reverting an addition falls back to Size.
{
  const store = createStore();
  assert.ok(
    store
      .get(ruleConsumersAtom)
      .some((consumer) => consumer.label === "Size › Global"),
  );
  const custom = { ...createScaleType(), name: "Custom grid" };
  store.set(addScaleTypeAtom, custom);
  store.set(updateSizeScaleAtom, {
    id: global.id,
    patch: { scaleTypeId: custom.id },
  });
  assert.deepEqual(
    store
      .get(scaleTypeConsumersAtom)
      .filter((consumer) => consumer.scaleTypeId === custom.id)
      .map((consumer) => consumer.label),
    ["Size › Global"],
  );
  assert.equal(
    store.set(deleteScaleTypeAtom, custom.id),
    null,
    "a formula in use cannot be deleted",
  );
  store.set(removeScaleTypeWithFallbackAtom, custom.id);
  assert.equal(
    store.get(sizeDocumentAtom).scales[0].scaleTypeId,
    SIZE_SCALE_TYPE_ID,
  );
}

console.log(
  "size: generation, scale editing, tokens, change log, impact, cancel, and references passed",
);
