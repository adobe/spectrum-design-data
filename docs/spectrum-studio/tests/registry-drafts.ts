// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import {
  projectClassification,
  updateTaxonomy,
  type TaxonomyDocument,
} from "../src/features/taxonomy/model";
import {
  registryBatchSteps,
  registryCategoryBatch,
  reorderRegistryCategories,
} from "../src/features/taxonomy/registryDraft";

const categoryId = "f0000000-0000-4000-8000-000000000001";
const secondId = "f0000000-0000-4000-8000-000000000002";
const termId = "f0000000-0000-4000-8000-000000000003";
const otherTermId = "f0000000-0000-4000-8000-000000000004";
const base: TaxonomyDocument = {
  schemaVersion: 1,
  categories: [categoryId, secondId].map((id, index) => ({
    id,
    key: index ? "property" : "structure",
    name: index ? "Property" : "Structure",
    description: "",
    valueType: "string",
    cardinality: "one",
    scopes: ["colors"],
    required: false,
    includeInProjections: true,
  })),
  terms: [
    { id: termId, categoryId, value: "base", description: "" },
    { id: otherTermId, categoryId: secondId, value: "color", description: "" },
  ],
  order: [categoryId, secondId],
  classifications: {},
};
const before = structuredClone(base);
const reordered = reorderRegistryCategories(
  base.order,
  categoryId,
  secondId,
  "after",
);
assert.deepEqual(reordered, [secondId, categoryId]);
assert.deepEqual(
  reorderRegistryCategories(reordered, categoryId, secondId, "before"),
  base.order,
);
assert.deepEqual(
  reorderRegistryCategories(base.order, categoryId, categoryId, "after"),
  base.order,
);
assert.throws(
  () => reorderRegistryCategories(base.order, "missing", categoryId, "before"),
  /available/,
);
assert.throws(
  () =>
    reorderRegistryCategories(
      [categoryId, categoryId],
      categoryId,
      categoryId,
      "before",
    ),
  /available/,
);
const classification = { [categoryId]: termId, [secondId]: otherTermId };
assert.equal(
  projectClassification(base, classification, "colors").name,
  "base-color",
);
assert.equal(
  projectClassification({ ...base, order: reordered }, classification, "colors")
    .name,
  "color-base",
);
const renamed = {
  ...base,
  terms: base.terms.map((term) =>
    term.id === termId ? { ...term, value: "frame" } : term,
  ),
};
const renameSteps = registryBatchSteps(
  base,
  registryCategoryBatch(base, renamed, categoryId),
);
assert.equal(renameSteps.at(-1)?.terms[0].id, termId);
assert.equal(renameSteps.at(-1)?.terms[0].value, "frame");
const newTerm = {
  ...base.terms[0],
  id: crypto.randomUUID(),
  value: "container",
};
const draft = { ...base, terms: [base.terms[1], newTerm] };
assert.throws(() => updateTaxonomy(base, draft), /immutable/);
const batch = registryCategoryBatch(base, draft, categoryId);
const steps = registryBatchSteps(base, batch);
assert.equal(steps.length, 2);
assert.deepEqual(steps.at(-1)?.terms, draft.terms);
assert.deepEqual(
  registryBatchSteps(base, registryCategoryBatch(base, base, categoryId)),
  [],
);
assert.throws(
  () => registryBatchSteps(structuredClone(base), batch),
  /changed/,
);
assert.throws(
  () =>
    registryBatchSteps(base, {
      base,
      operations: [
        { kind: "term", term: { ...base.terms[0], categoryId: secondId } },
      ],
    }),
  /ownership/,
);
assert.throws(
  () =>
    registryBatchSteps(base, {
      base,
      operations: [
        {
          kind: "category",
          category: { ...base.categories[0], key: "replacement" },
        },
      ],
    }),
  /immutable/,
);
assert.deepEqual(
  base,
  before,
  "Draft creation, cancellation and rejected edits never mutate the accepted document.",
);
console.log(
  "Registry category draft operations, UUID guards, reorder and name projection passed.",
);
