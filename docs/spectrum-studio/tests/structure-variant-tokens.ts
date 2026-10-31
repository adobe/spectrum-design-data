// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createTshirtFixture } from "./fixtures/tshirt";
import { createVariantProperty } from "../src/features/option-groups/model";
import {
  emptyStructureEditor,
  resolveStructureOptions,
  EMPTY_STRUCTURE_PREVIEW,
} from "../src/features/structures/variants";
import { synchronizeVariantIdentities } from "../src/features/structures/semanticIdentity";
import {
  buildTshirtArtifacts,
  tshirtPreview,
  liveTshirtRow,
} from "../src/features/design-data/tshirtArtifacts";
import {
  structureSelection,
  structureSlotDefinition,
} from "../src/features/structures/model";
import {
  projectClassification,
  assertTaxonomy,
} from "../src/features/taxonomy/model";
import { createStore } from "jotai";
import { primitiveReferencesAtom } from "../src/features/tokens/primitiveReferenceState";
import {
  createElement,
  elementBindingId,
} from "../src/features/structures/elements";
import { SIZE_TERM_IDS } from "../src/features/taxonomy/variantVocabulary";
import {
  canonicalAliasRows,
  completeAliasSource,
} from "../src/features/tokens/aliasTargets";
import { buildClassificationReviewExport } from "../src/features/taxonomy/reviewedExport";
import {
  buildGeneratedClassificationCompatibility,
  assertGeneratedClassificationCompatibility,
} from "../src/features/taxonomy/generatedReviewExport";
import { EMPTY_ALIASES } from "../src/features/tokens/aliases";
import {
  renameVariantProperty,
  removeVariantOption,
  restoreEditorRemoval,
} from "../src/features/structures/variantOperations";
import { createDefaultSnapshot } from "../src/features/edit-session/state";
import { compareAuthoring } from "../src/features/changelog/registry";
import { compareSemanticTokens } from "../src/features/changelog/tokenComparison";
import { defaultStructureReferences } from "../src/features/structures/thumbnail";

const fixture = createTshirtFixture({ fiveSizes: true });
const baseline = structuredClone(fixture.bundle);
const source = structuredClone(fixture.source);
const structure = source.structures!.structures[0];
const taxonomy = source.taxonomy!;
const category = crypto.randomUUID();
const first = crypto.randomUUID(),
  second = crypto.randomUUID();
taxonomy.categories.push({
  id: category,
  key: "treatment",
  name: "Treatment",
  description: "",
  valueType: "string",
  cardinality: "one",
  scopes: ["structures"],
  required: false,
  includeInProjections: true,
});
const propertyTerm = crypto.randomUUID();
taxonomy.terms.push(
  { id: propertyTerm, categoryId: category, value: "density", description: "" },
  { id: first, categoryId: category, value: "roomy", description: "" },
  { id: second, categoryId: category, value: "narrowed", description: "" },
);
taxonomy.order.push(category);
// Property and option use separate categories so neither assignment replaces the other.
const propertyCategory = crypto.randomUUID();
taxonomy.categories.push({
  ...taxonomy.categories.at(-1)!,
  id: propertyCategory,
  key: "variantProperty",
});
taxonomy.terms.find((term) => term.id === propertyTerm)!.categoryId =
  propertyCategory;
