// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import { designSystemDefaults } from "../src/data/defaults";
import { editModeAtom } from "../src/state/view/editMode";
import {
  authoringSnapshotAtom,
  assertStoredSnapshot,
  cancelEditAtom,
  createDefaultSnapshot,
  enterEditModeAtom,
  restoreAuthoringSnapshotAtom,
  saveEditAtom,
} from "../src/features/edit-session/state";
import { upgradeStructureCompositionSnapshot } from "../src/features/edit-session/structureCompositionUpgrade";
import {
  STRUCTURES_SCHEMA_VERSION,
  createStructure,
  isStructuresDocument,
  structureGeneration,
} from "../src/features/structures/model";
import {
  ELEMENT_TYPES,
  createElement,
  elementBindingId,
  isStructureElement,
} from "../src/features/structures/elements";
import {
  editElementsAtom,
  insertElementAtom,
  removeElementAtom,
  restoreElementAtom,
  updateElementAtom,
} from "../src/features/structures/elementState";
import {
  structuresDocumentAtom,
  applyStructureRuleAtom,
} from "../src/features/structures/state";
import {
  appliedElementBindings,
  resolveElements,
  templateTargets,
} from "../src/features/structures/elementResolution";
import { STRUCTURE_TERM_IDS } from "../src/features/structures/vocabulary";
import { primitiveReferencesAtom } from "../src/features/tokens/primitiveReferenceState";
import { primitiveReferenceId } from "../src/features/tokens/primitiveIdentity";
import { tokenUuid } from "../src/features/tokens/model";
import { buildTshirtArtifacts } from "../src/features/design-data/tshirtArtifacts";
import { rulesAtom } from "../src/features/logic/library";
import { resolveTshirtRule } from "../src/features/logic/tshirt";
import { SIZE_TERM_IDS } from "../src/features/taxonomy/variantVocabulary";
import {
  updateTypographyAtom,
  typographyDocumentAtom,
  removeLineHeightAtom,
} from "../src/features/typography/state";
import { browserTokenEditsAtom } from "../src/features/tokens/browserEdits";
import { browserModeContextAtom } from "../src/features/tokens/browserState";
import { updateSizeScaleAtom } from "../src/features/size/state";
import {
  editReferencedTaxonomyAtom,
  taxonomyTemplateReferencesAtom,
} from "../src/features/taxonomy/editing";
import { taxonomyDocumentAtom } from "../src/features/taxonomy/state";
import {
  changeGroupsAtom,
  revertChangeTopicAtom,
} from "../src/features/changelog/state";
import { fittedMenuWidth } from "../src/components/fields/menuSizing";
import { tokenImpactSummaryAtom } from "../src/features/impact/state";
import { TOKEN_IMPACT_SOURCES } from "../src/features/impact/sources";
import { isTokenAffected } from "../src/features/impact/summaries";
import { projectSnapshot } from "../src/features/design-data/authoringProjection";
import { outputInventory } from "../src/features/design-data/materialization";
import { inlineFixtureReferences } from "./fixtures/componentReferences";

const store = createStore();
store.set(enterEditModeAtom);
const initial = store.get(structuresDocumentAtom).structures[0];
for (const element of initial.elements ?? [])
  store.set(removeElementAtom, {
    structureId: initial.conceptId,
    elementId: element.id,
    confirmed: true,
  });
store.set(saveEditAtom);
store.set(editModeAtom, false);
assertStoredSnapshot(store.get(authoringSnapshotAtom));
assert.equal(fittedMenuWidth(100, 360, 800), 360);
assert.equal(fittedMenuWidth(100, 360, 320), 296);
assert.equal(fittedMenuWidth(100, 360, 800, 240), 240);
assert.equal(fittedMenuWidth(100, 360, 800, 40), 100);
assert.throws(
  () => fittedMenuWidth(100, 360, 800, Number.NaN),
  /positive pixel/,
);
const base = designSystemDefaults.system.structures.structures[0];
const id = base.conceptId;
const snapshot = () => store.get(authoringSnapshotAtom);
const structure = () =>
  store
    .get(structuresDocumentAtom)
    .structures.find((structure) => structure.conceptId === id)!;
