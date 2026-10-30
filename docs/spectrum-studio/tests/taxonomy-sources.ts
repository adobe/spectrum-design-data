// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import {
  colorSystemDocumentAtom,
  updateContrastTokenAtom,
} from "../src/features/color-system/state";
import {
  browserModeContextAtom,
  browserTokensAtom,
  editBrowserTokensAtom,
} from "../src/features/tokens/browserState";
import {
  enterEditModeAtom,
  authoringSnapshotAtom,
  saveEditAtom,
  cancelEditAtom,
} from "../src/features/edit-session/state";
import { taxonomyDocumentAtom } from "../src/features/taxonomy/state";
import { editFoundationNameAtom } from "../src/features/taxonomy/sourceState";
import { editReferencedTaxonomyAtom } from "../src/features/taxonomy/editing";
import { assertFoundationGovernance } from "../src/features/taxonomy/foundationGovernance";
import {
  canonicalDesignSystemDataset,
  composeDesignSystemDefaults,
} from "../src/features/design-data/validation";
import { designSystemDefaults } from "../src/data/defaults";
import { scaleStepName } from "../src/features/scales/stepNames";
import { taxonomyIssues } from "../src/features/taxonomy/model";
import {
  analysisSavedInputAtom,
  analysisWorkingInputAtom,
} from "../src/features/design-data/state";

const store = createStore();
const baseline = store.get(authoringSnapshotAtom);
assert.equal(store.get(analysisSavedInputAtom).errors.length, 0);
assert.equal(store.get(analysisWorkingInputAtom).errors.length, 0);
store.set(enterEditModeAtom);
const tokens = store.get(browserTokensAtom);
for (const scope of ["colors", "typography", "spacing", "size"]) {
  const source = tokens.find((token) => token.type === scope)!;
  assert(source.taxonomySource?.governed);
  assert.equal(
    source.projection!.flat.property,
    scope === "colors"
      ? "color"
      : scope === "typography"
        ? "size"
        : scope === "spacing"
          ? undefined
          : "size",
  );
  if (scope === "spacing")
    assert.equal(source.projection!.flat.tokenCategory, "spacing");
  const before = store.get(taxonomyDocumentAtom);
  assert.throws(
    () =>
      store.set(editBrowserTokensAtom, {
        ids: [source.id],
        modeKey: store.get(browserModeContextAtom).key,
        patch: {
          classification: {
            "0bb57816-c2eb-4d6c-bfb1-ac5d7520e88a":
              "73d1c87a-7ca9-4f40-9404-8ae65dc26833",
          },
        },
      }),
    /governed/,
  );
  assert.deepEqual(store.get(taxonomyDocumentAtom), before);
}
assert(
  taxonomyIssues({ ...store.get(taxonomyDocumentAtom), sourceAssignments: {} })
    .length,
);
assert(
  taxonomyIssues({ ...store.get(taxonomyDocumentAtom), sourceBindings: {} })
    .length,
);
const swatch = baseline.colorSystem.contrasts[0];
const affected = tokens.filter(
  (token) => token.taxonomySource?.stepId === swatch.id,
);
assert.equal(affected.length, baseline.colorSystem.scales.length);
assert(affected.every((token) => token.projection!.flat.scaleIndex === 100));
store.set(updateContrastTokenAtom, { id: swatch.id, value: 1.75 });
const changed = store
  .get(browserTokensAtom)
  .filter((token) => token.taxonomySource?.stepId === swatch.id);
assert.deepEqual(
  changed.map((token) => [
    token.id,
    token.name,
    token.projection!.classification,
  ]),
  affected.map((token) => [
    token.id,
    token.name,
    token.projection!.classification,
  ]),
);
assert(changed.some((token, index) => token.value !== affected[index].value));
store.set(colorSystemDocumentAtom, {
  ...store.get(colorSystemDocumentAtom),
  contrasts: [...baseline.colorSystem.contrasts].reverse(),
});
const reordered = store
  .get(browserTokensAtom)
  .filter((token) => token.taxonomySource?.stepId === swatch.id);
assert(
  reordered.every(
    (token) =>
      token.projection!.flat.scaleIndex ===
      baseline.colorSystem.contrasts.length * 100,
  ),
);
assert.deepEqual(
  reordered.map((token) => [token.id, token.value]),
  affected.map((token) => [token.id, token.value]),
  "Reordering shared swatches changes every scale's index, not stable identity or contrast math.",
);
assert.equal(scaleStepName(-2, 2), 50);
assert.equal(scaleStepName(-1, 2), 75);

const canonical = canonicalDesignSystemDataset(designSystemDefaults);
const invalid = structuredClone(canonical);
invalid.system.taxonomy.classifications[affected[0].id] = {
  "0bb57816-c2eb-4d6c-bfb1-ac5d7520e88a":
    "273990a0-e71e-4249-9628-7e8fa689747b",
};
assert.throws(
  () => composeDesignSystemDefaults(invalid, []),
  /cannot override/,
);
const registry = store.get(taxonomyDocumentAtom);
assert.throws(
  () =>
    store.set(editReferencedTaxonomyAtom, {
      ...registry,
      terms: registry.terms.map((term) =>
        term.categoryId === "fe55c281-7565-40c8-b9d1-3b5f1cfff917" &&
        term.value === 100
          ? { ...term, value: 101 }
          : term,
      ),
    }),
  /requires a registered/,
);
assert.deepEqual(store.get(taxonomyDocumentAtom), registry);
store.set(cancelEditAtom);
assert.deepEqual(store.get(authoringSnapshotAtom), baseline);
store.set(enterEditModeAtom);
const spacing = baseline.spacing!.scales[0];
store.set(editFoundationNameAtom, {
  id: `spacing:${spacing.id}`,
  value: "Shared dimensions",
});
store.set(saveEditAtom);
assert.equal(
  store.get(analysisSavedInputAtom).errors.length,
  0,
  "Saved authoring input serializes refs before canonical validation.",
);
store.set(editFoundationNameAtom, {
  id: `spacing:${spacing.id}`,
  value: "Later draft",
});
assert.equal(store.get(analysisWorkingInputAtom).errors.length, 0);
store.set(cancelEditAtom);
assert.equal(
  store.get(authoringSnapshotAtom).size!.scales[0].name,
  "Shared dimensions",
);
const snapshot = store.get(authoringSnapshotAtom);
assertFoundationGovernance(
  {
    color: snapshot.colorSystem,
    typography: snapshot.typography,
    spacing: snapshot.spacing!,
    size: snapshot.size!,
  },
  store.get(taxonomyDocumentAtom),
);
console.log(
  "Foundation-governed classifications, shared swatches, state-bypass protections, canonical Analysis and in-memory lifecycle passed.",
);
