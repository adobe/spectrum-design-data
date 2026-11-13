// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import {
  createDefaultSnapshot,
  assertStoredSnapshot,
  restoreAuthoringSnapshotAtom,
  authoringSourceSnapshotAtom,
  enterEditModeAtom,
  saveEditAtom,
  cancelEditAtom,
  resetAllAuthoringAtom,
} from "../src/features/edit-session/state";
import {
  stylesDocumentAtom,
  saveStyleAtom,
  removeStyleAtom,
  restoreStyleAtom,
  selectedStyleIdAtom,
  stylePreviewAtom,
  editStylePropertiesAtom,
  addColorRoleAtom,
  setColorRoleScaleAtom,
  removeColorRoleAtom,
  restoreColorRoleAtom,
} from "../src/features/styles/state";
import { ORDERED_CATEGORY_IDS } from "../src/features/taxonomy/orderedVocabulary";
import {
  EMPTY_STYLES,
  isStylesDocument,
  type StyleRecipe,
} from "../src/features/styles/model";
import { registerStyleName } from "../src/features/styles/vocabulary";
import { synchronizeStylePublications } from "../src/features/styles/generation";
import { buildStylesForSource } from "../src/features/styles/artifacts";
import { modeSelections } from "../src/features/modes/combinations";
import { compareAuthoring } from "../src/features/changelog/registry";
import { readPath, restorePath } from "../src/features/changelog/contract";
import {
  prepareChangeReset,
  itemResetPlan,
} from "../src/features/changelog/resetPlans";
import { createLocalVariantProperty } from "../src/features/option-groups/model";
import {
  removeStyleProperty,
  removeStyleOption,
  stylePreviewOptions,
  stylePropertiesEditor,
} from "../src/features/styles/variants";
import { createComponent } from "../src/features/components/model";
import { componentImpactForSnapshots } from "../src/features/impact/componentImpact";
import {
  AUTHORING_STORAGE_KEY,
  AUTHORING_RECORD_VERSION,
  readAuthoringRecord,
} from "../src/features/edit-session/storage";
import { encodeStructureSource } from "../src/features/edit-session/structureSourceCodec";
import { registerTerm } from "../src/features/taxonomy/model";
import { registerVariantProperty } from "../src/features/option-groups/naming";
import { leafElements } from "../src/features/structures/children";

class MemoryStorage implements Storage {
  data = new Map<string, string>();
  get length() {
    return this.data.size;
  }
  key(index: number) {
    return [...this.data.keys()][index] ?? null;
  }
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  clear() {
    throw new Error("Unscoped storage clearing is not allowed.");
  }
}
const storage = new MemoryStorage();
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    localStorage: storage,
    sessionStorage: storage,
    addEventListener() {},
    removeEventListener() {},
  },
});
const defaults = createDefaultSnapshot();
defaults.styles = structuredClone(EMPTY_STYLES);
for (const structure of defaults.structures!.structures)
  for (const element of leafElements(structure)) delete element.textStyle;
const named = registerStyleName(defaults.taxonomy!, "lifecycle-background");
const recipe: StyleRecipe = {
  id: crypto.randomUUID(),
  kind: "background",
  name: named.name,
  classification: {},
  appearance: { color: { kind: "single", binding: { value: "#123456" } } },
  options: [],
  differences: {},
  applications: [],
};
const contexts = modeSelections(defaults.modeSets).map((selection) => ({
  selection,
  references: [],
  modes: {},
}));
const styles = synchronizeStylePublications(
  { ...structuredClone(EMPTY_STYLES), recipes: [recipe] },
  contexts,
  defaults.rules!,
);
const original = { ...defaults, taxonomy: named.taxonomy, styles };
assertStoredSnapshot(original);
const changed = structuredClone(original);
changed.styles.recipes[0].appearance.color = {
  kind: "single",
  binding: { value: "#abcdef" },
};
changed.typography.textZoom += 1;
const items = compareAuthoring(original, changed).groups.flatMap(
  (group) => group.items,
);
const color = items
  .find((item) => item.sourceKind === "style")!
  .fields.find((field) => field.address?.path.includes("appearance"))!;
