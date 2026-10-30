// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import {
  captureSnapshot,
  enterEditModeAtom,
} from "../src/features/edit-session/state";
import {
  editReferencedTaxonomyAtom,
  referencedTaxonomySourceAtom,
  validateReferencedTaxonomyAtom,
} from "../src/features/taxonomy/editing";
import {
  computeTaxonomyValidation,
  currentTaxonomyValidation,
  taxonomyDraftError,
  validateReferencedTaxonomy,
  type TaxonomyValidationRequest,
  type TaxonomyValidationState,
} from "../src/features/taxonomy/referenceValidation";
import type { TaxonomyDocument } from "../src/features/taxonomy/model";
import { componentTokenCatalogWithColorWitness } from "../src/features/components/references";
import { componentColorWitnessAtom } from "../src/features/components/colorWitness";
import { normalizeTaxonomyTerms } from "../src/features/taxonomy/model";

const store = createStore();
store.set(enterEditModeAtom);
const source = store.get(referencedTaxonomySourceAtom);
assert.equal(store.get(referencedTaxonomySourceAtom), source);
const before = structuredClone(captureSnapshot(store.get));
const previous = source.previous;
const term = previous.terms[0];
const added = {
  ...term,
  id: "f0000000-0000-4000-8000-000000000002",
  value: "Worker fixture",
  description: "",
};
const candidate: TaxonomyDocument = {
  ...previous,
  terms: [...previous.terms, added],
};
const request: TaxonomyValidationRequest = {
  source,
  document: candidate,
  termId: added.id,
  field: "value",
  text: String(added.value),
};
const validate = store.get(validateReferencedTaxonomyAtom);
const witness =
  componentTokenCatalogWithColorWitness(before).componentColorWitness;
assert(witness?.scaleColors?.length);
store.set(componentColorWitnessAtom, structuredClone(witness));
assert.equal(
  store.get(referencedTaxonomySourceAtom),
  source,
  "Proof publication cannot invalidate or restart the active draft source.",
);
assert.equal(
  store.get(validateReferencedTaxonomyAtom),
  validate,
  "Proof publication cannot replace the canonical draft validator.",
);
for (const document of [
  previous,
  candidate,
  {
    ...previous,
    terms: previous.terms.map((entry) =>
      entry.id === term.id
        ? { ...entry, description: "Worker description" }
        : entry,
    ),
  },
  {
    ...candidate,
    terms: candidate.terms.map((entry) =>
      entry.id === added.id ? { ...entry, value: term.value } : entry,
    ),
  },
  { ...previous, order: [...previous.order, previous.order[0]] },
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
  {
    ...previous,
    terms: previous.terms.filter(
      (entry) => entry.id !== before.colorSystem.scales[0].nameRef!.termId,
    ),
  },
]) {
  let expected: ReturnType<typeof computeTaxonomyValidation>;
  try {
    validate(document);
    expected = { valid: true };
  } catch (failure) {
    expected = {
      valid: false,
      error: failure instanceof Error ? failure.message : String(failure),
    };
  }
  const cloned = structuredClone({ ...request, document });
  const untouched = structuredClone(cloned);
  let reused: ReturnType<typeof computeTaxonomyValidation>;
  try {
    validateReferencedTaxonomy(source, document, witness);
    reused = { valid: true };
  } catch (failure) {
    reused = {
      valid: false,
      error: failure instanceof Error ? failure.message : String(failure),
    };
  }
  assert.deepEqual(
    reused,
    expected,
    "Exact prepared scale reuse cannot omit any Registry or dependency guard.",
  );
  assert.deepEqual(
    computeTaxonomyValidation(cloned),
    expected,
    "Structured worker input retains every synchronous validation result.",
  );
  assert.deepEqual(
    cloned,
    untouched,
    "Draft checks cannot mutate proposals, evidence or source snapshots.",
  );
  if (!expected.valid) {
    assert.throws(
      () => store.set(editReferencedTaxonomyAtom, document),
      { message: expected.error },
      "The authoritative commit rejects invalid drafts independently of worker results.",
    );
    assert.deepEqual(captureSnapshot(store.get), before);
    const broken = structuredClone(source);
    const referenced = broken.snapshot
      .components!.components.flatMap((component) => component.assignments)
      .find((row) => "$ref" in row)!;
    if ("$ref" in referenced)
      referenced.$ref = "f0000000-0000-4000-8000-000000000099";
    assert.throws(
      () => validateReferencedTaxonomy(broken, candidate, witness),
      /no longer published or available/,
      "A reusable color result cannot authorize an invalid Component reference.",
    );
  }
}
assert.deepEqual(captureSnapshot(store.get), before);

