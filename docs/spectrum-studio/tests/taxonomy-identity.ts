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
import {
  registryCategoryBatch,
  reorderRegistryCategories,
} from "../src/features/taxonomy/registryDraft";

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
  (entry) => entry.key === "colorFamily",
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
  "unique custom term",
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
  "unique custom term",
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
assert.equal(after.name, "identity preserved hue");
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
const batchStore = createStore();
batchStore.set(enterEditModeAtom);
const initial = batchStore.get(taxonomyDocumentAtom);
const first = {
  id: crypto.randomUUID(),
  categoryId: custom.id,
  value: "registry draft first",
  description: "",
};
batchStore.set(editReferencedTaxonomyAtom, {
  ...initial,
  categories: [...initial.categories, custom],
  order: [...initial.order, custom.id],
  terms: [...initial.terms, first],
});
batchStore.set(saveEditAtom);
batchStore.set(cancelEditAtom);
const batchBase = batchStore.get(taxonomyDocumentAtom);
const replacement = {
  ...first,
  id: crypto.randomUUID(),
  value: "registry draft second",
};
const batchDraft = {
  ...batchBase,
  categories: batchBase.categories.map((row) =>
    row.id === custom.id ? { ...row, description: "Staged metadata" } : row,
  ),
  terms: [...batchBase.terms.filter((row) => row.id !== first.id), replacement],
};
const batch = registryCategoryBatch(batchBase, batchDraft, custom.id);
assert.throws(
  () => batchStore.set(editReferencedTaxonomyAtom, batch),
  /edit mode/,
);
batchStore.set(enterEditModeAtom);
let publications = 0;
const unsubscribe = batchStore.sub(taxonomyDocumentAtom, () => publications++);
assert.throws(
  () =>
    batchStore.set(editReferencedTaxonomyAtom, {
      ...batch,
      operations: [...batch.operations, { kind: "remove-term", id: term.id }],
    }),
  /remap|Unresolved|registered|unknown/i,
);
assert.equal(batchStore.get(taxonomyDocumentAtom), batchBase);
assert.equal(
  publications,
  0,
  "A rejected late operation cannot publish earlier operations.",
);
batchStore.set(editReferencedTaxonomyAtom, batch);
assert.equal(publications, 1, "The complete batch publishes exactly once.");
unsubscribe();
assert.deepEqual(batchStore.get(taxonomyDocumentAtom), batchDraft);
const batchFields = taxonomyChangeFields(
  batchBase,
  batchStore.get(taxonomyDocumentAtom),
);
for (const key of [
  `Category ${custom.id}`,
  `Term ${first.id}`,
  `Term ${replacement.id}`,
])
  assert(
    batchFields.some((field) => field.key === key),
    `${key} remains visible in Changes.`,
  );
batchStore.set(cancelEditAtom);
assert.deepEqual(
  batchStore.get(taxonomyDocumentAtom),
  batchBase,
  "Overall Cancel discards the entire category batch.",
);
batchStore.set(enterEditModeAtom);
const resumedBase = batchStore.get(taxonomyDocumentAtom);
batchStore.set(
  editReferencedTaxonomyAtom,
  registryCategoryBatch(resumedBase, batchDraft, custom.id),
);
batchStore.set(saveEditAtom);
assert.deepEqual(batchStore.get(taxonomyDocumentAtom), batchDraft);
batchStore.set(enterEditModeAtom);
const orderBase = batchStore.get(taxonomyDocumentAtom);
const indexCategory = orderBase.categories.find(
  (row) => row.key === "scaleIndex",
)!;
const beforeOrderTokens = batchStore.get(browserTokensAtom);
batchStore.set(editReferencedTaxonomyAtom, {
  ...orderBase,
  order: reorderRegistryCategories(
    orderBase.order,
    category.id,
    indexCategory.id,
    "after",
  ),
});
const afterOrderTokens = batchStore.get(browserTokensAtom);
assert(
  afterOrderTokens.some(
    (token, index) => token.name !== beforeOrderTokens[index].name,
  ),
);
for (const original of beforeOrderTokens) {
  const updated = afterOrderTokens.find((token) => token.id === original.id)!;
  assert(updated, "Reorder retains every token identity.");
  assert.deepEqual(updated.value, original.value);
  assert.deepEqual(
    updated.projection?.classification,
    original.projection?.classification,
  );
}
assert(
  taxonomyChangeFields(orderBase, batchStore.get(taxonomyDocumentAtom)).some(
    (field) => field.key === "Global category order",
  ),
);
batchStore.set(cancelEditAtom);
assert.deepEqual(batchStore.get(taxonomyDocumentAtom), batchDraft);
console.log(
  "Registry UUID identity, atomic batches, rejected edits, Changes, reorder propagation and Save/Cancel passed.",
);