assert(color.address, "Nested authored fields have explicit reset addresses.");
const restored = restorePath(changed, original, color.address!);
assert.deepEqual(
  restored.styles.recipes[0].appearance,
  original.styles.recipes[0].appearance,
);
assert.equal(
  restored.typography.textZoom,
  changed.typography.textZoom,
  "Narrow resets preserve unrelated edits.",
);
assert.deepEqual(
  readPath(restored, color.address!.path),
  readPath(original, color.address!.path),
);
const additions = compareAuthoring(defaults, original)
  .groups.flatMap((group) => group.items)
  .find((item) => item.sourceKind === "style")!;
const removed = prepareChangeReset(
  { ...original, attachments: {} },
  itemResetPlan(additions),
);
assert.equal(removed.styles?.recipes.length, 0);

const property = createLocalVariantProperty("Tone");
const withProperty = {
  ...recipe,
  options: [property],
  differences: {
    [property.options[1].id]: {
      color: { kind: "single" as const, binding: { value: "#ffffff" } },
    },
  },
};
assert.equal(
  removeStyleOption(withProperty, property.id, property.options[1].id)
    .options[0].kind,
  "variant",
);
assert.deepEqual(
  removeStyleOption(withProperty, property.id, property.options[1].id)
    .differences,
  {},
);
assert.deepEqual(removeStyleProperty(withProperty, property.id).options, []);
assert.deepEqual(
  removeStyleProperty(withProperty, property.id).differences,
  {},
);
assert.deepEqual(
  stylePreviewOptions(withProperty, { [property.id]: "deleted-option" }),
  { [property.id]: property.defaultOptionId },
);
const oneOption = removeStyleOption(
  withProperty,
  property.id,
  property.options[1].id,
);
assert.throws(
  () => removeStyleOption(oneOption, property.id, property.options[0].id),
  /at least one/,
);
const noDefault = removeStyleOption(
  withProperty,
  property.id,
  property.defaultOptionId,
);
assert.equal(
  noDefault.options[0].kind === "variant" &&
    noDefault.options[0].defaultOptionId,
  property.options[1].id,
);
const local = synchronizeStylePublications(
  { ...styles, recipes: [withProperty] },
  contexts,
  defaults.rules!,
);
assert.equal(
  buildStylesForSource({ ...original, styles: local }).rows.length,
  contexts.length,
  "Unnamed local options do not publish.",
);
const richBaseline = { ...original, styles: local };
const richWorking = structuredClone(richBaseline);
const editedRecipe = richWorking.styles.recipes[0];
const editedProperty = editedRecipe.options[0];
assert(editedProperty.kind === "variant");
editedProperty.options[1].name = "Secondary";
editedProperty.defaultOptionId = editedProperty.options[1].id;
editedRecipe.differences[property.options[1].id].fontWeight = { value: 700 };
const sharedRule = richWorking.rules!.find(
  (rule) => rule.type === "conditional" && rule.outputs?.length,
)!;
assert(sharedRule.type === "conditional");
editedRecipe.applications.push({
  id: crypto.randomUUID(),
  ruleId: sharedRule.id,
  outputIds: [sharedRule.outputs![0].id],
});
const nested = compareAuthoring(richBaseline, richWorking)
  .groups.flatMap((group) => group.items)
  .filter((item) => item.sourceKind === "style")
  .flatMap((item) => item.fields)
  .filter((field) => field.address);
for (const key of ["options", "differences", "applications"])
  assert(
    nested.some((field) => field.address!.path.includes(key)),
    `${key} has authored Changes/reset coverage.`,
  );
for (const field of nested) {
  const reset = restorePath(richWorking, richBaseline, field.address!);
  assert.deepEqual(
    readPath(reset, field.address!.path),
    readPath(richBaseline, field.address!.path),
  );
}
const invalidDefault = structuredClone(local);
const invalidProperty = invalidDefault.recipes[0].options[0];
assert(invalidProperty.kind === "variant");
invalidProperty.defaultOptionId = crypto.randomUUID();
assert(!isStylesDocument(invalidDefault));

