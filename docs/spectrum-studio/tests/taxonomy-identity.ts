// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import dataset from "../src/data/design-system.defaults.json" with { type: "json" };
import { designSystemDefaults } from "../src/data/defaults";
import {
  assertTaxonomy,
  projectClassification,
  registerTerm,
  taxonomyEmissionKey,
  taxonomyIdPattern,
  updateTaxonomy,
} from "../src/features/taxonomy/model";
import { taxonomyDocumentAtom } from "../src/features/taxonomy/state";
import {
  editReferencedTaxonomyAtom,
  validateReferencedTaxonomyAtom,
} from "../src/features/taxonomy/editing";
import {
  enterEditModeAtom,
  saveEditAtom,
  cancelEditAtom,
} from "../src/features/edit-session/state";
import { taxonomyChangeFields } from "../src/features/taxonomy/changes";
import { colorSystemDocumentAtom } from "../src/features/color-system/state";
import { browserTokensAtom } from "../src/features/tokens/browserState";

const baseline = designSystemDefaults.system.taxonomy;
assertTaxonomy(baseline);
const identities = [...baseline.categories, ...baseline.terms].map(
  (entry) => entry.id,
);
assert(identities.every((id) => taxonomyIdPattern.test(id)));
assert.equal(new Set(identities).size, identities.length);
assert.deepEqual(
  baseline,
  dataset.system.taxonomy,
  "Defaults never mint or remap IDs on load.",
);
const category = baseline.categories.find(
  (entry) => entry.key === "colorName",
)!;
const term = baseline.terms.find(
  (entry) =>
    entry.id ===
    designSystemDefaults.system.foundations.color.scales[0].nameRef!.termId,
)!;
assert.throws(
  () =>
    assertTaxonomy({
      ...baseline,
      categories: baseline.categories.map((entry) =>
        entry.id === category.id ? { ...entry, id: "label-id" } : entry,
      ),
    }),
  /Malformed/,
);
assert.throws(
  () =>
    updateTaxonomy(baseline, {
      ...baseline,
      categories: baseline.categories.map((entry) =>
        entry.id === category.id ? { ...entry, key: "anotherKey" } : entry,
      ),
    }),
  /immutable/,
);
const reminted = crypto.randomUUID();
assert.throws(
  () =>
    updateTaxonomy(baseline, {
      ...baseline,
      terms: baseline.terms.map((entry) =>
        entry.id === term.id ? { ...entry, id: reminted } : entry,
      ),
    }),
  /immutable/,
);
assert.throws(
  () =>
    updateTaxonomy(baseline, {
      ...baseline,
      terms: baseline.terms.map((entry) =>
        entry.id === term.id
          ? {
              ...entry,
              categoryId: baseline.categories.find(
                (entry) => entry.key === "surfaceName",
              )!.id,
            }
          : entry,
      ),
    }),
  /ownership is immutable/,
);

const id = crypto.randomUUID();
const custom = {
  ...category,
  id,
  key: taxonomyEmissionKey(id),
  name: "Custom category",
  required: false,
};
const customDocument = updateTaxonomy(baseline, {
  ...baseline,
  categories: [...baseline.categories, custom],
  order: [...baseline.order, id],
});
const newTermId = crypto.randomUUID();
const added = registerTerm(
  customDocument,
  id,
  "  Unique custom term  ",
  newTermId,
);
assert.equal(
  added.terms.find((entry) => entry.id === newTermId)?.value,
  "Unique custom term",
);
assert.throws(
  () => registerTerm(customDocument, id, " RED ", crypto.randomUUID()),
  /already owned/,
);
assert.throws(
  () => registerTerm(customDocument, id, "100", crypto.randomUUID()),
  /already owned/,
);
assert.throws(
  () => registerTerm(customDocument, id, "", crypto.randomUUID()),
  /Enter a term/,
);
assert.equal(
  registerTerm(added, id, "unique CUSTOM term", crypto.randomUUID()),
  added,
);
assert.equal(taxonomyEmissionKey(id), custom.key);
assert.notEqual(taxonomyEmissionKey(crypto.randomUUID()), custom.key);
const renamedCategory = updateTaxonomy(added, {
  ...added,
  categories: added.categories.map((entry) =>
    entry.id === id ? { ...entry, name: "Renamed category" } : entry,
  ),
});
assert.equal(
  projectClassification(renamedCategory, { [id]: newTermId }, "colors").flat[
    custom.key
  ],
  "Unique custom term",
);
assert.deepEqual(
  renamedCategory.terms,
  added.terms,
  "Category display names cannot alter ownership or internal field mapping.",
);

const store = createStore();
assert.throws(
  () => store.set(editReferencedTaxonomyAtom, baseline),
  /edit mode/,
);
store.set(enterEditModeAtom);
const before = store.get(taxonomyDocumentAtom);
const description = {
  ...before,
  terms: before.terms.map((entry) =>
    entry.id === term.id
      ? { ...entry, description: "Shared term description" }
      : entry,
  ),
};
store.get(validateReferencedTaxonomyAtom)(description);
assert.deepEqual(
  store.get(taxonomyDocumentAtom),
  before,
  "Validation cannot mutate the owner.",
);
store.set(editReferencedTaxonomyAtom, description);
assert(
  taxonomyChangeFields(before, store.get(taxonomyDocumentAtom)).some(
    (field) => field.key === `Term ${term.id}`,
  ),
);
store.set(cancelEditAtom);
assert.deepEqual(store.get(taxonomyDocumentAtom), before);
store.set(enterEditModeAtom);
store.set(editReferencedTaxonomyAtom, description);
store.set(saveEditAtom);
store.set(editReferencedTaxonomyAtom, before);
store.set(cancelEditAtom);
assert.deepEqual(store.get(taxonomyDocumentAtom), description);

store.set(enterEditModeAtom);
const color = store
  .get(colorSystemDocumentAtom)
  .scales.find((entry) => entry.nameRef!.termId === term.id)!;
const tokens = store
  .get(browserTokensAtom)
  .filter((entry) => entry.projection?.classification[category.id] === term.id);
const renamed = {
  ...description,
  terms: description.terms.map((entry) =>
    entry.id === term.id
      ? { ...entry, value: "Identity preserved hue" }
      : entry,
  ),
};
store.set(editReferencedTaxonomyAtom, renamed);
const after = store
  .get(colorSystemDocumentAtom)
  .scales.find((entry) => entry.id === color.id)!;
assert.equal(after.name, "Identity preserved hue");
assert.deepEqual(after.nameRef, color.nameRef);
assert.deepEqual(after.stops, color.stops);
const afterTokens = store.get(browserTokensAtom);
for (const token of tokens) {
  const after = afterTokens.find((entry) => entry.id === token.id)!;
  assert.equal(after.value, token.value);
  assert.equal(after.projection!.classification[category.id], term.id);
  assert(after.name.startsWith("identity-preserved-hue-"));
}
assert.deepEqual(
  createStore().get(taxonomyDocumentAtom),
  baseline,
  "A fresh page session restores checked-in identities.",
);
console.log(
  "Registry UUID identity, immutable mapping, description tracking, name propagation and page-session lifecycle passed.",
);
