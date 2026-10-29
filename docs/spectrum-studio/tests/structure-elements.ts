// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import { designSystemDefaults } from "../src/data/defaults";
import {
  authoringSnapshotAtom,
  assertStoredSnapshot,
  cancelEditAtom,
  createDefaultSnapshot,
  enterEditModeAtom,
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
import {
  defaultsAnalysisInput,
  projectAuthoringDataset,
} from "../src/features/design-data/projection";
import { outputInventory } from "../src/features/design-data/materialization";

const store = createStore();
store.set(structuresDocumentAtom, {
  ...store.get(structuresDocumentAtom),
  structures: store
    .get(structuresDocumentAtom)
    .structures.map((source, index) =>
      index === 0 ? { ...source, elements: [] } : source,
    ),
});
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
const baselineProjection = defaultsAnalysisInput();
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
const barBindings = structuredClone(
  structure().elements!.find((element) => element.id === bar)!.bindings,
);
store.set(updateElementAtom, {
  structureId: id,
  elementId: bar,
  orientation: STRUCTURE_TERM_IDS.vertical,
});
assert.deepEqual(
  structure().elements!.find((element) => element.id === bar)!.bindings,
  barBindings,
);
store.set(updateElementAtom, {
  structureId: id,
  elementId: workflow,
  glyph: "Bell",
});
assert.deepEqual(
  buildTshirtArtifacts(snapshot()),
  native,
  "Bindings, glyphs, orientation and All preview mappings cannot add aliases, lineage or token rows.",
);
const beforePreview = structuredClone(structure());
for (const size of ["xs", "s", "m", "l", "xl"] as const)
  assert.ok(resolve(size).every((element) => !element.issues.length));
assert.notEqual(
  resolve("s").find((element) => element.element.id === text)!.styles.fontSize,
  font.value,
);
assert.deepEqual(
  structure(),
  beforePreview,
  "Preview scaling does not write back the resolved variant.",
);
assert.equal(
  store.get(taxonomyTemplateReferencesAtom).length,
  7,
  "Five authored leaves plus the two source-owned default Text leaves.",
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
store.set(browserTokenEditsAtom, {
  [unitless.nativeId]: {
    values: { [modeKey]: { value: 1.23456789, baseline: unitless.value } },
  },
});
assert.equal(
  resolve().find((element) => element.element.id === text)!.styles.lineHeight,
  1.23456789,
);
store.set(browserTokenEditsAtom, {});
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
corrupt
  .structures!.structures[0].elements!.find((element) => element.id === text)!
  .bindings.find((binding) => binding.slot === "fontSize")!.$ref = unitless.id;
assert.throws(() => assertStoredSnapshot(corrupt), /metric is incompatible/);
store.set(saveEditAtom);
assert.equal(
  store.get(tokenImpactSummaryAtom).affected.count,
  0,
  "Saved template edits add zero token impact.",
);
assert.deepEqual(buildTshirtArtifacts(snapshot()), native);
const templateProjection = projectAuthoringDataset(
  {
    ...designSystemDefaults,
    system: {
      ...designSystemDefaults.system,
      structures: store.get(structuresDocumentAtom),
    },
  },
  baselineProjection.source,
);
assert.deepEqual(templateProjection.errors, []);
assert.deepEqual(
  templateProjection.records.filter((record) => record.category === "tokens"),
  baselineProjection.records.filter((record) => record.category === "tokens"),
  "Template edits preserve every generated concept and mode-value row.",
);
assert.deepEqual(
  outputInventory(templateProjection),
  outputInventory(baselineProjection),
  "Template edits preserve the full canonical inventory, including evaluation samples, recipes and assignment denominators.",
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
store.set(applyStructureRuleAtom, { structureId: id, application: custom });
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
    applications: [...structure().generation!.applications, unrelated],
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
assert.deepEqual(buildTshirtArtifacts(snapshot()), native);
store.set(enterEditModeAtom);
store.set(revertChangeTopicAtom, "structures");
assert.deepEqual(
  store.get(structuresDocumentAtom),
  designSystemDefaults.system.structures,
);
const older = createDefaultSnapshot();
older.structures!.schemaVersion = 2;
for (const structure of older.structures!.structures) delete structure.elements;
const upgraded = upgradeStructureCompositionSnapshot(older, 9);
assert.equal(upgraded.structures!.schemaVersion, STRUCTURES_SCHEMA_VERSION);
assert.deepEqual(upgraded.structures!.structures[0].elements, []);
assert.deepEqual(
  upgraded.structures!.structures[0].generation,
  older.structures!.structures[0].generation,
);
assert.deepEqual(upgraded.colorSystem, older.colorSystem);
assert.deepEqual(templateTargets(base.generation!.applications[0]), {
  kind: "all",
});
assert.deepEqual(templateTargets({ ...custom, previewTargets: undefined }), {
  kind: "custom",
  bindingIds: [],
});

const only = createStore();
only.set(enterEditModeAtom);
const plain = createStructure("Preview only");
delete plain.generation;
only.set(structuresDocumentAtom, { schemaVersion: 3, structures: [plain] });
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
only.set(applyStructureRuleAtom, {
  structureId: plain.conceptId,
  application: {
    id: crypto.randomUUID(),
    ruleId: base.generation!.applications[0].ruleId,
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
assert.throws(
  () =>
    only.set(editElementsAtom, {
      structureId: plain.conceptId,
      elements: [
        { ...previewOnly.elements![0], termId: ELEMENT_TYPES.bar.termId },
      ],
    }),
  /invalid/i,
  "Invalid element graphs are rejected rather than partially saved.",
);
console.log(
  "Structure elements: ordered editing, typed units/live references, preview-only sizes, dependency guards, exact Undo/lifecycle and unchanged complete layout-token output passed.",
);
