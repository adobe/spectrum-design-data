// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import {
  authoringSnapshotAtom,
  createDefaultSnapshot,
  enterEditModeAtom,
  cancelEditAtom,
  saveEditAtom,
  editSessionSnapshotAtom,
  resetAllAuthoringAtom,
} from "../src/features/edit-session/state";
import {
  componentDraftRevisionAtom,
  componentsDocumentAtom,
} from "../src/features/components/documentState";
import { editComponentsAtom } from "../src/features/components/state";
import { componentTokenCatalog } from "../src/features/components/references";
import {
  changeGroupsAtom,
  revertChangeTopicAtom,
} from "../src/features/changelog/state";
import {
  applyChangeResetPlanAtom,
  itemResetPlan,
  sourceResetPlan,
} from "../src/features/changelog/resetPlans";
import { tokenImpactSummaryAtom } from "../src/features/impact/state";
import { taxonomyDocumentAtom } from "../src/features/taxonomy/state";
import { spacingDocumentAtom } from "../src/features/spacing/state";
import { projectAuthoringDataset } from "../src/features/design-data/projection";
import { designSystemDefaults } from "../src/data/defaults";
import {
  addColorScaleAtom,
  colorSystemDocumentAtom,
  removeColorScaleAtom,
} from "../src/features/color-system/state";
import { browserTokenEditsAtom } from "../src/features/tokens/browserEdits";
import { taxonomyComponentReferencesAtom } from "../src/features/taxonomy/editing";
import { updateSizeScaleAtom } from "../src/features/size/state";
import {
  addScaleTypeAtom,
  scaleTypesAtom,
} from "../src/features/logic/scaleTypeLibrary";
import { removeScaleTypeWithFallbackAtom } from "../src/features/logic/scaleTypeReferences";
import { createScaleType } from "../src/features/scales/scaleType";
import { compareAuthoring } from "../src/features/changelog/registry";
import { componentRelationships } from "../src/features/components/projection";
import { componentKey } from "../src/features/components/model";

const store = createStore();
const baseline = createDefaultSnapshot();
const impact = store.get(tokenImpactSummaryAtom);
assert.equal(store.get(componentsDocumentAtom).components.length, 2);
assert.throws(
  () => store.set(editComponentsAtom, baseline.components!),
  /edit mode/,
);
store.set(enterEditModeAtom);
const next = structuredClone(store.get(componentsDocumentAtom));
next.components[0].declaration.displayName = "Action control";
store.set(editComponentsAtom, next);
assert.equal(
  store.get(authoringSnapshotAtom).components!.components[0].declaration
    .displayName,
  "Action control",
);
assert.deepEqual(store.get(tokenImpactSummaryAtom), impact);
const item = store
  .get(changeGroupsAtom)
  .find((group) => group.id === "components")!.items[0];
