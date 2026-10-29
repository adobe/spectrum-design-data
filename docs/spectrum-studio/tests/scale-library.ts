// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import {
  changeGroupsAtom,
  resetAllChangeDataAtom,
  revertChangeItemAtom,
} from "../src/features/changelog/state";
import {
  cancelEditAtom,
  enterEditModeAtom,
} from "../src/features/edit-session/state";
import { foundationImpactSummaryAtom } from "../src/features/impact/state";
import {
  addInterpolationAtom,
  addScaleTypeAtom,
  interpolationsAtom,
  INTERPOLATION_DEFAULTS,
  isInterpolationList,
  isScaleTypeList,
  normalizeLogicLibraryAtom,
  removeInterpolationAtom,
  removeScaleTypeAtom,
  replaceInterpolationAtom,
  replaceScaleTypeAtom,
  restoreScaleTypeAtom,
  SCALE_TYPE_DEFAULTS,
  scaleTypesAtom,
} from "../src/features/logic/scaleTypeLibrary";
import { createInterpolation } from "../src/features/scales/interpolationDefinition";
import {
  interpolationConsumersAtom,
  normalizeInterpolationReferencesAtom,
  removeInterpolationWithFallbackAtom,
  restoreInterpolationWithConsumersAtom,
} from "../src/features/logic/interpolationReferences";
import {
  generatedTypographyAtom,
  typographyDocumentAtom,
  updateTypographyAtom,
} from "../src/features/typography/state";
import {
  createScaleType,
  SPACING_SCALE_TYPE_ID,
} from "../src/features/scales/scaleType";
import {
  deleteScaleTypeAtom,
  normalizeLockedBindingsAtom,
} from "../src/features/logic/scaleTypeReferences";
import { createBinding } from "../src/features/scales/binding";
import { BINDABLE_PARAMETER_RANGES } from "../src/features/modes/parameters";
import { spacingDocumentAtom } from "../src/features/spacing/state";

function logicItems(store: ReturnType<typeof createStore>) {
  return (
    store.get(changeGroupsAtom).find((group) => group.id === "logic")?.items ??
    []
  );
}

// Defaults ship the starting formulas; none are locked.
assert.deepEqual(
  createStore()
    .get(scaleTypesAtom)
    .map((scaleType) => scaleType.id),
  SCALE_TYPE_DEFAULTS.map((scaleType) => scaleType.id),
);
assert.ok(SCALE_TYPE_DEFAULTS.every((scaleType) => !scaleType.locked));
assert.ok(
  SCALE_TYPE_DEFAULTS.every(
    (scaleType) =>
      scaleType.base.overridable &&
      scaleType.parameters.every(
        (parameter) => parameter.overridable && parameter.adaptable,
      ),
  ),
  "shipped formulas allow every override and stay adaptive",
);
assert.ok(isScaleTypeList(SCALE_TYPE_DEFAULTS));
assert.ok(!isScaleTypeList([{ id: "x", name: "X" }]));
assert.ok(isInterpolationList([createInterpolation()]));
assert.ok(
  !isInterpolationList([{ ...createInterpolation(), method: "spline" }]),
);

// Add, replace, remove, restore. Shipped formulas are ordinary library items.
{
  const store = createStore();
  const custom = { ...createScaleType(), name: "Custom grid", locked: true };
  store.set(addScaleTypeAtom, custom);
  const added = store
    .get(scaleTypesAtom)
    .find((scaleType) => scaleType.id === custom.id)!;
  assert.equal(added.locked, undefined, "authored formulas are never locked");
  assert.throws(() => store.set(addScaleTypeAtom, custom), /already exists/);
  assert.equal(
    store.get(scaleTypesAtom).filter((scaleType) => scaleType.id === custom.id)
      .length,
    1,
    "ids are unique",
  );

  store.set(replaceScaleTypeAtom, { ...added, name: "Renamed" });
  assert.equal(
    store.get(scaleTypesAtom).find((scaleType) => scaleType.id === custom.id)!
      .name,
    "Renamed",
  );
  store.set(replaceScaleTypeAtom, {
    ...SCALE_TYPE_DEFAULTS[0],
    name: "Edited shipped",
  });
  assert.equal(
    store.get(scaleTypesAtom)[0].name,
    "Edited shipped",
    "shipped formulas can be edited",
  );

  const removed = store.set(removeScaleTypeAtom, custom.id)!;
  assert.equal(removed.item.name, "Renamed");
  assert.ok(
    !store.get(scaleTypesAtom).some((scaleType) => scaleType.id === custom.id),
  );
  store.set(restoreScaleTypeAtom, removed);
  assert.equal(
    store.get(scaleTypesAtom)[removed.index].id,
    custom.id,
    "undo restores the position",
  );
}

