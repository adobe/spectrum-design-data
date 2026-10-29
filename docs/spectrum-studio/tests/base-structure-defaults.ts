// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import { designSystemDefaults } from "../src/data/defaults";
import {
  createDefaultSnapshot,
  assertStoredSnapshot,
  authoringSnapshotAtom,
  editSessionSnapshotAtom,
  restoreAuthoringSnapshotAtom,
} from "../src/features/edit-session/state";
import { COMPONENT_SIZES } from "../src/features/foundations/componentSizes";
import { createTshirtMappings } from "../src/features/logic/model";
import {
  structureGeneration,
  structureSelection,
} from "../src/features/structures/model";
import { STRUCTURE_TERM_IDS } from "../src/features/structures/vocabulary";
import { SIZE_TERM_IDS } from "../src/features/taxonomy/variantVocabulary";
import { primitiveReferencesAtom } from "../src/features/tokens/primitiveReferenceState";
import { buildTshirtArtifacts } from "../src/features/design-data/tshirtArtifacts";
import { assertTshirtGraph } from "../src/features/design-data/tshirtProfile";
import { tshirtTokenImpactRecords } from "../src/features/design-data/tshirtChanges";
import { tshirtUnsavedImpactAtom } from "../src/features/design-data/tshirtState";
import {
  changeGroupsAtom,
  revertChangeItemAtom,
  revertChangeTopicAtom,
} from "../src/features/changelog/state";
import { enterEditModeAtom } from "../src/features/edit-session/state";
import {
  addStructureAtom,
  assignStructureAtom,
  removeStructureAtom,
  structuresDocumentAtom,
} from "../src/features/structures/state";
import { replaceRuleAtom } from "../src/features/logic/state";
import {
  defaultsAnalysisInput,
  projectAuthoringDataset,
} from "../src/features/design-data/projection";
import { outputInventory } from "../src/features/design-data/materialization";
import {
  foundationImpactSummaryAtom,
  tokenImpactSummaryAtom,
} from "../src/features/impact/state";

const system = designSystemDefaults.system;
assert.equal(system.structures.structures.length, 2);
const baseStructure = system.structures.structures[0];
assert.equal(baseStructure.name, "Base");
for (const slot of ["width", "height"] as const) {
  assert.deepEqual(structureSelection(baseStructure, slot), {
    value: { kind: "sizing", preset: "hug" },
  });
}
assert.deepEqual(structureSelection(baseStructure, "horizontal"), {
  value: { kind: "term", termId: STRUCTURE_TERM_IDS.left },
});
assert.deepEqual(structureSelection(baseStructure, "vertical"), {
  value: { kind: "term", termId: STRUCTURE_TERM_IDS.top },
});
for (const slot of [
  "minWidth",
  "maxWidth",
  "minHeight",
  "maxHeight",
  "paddingTop",
  "paddingBottom",
  "elevation",
] as const) {
  assert.equal(
    structureSelection(baseStructure, slot),
    null,
    "Unspecified fields remain unassigned.",
  );
}
const generation = structureGeneration(baseStructure);
assert.deepEqual(
  generation.sizeTermIds,
  COMPONENT_SIZES.map((size) => SIZE_TERM_IDS[size.id]),
);
assert.equal(generation.applications.length, 1);
assert.deepEqual(generation.applications[0].targets, { kind: "all" });
assert.equal(
  system.taxonomy.terms.find((term) => term.id === generation.nameRef?.termId)
    ?.value,
  "Base",
);
const sizingRule = system.rules.find(
  (rule) => rule.id === generation.applications[0].ruleId,
);
assert.ok(sizingRule?.type === "tshirt-sizing");
assert.equal(sizingRule.movement, "available-token");
assert.deepEqual(sizingRule.mappings, createTshirtMappings("available-token"));

const fresh = createStore();
const references = fresh.get(primitiveReferencesAtom);
for (const [slot, name] of [
  ["gap", "spacing-base-gap-100"],
  ["paddingLeft", "spacing-base-horizontal-100"],
  ["paddingRight", "spacing-base-horizontal-100"],
  ["radiusTopLeft", "radius-100"],
  ["radiusTopRight", "radius-100"],
  ["radiusBottomRight", "radius-100"],
  ["radiusBottomLeft", "radius-100"],
] as const) {
  const matching = references.filter((reference) => reference.name === name);
  assert.equal(
    matching.length,
    1,
    `${name} identifies exactly one current foundation token.`,
  );
  assert.deepEqual(structureSelection(baseStructure, slot), {
    $ref: matching[0].id,
  });
}