const native = buildTshirtArtifacts(snapshot());
const baselineProjection = projectSnapshot(snapshot(), "saved");
const baselineTemplateReferences = store.get(taxonomyTemplateReferencesAtom);
assert.deepEqual(baselineProjection.errors, []);
assert.throws(
  () =>
    store.set(insertElementAtom, { structureId: id, kind: "text", index: 0 }),
  /edit mode/,
);
store.set(enterEditModeAtom);
const references = store.get(primitiveReferencesAtom);
const font = references.find(
  (reference) => reference.metricId === "font-size" && reference.index === 0,
)!;
const pixel = references.find(
  (reference) =>
    reference.metricId?.endsWith("-lineHeight") && reference.index === 0,
)!;
const unitless = references.find(
  (reference) =>
    reference.metricId?.endsWith("-unitlessLineHeight") &&
    reference.index === 0,
)!;
const icon = references.find(
  (reference) =>
    reference.metricId === "workflow-icon-size" && reference.index === 0,
)!;
const length = references.find(
  (reference) => reference.family === "size" && reference.index === 0,
)!;
assert.ok(font.measurement?.kind === "nominal-font-size");
assert.notEqual(pixel.id, unitless.id);
assert.equal(unitless.unit, "multiplier");
assert.equal(
  primitiveReferenceId("typography", "typography:font-size", 0),
  tokenUuid("authoring-typography:v1:font-size:0"),
  "Reuse the canonical Typography alias identity.",
);
const text = store.set(insertElementAtom, {
  structureId: id,
  kind: "text",
  index: 0,
});
const visual = store.set(insertElementAtom, {
  structureId: id,
  kind: "visual",
  index: 1,
});
const workflow = store.set(insertElementAtom, {
  structureId: id,
  kind: "workflowIcon",
  index: 0,
});
const ui = store.set(insertElementAtom, {
  structureId: id,
  kind: "uiIcon",
  index: 2,
});
const bar = store.set(insertElementAtom, {
  structureId: id,
  kind: "bar",
  index: 4,
});
assert.deepEqual(
  structure().elements!.map((element) => element.id),
  [workflow, text, ui, visual, bar],
);
assert.throws(
  () =>
    store.set(insertElementAtom, { structureId: id, kind: "bar", index: -1 }),
  /location/,
);
assert.equal(structure().elements!.length, 5);
assert.deepEqual(
  buildTshirtArtifacts(snapshot()),
  native,
  "Unassigned children do not change the complete native token bundle.",
);
assert.ok(
  store.get(changeGroupsAtom).find((group) => group.id === "structures"),
);
const bind = (
  elementId: string,
  slot: Parameters<typeof elementBindingId>[1],
  referenceId: string,
) =>
  store.set(updateElementAtom, {
    structureId: id,
    elementId,
    slot,
    referenceId,
  });
assert.throws(
  () => bind(text, "fontSize", length.id),
  /unavailable or incompatible/,
);
assert.throws(
  () => bind(visual, "width", unitless.id),
  /unavailable or incompatible/,
);
assert.throws(() => bind(workflow, "width", length.id), /invalid/);
bind(text, "fontSize", font.id);
bind(text, "lineHeight", pixel.id);
bind(workflow, "size", icon.id);
bind(ui, "size", length.id);
bind(visual, "width", length.id);
bind(visual, "height", length.id);
bind(bar, "length", length.id);
bind(bar, "thickness", length.id);
const resolve = (size: "xs" | "s" | "m" | "l" | "xl" = "m") =>
  resolveElements(
    structure(),
    store.get(primitiveReferencesAtom),
    store.get(rulesAtom),
    size,
  );