taxonomy.order.splice(taxonomy.order.indexOf(category), 0, propertyCategory);
const property = createVariantProperty(
  "Density",
  { [propertyCategory]: propertyTerm },
  [
    { name: "Regular", classification: { [category]: first } },
    { name: "Compact", classification: { [category]: second } },
  ],
);
const optionId = property.options[1].id;
structure.editor = {
  ...emptyStructureEditor(),
  properties: [property],
  overrides: {
    [optionId]: { slots: { paddingLeft: { $ref: fixture.alternate.id } } },
  },
};
source.structures = synchronizeVariantIdentities(
  source.structures!,
  source.modeSets,
);
const persisted = structuredClone(source);
const renamedProperty = renameVariantProperty(
  structure.editor,
  property.id,
  "density",
  taxonomy,
);
assert.equal(renamedProperty.editor.properties[0].name, "Density");
assert.equal(
  renamedProperty.taxonomy,
  taxonomy,
  "Choosing an existing term cannot modify the Registry.",
);
assert.throws(
  () =>
    renameVariantProperty(
      structure.editor!,
      property.id,
      "Unregistered property",
      taxonomy,
    ),
  /existing Registry/,
);
const expandedModes = [
  ...source.modeSets,
  {
    ...source.modeSets[0],
    id: crypto.randomUUID(),
    key: "variantTestAxis",
    modes: source.modeSets[0].modes.map((mode) => ({
      ...mode,
      id: crypto.randomUUID(),
    })),
  },
];
expandedModes.at(-1)!.defaultModeId = expandedModes.at(-1)!.modes[0].id;
const expanded = synchronizeVariantIdentities(
  source.structures!,
  expandedModes,
);
const previousIds =
  source.structures!.structures[0].editor!.semanticIdentities!;
const expandedIds = expanded.structures[0].editor!.semanticIdentities!;
for (const [key, identity] of Object.entries(previousIds[optionId])) {
  assert.equal(expandedIds[optionId][key].conceptId, identity.conceptId);
  for (const [context, uuid] of Object.entries(identity.rows))
    assert.equal(expandedIds[optionId][key].rows[context], uuid);
  assert.ok(
    Object.keys(expandedIds[optionId][key].rows).length >
      Object.keys(identity.rows).length,
  );
}
assert.equal(
  synchronizeVariantIdentities(expanded, source.modeSets),
  expanded,
  "Removing a mode preserves IDs for Undo.",
);
const beforeRemoval = expanded.structures[0].editor!;
const afterRemoval = removeVariantOption(beforeRemoval, property.id, optionId);
assert.deepEqual(
  restoreEditorRemoval(afterRemoval, beforeRemoval, afterRemoval)
    .semanticIdentities,
  expandedIds,
  "Option Undo restores its original output identities.",
);
assertTaxonomy(taxonomy);
const generated = buildTshirtArtifacts(source);
const fullBefore = {
  ...createDefaultSnapshot(),
  ...structuredClone(fixture.source),
};
const fullAfter = { ...createDefaultSnapshot(), ...structuredClone(source) };
fullAfter.structures!.structures[0].description =
  "A description unrelated to token generation.";