const failed: TaxonomyValidationState = {
  status: "ready",
  input: request,
  value: { valid: false, error: "Exact validation error" },
};
assert.equal(
  taxonomyDraftError(failed, source, added.id, "value", request.text),
  "Exact validation error",
);
for (const [id, field, text] of [
  [term.id, "value", request.text],
  [added.id, "description", request.text],
  [added.id, "value", "Newer text"],
] as const)
  assert.equal(taxonomyDraftError(failed, source, id, field, text), null);
assert.equal(
  taxonomyDraftError(
    { status: "pending", input: request },
    source,
    added.id,
    "value",
    request.text,
  ),
  null,
);
assert.equal(
  taxonomyDraftError(
    { status: "ready", input: request, value: { valid: true } },
    source,
    added.id,
    "value",
    request.text,
  ),
  null,
);
assert.equal(
  taxonomyDraftError(
    { status: "unavailable", input: request, error: "Worker unavailable" },
    source,
    added.id,
    "value",
    request.text,
  ),
  "Worker unavailable",
);

store.set(editReferencedTaxonomyAtom, candidate);
assert.deepEqual(
  captureSnapshot(store.get),
  { ...before, taxonomy: normalizeTaxonomyTerms(candidate) },
  "Prepared acceptance changes only the proposed Registry, with normalized term values.",
);
assert.deepEqual(
  store.get(componentColorWitnessAtom),
  witness,
  "Acceptance cannot mutate its worker-prepared evidence.",
);
const fallbackStore = createStore();
fallbackStore.set(enterEditModeAtom);
assert.equal(fallbackStore.get(componentColorWitnessAtom), null);
fallbackStore.set(editReferencedTaxonomyAtom, candidate);
assert.deepEqual(
  captureSnapshot(fallbackStore.get),
  captureSnapshot(store.get),
  "Acceptance before proof readiness retains the complete canonical path.",
);
const next = store.get(referencedTaxonomySourceAtom);
assert.notEqual(next, source);
assert.deepEqual(next.previous, normalizeTaxonomyTerms(candidate));
assert.equal(
  currentTaxonomyValidation(failed, next),
  undefined,
  "Accepted source changes invalidate ready replies before effects run.",
);
assert.equal(
  taxonomyDraftError(failed, next, added.id, "value", request.text),
  null,
);
assert.equal(
  currentTaxonomyValidation({ status: "pending", input: request }, next),
  undefined,
);
assert.equal(
  currentTaxonomyValidation(
    { status: "unavailable", input: request, error: "Old failure" },
    next,
  ),
  undefined,
);
assert.equal(currentTaxonomyValidation(undefined, source), undefined);
assert.deepEqual(
  computeTaxonomyValidation(request),
  { valid: true },
  "A captured draft check remains read-only after newer acceptance.",
);
const mutable = structuredClone(request);
assert.deepEqual(computeTaxonomyValidation(mutable), { valid: true });
mutable.document.terms.at(-1)!.value = term.value;
assert.equal(
  computeTaxonomyValidation(mutable).valid,
  false,
  "Finished checks cannot permanently trust mutable proposals.",
);
mutable.document.terms.at(-1)!.value = "Recovered worker fixture";
assert.deepEqual(computeTaxonomyValidation(mutable), { valid: true });
console.log(
  "Registry validation work: exact structured-input parity, authoritative guards, source/field/text freshness, explicit failures and mutation safety passed.",
);
