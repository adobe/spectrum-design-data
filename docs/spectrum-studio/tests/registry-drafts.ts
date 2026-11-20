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
  reorderVisibleRegistryCategories,
} from "../src/features/taxonomy/registryDraft";
import {
  ALL_REGISTRY_FILTERS,
  REGISTRY_FILTER_ALL,
  categoryMatchesRegistryFilters,
  nextRegistryFilterSelection,
  registryFilterKeys,
  type RegistryFilters,
} from "../src/features/taxonomy/registryFilters";

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
{
  // Moves while filtered anchor to the visible category that was passed.
  const full = ["A", "B", "C", "D", "E", "F"];
  const right = reorderVisibleRegistryCategories(
    full,
    ["A", "B", "F"],
    "A",
    "F",
    "before",
  );
  assert.deepEqual(right, ["B", "A", "C", "D", "E", "F"]);
  assert.deepEqual(
    reorderVisibleRegistryCategories(
      right,
      ["B", "A", "D", "F"],
      "F",
      "D",
      "before",
    ),
    ["B", "A", "C", "F", "D", "E"],
  );
  assert.deepEqual(
    reorderVisibleRegistryCategories(full, ["A", "C"], "A", "C", "before"),
    full,
  );
  assert.deepEqual(
    reorderVisibleRegistryCategories(full, full, "A", "F", "after"),
    reorderRegistryCategories(full, "A", "F", "after"),
  );
}
{
  const anyTier = { scopes: ["colors" as const] };
  const semanticSpacing = {
    scopes: ["spacing" as const, "styles" as const],
    allowedTokenTiers: ["semantic" as const],
  };
  const noTypes = { scopes: ["styles" as const] };
  const only = (filters: Partial<RegistryFilters>) => ({
    ...ALL_REGISTRY_FILTERS,
    ...filters,
  });
  for (const category of [anyTier, semanticSpacing, noTypes])
    assert.ok(categoryMatchesRegistryFilters(category, ALL_REGISTRY_FILTERS));
  assert.ok(
    categoryMatchesRegistryFilters(anyTier, only({ tiers: ["component"] })),
  );
  assert.ok(
    !categoryMatchesRegistryFilters(
      semanticSpacing,
      only({ tiers: ["component"] }),
    ),
  );
  assert.ok(
    categoryMatchesRegistryFilters(
      semanticSpacing,
      only({ tiers: ["primitive", "semantic"], types: ["spacing", "size"] }),
    ),
  );
  assert.ok(
    !categoryMatchesRegistryFilters(
      semanticSpacing,
      only({ types: ["colors"] }),
    ),
  );
  assert.ok(
    !categoryMatchesRegistryFilters(noTypes, only({ types: ["colors"] })),
  );
  assert.ok(
    !categoryMatchesRegistryFilters(
      { scopes: ["colors"], allowedTokenTiers: [] },
      only({ tiers: ["semantic"] }),
    ),
  );
}
{
  const options = ["primitive", "semantic", "component"] as const;
  assert.deepEqual(registryFilterKeys(options, options), [
    REGISTRY_FILTER_ALL,
    ...options,
  ]);
  assert.deepEqual(registryFilterKeys(options, ["component", "primitive"]), [
    "primitive",
    "component",
  ]);
  // Unchecking one option from All leaves the others.
  assert.deepEqual(
    nextRegistryFilterSelection(options, options, [
      REGISTRY_FILTER_ALL,
      "primitive",
      "component",
    ]),
    ["primitive", "component"],
  );
  assert.deepEqual(
    nextRegistryFilterSelection(
      options,
      ["semantic"],
      ["semantic", REGISTRY_FILTER_ALL],
    ),
    [...options],
  );
  // Unchecking the last option leaves nothing selected.
  assert.deepEqual(nextRegistryFilterSelection(options, ["semantic"], []), []);
  // Choosing All while everything is selected deselects all.
  assert.deepEqual(nextRegistryFilterSelection(options, options, options), []);
  assert.deepEqual(nextRegistryFilterSelection(options, [], ["all"]), [
    ...options,
  ]);
  assert.deepEqual(
    nextRegistryFilterSelection(
      options,
      ["semantic"],
      ["semantic", "component"],
    ),
    ["semantic", "component"],
  );
}
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