const authoredComparison = compareAuthoring(fullBefore, fullAfter);
const tokenComparison = compareSemanticTokens(
  fullBefore,
  fullAfter,
  authoredComparison,
);
assert.equal(
  tokenComparison.records.filter((row) =>
    row.modeValues.some((value) => value.changed),
  ).length,
  5,
);
const variantConcepts = new Set(
  generated.semantics.filter((row) => row.optionId).map((row) => row.conceptId),
);
assert.deepEqual(
  tokenComparison.items
    .filter((item) => variantConcepts.has(item.id))
    .flatMap((item) => item.upstream ?? [])
    .filter(
      (upstream) =>
        upstream.address.path[0] === "structures" &&
        upstream.address.path.includes("description"),
    ),
  [],
  "Generated resets exclude unrelated Structure metadata.",
);
const identityOnly = structuredClone(fullAfter);
identityOnly.structures!.structures[0].editor!.semanticIdentities = {};
assert.deepEqual(
  compareAuthoring(fullBefore, identityOnly).slots,
  authoredComparison.slots,
  "Output identity bookkeeping is excluded from authored counts and reset choices.",
);
assert.deepEqual(
  source,
  persisted,
  "Generation cannot allocate or change identities.",
);
assert.deepEqual(
  generated.semantics.filter((row) => !row.optionId),
  baseline.semantics,
);
const added = generated.semantics.filter((row) => row.optionId === optionId);
assert.equal(
  added.length,
  5,
  "One changed binding creates exactly one semantic per enabled size.",
);
assert.equal(new Set(added.map((row) => row.conceptId)).size, 5);
assert.ok(added.every((row) => /^[0-9a-f-]{14}4/.test(row.conceptId)));
assert.ok(added.every((row) => row.bindingIds.length === 1));
assert.ok(
  added.every((row) => row.canonicalName?.includes("density-narrowed")),
);
assert.deepEqual(
  buildTshirtArtifacts(structuredClone(source)),
  generated,
  "Reload preserves every output identity.",
);
assert.equal(
  synchronizeVariantIdentities(source.structures!, source.modeSets),
  source.structures,
  "Identity synchronization is idempotent.",
);
const effective = resolveStructureOptions(source.structures!.structures[0], {
  ...EMPTY_STRUCTURE_PREVIEW,
  options: { [property.id]: optionId },
}).structure;
const preview = tshirtPreview(
  effective,
  "m",
  generated,
  {},
  fixture.references,
  { [property.id]: optionId },
);
const changed = added.find((row) => row.size === "m")!;
assert.deepEqual(structureSelection(preview.structure, "paddingLeft"), {
  $ref: changed.token.uuid,
});
assert.deepEqual(
  structureSelection(preview.structure, "paddingRight"),
  structureSelection(
    tshirtPreview(structure, "m", baseline, {}, fixture.references).structure,
    "paddingRight",
  ),
  "Unchanged grouped sides reuse the exact default semantic.",
);
taxonomy.order = [...taxonomy.order].reverse();
const reordered = buildTshirtArtifacts(source);
const renamed = reordered.semantics.find(
  (row) => row.conceptId === changed.conceptId,
)!;
assert.equal(
  renamed.token.uuid,
  changed.token.uuid,
  "Registry reordering must not change token identity.",
);
assert.equal(
  renamed.canonicalName,
  projectClassification(taxonomy, renamed.classification, "structures").name,
);
const noRule = structuredClone(source);
noRule.structures!.structures[0].generation!.applications = [];
noRule.structures!.structures[0].generation!.sizeTermIds = [SIZE_TERM_IDS.m];
assert.equal(
  buildTshirtArtifacts(noRule).semantics.length,
  1,
  "Size support off still emits the changed Medium binding.",
);
const leafSource = structuredClone(source);
const leafRoot = leafSource.structures!.structures[0];
const text = createElement("text");
const typeReferences = createStore()
  .get(primitiveReferencesAtom)
  .filter((reference) => reference.metricId === "font-size");
assert.ok(typeReferences.length >= 2);
text.bindings = [
  {
    id: elementBindingId(text.id, "fontSize"),
    slot: "fontSize",
    $ref: typeReferences[0].id,
    family: "typography",
  },
];
leafRoot.elements = [text];
leafRoot.editor!.overrides[optionId] = {
  elements: {
    [text.id]: {
      ...text,
      bindings: [{ ...text.bindings[0], $ref: typeReferences[1].id }],
    },
  },
};
leafSource.structures = synchronizeVariantIdentities(
  leafSource.structures!,
  leafSource.modeSets,
);
const leafBundle = buildTshirtArtifacts(leafSource);
const leafRows = leafBundle.semantics.filter((row) => row.optionId);
assert.ok(
  leafRows.length >= 5,
  "A changed leaf binding emits variant semantics for enabled sizes and actual owned modes.",
);
assert.ok(leafRows.every((row) => row.bindingIds[0] === text.bindings[0].id));
assert.ok(leafRows.every((row) => row.target.family === "typography"));
assert.deepEqual(buildTshirtArtifacts(structuredClone(leafSource)), leafBundle);
for (const slot of [
  "minWidth",
  "minHeight",
  "maxWidth",
  "maxHeight",
] as const) {
  const constraintSource = structuredClone(source);
  const owner = constraintSource.structures!.structures[0];
  const visual = createElement("visual");
  owner.elements = [visual];
  owner.editor!.overrides[optionId] = {
    elements: {
      [visual.id]: {
        ...visual,
        bindings: [
          {
            id: elementBindingId(visual.id, slot),
            slot,
            $ref: createStore()
              .get(primitiveReferencesAtom)
              .find((reference) => reference.family === "size")!.id,
            family: "size",
          },
        ],
      },
    },
  };
  constraintSource.structures = synchronizeVariantIdentities(
    constraintSource.structures!,
    constraintSource.modeSets,
  );
  const rows = buildTshirtArtifacts(constraintSource).semantics.filter(
    (row) => row.optionId,
  );
  assert.ok(rows.length > 0);
  for (const row of rows)
    for (const [category, term] of Object.entries(
      structureSlotDefinition(slot).classification,
    ))
      assert.equal(
        row.classification[category],
        term,
        "Leaf constraints reuse the Registry width/height and minimum/maximum classifications.",
      );
}
assert.ok(
  leafRows.every((row) =>
    Object.keys(row.selection).every(
      (id) =>
        leafSource.modeSets.find((axis) => axis.id === id)?.key ===
        "textScaling",
    ),
  ),
  "Unrelated color modes cannot multiply typography semantics.",
);
const ratioReferences = createStore()
  .get(primitiveReferencesAtom)
  .filter((reference) => reference.unit === "multiplier");
