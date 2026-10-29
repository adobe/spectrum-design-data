// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import {
  EMPTY_STRUCTURES,
  assignStructure,
  assertStructureReferences,
  assertStructureTaxonomy,
  createStructure,
  isStructuresDocument,
  structureBinding,
  structureSelection,
  structureTaxonomyAssignments,
} from "../src/features/structures/model";
import {
  STRUCTURE_CATEGORIES,
  STRUCTURE_CATEGORY_IDS,
  STRUCTURE_TERMS,
  STRUCTURE_TERM_IDS,
} from "../src/features/structures/vocabulary";
import { structuresDocumentAtom } from "../src/features/structures/documentState";
import { primitiveReferencesAtom } from "../src/features/tokens/primitiveReferenceState";
import { addSizeScaleAtom, sizeDocumentAtom } from "../src/features/size/state";
import {
  elevationDocumentAtom,
  updateElevationAtom,
} from "../src/features/elevation/state";
import { taxonomyDocumentAtom } from "../src/features/taxonomy/state";
import {
  taxonomyEvidenceSourcesAtom,
  validateReferencedTaxonomyAtom,
} from "../src/features/taxonomy/editing";
import {
  createDefaultSnapshot,
  assertStoredSnapshot,
  authoringSnapshotAtom,
  editSessionSnapshotAtom,
  restoreAuthoringSnapshotAtom,
  saveEditAtom,
  cancelEditAtom,
  enterEditModeAtom,
} from "../src/features/edit-session/state";
import { upgradeStructuresSnapshot } from "../src/features/edit-session/structuresUpgrade";
import {
  addStructureAtom,
  assignStructureAtom,
  removeStructureAtom,
  renameStructureAtom,
  restoreStructureAtom,
  selectedStructureIdAtom,
} from "../src/features/structures/state";
import {
  constraintChoiceAllowed,
  constraintChoiceIssue,
  resolveStructure,
  UNMEASURED_LAYOUT,
  type PreviewLayoutContext,
} from "../src/features/structures/resolution";
import { editModeAtom } from "../src/state/view/editMode";
import { structureChanges } from "../src/features/structures/changes";
import {
  changeGroupsAtom,
  revertChangeItemAtom,
  revertChangeTopicAtom,
} from "../src/features/changelog/state";
import {
  foundationImpactSummaryAtom,
  tokenImpactSummaryAtom,
} from "../src/features/impact/state";
import {
  analysisSavedInputAtom,
  analysisWorkingInputAtom,
} from "../src/features/design-data/state";
import { combinedTokenSelection } from "../src/components/fields/tokenSelection";
import { componentsDocumentAtom } from "../src/features/components/documentState";

const store = createStore();
store.set(componentsDocumentAtom, { schemaVersion: 2, components: [] });
const taxonomy = store.get(taxonomyDocumentAtom);
for (const category of STRUCTURE_CATEGORIES) {
  const registered = taxonomy.categories.find(
    (item) => item.id === category.id,
  );
  assert.ok(registered);
  assert.deepEqual(
    [
      registered.id,
      registered.key,
      registered.valueType,
      registered.cardinality,
    ],
    [category.id, category.key, category.valueType, category.cardinality],
  );
  assert.ok(
    registered.scopes.includes("structures"),
    "Shared categories retain the Structure scope as other scopes are added.",
  );
}
for (const term of STRUCTURE_TERMS) {
  const registered = taxonomy.terms.find((item) => item.id === term.id);
  assert.ok(registered);
  assert.equal(
    registered.categoryId,
    term.categoryId,
    "Terminology changes do not transfer native slot-term ownership.",
  );
  assert.equal(typeof registered.value, "string");
}
const structure = createStructure("  Structure 1  ");
assert.equal(structure.name, "Structure 1");
assert.equal(structure.properties.length, 5);
assert.equal(
  isStructuresDocument({ schemaVersion: 1, structures: [structure] }),
  true,
);
assert.deepEqual(structureSelection(structure, "width"), {
  value: { kind: "sizing", preset: "hug" },
});
assert.deepEqual(structureSelection(structure, "horizontal"), {
  value: { kind: "term", termId: STRUCTURE_TERM_IDS.left },
});
assert.equal(
  isStructuresDocument({
    schemaVersion: 1,
    structures: [{ ...structure, name: "" }],
  }),
  false,
);
assert.equal(
  isStructuresDocument({
    schemaVersion: 1,
    structures: [structure, structure],
  }),
  false,
);
assert.equal(
  isStructuresDocument({
    schemaVersion: 1,
    structures: [
      {
        ...structure,
        properties: [...structure.properties, structure.properties[0]],
      },
    ],
  }),
  false,
);
assert.equal(
  isStructuresDocument({
    schemaVersion: 1,
    structures: [{ ...structure, properties: structure.properties.slice(1) }],
  }),
  false,
);
assert.throws(
  () =>
    assignStructure(structure, {
      horizontal: { value: { kind: "term", termId: STRUCTURE_TERM_IDS.top } },
    }),
  /Invalid Structures/,
);

