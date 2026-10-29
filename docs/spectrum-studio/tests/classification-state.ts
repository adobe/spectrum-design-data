// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import { assessClassificationStandard } from "../src/features/taxonomy/standardization";
import { classificationStandard } from "../src/features/taxonomy/standardContract";

class MemoryStorage {
  data = new Map<string, string>();
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
}
const localStorage = new MemoryStorage();
const events = new EventTarget();
Object.defineProperty(globalThis, "window", {
  value: {
    localStorage,
    sessionStorage: new MemoryStorage(),
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
  },
  configurable: true,
});
const { initializeAuthoringPersistence } =
  await import("../src/features/edit-session/persistence");
const { AUTHORING_STORAGE_KEY, AUTHORING_RECORD_VERSION } =
  await import("../src/features/edit-session/storage");
const {
  enterEditModeAtom,
  saveEditAtom,
  cancelEditAtom,
  authoringSnapshotAtom,
  editSessionSnapshotAtom,
  assertStoredSnapshot,
  resetAllAuthoringAtom,
} = await import("../src/features/edit-session/state");
const { taxonomyDocumentAtom } = await import("../src/features/taxonomy/state");
const { editReferencedTaxonomyAtom, taxonomyEvidenceSourcesAtom } =
  await import("../src/features/taxonomy/editing");
const { resolveSourceClassification } =
  await import("../src/features/taxonomy/model");
const { NOMINAL_FONT_SIZE_MEASUREMENT } =
  await import("../src/features/typography/typographyTokens");
const { flushPersistedState } = await import("../src/state/persist");
const { changeGroupsAtom, revertChangeTopicAtom, savedModeTokenRowsAtom } =
  await import("../src/features/changelog/state");
const { aliasesAtom } = await import("../src/features/tokens/aliasState");
const first = createStore();
let dispose = initializeAuthoringPersistence(first);
const initial = structuredClone(first.get(authoringSnapshotAtom));
const savedRows = structuredClone(first.get(savedModeTokenRowsAtom));
const evidence = first.get(taxonomyEvidenceSourcesAtom);
const nominal = evidence.filter((source) => source.measurement);
assert(nominal.length > 1);
assert(
  nominal.some((source) => source.id === "typography:font-size"),
  "Registry preserves nominal metadata on the authored metric as well as every generated font-size source.",
);
assert(
  nominal.every(
    (source) =>
      source.scope === "typography" &&
      JSON.stringify(source.measurement) ===
        JSON.stringify(NOMINAL_FONT_SIZE_MEASUREMENT),
  ),
);
const registryAssessment = assessClassificationStandard(
  first.get(taxonomyDocumentAtom),
  evidence.map((source) => {
    const projection = resolveSourceClassification(
      first.get(taxonomyDocumentAtom),
      source.id,
      source.evidence,
      source.scope,
      source.context,
    );
    return {
      id: source.id,
      scope: source.scope,
      classification: projection.classification,
      projectionIssues: projection.issues,
      measurement: source.measurement,
    };
  }),
);
assert(
  !registryAssessment.occurrences.some(
    (entry) =>
      nominal.some((source) => source.id === entry.recordId) &&
      entry.issues.some((issue) => issue.code === "measurement-review"),
  ),
  "Registry must not invent missing-measurement warnings for explicit nominal sources.",
);
const text = first
  .get(taxonomyDocumentAtom)
  .terms.find((term) => term.value === "Text")!;
const definition = classificationStandard.concepts.find(
  (entry) => entry.id === "element:text",
)!.definition;
const question = classificationStandard.facets.find(
  (entry) => entry.key === "element",
)!.question;
const termStatus = (store: typeof first) =>
  assessClassificationStandard(
    store.get(taxonomyDocumentAtom),
  ).occurrences.find(
    (entry) =>
      entry.recordKind === "term-definition" && entry.termId === text.id,
  )!;
