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
  restoreAuthoringSnapshotAtom,
  saveEditAtom,
} from "../src/features/edit-session/state";
import {
  createLocalVariantProperty,
  createBooleanProperty,
} from "../src/features/option-groups/model";
import {
  duplicateVariantOption,
  makeVariantOptionDefault,
  removeVariantOption,
  renameVariantOption,
  renameVariantProperty,
} from "../src/features/structures/variantOperations";
import { structuresDocumentAtom } from "../src/features/structures/documentState";
import { updateStructureEditorAtom } from "../src/features/structures/variantState";
import { createStructure } from "../src/features/structures/model";
import { createElement } from "../src/features/structures/elements";
import {
  emptyStructureEditor,
  resolveStructureOptions,
  structureEditor,
} from "../src/features/structures/variants";
import { primitiveReferencesAtom } from "../src/features/tokens/primitiveReferenceState";
import { updateElementAtom } from "../src/features/structures/elementState";
import { buildTshirtArtifacts } from "../src/features/design-data/tshirtArtifacts";
import { compareAuthoring } from "../src/features/changelog/registry";
import { reconcileStructureNames } from "../src/features/structures/registeredNames";
import { registerVariantProperty } from "../src/features/option-groups/naming";

const fixture = createDefaultSnapshot();
const structure = createStructure("Local properties");
const visual = createElement("visual");
structure.elements = [visual];
fixture.structures!.structures.push(structure);
const registered = reconcileStructureNames(
  fixture.taxonomy!,
  fixture.structures!,
  fixture.structures!,
);
fixture.taxonomy = registered.taxonomy;
fixture.structures = registered.document;
const store = createStore();
store.set(restoreAuthoringSnapshotAtom, fixture);
store.set(editSessionSnapshotAtom, fixture);
const current = () =>
  store
    .get(structuresDocumentAtom)
    .structures.find((item) => item.conceptId === structure.conceptId)!;
const update = (editor: ReturnType<typeof structureEditor>) =>
  store.set(updateStructureEditorAtom, {
    structureId: structure.conceptId,
    editor,
  });
const variant = createLocalVariantProperty("Placement");
variant.options[1].name = "End";
assert.throws(() => createLocalVariantProperty(" "), /name/);
assert.deepEqual(variant.classification, {});
assert.deepEqual(
  variant.options.map((option) => option.name),
  ["Default", "End"],
);
assert.equal(variant.defaultOptionId, variant.options[0].id);
assert.equal(
  new Set([variant.id, ...variant.options.map((option) => option.id)]).size,
  3,
);
const editor = {
  ...emptyStructureEditor(),
  properties: [variant, createBooleanProperty("Has icon")],
};
assert.throws(() => update(editor), /edit mode/);
store.set(enterEditModeAtom);
update(editor);
const taxonomy = store.get(authoringSnapshotAtom).taxonomy!;
assert.throws(
  () =>
    renameVariantProperty(
      structureEditor(current()),
      variant.id,
      "Placement",
      taxonomy,
    ),
  /already belongs/,
);
const option = variant.options[1];
assert.throws(
  () =>
    renameVariantOption(
      structureEditor(current()),
      variant.id,
      option.id,
      "End",
      taxonomy,
    ),
  /already belongs/,
);
assert.deepEqual(store.get(authoringSnapshotAtom).taxonomy, taxonomy);
const extra = { id: crypto.randomUUID(), name: "Both", classification: {} };
update(
  duplicateVariantOption(
    structureEditor(current()),
    variant.id,
    option.id,
    extra,
  ),
);
update(
  makeVariantOptionDefault(structureEditor(current()), variant.id, extra.id),
);
const property = structureEditor(current()).properties[0];
assert.equal(property.kind, "variant");
if (property.kind !== "variant") throw new Error("Expected a variant.");
assert.equal(property.defaultOptionId, extra.id);
assert.throws(
  () => removeVariantOption(structureEditor(current()), variant.id, extra.id),
  /default/,
);
const beforeInvalid = store.get(authoringSnapshotAtom);
assert.throws(
  () =>
    update(
      renameVariantOption(
        structureEditor(current()),
        variant.id,
        option.id,
        "Both",
        taxonomy,
      ).editor,
    ),
  /distinct name/,
);
assert.deepEqual(store.get(authoringSnapshotAtom), beforeInvalid);
assert.throws(
  () =>
    renameVariantProperty(
      structureEditor(current()),
      variant.id,
      " ",
      taxonomy,
    ),
  /name/,
);
const reference = store
  .get(primitiveReferencesAtom)
  .find((item) => item.family === "size" && !item.error)!;