const references = store.get(primitiveReferencesAtom);
const width = references.find(
  (item) => item.family === "size" && item.index === 0,
)!;
const spacing = references.find((item) => item.family === "spacing")!;
let linked = assignStructure(structure, {
  width: { $ref: width.id },
  paddingTop: { $ref: spacing.id },
});
assert.equal(
  structureBinding(linked, "width")!.id,
  structureBinding(structure, "width")!.id,
);
const originalPaddingId = structureBinding(linked, "paddingTop")!.id;
linked = assignStructure(assignStructure(linked, { paddingTop: null }), {
  paddingTop: { $ref: spacing.id },
});
assert.equal(structureBinding(linked, "paddingTop")!.id, originalPaddingId);
const document = { schemaVersion: 1 as const, structures: [linked] };
assertStructureTaxonomy(document, taxonomy);
assertStructureReferences(
  document,
  new Map(references.map((item) => [item.id, item.family])),
);
assert.throws(
  () => assertStructureReferences(document, new Map([[width.id, "spacing"]])),
  /Structure 1.*Width/,
);
assert.throws(
  () =>
    assertStructureTaxonomy(document, {
      ...taxonomy,
      terms: taxonomy.terms.filter(
        (term) => term.id !== STRUCTURE_TERM_IDS.width,
      ),
    }),
  /Structure 1.*Width/,
);
store.set(structuresDocumentAtom, document);
const horizontalBinding = structureBinding(linked, "horizontal")!;
assert.equal(
  structureTaxonomyAssignments(horizontalBinding)[
    STRUCTURE_CATEGORY_IDS.position
  ],
  STRUCTURE_TERM_IDS.left,
);
const registrySources = store
  .get(taxonomyEvidenceSourcesAtom)
  .filter(
    (source) =>
      source.scope === "structures" &&
      (source.context?.id === linked.conceptId ||
        linked.properties.some((binding) => binding.id === source.id)),
  );