// Deleting is refused while a foundation uses the formula, and allowed once it does not.
{
  const store = createStore();
  assert.equal(
    store.set(deleteScaleTypeAtom, SPACING_SCALE_TYPE_ID),
    null,
    "a used formula cannot be deleted",
  );
  assert.ok(
    store
      .get(scaleTypesAtom)
      .some((scaleType) => scaleType.id === SPACING_SCALE_TYPE_ID),
  );
  const unused = { ...createScaleType("linear"), name: "Unused" };
  store.set(addScaleTypeAtom, unused);
  assert.ok(
    store.set(deleteScaleTypeAtom, unused.id),
    "an unused formula can be deleted",
  );
}

// A locked, adaptive part keeps the formula's value at its binding's neutral point.
{
  const store = createStore();
  const range = BINDABLE_PARAMETER_RANGES["typography.textZoom"];
  const formula = SCALE_TYPE_DEFAULTS.find(
    (scaleType) => scaleType.id === SPACING_SCALE_TYPE_ID,
  )!;
  const document = store.get(spacingDocumentAtom);
  store.set(spacingDocumentAtom, {
    ...document,
    scales: document.scales.map((scale, index) =>
      index === 0
        ? {
            ...scale,
            bindings: {
              ratio: createBinding("typography.textZoom", range, 1.5),
            },
          }
        : scale,
    ),
  });
  store.set(normalizeLockedBindingsAtom);
  const neutralOf = () =>
    store
      .get(spacingDocumentAtom)
      .scales[0].bindings!.ratio.points.find(
        (point) => point.at === range.neutral,
      )!.value;
  assert.equal(neutralOf(), 1.5, "an overridable part keeps its own value");
  store.set(
    scaleTypesAtom,
    store.get(scaleTypesAtom).map((scaleType) =>
      scaleType.id === formula.id
        ? {
            ...scaleType,
            parameters: scaleType.parameters.map((parameter) =>
              parameter.id === "ratio"
                ? { ...parameter, overridable: false }
                : parameter,
            ),
          }
        : scaleType,
    ),
  );
  store.set(normalizeLockedBindingsAtom);
  assert.equal(
    neutralOf(),
    formula.parameters.find((parameter) => parameter.id === "ratio")!.default,
    "a locked part follows the formula",
  );
}

// Nothing in the library is locked, so normalizing never rewrites edited formulas or interpolations.
{
  const store = createStore();
  store.set(
    scaleTypesAtom,
    SCALE_TYPE_DEFAULTS.map((scaleType) => ({ ...scaleType, name: "Changed" })),
  );
  store.set(
    interpolationsAtom,
    INTERPOLATION_DEFAULTS.map((interpolation) => ({
      ...interpolation,
      name: "Changed",
    })),
  );
  assert.deepEqual(
    store.set(normalizeLogicLibraryAtom),
    [],
    "edited items are not reset",
  );
  assert.equal(store.get(scaleTypesAtom)[0].name, "Changed");
}

// Change log, impact, and revert.
{
  const store = createStore();
  assert.equal(logicItems(store).length, 0, "defaults are the baseline");
  const custom = { ...createScaleType(), name: "Custom grid" };
  store.set(addScaleTypeAtom, custom);
  const item = logicItems(store).find(
    (candidate) => candidate.sourceKind === "scale-type",
  )!;
  assert.equal(item.kind, "new");
  assert.equal(item.title, "Custom grid");
  const logicImpact = store
    .get(foundationImpactSummaryAtom)
    .categories.find((category) => category.category === "logic")!;
  assert.ok(
    logicImpact.affected.count > 0,
    "a new scale type counts as edited logic",
  );
  store.set(revertChangeItemAtom, item);
  assert.equal(logicItems(store).length, 0);
  assert.equal(store.get(scaleTypesAtom).length, SCALE_TYPE_DEFAULTS.length);

  const interpolation = { ...createInterpolation(), name: "Half" };
  store.set(addInterpolationAtom, interpolation);
  const interpolationItem = logicItems(store).find(
    (candidate) => candidate.sourceKind === "interpolation",
  )!;
  assert.equal(interpolationItem.kind, "new");
  store.set(revertChangeItemAtom, interpolationItem);
  assert.equal(
    store.get(interpolationsAtom).length,
    INTERPOLATION_DEFAULTS.length,
  );
  assert.ok(
    store.set(removeInterpolationAtom, interpolation.id) === null,
    "reverted interpolations are gone",
  );
}