const output = buildStylesForSource(original);
const component = createComponent({
  $id: "style-consumer",
  name: "style-consumer",
  displayName: "Style consumer",
  meta: { category: "Test", documentationUrl: "" },
});
const propertyCategory = original.taxonomy!.categories.find(
  (category) => category.key === "property",
)!;
const colorTerm = original.taxonomy!.terms.find(
  (term) => term.categoryId === propertyCategory.id && term.value === "color",
)!;
component.assignments = [
  {
    id: crypto.randomUUID(),
    property: { categoryId: propertyCategory.id, termId: colorTerm.id },
    $ref: output.rows[0].token.uuid,
  },
];
const consumerBefore = {
  ...original,
  components: {
    ...original.components!,
    components: [...original.components!.components, component],
  },
};
const consumerAfter = structuredClone(consumerBefore);
consumerAfter.styles.recipes[0].appearance.color = {
  kind: "single",
  binding: { value: "#abcdef" },
};
const impact = componentImpactForSnapshots(consumerBefore, consumerAfter);
assert.equal(impact.status, "ready");
if (impact.status === "ready")
  assert.equal(
    impact.summary.affected.count,
    1,
    "Actual Style token assignments drive Component Impact.",
  );

const legacyWorking = structuredClone(defaults),
  legacySaved = structuredClone(defaults);
delete legacyWorking.styles;
delete legacySaved.styles;
legacyWorking.typography.textZoom += 1;
storage.setItem(
  AUTHORING_STORAGE_KEY,
  JSON.stringify({
    version: 29,
    working: encodeStructureSource(legacyWorking),
    saved: encodeStructureSource(legacySaved),
    isEditing: true,
    attachments: {},
    savedAttachments: {},
  }),
);
const migrated = readAuthoringRecord(
  assertStoredSnapshot,
  (snapshot) => snapshot,
)!;
assert.equal(migrated.version, AUTHORING_RECORD_VERSION);
assert.deepEqual(migrated.working.styles, EMPTY_STYLES);
assert.deepEqual(migrated.saved.styles, EMPTY_STYLES);
assert.equal(
  migrated.working.typography.textZoom,
  legacyWorking.typography.textZoom,
);
assert.equal(
  migrated.saved.typography.textZoom,
  legacySaved.typography.textZoom,
);