assert.equal(
  registrySources.length,
  linked.properties.length + 1,
  "Registry reference counts include authored bindings and the Structure's Medium-size intent, not invented tokens.",
);
assert.deepEqual(
  registrySources.find((source) => source.id === horizontalBinding.id)!.context!
    .governed,
  structureTaxonomyAssignments(horizontalBinding),
);
const missingLeft = {
  ...taxonomy,
  terms: taxonomy.terms.filter((term) => term.id !== STRUCTURE_TERM_IDS.left),
};
assert.throws(
  () => store.get(validateReferencedTaxonomyAtom)(missingLeft),
  /Structure 1.*Horizontal alignment/,
);
const incompatiblePosition = {
  ...taxonomy,
  categories: taxonomy.categories.map((category) =>
    category.id === STRUCTURE_CATEGORY_IDS.position
      ? { ...category, scopes: ["spacing" as const] }
      : category,
  ),
};
assert.throws(
  () => store.get(validateReferencedTaxonomyAtom)(incompatiblePosition),
  /Structure 1.*Horizontal alignment/,
);
assert.deepEqual(store.get(taxonomyDocumentAtom), taxonomy);
const renamedLeft = {
  ...taxonomy,
  terms: taxonomy.terms.map((term) =>
    term.id === STRUCTURE_TERM_IDS.left ? { ...term, value: "Leading" } : term,
  ),
};
store.get(validateReferencedTaxonomyAtom)(renamedLeft);
assert.deepEqual(
  store.get(structuresDocumentAtom),
  document,
  "Registry label edits preserve the same Structure identities and references.",
);
const sizes = store.get(sizeDocumentAtom);
assert.throws(
  () =>
    store.set(sizeDocumentAtom, {
      ...sizes,
      scales: sizes.scales.filter((scale) => scale.id !== width.sourceId),
    }),
  /Structure 1.*Width/,
);
assert.deepEqual(store.get(sizeDocumentAtom), sizes);
assert.throws(
  () =>
    store.set(taxonomyDocumentAtom, {
      ...taxonomy,
      terms: taxonomy.terms.filter(
        (term) => term.id !== STRUCTURE_TERM_IDS.top,
      ),
    }),
  /Registry term/,
);
store.set(sizeDocumentAtom, {
  ...sizes,
  scales: sizes.scales.map((scale) => ({ ...scale, hideFromPublishing: true })),
});
assert.equal(
  store.get(primitiveReferencesAtom).find((item) => item.id === width.id)
    ?.hidden,
  true,
);

const elevation = references.find((item) => item.family === "elevation")!;
store.set(structuresDocumentAtom, {
  ...document,
  structures: [assignStructure(linked, { elevation: { $ref: elevation.id } })],
});
assert.throws(
  () =>
    store.set(elevationDocumentAtom, {
      ...store.get(elevationDocumentAtom),
      layers: [],
    }),
  /Structure 1.*Elevation/,
);
store.set(restoreAuthoringSnapshotAtom, createDefaultSnapshot());
assert.deepEqual(
  store.get(structuresDocumentAtom),
  createDefaultSnapshot().structures,
);

const old = createDefaultSnapshot();
old.components = { schemaVersion: 2, components: [] };
delete old.structures;
for (const domain of [old.spacing!, old.size!, old.radius!]) {
  for (const scale of domain.scales) delete scale.nameRef?.classification;
}
old.taxonomy!.categories = old.taxonomy!.categories.filter(
  (category) => !STRUCTURE_CATEGORIES.some((item) => item.id === category.id),
);
old.taxonomy!.order = old.taxonomy!.order.filter(
  (id) => !STRUCTURE_CATEGORIES.some((item) => item.id === id),
);
old.taxonomy!.terms = old.taxonomy!.terms.filter(
  (term) =>
    !STRUCTURE_CATEGORIES.some((category) => category.id === term.categoryId) &&
    !STRUCTURE_TERMS.some((item) => item.id === term.id),
);
old.taxonomy!.categories.find(
  (category) => category.id === STRUCTURE_CATEGORY_IDS.property,
)!.scopes = ["colors", "typography", "spacing", "size", "radius", "elevation"];
old.spacing!.scales[0].hideFromPublishing = true;
old.taxonomy!.terms.find(
  (term) => term.id === old.size!.scales[0].nameRef!.termId,
)!.value = "Custom existing name";
const upgraded = upgradeStructuresSnapshot(old, 3);
assertStoredSnapshot(upgraded);
assert.deepEqual(upgraded.structures, { schemaVersion: 1, structures: [] });
assert.deepEqual(upgraded.size, old.size);
assert.equal(upgraded.spacing!.scales[0].hideFromPublishing, true);
assert.equal(
  upgraded.taxonomy!.terms.find(
    (term) => term.id === old.size!.scales[0].nameRef!.termId,
  )!.value,
  "Custom existing name",
);
assert.equal(old.structures, undefined, "Upgrade does not mutate its input.");
assert.throws(() => assertStoredSnapshot(old), /incomplete/);
const collision = structuredClone(old);
collision.taxonomy!.terms.push({
  id: crypto.randomUUID(),
  categoryId: STRUCTURE_CATEGORY_IDS.property,
  value: "WIDTH",
  description: "",
});
assert.throws(
  () => upgradeStructuresSnapshot(collision, 3),
  /different identity/,
);
for (const version of [1, 2, 3] as const) {
  const legacy = structuredClone(old);
  if (version === 1) delete legacy.radius;
  if (version < 3) delete legacy.elevation;
  const complete = upgradeStructuresSnapshot(legacy, version);
  assertStoredSnapshot(complete);
  assert.deepEqual(complete.structures, { schemaVersion: 1, structures: [] });
  assert.deepEqual(complete.size, old.size);
}

