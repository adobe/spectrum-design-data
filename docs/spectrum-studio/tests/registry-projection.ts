// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import {
  captureSnapshot,
  enterEditModeAtom,
} from "../src/features/edit-session/state";
import { taxonomyDocumentAtom } from "../src/features/taxonomy/state";
import {
  taxonomyEvidenceProjections,
  taxonomyEvidenceSourcesAtom,
  validateReferencedTaxonomyAtom,
} from "../src/features/taxonomy/editing";
import {
  resolveSourceClassification,
  withTaxonomyProjection,
  type TaxonomyDocument,
} from "../src/features/taxonomy/model";
import { componentTokenCatalog } from "../src/features/components/references";
import {
  assessClassificationStandard,
  type StandardizationUsage,
} from "../src/features/taxonomy/standardization";
import { browserTokensAtom } from "../src/features/tokens/browserState";
import { previewOverridesAtom } from "../src/features/modes/previewState";
import { classificationReviewMessages } from "../src/features/taxonomy/reviewPresentation";

const store = createStore();
store.set(enterEditModeAtom);
const previous = store.get(taxonomyDocumentAtom);
const before = structuredClone(captureSnapshot(store.get));
const validate = store.get(validateReferencedTaxonomyAtom);
const color = before.colorSystem.scales[0].nameRef!;
const term = previous.terms.find((entry) => entry.id === color.termId)!;
const candidate: TaxonomyDocument = {
  ...previous,
  terms: [
    ...previous.terms,
    {
      id: "f0000000-0000-4000-8000-000000000001",
      categoryId: color.categoryId,
      value: "Priority fixture",
      description: "",
    },
  ],
};

for (const input of [
  previous,
  candidate,
  {
    ...candidate,
    terms: candidate.terms.map((entry) =>
      entry.id === term.id
        ? { ...entry, description: "Changed description" }
        : entry,
    ),
  },
  {
    ...previous,
    terms: previous.terms.map((entry) =>
      entry.id === term.id ? { ...entry, value: "Priority hue" } : entry,
    ),
  },
]) {
  const unchanged = structuredClone(input);
  validate(input);
  assert.deepEqual(
    input,
    unchanged,
    "Complete validation must not mutate the proposed Registry.",
  );
}
assert.deepEqual(
  captureSnapshot(store.get),
  before,
  "Validation alone cannot change any authored source.",
);
assert.deepEqual(
  componentTokenCatalog({ ...before, taxonomy: candidate }),
  componentTokenCatalog(before),
  "An unassigned term adds no emitted values, contexts or Component targets.",
);

const failures: [TaxonomyDocument, RegExp][] = [
  [
    { ...previous, order: [...previous.order, previous.order[0]] },
    /order|exactly|duplicate/i,
  ],
  [
    {
      ...previous,
      terms: previous.terms.filter((entry) => entry.id !== term.id),
    },
    /reference|unresolved|remap|name|registered|term/i,
  ],
  [
    {
      ...previous,
      categories: previous.categories.map((entry) =>
        entry.id === color.categoryId ? { ...entry, key: "changed" } : entry,
      ),
    },
    /immutable/i,
  ],
  [
    {
      ...candidate,
      terms: candidate.terms.map((entry) =>
        entry.id === "f0000000-0000-4000-8000-000000000001"
          ? { ...entry, value: String(term.value).toUpperCase() }
          : entry,
      ),
    },
    /owned|duplicate|conflict/i,
  ],
  [
    {
      ...previous,
      terms: previous.terms.map((entry) =>
        entry.id === term.id
          ? {
              ...entry,
              categoryId: previous.categories.find(
                (entry) => entry.id !== term.categoryId,
              )!.id,
            }
          : entry,
      ),
    },
    /immutable|owned|scope|category/i,
  ],
];
for (const [input, message] of failures) {
  assert.throws(() => validate(input), message);
  validate(candidate);
  assert.deepEqual(
    captureSnapshot(store.get),
    before,
    "Rejected drafts cannot change the accepted sources.",
  );
}

const mutable = structuredClone(candidate);
validate(mutable);
mutable.terms.at(-1)!.value = term.value;
assert.throws(
  () => validate(mutable),
  /owned|duplicate|conflict/i,
  "A completed batch cannot permanently trust a mutable proposal.",
);
mutable.terms.at(-1)!.value = "Recovered priority fixture";
validate(mutable);

