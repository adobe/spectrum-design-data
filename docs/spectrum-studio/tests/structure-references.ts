// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import {
  createDefaultSnapshot,
  assertStoredSnapshot,
  enterEditModeAtom,
  authoringSnapshotAtom,
} from "../src/features/edit-session/state";
import { upgradeStructureCompositionSnapshot } from "../src/features/edit-session/structureCompositionUpgrade";
import { buildTshirtArtifacts } from "../src/features/design-data/tshirtArtifacts";
import {
  formatTshirtName,
  assertTshirtGraph,
} from "../src/features/design-data/tshirtProfile";
import {
  tshirtTokenImpactRecords,
  tshirtTokenChanges,
} from "../src/features/design-data/tshirtChanges";
import { structureChanges } from "../src/features/structures/changes";
import {
  isLeaf,
  isStructureInstance,
  leafElements,
  assertStructureGraph,
  structureCandidates,
} from "../src/features/structures/children";
import {
  resolveComposition,
  resolveCompositionResult,
  supportedStructureSize,
} from "../src/features/structures/composition";
import {
  createStructure,
  structureSelection,
  structureGeneration,
  structureBinding,
  structureTaxonomyAssignments,
  assignStructure,
  STRUCTURES_SCHEMA_VERSION,
} from "../src/features/structures/model";
import {
  STRUCTURE_TERM_IDS as terms,
  STRUCTURE_CATEGORY_IDS as categories,
} from "../src/features/structures/vocabulary";
import {
  ELEMENT_CATEGORY_ID,
  ELEMENT_TYPES,
} from "../src/features/structures/elements";
import { SIZE_TERM_IDS } from "../src/features/taxonomy/variantVocabulary";
import { primitiveReferencesAtom } from "../src/features/tokens/primitiveReferenceState";
import {
  addStructureAtom,
  renameStructureAtom,
  removeStructureAtom,
  setStructureTokenNamingAtom,
  structuresDocumentAtom,
} from "../src/features/structures/state";
import {
  insertStructureInstanceAtom,
  removeElementAtom,
  restoreElementAtom,
} from "../src/features/structures/elementState";
import { taxonomyDocumentAtom } from "../src/features/taxonomy/state";
import {
  changeGroupsAtom,
  revertChangeItemAtom,
  revertChangeTopicAtom,
} from "../src/features/changelog/state";

const snapshot = createDefaultSnapshot();
assertStoredSnapshot(snapshot);
const [base, text] = snapshot.structures!.structures;
assert.equal(snapshot.structures!.schemaVersion, STRUCTURES_SCHEMA_VERSION);
assert.equal(snapshot.structures!.structures.length, 2);
assert.equal(text.name, "Text");
assert.equal(base.elements?.length, 1);
assert.deepEqual(base.elements![0], {
  id: "c664f132-52a1-4f10-8017-7a6a07e3149a",
  kind: "structureReference",
  structureId: text.conceptId,
});
assert.equal(isStructureInstance(base.elements![0]), true);
assert.equal(
  isStructureInstance({ ...base.elements![0], bindings: [] }),
  false,
  "Occurrences cannot store source overrides.",
);
assert.deepEqual(structureSelection(text, "direction"), {
  value: { kind: "term", termId: terms.vertical },
});
assert.deepEqual(
  structureTaxonomyAssignments(structureBinding(text, "direction")!),
  {
    [categories.property]: terms.direction,
    [categories.axis]: terms.vertical,
  },
);
assert.deepEqual(structureGeneration(text).nameRef, {
  categoryId: ELEMENT_CATEGORY_ID,
  termId: ELEMENT_TYPES.text.termId,
});
assert.deepEqual(
  structureGeneration(text).sizeTermIds,
  Object.values(SIZE_TERM_IDS),
);
const references = createStore().get(primitiveReferencesAtom);
const leaves = leafElements(text);
assert.equal(leaves.length, 2);
assert.deepEqual(
  leaves.map((leaf) =>
    leaf.bindings.map(
      (binding) => references.find((ref) => ref.id === binding.$ref)?.name,
    ),
  ),
  [["text-size-100"], ["text-size-75"]],
);
const bundle = buildTshirtArtifacts(snapshot, "shipped");
assertTshirtGraph(bundle.tokens);
assert.equal(bundle.semantics.length, 20);
const textRows = bundle.semantics.filter(
  (row) => row.structureId === text.conceptId,
);
assert.equal(textRows.length, 5);
assert.deepEqual(
  textRows.map((row) => formatTshirtName(row.token.name)),
  [
    "text-gap-extra-small",
    "text-gap-small",
    "text-gap-medium",
    "text-gap-large",
    "text-gap-extra-large",
  ],
);
assert.equal(textRows.find((row) => row.size === "m")!.target.value, 1);
assert.ok(
  textRows.every(
    (row) =>
      row.classification[ELEMENT_CATEGORY_ID] === ELEMENT_TYPES.text.termId &&
      "$ref" in row.token,
  ),
);
const legacy = structuredClone(snapshot);
legacy.structures!.schemaVersion = 3;
legacy.structures!.structures = [structuredClone(base)];
legacy.structures!.structures[0].elements = [];
legacy.structures!.structures[0].properties = base.properties.filter(
  (binding) => binding !== structureBinding(base, "direction"),
);
legacy.taxonomy!.terms = legacy.taxonomy!.terms.filter(
  (term) => term.id !== terms.direction,
);
const legacyBundle = buildTshirtArtifacts(legacy, "shipped");
assert.equal(legacyBundle.semantics.length, 15);
assert.deepEqual(
  bundle.semantics.filter((row) => row.structureId === base.conceptId),
  legacyBundle.semantics,
);
const upgraded = upgradeStructureCompositionSnapshot(legacy, 10);
assertStoredSnapshot(upgraded);
assert.equal(
  upgraded.structures!.structures.length,
  1,
  "Migration does not merge shipped Text into authored data.",
);
assert.equal(upgraded.structures!.structures[0].elements!.length, 0);
assert.deepEqual(
  structureSelection(upgraded.structures!.structures[0], "direction"),
  { value: { kind: "term", termId: terms.horizontal } },
);