const layout: PreviewLayoutContext = {
  availableWidth: 500,
  availableHeight: 300,
  naturalWidth: 98,
  naturalHeight: 34,
};
const sizeReferences = references.filter((item) => item.family === "size");
const small = { ...sizeReferences[0], value: 24 };
const large = { ...sizeReferences[1], value: 80 };
const gap = { ...spacing, value: 12 };
const radius = {
  ...references.find((item) => item.family === "radius")!,
  value: 8,
};
const live = [small, large, gap, radius, elevation];
const bounded = assignStructure(structure, {
  minWidth: { $ref: small.id },
  maxWidth: { $ref: large.id },
});
assert.equal(
  constraintChoiceAllowed(
    bounded,
    "minWidth",
    { $ref: large.id },
    live,
    layout,
  ),
  true,
  "Equal bounds are allowed.",
);
assert.equal(
  constraintChoiceAllowed(
    bounded,
    "maxWidth",
    { $ref: small.id },
    live,
    layout,
  ),
  true,
);
assert.equal(
  constraintChoiceAllowed(
    bounded,
    "minWidth",
    { value: { kind: "sizing", preset: "fill" } },
    live,
    layout,
  ),
  false,
);
assert.equal(
  constraintChoiceAllowed(
    bounded,
    "minWidth",
    { value: { kind: "sizing", preset: "hug" } },
    live,
    layout,
  ),
  false,
);
assert.equal(
  constraintChoiceAllowed(
    bounded,
    "minHeight",
    { value: { kind: "sizing", preset: "fill" } },
    live,
    layout,
  ),
  true,
  "The other axis is independent.",
);
assert.equal(
  constraintChoiceAllowed(
    structure,
    "minWidth",
    { value: { kind: "sizing", preset: "hug" } },
    live,
    UNMEASURED_LAYOUT,
  ),
  false,
  "Unmeasured presets are unsafe even without an opposing bound.",
);
assert.match(
  constraintChoiceIssue(
    bounded,
    "minWidth",
    { $ref: large.id },
    [{ ...large, value: 90 }, small],
    layout,
  ) ?? "",
  /^$/,
  "Equal reference identity uses the same live value for both bounds.",
);
const changed = [{ ...small, value: 90 }, large, gap, radius, elevation];
assert.match(
  resolveStructure(bounded, changed, layout).issues.minWidth!,
  /exceeds maximum/,
);
assert.deepEqual(
  structureSelection(bounded, "minWidth"),
  { $ref: small.id },
  "Later conflicts retain authored references.",
);
assert.equal(
  constraintChoiceAllowed(
    bounded,
    "maxWidth",
    { $ref: small.id },
    changed,
    layout,
  ),
  true,
  "A compatible replacement remains available.",
);