store.set(applyChangeResetPlanAtom, itemResetPlan(item));
assert.deepEqual(store.get(componentsDocumentAtom), baseline.components);
store.set(editComponentsAtom, next);
store.set(cancelEditAtom);
assert.deepEqual(store.get(componentsDocumentAtom), baseline.components);
store.set(enterEditModeAtom);
store.set(editComponentsAtom, next);
store.set(saveEditAtom);
assert.deepEqual(store.get(editSessionSnapshotAtom)!.components, next);
store.set(editComponentsAtom, { ...next, components: [] });
store.set(cancelEditAtom);
assert.deepEqual(store.get(componentsDocumentAtom), next);
store.set(enterEditModeAtom);
store.set(revertChangeTopicAtom, "components");
assert.deepEqual(store.get(componentsDocumentAtom), baseline.components);
const taxonomy = structuredClone(store.get(taxonomyDocumentAtom));
const propertyId = baseline.components!.components[0].assignments.find(
  (row) =>
    taxonomy.terms.find((term) => term.id === row.property.termId)?.value ===
    "Opacity",
)!.property.termId;
taxonomy.terms = taxonomy.terms.filter((term) => term.id !== propertyId);
assert.throws(
  () => store.set(taxonomyDocumentAtom, taxonomy),
  /Property term|component|Property meaning/i,
);
const spacing = structuredClone(store.get(spacingDocumentAtom));
const token = componentTokenCatalog(baseline).find(
  (token) =>
    token.id === baseline.components!.components[1].assignments.at(-1)!.$ref,
)!;
assert.equal(token.kind, "semantic");
spacing.scales = [];
assert.throws(
  () => store.set(spacingDocumentAtom, spacing),
  /available|reference|anchor|target/i,
);
assert.deepEqual(store.get(spacingDocumentAtom), baseline.spacing);
const projected = projectAuthoringDataset(designSystemDefaults, {
  kind: "defaults",
  root: "test",
  hash: "test",
  revision: "test",
  dirty: false,
  version: "1",
  validator: "test",
});
assert.equal(
  projected.records.filter((row) => row.category === "components").length,
  2,
);
assert.equal(
  projected.records.filter((row) => row.category === "relationships").length,
  baseline.components!.components.reduce(
    (count, component) => count + component.assignments.length,
    0,
  ),
);
const without = projectAuthoringDataset(
  {
    ...designSystemDefaults,
    system: {
      ...designSystemDefaults.system,
      components: { schemaVersion: 2, components: [] },
    },
  },
  projected.source,
);
assert.deepEqual(
  projected.records.filter((row) => row.category === "tokens"),
  without.records.filter((row) => row.category === "tokens"),
);
assert.equal(
  store.get(taxonomyComponentReferencesAtom).length,
  baseline.components!.components.reduce(
    (count, component) => count + component.assignments.length,
    0,
  ),
);
const originalTarget = baseline.components!.components[0].assignments[0].$ref!;
const targetBefore = componentTokenCatalog(
  store.get(authoringSnapshotAtom),
).find((token) => token.id === originalTarget)!;
const previousRegistry = structuredClone(store.get(taxonomyDocumentAtom));
const nameTermId = baseline.size!.scales[0].nameRef!.termId;
store.set(taxonomyDocumentAtom, {
  ...previousRegistry,
  terms: previousRegistry.terms.map((term) =>
    term.id === nameTermId
      ? { ...term, value: "Shared component scale" }
      : term,
  ),
});
const targetAfter = componentTokenCatalog(
  store.get(authoringSnapshotAtom),
).find((token) => token.id === originalTarget)!;
assert.equal(targetAfter.id, targetBefore.id);
assert.equal(targetAfter.value, targetBefore.value);
assert.equal(
  targetAfter.name,
  targetBefore.name,
  "An omitted Global source label stays out of the token name.",
);
assert.deepEqual(store.get(componentsDocumentAtom), baseline.components);
store.set(taxonomyDocumentAtom, previousRegistry);
const semanticId = baseline.components!.components[1].assignments.at(-1)!.$ref!;
const semanticBefore = componentTokenCatalog(
  store.get(authoringSnapshotAtom),
).find((token) => token.id === semanticId)!;
store.set(taxonomyDocumentAtom, {
  ...previousRegistry,
  order: [...previousRegistry.order].reverse(),
});
const semanticAfter = componentTokenCatalog(
  store.get(authoringSnapshotAtom),
).find((token) => token.id === semanticId)!;
assert.equal(semanticAfter.id, semanticBefore.id);
assert.equal(semanticAfter.value, semanticBefore.value);
assert.notEqual(semanticAfter.name, semanticBefore.name);
assert.deepEqual(store.get(componentsDocumentAtom), baseline.components);
store.set(taxonomyDocumentAtom, previousRegistry);
const formula = createScaleType();
store.set(addScaleTypeAtom, formula);
store.set(updateSizeScaleAtom, {
  id: baseline.size!.scales[0].id,
  patch: { scaleTypeId: formula.id },
});
assert(store.set(removeScaleTypeWithFallbackAtom, formula.id));
assert.equal(
  store.get(scaleTypesAtom).some((item) => item.id === formula.id),
  false,
);
assert.equal(
  store.get(authoringSnapshotAtom).size!.scales[0].scaleTypeId,
  baseline.size!.scales[0].scaleTypeId,
);
assert.deepEqual(store.get(componentsDocumentAtom), baseline.components);
const beforeRejectedPatch = structuredClone(store.get(authoringSnapshotAtom));
assert.throws(
  () =>
    store.set(updateSizeScaleAtom, {
      id: baseline.size!.scales[0].id,
      patch: { name: "Rejected source name", hideFromPublishing: true },
    }),
  /no longer published/,
);
assert.deepEqual(
  store.get(authoringSnapshotAtom),
  beforeRejectedPatch,
  "A rejected source update must not leave behind a Registry rename.",
);
const scaleId = store.set(addColorScaleAtom);
const scale = store
  .get(colorSystemDocumentAtom)
  .scales.find((scale) => scale.id === scaleId)!;
const color = componentTokenCatalog(store.get(authoringSnapshotAtom)).find(
  (token) => token.property === "color" && token.name.includes(scale.name),
)!;
assert(color);
const colorProperty = store
  .get(taxonomyDocumentAtom)
  .terms.find(
    (term) =>
      term.categoryId ===
        store
          .get(taxonomyDocumentAtom)
          .categories.find((category) => category.key === "property")!.id &&
      String(term.value).toLowerCase() === "color",
  )!;
