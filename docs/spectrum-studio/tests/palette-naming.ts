// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import {
  assertStoredSnapshot,
  authoringSnapshotAtom,
  cancelEditAtom,
  createDefaultSnapshot,
  editSessionSnapshotAtom,
  enterEditModeAtom,
  saveEditAtom,
} from "../src/features/edit-session/state";
import {
  isTaxonomyDocument,
  projectClassification,
  taxonomyIssues,
  withTaxonomyProjection,
  type TaxonomyDocument,
} from "../src/features/taxonomy/model";
import { taxonomyDocumentAtom } from "../src/features/taxonomy/state";
import {
  taxonomyTokenTree,
  type TaxonomyTreeItem,
} from "../src/features/taxonomy/tree";
import { editReferencedTaxonomyAtom } from "../src/features/taxonomy/editing";
import { browserTokensAtom } from "../src/features/tokens/browserState";
import { projectBrowserTokens } from "../src/features/tokens/browserModel";
import { buildCascadeTokenExport } from "../src/features/tokens/cascadeExport";
import { modeSetDefaultMode } from "../src/features/modes/model";
import { compareAuthoring } from "../src/features/changelog/registry";
import { taxonomyChangeFields } from "../src/features/taxonomy/changes";
import {
  prepareChangeReset,
  sourceResetPlan,
} from "../src/features/changelog/resetPlans";
import { computeComparison } from "../src/features/changelog/computeComparison";

const snapshot = createDefaultSnapshot();
const taxonomy = snapshot.taxonomy!;
const property = taxonomy.categories.find((entry) => entry.key === "property")!;
const color = taxonomy.terms.find(
  (term) => term.categoryId === property.id && term.value === "color",
)!;
assert.ok(color);
assert.equal(color.includeInProjections, false);
delete color.includeInProjections;
const omitColor = (document: TaxonomyDocument): TaxonomyDocument => ({
  ...document,
  terms: document.terms.map((term) =>
    term.id === color.id ? { ...term, includeInProjections: false } : term,
  ),
});
const omitted = omitColor(taxonomy);
assert.ok(isTaxonomyDocument(omitted));
assert.deepEqual(taxonomyIssues(omitted), []);
assert.equal(color.includeInProjections, undefined);
assert.ok(
  !isTaxonomyDocument({
    ...omitted,
    terms: omitted.terms.map((term) =>
      term.id === color.id ? { ...term, includeInProjections: "false" } : term,
    ),
  }),
  "Malformed inclusion flags must not be accepted as stored data.",
);

const exportColors = (document: TaxonomyDocument) =>
  buildCascadeTokenExport({
    base: snapshot.colorSystem,
    opacity: snapshot.opacity,
    taxonomy: document,
    modeSets: snapshot.modeSets,
    activeModes: snapshot.modeSets
      .map(modeSetDefaultMode)
      .filter((mode) => mode !== undefined),
    activeTokens: [],
    overrides: snapshot.tokenOverrides,
    browserEdits: snapshot.browserTokenEdits,
    rules: snapshot.rules,
  });