const shippedSnapshot = createDefaultSnapshot();
assert.deepEqual(shippedSnapshot.structures, system.structures);
assert.deepEqual(
  fresh.get(authoringSnapshotAtom),
  shippedSnapshot,
  "Fresh authoring and its shipped baseline use the same default data.",
);
assertStoredSnapshot(shippedSnapshot);
assert.deepEqual(
  fresh.get(changeGroupsAtom),
  [],
  "Shipped Base data is not reported as a user edit.",
);
assert.equal(fresh.get(foundationImpactSummaryAtom).edited.count, 0);
assert.equal(fresh.get(tokenImpactSummaryAtom).affected.count, 0);
const shipped = buildTshirtArtifacts(shippedSnapshot, "shipped");
assertTshirtGraph(shipped.tokens);
assert.equal(
  shipped.semantics.length,
  20,
  "Base retains 15 concepts and Text adds its five gap concepts.",
);
const baseRows = shipped.semantics.filter(
  (row) => row.structureId === baseStructure.conceptId,
);
assert.equal(
  baseRows.length,
  15,
  "Three Base properties still generate five semantic size concepts each.",
);
for (const size of COMPONENT_SIZES) {
  const rows = baseRows.filter((row) => row.size === size.id);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map((row) => row.token.name.property).sort(), [
    "corner-radius",
    "gap",
    "padding",
  ]);
  assert.equal(
    rows.find((row) => row.token.name.property === "padding")!.token.name
      .orientation,
    "horizontal",
  );
  assert.ok(
    rows.every((row) => Object.keys(row.context).length === 0),
    "Unbound defaults do not invent mode contexts.",
  );
}
assert.equal(
  baseRows.filter((row) => "value" in row.token).length,
  10,
  "Hidden Base spacing sources generate live literal values.",
);
const aliases = baseRows.filter((row) => "$ref" in row.token);
assert.equal(
  aliases.length,
  5,
  "Published radius generates UUID aliases for all five sizes.",
);
for (const row of aliases) {
  assert.notEqual(
    row.token.$ref,
    row.target.id,
    "Emitted row UUIDs are distinct from authoring reference UUIDs.",
  );
  assert.ok(
    shipped.tokens.some(
      (token) => token.uuid === row.token.$ref && "value" in token,
    ),
  );
}
const impact = tshirtTokenImpactRecords(shipped, shipped);
assert.equal(impact.length, 20);
assert.equal(
  impact.flatMap((record) => record.modeValues).length,
  20,
  "The shipped baseline counts only actual generated values.",
);
assert.ok(
  impact.every(
    (record) =>
      !record.manuallyOverridden &&
      !record.nameChanged &&
      !record.metadataChanged &&
      !record.referenceChanged &&
      record.modeValues.every((value) => !value.changed),
  ),
);
assert.deepEqual(fresh.get(tshirtUnsavedImpactAtom), {
  added: 0,
  removed: 0,
  saved: 20,
  values: 20,
  error: "",
});

const changedGap = structuredClone(shippedSnapshot);
const gapAnchor = references.find(
  (reference) => reference.name === "spacing-base-gap-100",
)!;
changedGap.spacing!.scales.find(
  (scale) => scale.id === gapAnchor.sourceId,
)!.base = 9;
const previousGap = shipped.semantics.find(
  (row) => row.size === "m" && row.token.name.property === "gap",
)!;
const regeneratedGap = buildTshirtArtifacts(changedGap).semantics.find(
  (row) => row.token.uuid === previousGap.token.uuid,
)!;
assert.equal(previousGap.token.value, "6px");
assert.equal(
  regeneratedGap.token.value,
  "9px",
  "Hidden default bindings stay live rather than freezing copied values.",
);

