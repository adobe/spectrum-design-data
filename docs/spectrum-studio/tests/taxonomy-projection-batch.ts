// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { createTaxonomyDefaults } from "../src/features/taxonomy/defaults";
import {
  projectClassification,
  resolveSourceClassification,
  taxonomyIssues,
  withTaxonomyProjection,
  type Classification,
} from "../src/features/taxonomy/model";

const document = createTaxonomyDefaults();
const scope = "colors";
const classification: Classification = Object.fromEntries(
  document.categories
    .filter((category) => category.scopes.includes(scope))
    .flatMap((category) => {
      const term = document.terms.find(
        (candidate) => candidate.categoryId === category.id,
      );
      return term ? [[category.id, term.id]] : [];
    }),
);
const original = projectClassification(document, classification, scope);
assert.deepEqual(
  withTaxonomyProjection(document, () =>
    projectClassification(document, classification, scope),
  ),
  original,
);

withTaxonomyProjection(document, () => {
  const first = projectClassification(document, classification, scope);
  first.issues.push("Caller-owned issue");
  first.segments[0].termIds.push("Caller-owned term");
  first.segments[0].values[0] = "Caller-owned value";
  first.flat["caller"] = "Caller-owned field";
  assert.deepEqual(
    projectClassification(document, { ...classification }, scope),
    original,
  );
  assert.deepEqual(
    withTaxonomyProjection(document, () =>
      projectClassification(document, classification, scope),
    ),
    original,
  );
  resolveSourceClassification(document, "generated", {}, scope, {
    id: "generated",
    governed: classification,
  }).issues.push("Another caller issue");
  assert.deepEqual(
    projectClassification(document, classification, scope),
    original,
  );
});

const changed = structuredClone(document);
withTaxonomyProjection(changed, () =>
  projectClassification(changed, classification, scope),
);
const term = changed.terms.find(
  (candidate) =>
    candidate.id ===
    classification[changed.order.find((id) => classification[id])!],
)!;
term.value =
  typeof term.value === "number" ? term.value + 1000 : `${term.value}-changed`;
assert.deepEqual(
  withTaxonomyProjection(changed, () =>
    projectClassification(changed, classification, scope),
  ),
  projectClassification(changed, classification, scope),
  "Mutable callers must be revalidated between projection batches.",
);
assert.notDeepEqual(
  projectClassification(changed, classification, scope),
  original,
);

assert.throws(
  () =>
    withTaxonomyProjection(document, () => {
      throw new Error("Batch failed");
    }),
  /Batch failed/,
);
const malformed = {
  ...document,
  order: [...document.order, document.order[0]],
};
assert(taxonomyIssues(malformed).length);
assert.deepEqual(
  withTaxonomyProjection(malformed, () =>
    projectClassification(malformed, classification, scope),
  ),
  projectClassification(malformed, classification, scope),
);
const unresolved = { ...classification, missing: "missing" };
assert.deepEqual(
  withTaxonomyProjection(document, () =>
    projectClassification(document, unresolved, scope),
  ),
  projectClassification(document, unresolved, scope),
);

const repetitions = 2000;
const uncachedStart = performance.now();
for (let index = 0; index < repetitions; index++)
  projectClassification(document, classification, scope);
const uncachedMs = performance.now() - uncachedStart;
const batchStart = performance.now();
withTaxonomyProjection(document, () => {
  for (let index = 0; index < repetitions; index++)
    assert.equal(
      projectClassification(document, classification, scope).name,
      original.name,
    );
});
const batchMs = performance.now() - batchStart;
assert(
  batchMs < uncachedMs * 0.5,
  `Projection batch should remove repeated validation: ${batchMs.toFixed(1)} / ${uncachedMs.toFixed(1)} ms.`,
);
console.log(
  JSON.stringify({
    uncachedMs: Math.round(uncachedMs),
    batchMs: Math.round(batchMs),
    repetitions,
  }),
);