assert.ok(resolve().every((element) => !element.issues.length));
assert.equal(
  resolve().find((element) => element.element.id === text)!.styles.lineHeight,
  `${pixel.value}px`,
);
bind(text, "lineHeight", unitless.id);
assert.equal(
  resolve().find((element) => element.element.id === text)!.styles.lineHeight,
  unitless.value,
);
const iconStyles = resolve().find(
  (element) => element.element.id === workflow,
)!.styles;
assert.equal(iconStyles.width, icon.value);
assert.equal(iconStyles.height, icon.value);
const boundBar = structure().elements!.find((element) => element.id === bar);
assert.ok(isStructureElement(boundBar));
const barBindings = structuredClone(boundBar.bindings);
const boundNative = buildTshirtArtifacts(snapshot());
const boundLeaves = structure().elements!;
assert.ok(boundLeaves.every(isStructureElement));
const leafBindingIds = new Set(
  boundLeaves.flatMap((element) =>
    element.bindings.map((binding) => binding.id),
  ),
);
const leafSemantics = boundNative.semantics.filter((row) =>
  row.bindingIds.some((bindingId) => leafBindingIds.has(bindingId)),
);
assert.deepEqual(
  new Set(leafSemantics.flatMap((row) => row.bindingIds)),
  leafBindingIds,
  "Every bound leaf property contributes contextual semantic output.",
);
assert.ok(leafSemantics.every((row) => row.structureId === id));
assert.deepEqual(
  boundNative.semantics.filter(
    (row) => !row.bindingIds.some((bindingId) => leafBindingIds.has(bindingId)),
  ),
  native.semantics,
  "Adding leaf bindings preserves all existing semantic rows.",
);
store.set(updateElementAtom, {
  structureId: id,
  elementId: bar,
  orientation: STRUCTURE_TERM_IDS.vertical,
});
const reorientedBar = structure().elements!.find(
  (element) => element.id === bar,
);
assert.ok(isStructureElement(reorientedBar));
assert.deepEqual(reorientedBar.bindings, barBindings);
store.set(updateElementAtom, {
  structureId: id,
  elementId: workflow,
  glyph: "Bell",
});
assert.deepEqual(
  buildTshirtArtifacts(snapshot()),
  boundNative,
  "Glyphs and orientation do not change generated tokens or lineage.",
);
const beforePreview = structuredClone(structure());
for (const size of ["xs", "s", "m", "l", "xl"] as const)
  assert.ok(resolve(size).every((element) => !element.issues.length));