const store = createStore();
store.set(restoreAuthoringSnapshotAtom, original);
store.set(stylePreviewAtom, {
  options: { old: "option" },
  outputId: "old-state",
  display: "values",
});
store.set(selectedStyleIdAtom, recipe.id);
assert.deepEqual(
  store.get(stylePreviewAtom),
  { options: {}, display: "values" },
  "Selecting a Style clears unrelated preview selections, not its display preference.",
);
store.set(enterEditModeAtom);
store.set(saveStyleAtom, {
  ...recipe,
  appearance: { color: { kind: "single", binding: { value: "#abcdef" } } },
});
store.set(saveEditAtom);
const saved = structuredClone(store.get(stylesDocumentAtom));
assert.deepEqual(
  saved.publications,
  styles.publications,
  "Save preserves every publication identity.",
);
store.set(enterEditModeAtom);
const deleted = store.set(removeStyleAtom, recipe.id);
assert.equal(store.get(stylesDocumentAtom).recipes.length, 0);
store.set(restoreStyleAtom, deleted);
assert.deepEqual(
  store.get(stylesDocumentAtom),
  saved,
  "Delete/Undo preserves the recipe and its output identities.",
);
store.set(saveStyleAtom, {
  ...recipe,
  appearance: { color: { kind: "single", binding: { value: "#000000" } } },
});
store.set(cancelEditAtom);
assert.deepEqual(
  store.get(stylesDocumentAtom),
  saved,
  "Cancel restores the saved Styles baseline.",
);
const record = readAuthoringRecord(assertStoredSnapshot)!;
assert.deepEqual(
  record.working.styles,
  saved,
  "Reload preserves the committed authoring record.",
);
store.set(enterEditModeAtom);
const beforePanelEdit = structuredClone(store.get(authoringSourceSnapshotAtom));
const panelTermId = crypto.randomUUID();
const panelTaxonomy = registerTerm(
  beforePanelEdit.taxonomy!,
  propertyCategory.id,
  "panel-contract",
  panelTermId,
);
const panelProperty = createLocalVariantProperty("Emphasis");
store.set(editStylePropertiesAtom, {
  recipeId: recipe.id,
  editor: {
    ...stylePropertiesEditor(saved.recipes[0]),
    properties: [panelProperty],
  },
  taxonomy: panelTaxonomy,
});
const afterPanelEdit = store.get(authoringSourceSnapshotAtom);
assert.deepEqual(afterPanelEdit.styles!.recipes[0].options, [panelProperty]);
assert(afterPanelEdit.taxonomy!.terms.some((term) => term.id === panelTermId));
assert.deepEqual(
  afterPanelEdit.structures,
  beforePanelEdit.structures,
  "Style panel edits leave Structures unchanged.",
);
assert.deepEqual(afterPanelEdit.typography, beforePanelEdit.typography);
store.set(cancelEditAtom);
assert.deepEqual(
  store.get(stylesDocumentAtom),
  saved,
  "Cancel restores shared-panel property edits.",
);
assert(
  !store
    .get(authoringSourceSnapshotAtom)
    .taxonomy!.terms.some((term) => term.id === panelTermId),
  "Cancel restores the matching Registry edit atomically.",
);
const beforeReadOnly = structuredClone(store.get(authoringSourceSnapshotAtom));
assert.throws(
  () =>
    store.set(editStylePropertiesAtom, {
      recipeId: recipe.id,
      editor: {
        ...stylePropertiesEditor(saved.recipes[0]),
        properties: [panelProperty],
      },
      taxonomy: panelTaxonomy,
    }),
  /Edit mode/,
);
assert.deepEqual(
  store.get(authoringSourceSnapshotAtom),
  beforeReadOnly,
  "Read-only rejection cannot write either source.",
);
store.set(enterEditModeAtom);
const registryDraft = createLocalVariantProperty("Panel treatment");
registryDraft.options[0].name = "panel-treatment-base";
registryDraft.options[1].name = "panel-treatment-emphasized";
const registryVariant = registerVariantProperty(
  registryDraft,
  beforeReadOnly.taxonomy!,
  true,
  "styles",
);
store.set(editStylePropertiesAtom, {
  recipeId: recipe.id,
  editor: {
    ...stylePropertiesEditor(saved.recipes[0]),
    properties: [
      {
        ...registryVariant.property,
        options: [registryVariant.property.options[0]],
      },
    ],
  },
  taxonomy: registryVariant.taxonomy,
});
assertStoredSnapshot(store.get(authoringSourceSnapshotAtom));
const initialVariantOutput = buildStylesForSource(
  store.get(authoringSourceSnapshotAtom),
);
assert.deepEqual(initialVariantOutput.issues, []);
assert.equal(
  initialVariantOutput.rows.length,
  contexts.length,
  "A new variant starts with one named default output in every mode.",
);
store.set(editStylePropertiesAtom, {
  recipeId: recipe.id,
  editor: {
    ...stylePropertiesEditor(saved.recipes[0]),
    properties: [registryVariant.property],
  },
  taxonomy: registryVariant.taxonomy,
});
const registryWorking = structuredClone(store.get(authoringSourceSnapshotAtom));
assertStoredSnapshot(registryWorking);
const registryOutput = buildStylesForSource(registryWorking);
assert.deepEqual(registryOutput.issues, []);
assert.equal(registryOutput.rows.length, contexts.length * 2);
assert(
  registryOutput.rows.some((row) =>
    row.name.includes("panel-treatment-emphasized"),
  ),
);
assert.deepEqual(registryWorking.structures, beforeReadOnly.structures);
assert.deepEqual(registryWorking.typography, beforeReadOnly.typography);
assert(
  compareAuthoring(beforeReadOnly, registryWorking)
    .groups.flatMap((group) => group.items)
    .some((item) => item.sourceKind === "style"),
);
store.set(cancelEditAtom);
assert.deepEqual(store.get(authoringSourceSnapshotAtom), beforeReadOnly);
store.set(enterEditModeAtom);
store.set(editStylePropertiesAtom, {
  recipeId: recipe.id,
  editor: {
    ...stylePropertiesEditor(saved.recipes[0]),
    properties: [registryVariant.property],
  },
  taxonomy: registryVariant.taxonomy,
});
const beforeRegistrySave = buildStylesForSource(
  store.get(authoringSourceSnapshotAtom),
);
store.set(saveEditAtom);
const registryRecord = readAuthoringRecord(assertStoredSnapshot)!;
assert.deepEqual(registryRecord.working.styles!.recipes[0].options, [
  registryVariant.property,
]);
assert.deepEqual(registryRecord.working.taxonomy, registryVariant.taxonomy);
assert.deepEqual(
  buildStylesForSource(registryRecord.working),
  beforeRegistrySave,
);
store.set(enterEditModeAtom);
store.set(resetAllAuthoringAtom);
assert.deepEqual(
  store.get(authoringSourceSnapshotAtom).styles,
  createDefaultSnapshot().styles,
);