const linked = structuredClone(store.get(componentsDocumentAtom));
linked.components[0].assignments.push({
  id: crypto.randomUUID(),
  property: { categoryId: colorProperty.categoryId, termId: colorProperty.id },
  $ref: color.id,
  options: Object.fromEntries(
    Object.entries(color.context).map(([key, value]) => [key, String(value)]),
  ),
});
store.set(editComponentsAtom, linked);
store.set(browserTokenEditsAtom, {
  [color.id]: { description: "Keep this authored metadata", values: {} },
});
const protectedSnapshot = structuredClone(store.get(authoringSnapshotAtom));
const removal = store.set(removeColorScaleAtom, scaleId);
assert.equal(removal.ok, false);
if (!removal.ok) assert.match(removal.error, /no longer published/);
assert.deepEqual(
  store.get(authoringSnapshotAtom),
  protectedSnapshot,
  "Blocked removal must retain source and token records.",
);
store.set(resetAllAuthoringAtom);
assert.deepEqual(store.get(authoringSnapshotAtom), baseline);
assert.deepEqual(store.get(componentsDocumentAtom), baseline.components);
assert.equal(store.get(changeGroupsAtom).length, 0);
assert.deepEqual(store.get(tokenImpactSummaryAtom), impact);
store.set(enterEditModeAtom);
const ordered = structuredClone(store.get(componentsDocumentAtom));
ordered.components[1].optionOrder.reverse();
store.set(editComponentsAtom, ordered);
const orderComparison = compareAuthoring(
  baseline,
  store.get(authoringSnapshotAtom),
);
const optionChange = orderComparison.groups.find(
  (group) => group.id === "components",
)!.items[0];
assert.deepEqual(
  optionChange.fields.map((field) => field.key),
  ["Option order"],
);
assert.equal(orderComparison.slots.filter((slot) => slot.changed).length, 1);
assert.deepEqual(store.get(tokenImpactSummaryAtom), impact);
const independentlyEdited = structuredClone(ordered);
independentlyEdited.components[1].declaration.description =
  "Keep this unrelated definition edit.";
store.set(editComponentsAtom, independentlyEdited);
const field = compareAuthoring(baseline, store.get(authoringSnapshotAtom))
  .groups.find((group) => group.id === "components")!
  .items.flatMap((item) => item.fields)
  .find((field) => field.key === "Option order")!;
assert(field.address);
const revision = store.get(componentDraftRevisionAtom);
store.set(
  applyChangeResetPlanAtom,
  sourceResetPlan("Option order", [field.address]),
);
assert.deepEqual(
  store.get(componentsDocumentAtom).components[1].optionOrder,
  baseline.components!.components[1].optionOrder,
);
assert.equal(
  store.get(componentsDocumentAtom).components[1].declaration.description,
  "Keep this unrelated definition edit.",
);
assert.equal(
  store.get(componentDraftRevisionAtom),
  revision + 1,
  "An authoritative component restore invalidates stale local forms.",
);
store.set(editComponentsAtom, ordered);
store.set(saveEditAtom);
assert.deepEqual(store.get(editSessionSnapshotAtom)!.components, ordered);
store.set(editComponentsAtom, baseline.components!);
store.set(cancelEditAtom);
assert.deepEqual(store.get(componentsDocumentAtom), ordered);
store.set(enterEditModeAtom);
store.set(applyChangeResetPlanAtom, itemResetPlan(optionChange));
assert.deepEqual(store.get(componentsDocumentAtom), baseline.components);
const renamedComponent = structuredClone(baseline.components!);
renamedComponent.components[0].declaration.displayName = "ActionButton / quiet";
renamedComponent.components[0].declaration.name = componentKey(
  "ActionButton / quiet",
);
store.set(editComponentsAtom, renamedComponent);
assert.deepEqual(
  renamedComponent.components[0].identities,
  baseline.components!.components[0].identities,
);
assert.equal(
  renamedComponent.components[0].declaration.$id,
  baseline.components!.components[0].declaration.$id,
);
const rows = componentRelationships(
  renamedComponent.components[0],
  baseline.taxonomy!,
);
assert(rows.every((row) => row.scope.component === "action-button-quiet"));
assert.deepEqual(
  rows.map((row) => row.uuid),
  baseline.components!.components[0].assignments.map((row) => row.id),
);
const collision = structuredClone(renamedComponent);
collision.components[0].declaration.name = componentKey(
  collision.components[1].declaration.displayName,
);
assert.throws(() => store.set(editComponentsAtom, collision), /Duplicate/);
assert.deepEqual(store.get(componentsDocumentAtom), renamedComponent);
store.set(resetAllAuthoringAtom);
const resetRevision = store.get(componentDraftRevisionAtom);
store.set(resetAllAuthoringAtom);
assert(
  store.get(componentDraftRevisionAtom) > resetRevision,
  "Reset all clears unapplied component forms even if the canonical document already matches defaults.",
);
console.log(
  "Component authoring, Save/Cancel, guarded dependencies, revert and separate accounting checks passed.",
);