const beforeBase = structuredClone(designSystemDefaults);
beforeBase.system.structures.structures = [];
beforeBase.system.rules = beforeBase.system.rules.filter(
  (rule) => rule.id !== sizingRule.id,
);
const currentAnalysis = defaultsAnalysisInput();
const previousAnalysis = projectAuthoringDataset(
  beforeBase,
  currentAnalysis.source,
);
assert.deepEqual(currentAnalysis.errors, []);
assert.deepEqual(previousAnalysis.errors, []);
const foundationRecords = (records: typeof currentAnalysis.records) =>
  records.filter((record) => record.pointer.startsWith("/system/foundations/"));
assert.deepEqual(
  foundationRecords(currentAnalysis.records),
  foundationRecords(previousAnalysis.records),
  "Adding Base preserves every existing foundation source, primitive value, identity and context.",
);
const currentInventory = outputInventory(currentAnalysis),
  previousInventory = outputInventory(previousAnalysis);
assert.equal(
  currentInventory.counts.evaluationSamples,
  previousInventory.counts.evaluationSamples,
);
assert.equal(
  currentInventory.counts.generatedOutputs,
  previousInventory.counts.generatedOutputs + 20,
);
assert.equal(
  currentInventory.counts.explicitAssignments,
  previousInventory.counts.explicitAssignments,
);

const editing = createStore();
editing.set(enterEditModeAtom);
const alternateGap = references.find(
  (reference) =>
    reference.sourceId === gapAnchor.sourceId && reference.index === 1,
)!;
const layout = {
  availableWidth: 500,
  availableHeight: 300,
  naturalWidth: 98,
  naturalHeight: 34,
};
editing.set(assignStructureAtom, {
  id: baseStructure.conceptId,
  changes: { gap: { $ref: alternateGap.id } },
  layout,
});
const changedBase = editing
  .get(changeGroupsAtom)
  .find((group) => group.id === "structures")!.items[0];
assert.equal(changedBase.kind, "modified");
assert.throws(() => fresh.set(revertChangeItemAtom, changedBase), /edit mode/);
assert.deepEqual(fresh.get(authoringSnapshotAtom), shippedSnapshot);
editing.set(revertChangeItemAtom, changedBase);
assert.deepEqual(
  editing.get(structuresDocumentAtom),
  system.structures,
  "Reverting a modified shipped Structure restores it rather than deleting it.",
);
editing.set(removeStructureAtom, baseStructure.conceptId);
const removedBase = editing
  .get(changeGroupsAtom)
  .find((group) => group.id === "structures")!.items[0];
assert.equal(removedBase.kind, "removed");
editing.set(addStructureAtom);
editing.set(revertChangeItemAtom, removedBase);
assert.deepEqual(
  editing.get(structuresDocumentAtom).structures[0],
  baseStructure,
  "Reverting deletion restores Base in its shipped position.",
);
editing.set(revertChangeTopicAtom, "structures");
assert.deepEqual(editing.get(structuresDocumentAtom), system.structures);
assert.deepEqual(editing.get(changeGroupsAtom), []);
editing.set(replaceRuleAtom, {
  ...sizingRule,
  mappings: sizingRule.mappings.map((mapping) =>
    mapping.termId === SIZE_TERM_IDS.s ? { ...mapping, offset: -2 } : mapping,
  ),
});
assert.notDeepEqual(editing.get(authoringSnapshotAtom).rules, system.rules);
editing.set(revertChangeTopicAtom, "logic");
assert.deepEqual(
  editing.get(authoringSnapshotAtom).rules,
  system.rules,
  "The shipped Base application does not block restoring shipped Logic definitions.",
);

const existingAuthored = structuredClone(shippedSnapshot);
assert.ok(existingAuthored.structures);
existingAuthored.structures.structures = [];
existingAuthored.rules = existingAuthored.rules!.filter(
  (rule) => rule.id !== sizingRule.id,
);
const restored = createStore();
restored.set(restoreAuthoringSnapshotAtom, existingAuthored);
restored.set(editSessionSnapshotAtom, existingAuthored);
assert.deepEqual(
  restored.get(authoringSnapshotAtom),
  existingAuthored,
  "New shipped defaults never overwrite an existing authored snapshot.",
);
assert.deepEqual(restored.get(tshirtUnsavedImpactAtom), {
  added: 0,
  removed: 0,
  saved: 0,
  values: 0,
  error: "",
});

console.log(
  "Base defaults: exact UUID bindings, all sizes, live hidden literals, published aliases, shipped accounting and authored-data preservation passed.",
);