const sources = store.get(taxonomyEvidenceSourcesAtom);
const project = () =>
  sources.map((source) =>
    resolveSourceClassification(
      previous,
      source.id,
      source.evidence,
      source.scope,
      source.context,
    ),
  );
const canonical = project();
assert.deepEqual(withTaxonomyProjection(previous, project), canonical);
assert.deepEqual(taxonomyEvidenceProjections(previous, sources), canonical);
const detached = taxonomyEvidenceProjections(previous, sources);
detached[0].issues.push("Caller-owned issue");
assert.deepEqual(taxonomyEvidenceProjections(previous, sources), canonical);
assert.deepEqual(store.get(taxonomyDocumentAtom), before.taxonomy);
const usages: StandardizationUsage[] = canonical.map((projection, index) => ({
  id: sources[index].id,
  scope: sources[index].scope,
  classification: projection.classification,
  projectionIssues: projection.issues,
  measurement: sources[index].measurement,
}));
const assess = (
  document: TaxonomyDocument,
  records: readonly StandardizationUsage[],
) =>
  withTaxonomyProjection(document, () =>
    assessClassificationStandard(document, records),
  );
for (const records of [
  usages,
  [],
  [{ ...usages[0], recordKind: "alias-usage" as const }],
  [{ ...usages[0], scope: "motion" as const }],
  [{ id: "Missing scope", classification: {} }],
]) {
  assert.deepEqual(
    assess(previous, records),
    assessClassificationStandard(previous, records),
    "Scoped review must preserve every definition, usage, issue, count and profile field.",
  );
}
const review = assess(previous, usages);
const mutableReview = structuredClone(previous);
mutableReview.categories[0].name = "Mutable review category";
assert.notDeepEqual(assess(mutableReview, usages), review);
assert.deepEqual(
  assess(mutableReview, usages),
  assessClassificationStandard(mutableReview, usages),
);
assert.throws(
  () => assess(previous, [...usages, usages[0]]),
  /duplicate classification usage identity/i,
);
assert.deepEqual(
  assess(previous, usages),
  review,
  "Failed review scopes cannot poison subsequent assessments.",
);
review.occurrences[0].issues.length = 0;
assert.deepEqual(
  assess(previous, usages),
  assessClassificationStandard(previous, usages),
  "Returned review objects remain caller-owned without corrupting later results.",
);
for (const zoom of [0, 1, 4, 2, 0]) {
  store.set(previewOverridesAtom, { "typography.textZoom": zoom });
  const tokens = store.get(browserTokensAtom);
  const records: StandardizationUsage[] = tokens
    .filter((token) => !token.alias)
    .map((token) => ({
      id: token.id,
      scope: token.semantic ? "structures" : token.type,
      classification: token.projection?.classification,
      projectionIssues: token.projection?.issues,
      measurement: token.measurement,
    }));
  const unchanged = structuredClone(records);
  const expected = assessClassificationStandard(previous, records);
  const actual = assess(previous, records);
  assert.deepEqual(
    actual,
    expected,
    "Every Tokens classification occurrence, warning, measurement, count and profile field must remain canonical.",
  );
  assert.deepEqual(
    classificationReviewMessages(previous, actual.occurrences),
    classificationReviewMessages(previous, expected.occurrences),
  );
  assert.deepEqual(
    records,
    unchanged,
    "Review cannot mutate the token usages.",
  );
  assert.throws(
    () => assess(previous, [...records, records[0]]),
    /duplicate classification usage identity/i,
  );
  assert.deepEqual(
    assess(previous, records),
    expected,
    "A rejected Tokens assessment cannot retain its temporary projection scope.",
  );
  actual.occurrences[0].issues.length = 0;
  assert.deepEqual(
    assess(previous, records),
    expected,
    "Tokens assessment results remain caller-owned.",
  );
}
store.set(previewOverridesAtom, {});
assert.deepEqual(
  captureSnapshot(store.get),
  before,
  "Adaptive preview and classification review cannot alter authored data.",
);
console.log(
  "Registry projection: complete validation, exact evidence/output/review parity, immutable identities, rejected updates, mutation safety and failed-batch cleanup passed.",
);