assert.ok(ratioReferences.length >= 2);
const ratioSource = structuredClone(leafSource);
const ratioRoot = ratioSource.structures!.structures[0];
const ratioBinding = {
  id: elementBindingId(text.id, "lineHeight"),
  slot: "lineHeight" as const,
  $ref: ratioReferences[0].id,
  family: "typography" as const,
};
ratioRoot.elements = [{ ...text, bindings: [ratioBinding] }];
ratioRoot.editor!.overrides[optionId] = {
  elements: {
    [text.id]: {
      ...text,
      bindings: [{ ...ratioBinding, $ref: ratioReferences[1].id }],
    },
  },
};
ratioSource.structures = synchronizeVariantIdentities(
  ratioSource.structures!,
  ratioSource.modeSets,
);
const ratioBundle = buildTshirtArtifacts(ratioSource);
const ratioRow = ratioBundle.semantics.find((row) => row.optionId)!;
assert.ok(
  !String(ratioRow.token.value).includes("px"),
  "Unitless line-height semantics remain unitless.",
);
assert.equal(
  liveTshirtRow(ratioRow, ratioReferences).token.value,
  String(
    ratioReferences.find((reference) => reference.id === ratioRow.target.id)!
      .value,
  ),
);
const records = canonicalAliasRows(
  completeAliasSource(ratioSource),
  ratioBundle,
  "strict",
  { excludeColors: true },
);
assert.ok(
  records.some((record) => record.token.semantic?.optionId === optionId),
  "Variants reach the canonical token inventory.",
);
assert.ok(
  records
    .filter((record) => record.token.semantic?.optionId)
    .every((record) => record.name === record.token.semantic!.canonicalName),
  "Browser and export use the same Registry-ordered names.",
);
const defaultPreview = defaultStructureReferences(
  fixture.references.map((reference) => ({ ...reference, value: 9999 })),
  records,
  ratioSource.modeSets,
);
assert.notEqual(
  defaultPreview.references.find(
    (reference) => reference.id === fixture.anchor.id,
  )!.value,
  9999,
  "List thumbnails use declared default modes instead of active preview values.",
);
const packet = await buildGeneratedClassificationCompatibility(
  ratioBundle,
  await buildClassificationReviewExport(
    ratioSource.taxonomy!,
    records.filter((record) => record.token.type !== "opacity"),
    EMPTY_ALIASES,
    "compatibility",
  ),
);
assert.equal(packet.schemaVersion, 3);
await assertGeneratedClassificationCompatibility(
  JSON.parse(JSON.stringify(packet)),
);
structure.editor.overrides[optionId] = { order: [] };
source.structures!.structures[0].editor!.overrides[optionId] = { order: [] };
assert.deepEqual(
  buildTshirtArtifacts(source).tokens,
  baseline.tokens,
  "Ordering alone creates zero tokens.",
);
console.log(
  "Variant semantics: exact inventory, stable random identities, grouped inheritance, preview selection, and Registry ordering passed.",
);