assert.equal(
  resolve("s").find((element) => element.element.id === text)!.styles.fontSize,
  font.value,
  "Base's current rule excludes font-size changes and retains the anchor.",
);
assert.ok(
  !appliedElementBindings(structure(), store.get(rulesAtom), references).some(
    (item) => item.binding.id === elementBindingId(text, "fontSize"),
  ),
);
assert.deepEqual(
  structure(),
  beforePreview,
  "Preview scaling does not write back the resolved variant.",
);
const templateReferences = store.get(taxonomyTemplateReferencesAtom);
assert.deepEqual(
  templateReferences.filter((reference) =>
    baselineTemplateReferences.some((baseline) => baseline.id === reference.id),
  ),
  baselineTemplateReferences,
  "Existing source-owned template references remain unchanged.",
);
assert.deepEqual(
  new Set(
    templateReferences
      .filter(
        (reference) =>
          !baselineTemplateReferences.some(
            (baseline) => baseline.id === reference.id,
          ),
      )
      .map((reference) => reference.id),
  ),
  new Set([workflow, text, ui, visual, bar]),
  "Each newly authored leaf contributes exactly one Registry reference.",
);
assert.throws(
  () =>
    store.set(editReferencedTaxonomyAtom, {
      ...store.get(taxonomyDocumentAtom),
      terms: store
        .get(taxonomyDocumentAtom)
        .terms.filter((term) => term.id !== ELEMENT_TYPES.text.termId),
    }),
  /Registry type/,
);
bind(
  visual,
  "width",
  references.find(
    (reference) =>
      reference.family === "size" &&
      reference.sourceId === length.sourceId &&
      reference.index === 1,
  )!.id,
);
assert.throws(
  () =>
    store.set(updateSizeScaleAtom, {
      id: length.sourceId,
      patch: { above: 0, below: 0 },
    }),
  /unavailable|compatible/,
  "All current child targets still need existing source steps.",
);
bind(visual, "width", length.id);
const typography = store.get(typographyDocumentAtom);
const cardId = unitless.metricId!.replace(/-unitlessLineHeight$/, "");
assert.throws(
  () =>
    store.set(removeLineHeightAtom, {
      id: cardId,
      replacementId: typography.lineHeights.find((card) => card.id !== cardId)!
        .id,
    }),
  /template token source/,
);
bind(
  text,
  "fontSize",
  references.find(
    (reference) => reference.metricId === "font-size" && reference.index === -1,
  )!.id,
);
assert.throws(
  () => store.set(updateTypographyAtom, { smallSizes: 0 }),
  /template token source/,
);
bind(text, "fontSize", font.id);
const modeKey = store.get(browserModeContextAtom).key;
const originalEdits = store.get(browserTokenEditsAtom);
store.set(browserTokenEditsAtom, {
  ...originalEdits,
  [unitless.nativeId]: {
    ...originalEdits[unitless.nativeId],
    values: { [modeKey]: { value: 1.23456789, baseline: unitless.value } },
  },
});
assert.equal(
  resolve().find((element) => element.element.id === text)!.styles.lineHeight,
  1.23456789,
);
store.set(browserTokenEditsAtom, originalEdits);
assert.equal(
  isStructureElement({
    ...createElement("text"),
    bindings: [
      {
        id: elementBindingId(text, "width"),
        slot: "width",
        $ref: length.id,
        family: "size",
      },
    ],
  }),
  false,
);
assert.equal(
  isStructureElement({ ...createElement("text"), kind: "control" }),
  false,
);
assert.equal(
  isStructureElement({
    ...createElement("workflowIcon"),
    glyph: "Not a glyph",
  }),
  false,
);
const preservedText = createElement("text", text);
assert.equal(preservedText.id, text);
assert.ok(isStructureElement(preservedText));
assert.equal(
  isStructuresDocument({
    schemaVersion: 3,
    structures: [
      {
        ...structure(),
        elements: [createElement("text", text), createElement("text", text)],
      },
    ],
  }),
  false,
);
const corrupt = structuredClone(snapshot());
const corruptText = corrupt.structures!.structures[0].elements!.find(
  (element) => element.id === text,
);
assert.ok(isStructureElement(corruptText));
const corruptFont = corruptText.bindings.find(
  (binding) => binding.slot === "fontSize",
);
assert.ok(corruptFont && typeof corruptFont.$ref === "string");
corruptFont.$ref = unitless.id;
assert.throws(() => assertStoredSnapshot(corrupt), /metric is incompatible/);
store.set(saveEditAtom);
const savedNative = buildTshirtArtifacts(snapshot());
const semanticValues = (bundle: typeof savedNative) =>
  bundle.semantics
    .map((row) => ({
      bindings: row.bindingIds,
      context: row.context,
      value: row.target.value,
    }))
    .sort((left, right) =>
      JSON.stringify(left).localeCompare(JSON.stringify(right)),
    );
assert.deepEqual(
  semanticValues(savedNative),
  semanticValues(boundNative),
  "Save allocates publication identities without changing semantic values.",
);
const templateProjection = projectSnapshot(snapshot(), "saved");
assert.deepEqual(templateProjection.errors, []);
const tokenFacts = (records: typeof templateProjection.records) =>
  records
    .filter((record) => record.category === "tokens")
    .map(({ id, conceptId, context, value, reference, unit }) => ({
      id,
      conceptId,
      context,
      value,
      reference,
      unit,
    }));