const before = exportColors(taxonomy);
const after = exportColors(omitted);
assert.deepEqual(
  after.tokens,
  before.tokens,
  "Naming choices cannot alter structured names, publication IDs, values or required rows.",
);
assert.ok(before.tokens.length > 0);
const blue = after.tokens.filter((token) => token.name.colorFamily === "blue");
assert.equal(new Set(blue.map((token) => token.conceptId)).size, 16);
const schemes = new Set<string>();
for (const token of blue) {
  schemes.add(String(token.name.colorScheme ?? "light"));
  const projection = after.taxonomy!.projections[token.uuid];
  assert.equal(projection.name, `blue-${token.name.scaleIndex}`);
  assert.equal(projection.flat.property, "color");
  assert.equal(projection.classification[property.id], color.id);
  assert.ok(
    !projection.segments.some((segment) => segment.categoryId === property.id),
  );
  assert.deepEqual(projection.issues, []);
  assert.deepEqual(
    projection,
    projectClassification(omitted, projection.classification, "colors"),
    "Token names and cascade output must use the same Registry projection.",
  );
}
assert.deepEqual([...schemes].sort(), ["dark", "light", "wireframe"]);
assert.ok(
  Object.values(before.taxonomy!.projections).some(
    (projection) => projection.name === "blue-color-100",
  ),
);
assert.ok(
  Object.values(after.taxonomy!.projections).some(
    (projection) => projection.name === "blue-100",
  ),
);
const classification = after.taxonomy!.projections[blue[0].uuid].classification;
assert.deepEqual(
  withTaxonomyProjection(omitted, () =>
    projectClassification(omitted, classification, "colors"),
  ),
  projectClassification(omitted, classification, "colors"),
  "Cached and uncached projection must agree.",
);
const categoryHidden = {
  ...omitted,
  categories: omitted.categories.map((category) =>
    category.id === property.id
      ? { ...category, includeInProjections: false }
      : category,
  ),
  terms: omitted.terms.map((term) =>
    term.id === color.id ? { ...term, includeInProjections: true } : term,
  ),
};
assert.equal(
  projectClassification(categoryHidden, classification, "colors").name,
  after.taxonomy!.projections[blue[0].uuid].name,
  "Including a term cannot bypass its excluded category.",
);
const emptyName = {
  ...taxonomy,
  terms: taxonomy.terms.map((term) => ({
    ...term,
    includeInProjections: false,
  })),
};
assert.ok(
  projectClassification(emptyName, classification, "colors").issues.includes(
    "No included classification segments.",
  ),
  "Removing every segment must remain diagnostic, not throw or invent a name.",
);

const data = new Map<string, string>();
const events = new EventTarget();
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    localStorage: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => data.set(key, value),
      removeItem: (key: string) => data.delete(key),
    },
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
  },
});
const { initializeAuthoringPersistence } =
  await import("../src/features/edit-session/persistence");
const { persistenceIssuesAtom } = await import("../src/state/persist");
const { AUTHORING_RECORD_VERSION, writeAuthoringRecord } =
  await import("../src/features/edit-session/storage");
writeAuthoringRecord({
  version: AUTHORING_RECORD_VERSION,
  working: snapshot,
  saved: snapshot,
  isEditing: false,
  attachments: {},
  savedAttachments: {},
});
const store = createStore();
let dispose = initializeAuthoringPersistence(store);
store.set(enterEditModeAtom);
const original = store.get(browserTokensAtom).filter((token) => !token.alias);
store.set(
  editReferencedTaxonomyAtom,
  omitColor(store.get(taxonomyDocumentAtom)),
);
const changed = store.get(browserTokensAtom).filter((token) => !token.alias);
assert.equal(changed.length, original.length);
const flattenTree = (items: TaxonomyTreeItem[]): TaxonomyTreeItem[] =>
  items.flatMap((item) => [item, ...flattenTree(item.children)]);
const hierarchy = flattenTree(taxonomyTokenTree(changed));
assert.ok(
  !hierarchy.some((item) => item.segment?.termIds.includes(color.id)),
  "Hierarchy must omit the same Color term as displayed names and output.",
);
assert.deepEqual(
  hierarchy
    .filter((item) => item.token)
    .map((item) => item.token!.id)
    .sort(),
  changed.map((token) => token.id).sort(),
  "Omission must not hide tokens from the hierarchy.",
);
for (const token of changed) {
  const previous = original.find((entry) => entry.id === token.id)!;
  assert.ok(previous, "Every token retains its existing concept identity.");
  assert.equal(token.value, previous.value);
  assert.deepEqual(token.projection?.flat, previous.projection?.flat);
  if (token.projection?.classification[property.id] !== color.id)
    assert.equal(
      token.name,
      previous.name,
      "Unrelated terms keep their names.",
    );
}
const working = store.get(authoringSnapshotAtom);
assertStoredSnapshot(working);
assert.deepEqual(working.colorSystem, snapshot.colorSystem);
const fields = compareAuthoring(snapshot, working)
  .groups.flatMap((group) => group.items)
  .flatMap((item) => item.fields);