update({
  ...structureEditor(current()),
  overrides: { [option.id]: { slots: { width: { $ref: reference.id } } } },
});
store.set(updateElementAtom, {
  structureId: structure.conceptId,
  elementId: visual.id,
  optionId: option.id,
  slot: "width",
  referenceId: reference.id,
});
assert.throws(
  () =>
    makeVariantOptionDefault(structureEditor(current()), variant.id, option.id),
  /before saving differences/,
);
const resolved = resolveStructureOptions(current(), {
  options: { [variant.id]: option.id },
  booleans: {},
  activePropertyId: variant.id,
  indentationLevel: 0,
});
assert.deepEqual(resolved.issues, []);
assert.ok(
  resolved.structure.properties.some(
    (binding) => "$ref" in binding && binding.$ref === reference.id,
  ),
);
const authored = structuredClone(store.get(authoringSnapshotAtom));
assertStoredSnapshot(authored);
assert.deepEqual(authored.taxonomy, fixture.taxonomy);
assert.deepEqual(buildTshirtArtifacts(authored), buildTshirtArtifacts(fixture));
assert.ok(
  compareAuthoring(fixture, authored).groups.some(
    (group) => group.id === "structures",
  ),
);
store.set(cancelEditAtom);
assert.deepEqual(store.get(authoringSnapshotAtom), fixture);
store.set(enterEditModeAtom);
update(structureEditor(authored.structures!.structures.at(-1)!));
store.set(saveEditAtom);
assert.deepEqual(
  store.get(editSessionSnapshotAtom),
  store.get(authoringSnapshotAtom),
);
const reloaded = createStore();
reloaded.set(
  restoreAuthoringSnapshotAtom,
  JSON.parse(JSON.stringify(store.get(authoringSnapshotAtom))),
);
assert.deepEqual(
  reloaded.get(authoringSnapshotAtom),
  store.get(authoringSnapshotAtom),
);
const registeredStore = createStore();
const registeredFixture = structuredClone(fixture);
registeredFixture.structures!.structures.at(-1)!.generation = {
  ...structuredClone(registeredFixture.structures!.structures[0].generation!),
  applications: [],
};
registeredStore.set(restoreAuthoringSnapshotAtom, registeredFixture);
registeredStore.set(editSessionSnapshotAtom, registeredFixture);
registeredStore.set(enterEditModeAtom);
const registryDraft = createLocalVariantProperty("Registered placement");
registryDraft.options[0].name = "registered-placement-base";
registryDraft.options[1].name = "registered-placement-offset";
const registration = registerVariantProperty(
  registryDraft,
  fixture.taxonomy!,
  true,
);
const registeredEditor = {
  ...emptyStructureEditor(),
  properties: [registration.property],
  overrides: {
    [registryDraft.options[1].id]: {
      slots: { width: { $ref: reference.id } },
    },
  },
};
registeredStore.set(updateStructureEditorAtom, {
  structureId: structure.conceptId,
  editor: registeredEditor,
  taxonomy: registration.taxonomy,
});
const registeredWorking = structuredClone(
  registeredStore.get(authoringSnapshotAtom),
);
assertStoredSnapshot(registeredWorking);
const registeredStructure = registeredWorking.structures!.structures.find(
  (item) => item.conceptId === structure.conceptId,
)!;
assert.deepEqual(
  resolveStructureOptions(registeredStructure, {
    options: { [registryDraft.id]: registryDraft.options[1].id },
    booleans: {},
    activePropertyId: registryDraft.id,
    indentationLevel: 0,
  }).previewOnlySlots,
  [],
  "Registered options are eligible for semantic output, not preview-only.",
);
assert.deepEqual(registeredWorking.typography, fixture.typography);
assert(
  buildTshirtArtifacts(registeredWorking).semantics.some((row) =>
    Object.values(row.token.name).includes("registered-placement-offset"),
  ),
  "Registry-backed Structure differences reach the existing semantic generator.",
);
registeredStore.set(cancelEditAtom);
assert.deepEqual(registeredStore.get(authoringSnapshotAtom), registeredFixture);
registeredStore.set(enterEditModeAtom);
registeredStore.set(updateStructureEditorAtom, {
  structureId: structure.conceptId,
  editor: registeredEditor,
  taxonomy: registration.taxonomy,
});
registeredStore.set(saveEditAtom);
const registryReload = createStore();
registryReload.set(
  restoreAuthoringSnapshotAtom,
  JSON.parse(JSON.stringify(registeredStore.get(authoringSnapshotAtom))),
);
assert.deepEqual(
  registryReload.get(authoringSnapshotAtom),
  registeredStore.get(authoringSnapshotAtom),
  "Structure category/term references survive Save and reload together.",
);
console.log(
  "Legacy compatibility and registered Structure options: naming, semantic eligibility, atomic Save/Cancel/reload passed.",
);