const composed = resolveComposition(
  base,
  [base, text],
  references,
  snapshot.rules!,
  bundle,
);
assert.equal(composed.children.length, 1);
const module = composed.children[0];
assert.ok("composition" in module);
assert.equal(module.composition.resolved.styles.flexDirection, "column");
assert.equal(module.composition.resolved.styles.gap, 1);
assert.deepEqual(
  module.composition.children.map((child) =>
    "element" in child ? child.styles.fontSize : undefined,
  ),
  [14, 12],
);
assert.deepEqual(composed.issues, []);
const constrained = assignStructure(text, {
  minWidth: { value: { kind: "sizing", preset: "hug" } },
  maxWidth: { value: { kind: "sizing", preset: "fill" } },
});
assert.ok(
  resolveComposition(
    base,
    [base, constrained],
    references,
    snapshot.rules!,
    bundle,
  ).issues.length,
);
const measured = resolveComposition(
  base,
  [base, constrained],
  references,
  snapshot.rules!,
  bundle,
  {},
  "m",
  undefined,
  {
    [`/${base.elements![0].id}`]: {
      availableWidth: 200,
      availableHeight: 100,
      naturalWidth: 32,
      naturalHeight: 40,
    },
  },
);
assert.deepEqual(measured.issues, []);
assert.ok("composition" in measured.children[0]);
assert.equal(measured.children[0].composition.resolved.styles.minWidth, 32);
assert.equal(measured.children[0].composition.resolved.styles.maxWidth, 200);
const failed = resolveCompositionResult(
  base,
  [base],
  references,
  snapshot.rules!,
  bundle,
);
assert.equal(failed.status, "error");
assert.ok(failed.status === "error" && /unavailable/.test(failed.error));
const sparse = {
  ...text,
  generation: {
    ...structureGeneration(text),
    sizeTermIds: [SIZE_TERM_IDS.xs, SIZE_TERM_IDS.m, SIZE_TERM_IDS.xl],
  },
};
assert.equal(supportedStructureSize(sparse, "s"), "m");
const sparseComposition = resolveComposition(
  base,
  [base, sparse],
  references,
  snapshot.rules!,
  bundle,
  {},
  "s",
);
assert.match(
  sparseComposition.warnings.join(" "),
  /S is unavailable; showing M/,
);
const column = assignStructure(base, {
  direction: { value: { kind: "term", termId: terms.vertical } },
  horizontal: { value: { kind: "term", termId: terms.right } },
  vertical: { value: { kind: "term", termId: terms.bottom } },
});
const columnPreview = resolveComposition(
  column,
  [column, text],
  references,
  snapshot.rules!,
  bundle,
);
assert.equal(columnPreview.resolved.styles.alignItems, "flex-end");
assert.equal(columnPreview.resolved.styles.justifyContent, "flex-end");
assert.deepEqual(structureCandidates([base, text], text.conceptId), []);
assert.throws(
  () =>
    assertStructureGraph([
      {
        ...text,
        elements: [
          {
            id: crypto.randomUUID(),
            kind: "structureReference",
            structureId: text.conceptId,
          },
        ],
      },
    ]),
  /directly or indirectly/,
);
assert.throws(
  () =>
    assertStructureGraph([
      {
        ...text,
        elements: [
          {
            id: crypto.randomUUID(),
            kind: "structureReference",
            structureId: base.conceptId,
          },
        ],
      },
      base,
    ]),
  /indirectly/,
);
assert.throws(() => assertStructureGraph([base]), /unavailable/);
assert.throws(
  () => assertStructureGraph([base, text, text]),
  /unique identities/,
);
const originalRule = snapshot.rules!.find((rule) => rule.type === "generator")!;
const parentRule = {
  ...originalRule,
  id: "rule-parent-only",
  mappings: originalRule.mappings.map((mapping) =>
    mapping.termId === SIZE_TERM_IDS.s ? { ...mapping, offset: 2 } : mapping,
  ),
};
const differentRules = structuredClone(snapshot);
differentRules.rules!.push(parentRule);
differentRules.structures!.structures[0].generation!.applications[0].ruleId =
  parentRule.id;