assert.equal(fields.length, 1, "Only the authored naming choice changes.");
assert.equal(fields[0].address?.path.at(-1), "includeInProjections");
assert.ok(fields[0].address);
assert.equal(taxonomyChangeFields(taxonomy, working.taxonomy!).length, 1);
const withUnrelatedEdit = structuredClone(snapshot);
withUnrelatedEdit.platforms[0].name = "Keep unrelated work";
const resetField = compareAuthoring(createDefaultSnapshot(), withUnrelatedEdit)
  .groups.flatMap((group) => group.items)
  .flatMap((item) => item.fields)
  .find((field) => field.address?.path.at(-1) === "includeInProjections")!;
assert.ok(resetField.address);
const reset = prepareChangeReset(
  { ...withUnrelatedEdit, attachments: {} },
  sourceResetPlan("Restore default name omission", [resetField.address]),
);
assert.deepEqual(reset.taxonomy, omitted);
assert.equal(reset.platforms[0].name, "Keep unrelated work");

const comparison = (working: typeof snapshot) =>
  computeComparison(
    { shipped: snapshot, working, attachments: {} },
    () => undefined,
  );
const unchangedImpact = comparison(snapshot);
const renamedImpact = comparison(working);
assert.equal(renamedImpact.tokens.status, "ready");
assert.equal(unchangedImpact.tokens.status, "ready");
if (
  renamedImpact.tokens.status === "ready" &&
  unchangedImpact.tokens.status === "ready"
) {
  const normalizeNames = (
    record: (typeof renamedImpact.tokens.comparison.records)[number],
  ) => ({
    ...record,
    nameChanged: false,
  });
  assert.deepEqual(
    renamedImpact.tokens.comparison.records.map(normalizeNames),
    unchangedImpact.tokens.comparison.records.map(normalizeNames),
    "Token identities, denominators, mode values and override classification are unchanged.",
  );
  assert.ok(
    renamedImpact.tokens.comparison.records.some(
      (record) => record.nameChanged,
    ),
    "Renamed tokens remain visible in Changes and name impact.",
  );
}
assert.deepEqual(
  renamedImpact.componentImpact,
  unchangedImpact.componentImpact,
  "Name-only edits do not change effective component values or their denominator.",
);
const collisionTaxonomy = {
  ...omitted,
  categories: omitted.categories.map((category) =>
    category.id === property.id ? { ...category, required: false } : category,
  ),
};
const blueToken = changed.find((token) => token.name === "blue-100")!;
assert.ok(blueToken);
const noProperty = { ...blueToken.projection!.classification };
delete noProperty[property.id];
const collisions = projectBrowserTokens(
  [
    blueToken,
    {
      ...blueToken,
      id: crypto.randomUUID(),
      classificationOverride: noProperty,
    },
  ],
  collisionTaxonomy,
);
assert.ok(
  collisions.every((token) =>
    token.projection!.issues.some((issue) => /collision/i.test(issue)),
  ),
  "Omitted terms must not conceal serialized-name collisions.",
);
store.set(cancelEditAtom);
assert.deepEqual(store.get(taxonomyDocumentAtom), taxonomy);
store.set(enterEditModeAtom);
store.set(
  editReferencedTaxonomyAtom,
  omitColor(store.get(taxonomyDocumentAtom)),
);
store.set(saveEditAtom);
const saved = structuredClone(store.get(editSessionSnapshotAtom));
assert.equal(
  saved!.taxonomy!.terms.find((term) => term.id === color.id)!
    .includeInProjections,
  false,
);
dispose();
const reloaded = createStore();
dispose = initializeAuthoringPersistence(reloaded);
assert.deepEqual(reloaded.get(persistenceIssuesAtom), []);
assert.deepEqual(reloaded.get(taxonomyDocumentAtom), saved!.taxonomy);
reloaded.set(enterEditModeAtom);
const restored = structuredClone(reloaded.get(taxonomyDocumentAtom));
delete restored.terms.find((term) => term.id === color.id)!
  .includeInProjections;
reloaded.set(editReferencedTaxonomyAtom, restored);
reloaded.set(cancelEditAtom);
assert.deepEqual(reloaded.get(taxonomyDocumentAtom), saved!.taxonomy);
dispose();
console.log(
  "Term-scoped palette naming preserves values, identities, other terms, Changes, Impact and Save/Cancel/reload.",
);