const styled = assignStructure(structure, {
  width: { $ref: large.id },
  height: { value: { kind: "sizing", preset: "fill" } },
  minWidth: { $ref: small.id },
  maxWidth: { value: { kind: "sizing", preset: "fill" } },
  minHeight: { value: { kind: "sizing", preset: "hug" } },
  maxHeight: { value: { kind: "sizing", preset: "fill" } },
  horizontal: { value: { kind: "term", termId: STRUCTURE_TERM_IDS.center } },
  vertical: { value: { kind: "term", termId: STRUCTURE_TERM_IDS.bottom } },
  gap: { $ref: gap.id },
  paddingTop: { $ref: gap.id },
  paddingRight: { $ref: gap.id },
  paddingBottom: { $ref: gap.id },
  paddingLeft: { $ref: gap.id },
  radiusTopLeft: { $ref: radius.id },
  radiusTopRight: { $ref: radius.id },
  radiusBottomRight: { $ref: radius.id },
  radiusBottomLeft: { $ref: radius.id },
  elevation: { $ref: elevation.id },
});
const output = resolveStructure(styled, live, layout);
assert.deepEqual(output.issues, {});
assert.deepEqual(output.styles, {
  display: "flex",
  flexDirection: "row",
  boxSizing: "border-box",
  width: 80,
  height: "100%",
  minWidth: 24,
  maxWidth: 500,
  minHeight: 34,
  maxHeight: 300,
  gap: 12,
  paddingTop: 12,
  paddingRight: 12,
  paddingBottom: 12,
  paddingLeft: 12,
  borderTopLeftRadius: 8,
  borderTopRightRadius: 8,
  borderBottomRightRadius: 8,
  borderBottomLeftRadius: 8,
  justifyContent: "center",
  alignItems: "flex-end",
  boxShadow: elevation.value,
});
assert.equal(output.intrinsicStyles.width, "max-content");
assert.equal(output.intrinsicStyles.maxWidth, undefined);
assert.equal(output.intrinsicStyles.paddingLeft, output.styles.paddingLeft);
assert.equal(resolveStructure(structure, live).styles.width, "max-content");
assert.equal(
  resolveStructure(structure, live).styles.paddingTop,
  undefined,
  "Optional fields do not acquire invented values.",
);
assert.ok(
  resolveStructure(
    styled,
    live.filter((item) => item.id !== gap.id),
    layout,
  ).issues.paddingLeft,
);
assert.ok(
  resolveStructure(
    styled,
    [{ ...large, value: -1 }, ...live.filter((item) => item.id !== large.id)],
    layout,
  ).issues.width,
);
assert.ok(
  resolveStructure(
    styled,
    live.filter((item) => item.family !== "elevation"),
    layout,
  ).issues.elevation,
);
assert.ok(
  resolveStructure(
    styled,
    [
      { ...large, family: "spacing" as const },
      ...live.filter((item) => item.id !== large.id),
    ],
    layout,
  ).issues.width,
);

assert.deepEqual(
  combinedTokenSelection([
    { selectedKey: null },
    { selectedKey: null },
    { selectedKey: null },
    { selectedKey: null },
  ]),
  { selectedKey: null, isMixed: false },
);
assert.deepEqual(
  combinedTokenSelection([
    { selectedKey: small.id },
    { selectedKey: small.id },
    { selectedKey: small.id },
    { selectedKey: small.id },
  ]),
  { selectedKey: small.id, isMixed: false },
);
assert.deepEqual(
  combinedTokenSelection([
    { selectedKey: small.id },
    { selectedKey: large.id },
    { selectedKey: small.id },
    { selectedKey: small.id },
  ]),
  { selectedKey: null, isMixed: true },
  "References, not equal generated numbers, determine Mixed.",
);