const differentBundle = buildTshirtArtifacts(differentRules);
const sourceSized = resolveComposition(
  differentRules.structures!.structures[0],
  differentRules.structures!.structures,
  references,
  differentRules.rules!,
  differentBundle,
  {},
  "s",
);
const originalSized = resolveComposition(
  base,
  [base, text],
  references,
  snapshot.rules!,
  bundle,
  {},
  "s",
);
assert.ok(
  "composition" in sourceSized.children[0] &&
    "composition" in originalSized.children[0],
);
assert.deepEqual(
  sourceSized.children[0].composition,
  originalSized.children[0].composition,
  "A parent's different rule never rescales its referenced source.",
);
assert.equal(originalSized.resolved.styles.gap, 5);
assert.equal(sourceSized.resolved.styles.gap, 8);
const pair = createStructure("Pair", "d0000000-0000-4000-8000-000000000501");
pair.generation!.sizeTermIds = Object.values(SIZE_TERM_IDS);
pair.elements = [
  {
    id: "d0000000-0000-4000-8000-000000000502",
    kind: "structureReference",
    structureId: text.conceptId,
  },
  {
    id: "d0000000-0000-4000-8000-000000000503",
    kind: "structureReference",
    structureId: text.conceptId,
  },
];
const nested = {
  ...base,
  elements: [
    {
      ...base.elements![0],
      kind: "structureReference" as const,
      structureId: pair.conceptId,
    },
  ],
};
const nestedSource = {
  ...snapshot,
  structures: { ...snapshot.structures!, structures: [nested, pair, text] },
};
assertStoredSnapshot(nestedSource);
assert.deepEqual(buildTshirtArtifacts(nestedSource).tokens, bundle.tokens);
const nestedComposition = resolveComposition(
  nested,
  [nested, pair, text],
  references,
  snapshot.rules!,
  bundle,
  {},
  "s",
);
assert.ok("composition" in nestedComposition.children[0]);
assert.equal(nestedComposition.children[0].composition.children.length, 2);
assert.deepEqual(nestedComposition.issues, []);