assert(termStatus(first).fixRequired);
assert(
  termStatus(first).issues.some((issue) => issue.code === "definition-review"),
);
first.set(enterEditModeAtom);
let document = first.get(taxonomyDocumentAtom);
first.set(editReferencedTaxonomyAtom, {
  ...document,
  categories: document.categories.map((category) =>
    category.id === text.categoryId
      ? { ...category, description: question }
      : category,
  ),
  terms: document.terms.map((term) =>
    term.id === text.id ? { ...term, description: definition } : term,
  ),
});
assert.equal(termStatus(first).status, "standard");
assert(first.get(changeGroupsAtom).some((group) => group.id === "registry"));
assert.deepEqual(
  first.get(savedModeTokenRowsAtom),
  savedRows,
  "Working review changes do not enlarge saved mode-value denominators.",
);
assert.deepEqual(
  first.get(aliasesAtom),
  initial.aliases,
  "Definition review does not create name aliases.",
);
first.set(cancelEditAtom);
assert.deepEqual(first.get(authoringSnapshotAtom), initial);
assert(termStatus(first).fixRequired);
first.set(enterEditModeAtom);
document = first.get(taxonomyDocumentAtom);
first.set(editReferencedTaxonomyAtom, {
  ...document,
  terms: document.terms.map((term) =>
    term.id === text.id
      ? {
          ...term,
          description: "Unreviewed wording retained for investigation",
        }
      : term,
  ),
});
assert(
  termStatus(first).fixRequired,
  "A non-standard record stays marked while still editable.",
);
first.set(saveEditAtom);
flushPersistedState();
const saved = structuredClone(first.get(editSessionSnapshotAtom));
assertStoredSnapshot(saved);
assert(
  saved.taxonomy!.terms.some(
    (term) =>
      term.id === text.id &&
      term.description === "Unreviewed wording retained for investigation",
  ),
);
assert(
  termStatus(first).fixRequired,
  "Save does not silently turn draft meaning into conformance.",
);
assert.deepEqual(
  first.get(savedModeTokenRowsAtom),
  savedRows,
  "Saved definition-only changes add no token concepts, values or generation origins.",
);
assert.deepEqual(first.get(aliasesAtom), initial.aliases);
const raw = localStorage.getItem(AUTHORING_STORAGE_KEY);
assert(raw);
assert.equal(JSON.parse(raw).version, AUTHORING_RECORD_VERSION);
assert(
  !raw.includes('"classificationAssessment"') && !raw.includes('"fixRequired"'),
  "Derived annotations do not leak into the closed canonical authoring schema.",
);
dispose();
const reloaded = createStore();
dispose = initializeAuthoringPersistence(reloaded);
assert.deepEqual(reloaded.get(authoringSnapshotAtom), saved);
assert(
  termStatus(reloaded).fixRequired,
  "Reload recomputes identical warnings from preserved source data and the pinned contract.",
);
assert.deepEqual(reloaded.get(savedModeTokenRowsAtom), savedRows);
reloaded.set(enterEditModeAtom);
document = reloaded.get(taxonomyDocumentAtom);
reloaded.set(editReferencedTaxonomyAtom, {
  ...document,
  categories: document.categories.map((category) =>
    category.id === text.categoryId
      ? { ...category, description: question }
      : category,
  ),
  terms: document.terms.map((term) =>
    term.id === text.id ? { ...term, description: definition } : term,
  ),
});
assert.equal(termStatus(reloaded).status, "standard");
reloaded.set(cancelEditAtom);
assert.deepEqual(reloaded.get(authoringSnapshotAtom), saved);
assert(termStatus(reloaded).fixRequired);
reloaded.set(revertChangeTopicAtom, "registry");
assert.deepEqual(reloaded.get(taxonomyDocumentAtom), initial.taxonomy);
assert(
  termStatus(reloaded).fixRequired,
  "Reverting restores the original unresolved definition instead of retaining a stale passing flag.",
);
reloaded.set(resetAllAuthoringAtom);
assert.deepEqual(reloaded.get(authoringSnapshotAtom), initial);
assert.deepEqual(reloaded.get(editSessionSnapshotAtom), initial);
assert.deepEqual(reloaded.get(savedModeTokenRowsAtom), savedRows);
dispose();
Reflect.deleteProperty(globalThis, "window");
console.log(
  "Non-standard editing, Save/Cancel/reload/revert/reset, strict schemas and unchanged saved token/mode-value owners passed.",
);