const editing = createStore();
editing.set(componentsDocumentAtom, { schemaVersion: 2, components: [] });
editing.set(structuresDocumentAtom, structuredClone(EMPTY_STRUCTURES));
assert.throws(() => editing.set(addStructureAtom), /edit mode/);
editing.set(enterEditModeAtom);
const firstId = editing.set(addStructureAtom);
const secondId = editing.set(addStructureAtom);
assert.equal(editing.get(selectedStructureIdAtom), secondId);
assert.deepEqual(
  editing.get(structuresDocumentAtom).structures.map((item) => item.name),
  ["Structure 1", "Structure 2"],
);
assert.throws(
  () => editing.set(renameStructureAtom, { id: firstId, name: " " }),
  /name/,
);
editing.set(renameStructureAtom, { id: firstId, name: "  Card  " });
assert.equal(editing.get(structuresDocumentAtom).structures[0].name, "Card");
const accepted = editing.get(structuresDocumentAtom);
assert.throws(
  () =>
    editing.set(assignStructureAtom, {
      id: firstId,
      changes: { minWidth: { value: { kind: "sizing", preset: "hug" } } },
      layout: UNMEASURED_LAYOUT,
    }),
  /measured/,
);
assert.equal(editing.get(structuresDocumentAtom), accepted);
assert.throws(
  () =>
    editing.set(assignStructureAtom, {
      id: firstId,
      changes: { width: { $ref: spacing.id } },
      layout,
    }),
  /no longer available/,
);
assert.equal(editing.get(structuresDocumentAtom), accepted);
editing.set(assignStructureAtom, {
  id: firstId,
  changes: {
    paddingTop: { $ref: spacing.id },
    paddingRight: { $ref: spacing.id },
    paddingBottom: { $ref: spacing.id },
    paddingLeft: { $ref: spacing.id },
  },
  layout,
});
const allPadding = editing.get(structuresDocumentAtom).structures[0];
assert.equal(
  allPadding.properties.filter(
    (binding) => "$ref" in binding && binding.$ref === spacing.id,
  ).length,
  4,
);
assert.throws(
  () =>
    editing.set(assignStructureAtom, {
      id: firstId,
      changes: { paddingTop: null, paddingLeft: { $ref: width.id } },
      layout,
    }),
  /no longer available/,
);
assert.equal(
  editing.get(structuresDocumentAtom).structures[0],
  allPadding,
  "Four-field edits validate before any slot changes.",
);
editing.set(assignStructureAtom, {
  id: firstId,
  changes: { paddingTop: null },
  layout,
});
assert.equal(
  structureSelection(
    editing.get(structuresDocumentAtom).structures[0],
    "paddingTop",
  ),
  null,
);
assert.deepEqual(
  structureSelection(
    editing.get(structuresDocumentAtom).structures[0],
    "paddingLeft",
  ),
  { $ref: spacing.id },
);

const currentSizes = editing
  .get(primitiveReferencesAtom)
  .filter((item) => item.family === "size");
const lowest = currentSizes.reduce((a, b) =>
  Number(a.value) <= Number(b.value) ? a : b,
);
const highest = currentSizes.reduce((a, b) =>
  Number(a.value) >= Number(b.value) ? a : b,
);
assert.ok(Number(highest.value) > Number(lowest.value));
editing.set(assignStructureAtom, {
  id: firstId,
  changes: { maxWidth: { $ref: lowest.id } },
  layout,
});
const beforeConstraint = editing.get(structuresDocumentAtom);
assert.throws(
  () =>
    editing.set(assignStructureAtom, {
      id: firstId,
      changes: { minWidth: { $ref: highest.id } },
      layout,
    }),
  /exceeds maximum/,
);
assert.equal(
  editing.get(structuresDocumentAtom),
  beforeConstraint,
  "A direct/stale callback cannot bypass option filtering.",
);
editing.set(assignStructureAtom, {
  id: firstId,
  changes: { minWidth: { $ref: highest.id }, maxWidth: { $ref: highest.id } },
  layout,
});
assert.deepEqual(
  resolveStructure(
    editing.get(structuresDocumentAtom).structures[0],
    editing.get(primitiveReferencesAtom),
    layout,
  ).issues,
  {},
);
editing.set(assignStructureAtom, {
  id: firstId,
  changes: { minWidth: null },
  layout,
});