const baselineTokens = tokenFacts(baselineProjection.records);
const templateTokens = tokenFacts(templateProjection.records);
assert.deepEqual(
  templateTokens.filter((record) =>
    baselineTokens.some((baseline) => baseline.id === record.id),
  ),
  baselineTokens,
  "Leaf output preserves every pre-existing token concept and mode-value row.",
);
const addedRows = savedNative.semantics.filter((row) =>
  row.bindingIds.some((bindingId) => leafBindingIds.has(bindingId)),
);
const shippedConcepts = new Set(
  buildTshirtArtifacts(createDefaultSnapshot()).semantics.map(
    (row) => row.conceptId,
  ),
);
const newConcepts = new Set(
  addedRows
    .filter((row) => !shippedConcepts.has(row.conceptId))
    .map((row) => row.conceptId),
);
assert.ok(newConcepts.size > 0);
const affectedRecords = TOKEN_IMPACT_SOURCES.flatMap((source) =>
  store.get(source.recordsAtom),
).filter(isTokenAffected);
for (const conceptId of newConcepts)
  assert.ok(
    affectedRecords.some((record) => record.tokenId === conceptId),
    "Every newly published leaf concept contributes to shipped-baseline Impact.",
  );
assert.equal(
  store.get(tokenImpactSummaryAtom).affected.count,
  affectedRecords.length,
  "The Impact summary retains the complete saved generated-token accounting.",
);
assert.deepEqual(
  new Set(
    templateTokens
      .filter(
        (record) =>
          !baselineTokens.some((baseline) => baseline.id === record.id),
      )
      .map((record) => record.conceptId),
  ),
  new Set(addedRows.map((row) => row.conceptId)),
  "Analysis reports exactly the newly generated leaf concepts.",
);
assert.equal(
  outputInventory(templateProjection).counts.generatedOutputs -
    outputInventory(baselineProjection).counts.generatedOutputs,
  templateTokens.length - baselineTokens.length,
  "The output inventory accounts for every added generated row.",
);
assert.equal(
  outputInventory(templateProjection).counts.evaluationSamples,
  outputInventory(baselineProjection).counts.evaluationSamples,
  "Leaf bindings do not add foundation evaluation samples.",
);
store.set(enterEditModeAtom);
const layoutIds = base.properties
  .filter((binding) => "$ref" in binding)
  .map((binding) => binding.id);
const custom = {
  ...structureGeneration(structure()).applications[0],
  targets: { kind: "custom" as const, bindingIds: layoutIds.slice(1) },
  previewTargets: {
    kind: "custom" as const,
    bindingIds: [elementBindingId(text, "fontSize")],
  },
};
const unrelated = {
  id: crypto.randomUUID(),
  ruleId: custom.ruleId,
  targets: { kind: "custom" as const, bindingIds: [layoutIds[0]] },
};
store.set(editElementsAtom, {
  structureId: id,
  elements: structure().elements!,
  generation: {
    ...structure().generation!,
    applications: [custom, unrelated],
  },
});
assert.throws(
  () =>
    store.set(removeElementAtom, {
      structureId: id,
      elementId: text,
      confirmed: false,
    }),
  /Confirm/,
);
const beforeDelete = structuredClone(structure());
const removed = store.set(removeElementAtom, {
  structureId: id,
  elementId: text,
  confirmed: true,
});
assert.deepEqual(
  structureGeneration(structure()).applications[0].targets,
  custom.targets,
);
assert.deepEqual(
  structureGeneration(structure()).applications[0].previewTargets,
  { kind: "custom", bindingIds: [] },
);
assert.deepEqual(
  structure().generation!.applications[1],
  unrelated,
  "Deletion must not materialize or change an unrelated Custom application's preview targets.",
);
store.set(restoreElementAtom, removed);
assert.deepEqual(
  structure(),
  beforeDelete,
  "Undo restores exact position, properties and Custom preview targets.",
);
store.set(cancelEditAtom);
assert.deepEqual(buildTshirtArtifacts(snapshot()), savedNative);
store.set(enterEditModeAtom);
store.set(revertChangeTopicAtom, "structures");
assert.deepEqual(
  store.get(structuresDocumentAtom),
  designSystemDefaults.system.structures,
);
const older = createDefaultSnapshot();
older.structures!.schemaVersion = 2;
for (const structure of older.structures!.structures) {
  delete structure.elements;
  delete structure.editor;
  if (structure.generation) {
    structure.generation.sizeTermIds = Object.values(SIZE_TERM_IDS);
    structure.generation.applications =
      structure.generation.applications.filter((application) => {
        delete application.previewTargets;
        return (
          application.targets.kind === "all" ||
          application.targets.bindingIds.length > 0
        );
      });
  }
}
assert.ok(isStructuresDocument(older.structures));
const upgraded = upgradeStructureCompositionSnapshot(older, 9);
assert.equal(upgraded.structures!.schemaVersion, STRUCTURES_SCHEMA_VERSION);
assert.deepEqual(upgraded.structures!.structures[0].elements, []);
assert.deepEqual(
  upgraded.structures!.structures[0].generation,
  older.structures!.structures[0].generation,
);
assert.deepEqual(upgraded.colorSystem, older.colorSystem);
assert.deepEqual(
  templateTargets({ ...custom, previewTargets: { kind: "all" } }),
  { kind: "all" },
);
assert.deepEqual(templateTargets({ ...custom, previewTargets: undefined }), {
  kind: "custom",
  bindingIds: [],
});