// Cancelling an edit session drops unsaved library edits.
{
  const store = createStore();
  store.set(enterEditModeAtom);
  store.set(addScaleTypeAtom, { ...createScaleType(), name: "Temporary" });
  store.set(addInterpolationAtom, {
    ...createInterpolation(),
    name: "Temporary",
  });
  assert.equal(
    store.get(scaleTypesAtom).length,
    SCALE_TYPE_DEFAULTS.length + 1,
  );
  store.set(cancelEditAtom);
  assert.equal(store.get(scaleTypesAtom).length, SCALE_TYPE_DEFAULTS.length);
  assert.equal(
    store.get(interpolationsAtom).length,
    INTERPOLATION_DEFAULTS.length,
  );
}

// Reset all returns the library to its shipped state.
{
  const store = createStore();
  store.set(addScaleTypeAtom, { ...createScaleType(), name: "Custom grid" });
  store.set(addInterpolationAtom, { ...createInterpolation(), name: "Half" });
  store.set(resetAllChangeDataAtom);
  assert.equal(store.get(scaleTypesAtom).length, SCALE_TYPE_DEFAULTS.length);
  assert.equal(
    store.get(interpolationsAtom).length,
    INTERPOLATION_DEFAULTS.length,
  );
}

// Shared shapes have dynamic consumers and cannot be removed while referenced.
{
  const store = createStore();
  store.set(enterEditModeAtom);
  assert.deepEqual(
    store
      .get(interpolationConsumersAtom)
      .map((consumer) => consumer.interpolationId),
    [
      "interpolation-cosine",
      "interpolation-cosine",
      "interpolation-cosine",
      "interpolation-linear",
    ],
  );
  const custom = { ...createInterpolation(), name: "Straight" };
  store.set(addInterpolationAtom, custom);
  const document = store.get(typographyDocumentAtom);
  store.set(updateTypographyAtom, {
    lineHeights: document.lineHeights.map((card) =>
      card.id === "body"
        ? {
            ...card,
            adaptive: { ...card.adaptive, interpolationId: custom.id },
          }
        : card,
    ),
  });
  const tokens = (target: ReturnType<typeof createStore>) =>
    target
      .get(generatedTypographyAtom)
      .map((token) => token.lineHeights.body.length);
  assert.notDeepEqual(
    tokens(store),
    tokens(createStore()),
    "a different body interpolation changes line heights",
  );
  assert.throws(
    () => store.set(removeInterpolationWithFallbackAtom, custom.id),
    /still used/,
  );
  store.set(updateTypographyAtom, { lineHeights: document.lineHeights });
  const removed = store.set(removeInterpolationWithFallbackAtom, custom.id)!;
  assert.ok(
    !store.get(interpolationsAtom).some((item) => item.id === custom.id),
  );
  store.set(restoreInterpolationWithConsumersAtom, removed);
  assert.ok(
    store.get(interpolationsAtom).some((item) => item.id === custom.id),
  );
  assert.equal(store.set(normalizeInterpolationReferencesAtom), false);

  // Editing a shipped interpolation is tracked and reverts to the shipped definition.
  const editStore = createStore();
  const body = editStore
    .get(interpolationsAtom)
    .find((interpolation) => interpolation.id === "interpolation-cosine")!;
  editStore.set(replaceInterpolationAtom, {
    ...body,
    name: "Body line height (edited)",
  });
  const item = logicItems(editStore).find(
    (candidate) => candidate.sourceKind === "interpolation",
  )!;
  assert.equal(item.kind, "modified");
  editStore.set(revertChangeItemAtom, item);
  assert.equal(logicItems(editStore).length, 0);
}

console.log("scale library: all checks passed");