const removed = editing.set(removeStructureAtom, secondId);
assert.equal(editing.get(selectedStructureIdAtom), null);
editing.set(selectedStructureIdAtom, firstId);
editing.set(restoreStructureAtom, removed);
assert.equal(
  editing.get(selectedStructureIdAtom),
  firstId,
  "Undo does not steal a later selection.",
);
assert.deepEqual(
  editing.get(structuresDocumentAtom).structures[1],
  removed.structure,
);
const selectedRemoval = editing.set(removeStructureAtom, firstId);
editing.set(restoreStructureAtom, selectedRemoval);
assert.equal(editing.get(selectedStructureIdAtom), firstId);
assert.deepEqual(
  editing.get(structuresDocumentAtom).structures[0],
  selectedRemoval.structure,
);
assert.throws(
  () => editing.set(restoreStructureAtom, selectedRemoval),
  /already been restored/,
);
editing.set(editModeAtom, false);
assert.throws(
  () => editing.set(renameStructureAtom, { id: firstId, name: "Blocked" }),
  /edit mode/,
);
assert.throws(() => editing.set(removeStructureAtom, firstId), /edit mode/);
assert.throws(
  () =>
    editing.set(assignStructureAtom, {
      id: firstId,
      changes: { gap: { $ref: spacing.id } },
      layout,
    }),
  /edit mode/,
);

const counted = createStore();
const tokenBaseline = counted.get(tokenImpactSummaryAtom);
const foundationBaseline = counted.get(foundationImpactSummaryAtom);
const analysisBaseline = counted.get(analysisWorkingInputAtom);
counted.set(enterEditModeAtom);
const countedId = counted.set(addStructureAtom);
counted.set(assignStructureAtom, {
  id: countedId,
  changes: { width: { $ref: width.id }, gap: { $ref: spacing.id } },
  layout,
});
const group = counted
  .get(changeGroupsAtom)
  .find((item) => item.id === "structures")!;
assert.equal(group.items[0].kind, "new");
assert.deepEqual(
  group.items[0].fields.map((field) => field.key),
  [
    "Name",
    "Width",
    "Height",
    "Horizontal alignment",
    "Vertical alignment",
    "Direction",
    "Gap",
    "Generate sizes",
  ],
);
assert.deepEqual(counted.get(tokenImpactSummaryAtom), tokenBaseline);
assert.deepEqual(counted.get(foundationImpactSummaryAtom), foundationBaseline);
const analysis = counted.get(analysisWorkingInputAtom);
assert.deepEqual(analysis.errors, []);
assert.ok(
  analysis.records.some(
    (row) =>
      row.category === "authoring/structures" && row.conceptId === countedId,
  ),
);
assert.deepEqual(
  analysis.records.filter((row) => row.category === "tokens"),
  analysisBaseline.records.filter((row) => row.category === "tokens"),
);
assert.deepEqual(
  analysis.outputMetadata,
  analysisBaseline.outputMetadata,
  "Structure source records do not add published concepts or mode-value axes.",
);
assert.ok(
  !counted
    .get(analysisSavedInputAtom)
    .records.some(
      (row) =>
        row.category === "authoring/structures" && row.conceptId === countedId,
    ),
);
counted.set(saveEditAtom);
assert.ok(
  counted
    .get(analysisSavedInputAtom)
    .records.some(
      (row) =>
        row.category === "authoring/structures" && row.conceptId === countedId,
    ),
);
assert.ok(
  counted.get(changeGroupsAtom).some((item) => item.id === "structures"),
  "Save does not redefine the shipped Changes baseline.",
);
counted.set(renameStructureAtom, { id: countedId, name: "Unsaved name" });
counted.set(cancelEditAtom);
assert.equal(
  counted
    .get(structuresDocumentAtom)
    .structures.find((item) => item.conceptId === countedId)!.name,
  "Structure 1",
);
counted.set(enterEditModeAtom);
counted.set(revertChangeItemAtom, group.items[0]);
assert.ok(
  !counted.get(changeGroupsAtom).some((item) => item.id === "structures"),
  "Create then remove returns to the shipped baseline.",
);
assert.ok(
  counted
    .get(editSessionSnapshotAtom)!
    .structures!.structures.some((item) => item.conceptId === countedId),
  "Revert does not mutate the independent Cancel baseline.",
);
counted.set(addStructureAtom);
counted.set(addStructureAtom);
counted.set(revertChangeTopicAtom, "structures");
assert.deepEqual(
  counted.get(structuresDocumentAtom),
  createDefaultSnapshot().structures,
);
const baselineDocument = { schemaVersion: 1 as const, structures: [structure] };
assert.equal(
  structureChanges(
    { schemaVersion: 1, structures: [{ ...structure, name: "Renamed" }] },
    taxonomy,
    baselineDocument,
  )[0].kind,
  "modified",
);
assert.equal(
  structureChanges(
    { schemaVersion: 1, structures: [] },
    taxonomy,
    baselineDocument,
  )[0].kind,
  "removed",
);