const store = createStore();
store.set(enterEditModeAtom);
const beforeRegistry = structuredClone(store.get(taxonomyDocumentAtom));
store.set(renameStructureAtom, {
  id: text.conceptId,
  name: "Readable Text label",
});
assert.deepEqual(store.get(taxonomyDocumentAtom), beforeRegistry);
const renamed = buildTshirtArtifacts({
  ...snapshot,
  structures: store.get(structuresDocumentAtom),
});
assert.deepEqual(renamed.tokens, bundle.tokens);
assert.deepEqual(tshirtTokenChanges(bundle, renamed), []);
assert.ok(
  tshirtTokenImpactRecords(renamed, bundle).every(
    (row) =>
      !row.nameChanged &&
      !row.metadataChanged &&
      !row.referenceChanged &&
      row.modeValues.every((value) => !value.changed),
  ),
);
assert.equal(
  structureChanges(
    store.get(structuresDocumentAtom),
    beforeRegistry,
    snapshot.structures!,
  ).length,
  1,
);
assert.throws(
  () => store.set(removeStructureAtom, text.conceptId),
  /used by Base/,
);
const instanceId = store.set(insertStructureInstanceAtom, {
  structureId: base.conceptId,
  targetId: text.conceptId,
  index: 1,
});
assert.deepEqual(
  buildTshirtArtifacts({
    ...snapshot,
    structures: store.get(structuresDocumentAtom),
  }).tokens,
  bundle.tokens,
);
assert.throws(
  () =>
    store.set(insertStructureInstanceAtom, {
      structureId: base.conceptId,
      targetId: text.conceptId,
      index: 1,
      expected: { childIds: [base.elements![0].id], direction: "horizontal" },
    }),
  /picker was open/,
);
assert.throws(
  () =>
    store.set(insertStructureInstanceAtom, {
      structureId: base.conceptId,
      targetId: text.conceptId,
      index: 1,
      expected: {
        childIds: [base.elements![0].id, instanceId],
        direction: "vertical",
      },
    }),
  /picker was open/,
);
assert.throws(
  () =>
    store.set(insertStructureInstanceAtom, {
      structureId: text.conceptId,
      targetId: base.conceptId,
      index: 0,
    }),
  /indirectly/,
);
const removed = store.set(removeElementAtom, {
  structureId: base.conceptId,
  elementId: instanceId,
  confirmed: true,
});
assert.ok(!isLeaf(removed.element));
store.set(restoreElementAtom, removed);
assert.equal(
  store.get(structuresDocumentAtom).structures[0].elements![1].id,
  instanceId,
);
assert.throws(
  () =>
    store.set(setStructureTokenNamingAtom, {
      structureId: text.conceptId,
      createName: "Text",
    }),
  /already|owned|unique|conflict/i,
);
store.set(setStructureTokenNamingAtom, {
  structureId: text.conceptId,
  createName: "Readable content",
});
assert.ok(
  structureChanges(
    store.get(structuresDocumentAtom),
    store.get(taxonomyDocumentAtom),
    snapshot.structures!,
  )
    .find((item) => item.id === text.conceptId)!
    .fields.some((field) => field.key === "Token naming"),
);
assert.equal(
  store
    .get(taxonomyDocumentAtom)
    .terms.find((term) => term.id === ELEMENT_TYPES.text.termId)!.value,
  "Text",
);
assert.ok(
  buildTshirtArtifacts({
    ...snapshot,
    structures: store.get(structuresDocumentAtom),
    taxonomy: store.get(taxonomyDocumentAtom),
  })
    .semantics.filter((row) => row.structureId === text.conceptId)
    .every((row) =>
      formatTshirtName(row.token.name).startsWith("readable-content-gap-"),
    ),
);
assert.throws(
  () =>
    store.set(setStructureTokenNamingAtom, {
      structureId: text.conceptId,
      termId: null,
    }),
  /Invalid Structures/,
);
const reverting = createStore();
reverting.set(enterEditModeAtom);
const sourceId = reverting.set(addStructureAtom);
reverting.set(insertStructureInstanceAtom, {
  structureId: base.conceptId,
  targetId: sourceId,
  index: 1,
});
const sourceChange = reverting
  .get(changeGroupsAtom)
  .find((group) => group.id === "structures")!
  .items.find((item) => item.id === sourceId)!;
const beforeRevert = structuredClone(reverting.get(authoringSnapshotAtom));
assert.throws(
  () => reverting.set(revertChangeItemAtom, sourceChange),
  /used by Base/,
);
assert.deepEqual(
  reverting.get(authoringSnapshotAtom),
  beforeRevert,
  "An individual source revert cannot leave a dangling occurrence.",
);
reverting.set(revertChangeTopicAtom, "structures");
assert.deepEqual(
  reverting.get(structuresDocumentAtom),
  snapshot.structures,
  "Topic revert restores the complete graph atomically.",
);
console.log(
  "Reusable Structures: exact Text defaults, Base preservation, source ownership, direction, graph guards, migration, naming and lifecycle passed.",
);