const roleDefaults = store.get(authoringSourceSnapshotAtom);
const roleNames = (snapshot: typeof roleDefaults) =>
  Object.fromEntries(
    snapshot.styles!.colorRoles.map((role) => [
      snapshot.taxonomy!.terms.find(
        (term) =>
          term.id === role.roleTermId &&
          term.categoryId === ORDERED_CATEGORY_IDS.role,
      )?.value,
      role.scaleId,
    ]),
  );
assert.deepEqual(
  roleNames(roleDefaults),
  {
    informative: "scale-48",
    accent: "scale-48",
    positive: "scale-32",
    negative: "scale-6",
    notice: "scale-14",
    neutral: "scale-gray",
  },
  "Default color roles use Registry Role terms and their shipped scales.",
);
assert.throws(
  () =>
    createStore().set(addColorRoleAtom, { name: "brand", scaleId: "scale-48" }),
  /Edit mode/,
);
const roleStore = store;
const roleStart = roleStore.get(authoringSourceSnapshotAtom);
const roleBaseline = {
  ...roleStart,
  styles: structuredClone(roleStart.styles),
  taxonomy: structuredClone(roleStart.taxonomy),
};
const negative = roleBaseline.styles!.colorRoles.find(
  (role) => role.scaleId === "scale-6",
)!;
const removedRole = roleStore.set(removeColorRoleAtom, negative.id);
assert(
  !roleStore
    .get(stylesDocumentAtom)
    .colorRoles.some((role) => role.id === negative.id),
);
roleStore.set(restoreColorRoleAtom, removedRole);
assert.deepEqual(
  roleStore.get(stylesDocumentAtom).colorRoles,
  roleBaseline.styles!.colorRoles,
  "Delete/Undo restores a color role in place.",
);
assert.throws(
  () =>
    roleStore.set(addColorRoleAtom, {
      roleTermId: negative.roleTermId,
      scaleId: "scale-14",
    }),
  /already/,
  "A Role term maps to one color scale.",
);
roleStore.set(setColorRoleScaleAtom, { id: negative.id, scaleId: "scale-14" });
const added = roleStore.set(addColorRoleAtom, {
  name: "brand",
  scaleId: "scale-48",
});
const roleWorking = roleStore.get(authoringSourceSnapshotAtom);
assertStoredSnapshot(roleWorking);
assert.equal(roleNames(roleWorking).negative, "scale-14");
assert.equal(roleNames(roleWorking).brand, "scale-48");
assert.equal(
  roleWorking.taxonomy!.terms.find((term) => term.id === added.roleTermId)
    ?.categoryId,
  ORDERED_CATEGORY_IDS.role,
  "A typed role name registers a new Role term.",
);
assert(
  compareAuthoring(roleBaseline, roleWorking).groups.some(
    (group) => group.items.length,
  ),
  "Color role edits appear in Changes.",
);
roleStore.set(cancelEditAtom);
const cancelled = roleStore.get(authoringSourceSnapshotAtom);
assert.deepEqual(
  { styles: cancelled.styles, taxonomy: cancelled.taxonomy },
  { styles: roleBaseline.styles, taxonomy: roleBaseline.taxonomy },
  "Cancel restores color roles and the matching Registry edit together.",
);
const duplicateRoles = structuredClone(roleDefaults.styles!);
duplicateRoles.colorRoles.push({
  ...duplicateRoles.colorRoles[0],
  id: crypto.randomUUID(),
});
assert(!isStylesDocument(duplicateRoles), "Role terms are unique.");
const missingRoles: Partial<typeof duplicateRoles> = structuredClone(
  roleDefaults.styles!,
);
delete missingRoles.colorRoles;
assert(!isStylesDocument(missingRoles), "Color roles are required.");
console.log(
  "Styles field/domain resets, local options, real Component Impact, independent migrations, Save/Cancel/reload, Delete/Undo and color roles passed.",
);