const only = createStore();
only.set(
  restoreAuthoringSnapshotAtom,
  inlineFixtureReferences(
    only.get(authoringSnapshotAtom),
    (target) => target.kind === "semantic",
  ),
);
only.set(enterEditModeAtom);
const plain = createStructure("Preview only");
delete plain.generation;
only.set(structuresDocumentAtom, {
  ...only.get(structuresDocumentAtom),
  structures: [plain],
});
const child = only.set(insertElementAtom, {
  structureId: plain.conceptId,
  kind: "text",
  index: 0,
});
const unbound = only.set(insertElementAtom, {
  structureId: plain.conceptId,
  kind: "bar",
  index: 1,
});
const unboundRemoval = only.set(removeElementAtom, {
  structureId: plain.conceptId,
  elementId: unbound,
  confirmed: false,
});
assert.equal(
  only.get(structuresDocumentAtom).structures[0].generation,
  undefined,
  "Removing an untargeted child must not create sizing settings.",
);
only.set(restoreElementAtom, unboundRemoval);
assert.equal(
  only.get(structuresDocumentAtom).structures[0].generation,
  undefined,
);
only.set(updateElementAtom, {
  structureId: plain.conceptId,
  elementId: child,
  slot: "fontSize",
  referenceId: font.id,
});
const previewRule = {
  ...resolveTshirtRule(
    only.get(rulesAtom),
    base.generation!.applications[0].ruleId,
  ),
  id: crypto.randomUUID(),
  name: "Element preview test",
  locked: false,
  applicability: { kind: "all" as const },
};
only.set(rulesAtom, [...only.get(rulesAtom), previewRule]);
only.set(applyStructureRuleAtom, {
  structureId: plain.conceptId,
  application: {
    id: crypto.randomUUID(),
    ruleId: previewRule.id,
    targets: { kind: "custom", bindingIds: [] },
    previewTargets: { kind: "all" },
  },
});
const previewOnly = only.get(structuresDocumentAtom).structures[0];
assert.equal(previewOnly.generation!.nameRef, undefined);
assert.equal(
  buildTshirtArtifacts(only.get(authoringSnapshotAtom)).tokens.length,
  0,
);
const applied = previewOnly.generation!.applications[0];
const duplicate = { ...applied, id: crypto.randomUUID() };
assert.throws(
  () =>
    appliedElementBindings(
      {
        ...previewOnly,
        generation: {
          ...previewOnly.generation!,
          applications: [applied, duplicate],
        },
      },
      only.get(rulesAtom),
    ),
  /overlap/,
);
assert.equal(previewOnly.generation!.sizeTermIds[0], SIZE_TERM_IDS.m);
const previewElement = previewOnly.elements![0];
assert.ok(isStructureElement(previewElement));
assert.throws(
  () =>
    only.set(editElementsAtom, {
      structureId: plain.conceptId,
      elements: [{ ...previewElement, termId: ELEMENT_TYPES.bar.termId }],
    }),
  /invalid/i,
  "Invalid element graphs are rejected rather than partially saved.",
);
console.log(
  "Structure elements: bound-leaf publication, metadata-only previews, dependency guards, Analysis/Impact, migration and exact Undo/lifecycle passed.",
);