const guardedRevert = createStore();
guardedRevert.set(enterEditModeAtom);
const customSizeId = guardedRevert.set(addSizeScaleAtom);
const customReference = guardedRevert
  .get(primitiveReferencesAtom)
  .find((item) => item.sourceId === customSizeId)!;
const consumerId = guardedRevert.set(addStructureAtom);
guardedRevert.set(assignStructureAtom, {
  id: consumerId,
  changes: { width: { $ref: customReference.id } },
  layout,
});
guardedRevert.set(saveEditAtom);
const graph = structuredClone(guardedRevert.get(authoringSnapshotAtom));
assert.throws(
  () => guardedRevert.set(revertChangeTopicAtom, "foundations"),
  /Structure 1.*Width/,
);
assert.deepEqual(
  guardedRevert.get(authoringSnapshotAtom),
  graph,
  "Foundation topic preflight rejects before changing any domain.",
);
const customChange = guardedRevert
  .get(changeGroupsAtom)
  .find((item) => item.id === "foundations")!
  .items.find((item) => item.id === customSizeId)!;
assert.throws(
  () => guardedRevert.set(revertChangeItemAtom, customChange),
  /Structure 1.*Width/,
);
assert.deepEqual(guardedRevert.get(authoringSnapshotAtom), graph);
const badGraph = structuredClone(graph);
badGraph.size!.scales = badGraph.size!.scales.filter(
  (scale) => scale.id !== customSizeId,
);
assert.throws(
  () => guardedRevert.set(restoreAuthoringSnapshotAtom, badGraph),
  /Structure 1.*Width/,
);
assert.deepEqual(
  guardedRevert.get(authoringSnapshotAtom),
  graph,
  "Invalid restore validates the complete graph before mutation.",
);
guardedRevert.set(removeStructureAtom, consumerId);
guardedRevert.set(revertChangeItemAtom, customChange);
guardedRevert.set(cancelEditAtom);
assert.deepEqual(
  guardedRevert.get(authoringSnapshotAtom),
  graph,
  "Cancel restores source and consumer coherently without intermediate guard failures.",
);

const elevationGuard = createStore();
elevationGuard.set(enterEditModeAtom);
const elevatedId = elevationGuard.set(addStructureAtom);
const upperShadow = elevationGuard
  .get(primitiveReferencesAtom)
  .filter((item) => item.family === "elevation")
  .reduce((a, b) => (a.index > b.index ? a : b));
elevationGuard.set(assignStructureAtom, {
  id: elevatedId,
  changes: { elevation: { $ref: upperShadow.id } },
  layout,
});
const elevationGraph = structuredClone(
  elevationGuard.get(authoringSnapshotAtom),
);
assert.throws(
  () =>
    elevationGuard.set(updateElevationAtom, {
      above: upperShadow.index - 1,
      below: 1,
    }),
  /Structure 1.*Elevation/,
);
assert.deepEqual(
  elevationGuard.get(authoringSnapshotAtom),
  elevationGraph,
  "Rejected range changes do not leave extra Registry terms.",
);
console.log(
  "Structures: model, CRUD/Undo, constraints, CSS resolution, upgrades, graph integrity, lifecycle, source accounting, and unchanged token denominators passed.",
);
