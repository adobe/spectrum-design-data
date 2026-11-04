// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createTshirtFixture } from "./fixtures/tshirt";
import {
  buildTshirtArtifacts,
  liveTshirtRow,
} from "../src/features/design-data/tshirtArtifacts";
import { createVariantProperty } from "../src/features/option-groups/model";
import {
  assignStructure,
  isStructuresDocument,
} from "../src/features/structures/model";
import {
  createElement,
  elementBindingId,
  isStructureElement,
} from "../src/features/structures/elements";
import { emptyStructureEditor } from "../src/features/structures/variants";
import { synchronizeVariantIdentities } from "../src/features/structures/semanticIdentity";
import { resolveElements } from "../src/features/structures/elementResolution";
import { structureBinding } from "../src/features/structures/model";
import { createStructure } from "../src/features/structures/model";
import {
  toPortableStructures,
  fromPortableStructures,
} from "../src/features/structures/portableConversion";
import { isPortableStructuresDocument } from "../src/features/structures/portableShape";
import { canonicalJson } from "../src/features/design-data/canonicalJson";
import type { TshirtAuthoringSource } from "../src/features/design-data/tshirtArtifacts";

const fixture = createTshirtFixture({ fiveSizes: true });
const element = createElement("workflowIcon");
const bindingId = elementBindingId(element.id, "size");
const sizeReferences = fixture.references
  .filter(
    (reference) =>
      reference.family === "size" &&
      reference.sourceId ===
        fixture.references.find((item) => item.family === "size")?.sourceId,
  )
  .sort((left, right) => left.index - right.index);
assert.ok(sizeReferences.length > 1);
const expectedTargets = (anchorId: string) => {
  const anchorIndex = sizeReferences.findIndex(
    (reference) => reference.id === anchorId,
  );
  return fixture.rule.mappings.map(({ offset }) => {
    const position = Math.min(
      sizeReferences.length - 1,
      Math.max(0, anchorIndex + offset),
    );
    return sizeReferences[position].value;
  });
};
element.bindings = [
  {
    id: bindingId,
    slot: "size",
    family: "size",
    $ref: sizeReferences[0].id,
  },
];

function sourceWithElement(binding: (typeof element.bindings)[number]) {
  const source = structuredClone(fixture.source);
  const structure = source.structures!.structures[0];
  structure.elements = [{ ...element, bindings: [binding] }];
  return source;
}

function leafRows(source: TshirtAuthoringSource, id = bindingId) {
  return buildTshirtArtifacts(source).semantics.filter((row) =>
    row.bindingIds.includes(id),
  );
}

const referenceSource = sourceWithElement(element.bindings[0]);
const referenceRows = leafRows(referenceSource);
assert.equal(referenceRows.length, 5);
assert.deepEqual(
  referenceRows.map((row) => row.size),
  ["xs", "s", "m", "l", "xl"],
  "One primitive anchor generates an output for every selected size.",
);
assert.deepEqual(
  referenceRows.map((row) => row.target.value),
  expectedTargets(sizeReferences[0].id),
  "The attached rule recalculates every size from the primitive anchor.",
);
assert.ok(referenceRows.every((row) => row.token.name.structure === "base"));
assert.ok(
  referenceRows.every(
    (row) =>
      row.token.name.element === "workflow-icon" && !("$ref" in row.token),
  ),
  "Generated semantic output is a resolved value, not an authoring reference.",
);

const fiveSource = sourceWithElement({
  id: bindingId,
  slot: "size",
  family: "size",
  value: { kind: "number", value: 5, unit: "px" },
});
const fiveRows = leafRows(fiveSource);
assert.equal(fiveRows.length, referenceRows.length);
assert.deepEqual(
  fiveRows.map((row) => row.size),
  referenceRows.map((row) => row.size),
  "A single numeric input generates all selected size rows without per-size overrides.",
);
assert.deepEqual(
  fiveRows.map((row) => row.token.uuid),
  referenceRows.map((row) => row.token.uuid),
  "Replacing a primitive anchor with a literal preserves each semantic identity.",
);
assert.ok(fiveRows.every((row) => row.token.value === "5px"));

const eightSource = sourceWithElement({
  id: bindingId,
  slot: "size",
  family: "size",
  value: { kind: "number", value: 8, unit: "px" },
});
const eightRows = leafRows(eightSource);
assert.deepEqual(
  eightRows.map((row) => row.size),
  ["xs", "s", "m", "l", "xl"],
);
assert.deepEqual(
  eightRows.map((row) => row.token.uuid),
  fiveRows.map((row) => row.token.uuid),
  "Changing a literal updates the same semantic rows.",
);
assert.ok(eightRows.every((row) => row.token.value === "8px"));
assert.deepEqual(
  eightRows.map((row) => liveTshirtRow(row, fixture.references).token),
  eightRows.map((row) => row.token),
  "Numeric leaf outputs stay available in live previews without becoming primitives.",
);
assert.throws(
  () => liveTshirtRow(referenceRows[0], []),
  /unavailable/,
  "Unavailable primitive references still report errors.",
);
assert.deepEqual(
  buildTshirtArtifacts(JSON.parse(JSON.stringify(eightSource))),
  buildTshirtArtifacts(eightSource),
  "Authored numeric bindings survive serialization and reload.",
);

const alternateSource = sourceWithElement({
  id: bindingId,
  slot: "size",
  family: "size",
  $ref: sizeReferences.at(-1)!.id,
});
const alternateRows = leafRows(alternateSource);
assert.deepEqual(
  alternateRows.map((row) => row.size),
  referenceRows.map((row) => row.size),
);
assert.deepEqual(
  alternateRows.map((row) => row.target.value),
  expectedTargets(sizeReferences.at(-1)!.id),
  "Moving the anchor recalculates all size outputs using the same rule offsets.",
);
assert.deepEqual(
  alternateRows.map((row) => row.token.uuid),
  referenceRows.map((row) => row.token.uuid),
  "Reassigning the authored primitive updates values without minting new semantic identities.",
);
assert.notDeepEqual(
  alternateRows.map((row) => row.target.value),
  referenceRows.map((row) => row.target.value),
  "Changing the primitive anchor recalculates every size while preserving its rule mapping.",
);
assert.ok(
  !fixture.references.some((reference) =>
    [...referenceRows, ...fiveRows, ...eightRows].some(
      (row) => reference.id === row.token.uuid,
    ),
  ),
  "Generated semantic tokens never enter the primitive-reference picker source.",
);

const invalidLeaf = {
  ...element,
  bindings: [
    {
      id: bindingId,
      slot: "size" as const,
      family: "size" as const,
      value: {
        kind: "number" as const,
        value: Number.NaN,
        unit: "px" as const,
      },
    },
  ],
};
assert.equal(isStructureElement(invalidLeaf), false);
assert.equal(
  isStructureElement({
    ...invalidLeaf,
    bindings: [
      {
        ...invalidLeaf.bindings[0],
        value: { kind: "number", value: -1, unit: "px" },
      },
    ],
  }),
  false,
  "Leaf literal validation rejects non-finite and negative values.",
);

const typographyElement = createElement("text");
typographyElement.bindings = [
  {
    id: elementBindingId(typographyElement.id, "lineHeight"),
    slot: "lineHeight",
    family: "typography",
    value: { kind: "number", value: 1.5, unit: "multiplier" },
  },
];
const preview = resolveElements(
  {
    ...fixture.structure,
    generation: {
      ...fixture.structure.generation!,
      applications: [],
    },
    elements: [typographyElement],
  },
  [],
  [],
)[0];
assert.deepEqual(preview.issues, []);
assert.equal(preview.styles.lineHeight, 1.5);

const layoutSource = structuredClone(fixture.source);
const layoutStructure = layoutSource.structures!.structures[0];
const paddingLeft = structureBinding(layoutStructure, "paddingLeft")!;
const fiveLayout = assignStructure(layoutStructure, {
  paddingLeft: {
    value: { kind: "number", value: 5, unit: "px" },
  },
});
layoutSource.structures!.structures[0] = fiveLayout;
const layoutRows = buildTshirtArtifacts(layoutSource).semantics.filter((row) =>
  row.bindingIds.includes(paddingLeft.id),
);
assert.equal(layoutRows.length, 5);
assert.ok(layoutRows.every((row) => row.token.value === "5px"));
const eightLayout = assignStructure(fiveLayout, {
  paddingLeft: {
    value: { kind: "number", value: 8, unit: "px" },
  },
});
layoutSource.structures!.structures[0] = eightLayout;
const eightLayoutRows = buildTshirtArtifacts(layoutSource).semantics.filter(
  (row) => row.bindingIds.includes(paddingLeft.id),
);
assert.deepEqual(
  eightLayoutRows.map((row) => row.token.uuid),
  layoutRows.map((row) => row.token.uuid),
  "Editing a hardcoded layout value updates the same semantic identity.",
);
assert.ok(eightLayoutRows.every((row) => row.token.value === "8px"));
assert.deepEqual(
  eightLayoutRows.map((row) => liveTshirtRow(row, fixture.references).token),
  eightLayoutRows.map((row) => row.token),
  "Numeric layout outputs stay available after restoring the authored source.",
);

const ownedSource = structuredClone(fixture.source);
const owner = ownedSource.structures!.structures[0];
const ownedLayout = createStructure("Owned layout");
ownedLayout.parentStructureId = owner.conceptId;
const ownedLayoutLiteral = assignStructure(ownedLayout, {
  paddingLeft: {
    value: { kind: "number", value: 5, unit: "px" },
  },
});
const ownedBinding = structureBinding(ownedLayoutLiteral, "paddingLeft")!;
const ownedElement = createElement("workflowIcon");
const ownedElementBinding = elementBindingId(ownedElement.id, "size");
ownedElement.bindings = [
  {
    id: ownedElementBinding,
    slot: "size",
    family: "size",
    value: { kind: "number", value: 5, unit: "px" },
  },
];
ownedLayoutLiteral.elements = [ownedElement];
const instanceId = crypto.randomUUID();
owner.elements = [
  {
    id: instanceId,
    kind: "structureReference",
    structureId: ownedLayout.conceptId,
  },
];
owner.editor = {
  ...emptyStructureEditor(),
  layouts: { [`/${instanceId}`]: {} },
};
ownedSource.structures!.structures = [owner, ownedLayoutLiteral];
const ownedRows = buildTshirtArtifacts(ownedSource).semantics;
assert.ok(
  ownedRows.some(
    (row) =>
      row.structureId === owner.conceptId &&
      row.bindingIds.includes(ownedBinding.id) &&
      row.token.value === "5px",
  ),
  "Numeric values in owned layout definitions generate contextual output.",
);
assert.ok(
  ownedRows.some(
    (row) =>
      row.structureId === owner.conceptId &&
      row.bindingIds.includes(ownedElementBinding) &&
      row.token.value === "5px",
  ),
  "Numeric leaf values inside owned layouts generate contextual output.",
);
const portableOwned = toPortableStructures(
  ownedSource.structures!,
  ownedSource.taxonomy!,
  {
    [owner.conceptId]: owner.generation!.nameRef!,
  },
);
assert.equal(portableOwned.status, "ready");
if (portableOwned.status !== "ready")
  throw new Error("Owned numeric values need portable serialization.");
assert.ok(isPortableStructuresDocument(portableOwned.value));
const invalidPortableOwned = structuredClone(portableOwned.value);
const portableLayout = invalidPortableOwned.structures.find(
  (structure) => structure.conceptId === ownedLayout.conceptId,
)!;
const portableLiteral = portableLayout.bindings.find(
  (binding) => "value" in binding && binding.value.kind === "number",
);
if (
  !portableLiteral ||
  !("value" in portableLiteral) ||
  portableLiteral.value.kind !== "number"
)
  throw new Error("Expected a portable numeric layout binding.");
portableLiteral.value.value = -1;
assert.equal(
  isPortableStructuresDocument(invalidPortableOwned),
  false,
  "Portable schemas reject negative authored numbers.",
);
const invalidRuntimeOwned = structuredClone(ownedSource.structures!);
const invalidRuntimeLayout = invalidRuntimeOwned.structures.find(
  (structure) => structure.conceptId === ownedLayout.conceptId,
)!;
invalidRuntimeLayout.properties = invalidRuntimeLayout.properties.map(
  (binding) =>
    binding.id === ownedBinding.id
      ? {
          id: binding.id,
          classification: binding.classification,
          value: {
            kind: "number",
            value: Number.POSITIVE_INFINITY,
            unit: "px",
          },
        }
      : binding,
);
assert.equal(
  isStructuresDocument(invalidRuntimeOwned),
  false,
  "Runtime storage rejects non-finite authored numbers.",
);
const restoredOwned = fromPortableStructures(
  JSON.parse(JSON.stringify(portableOwned.value)),
  ownedSource.taxonomy!,
);
assert.equal(restoredOwned.status, "ready");
if (restoredOwned.status !== "ready")
  throw new Error("Owned numeric values need portable restoration.");
assert.deepEqual(
  restoredOwned.value.structures[1].properties.find(
    (binding) => binding.id === ownedBinding.id,
  ),
  ownedLayoutLiteral.properties.find(
    (binding) => binding.id === ownedBinding.id,
  ),
);
assert.deepEqual(
  (restoredOwned.value.structures[1].elements![0] as typeof ownedElement)
    .bindings[0].value,
  ownedElement.bindings[0].value,
  "Portable save/reload preserves numeric owned-layout and leaf assignments.",
);

const variantSource = structuredClone(fixture.source);
const variantStructure = variantSource.structures!.structures[0];
const optionCategoryId = crypto.randomUUID();
const optionCategory = crypto.randomUUID();
const optionTerms = [crypto.randomUUID(), crypto.randomUUID()];
const propertyTerm = crypto.randomUUID();
variantSource.taxonomy!.categories.push(
  {
    id: optionCategory,
    key: "treatment",
    name: "Treatment",
    description: "",
    valueType: "string",
    cardinality: "one",
    scopes: ["structures"],
    required: false,
    includeInProjections: true,
  },
  {
    id: optionCategoryId,
    key: "layoutVariant",
    name: "Layout variant",
    description: "",
    valueType: "string",
    cardinality: "one",
    scopes: ["structures"],
    required: false,
    includeInProjections: true,
  },
);
variantSource.taxonomy!.terms.push(
  {
    id: propertyTerm,
    categoryId: optionCategoryId,
    value: "spacing treatment",
    description: "",
  },
  ...optionTerms.map((id, index) => ({
    id,
    categoryId: optionCategory,
    value: `option-${index}`,
    description: "",
  })),
);
variantSource.taxonomy!.order.push(optionCategory, optionCategoryId);
const property = createVariantProperty(
  "Spacing treatment",
  { [optionCategoryId]: propertyTerm },
  [
    { name: "Default", classification: { [optionCategory]: optionTerms[0] } },
    { name: "Compact", classification: { [optionCategory]: optionTerms[1] } },
  ],
);
const optionId = property.options[1].id;
variantStructure.editor = {
  ...emptyStructureEditor(),
  properties: [property],
  overrides: {
    [optionId]: {
      slots: {
        paddingLeft: { value: { kind: "number", value: 5, unit: "px" } },
      },
    },
  },
};
variantSource.structures = synchronizeVariantIdentities(
  variantSource.structures!,
  variantSource.modeSets,
);
const variantBindingId = structureBinding(variantStructure, "paddingLeft")!.id;
const variantFiveRows = buildTshirtArtifacts(variantSource).semantics.filter(
  (row) =>
    row.optionId === optionId && row.bindingIds.includes(variantBindingId),
);
assert.ok(variantFiveRows.length > 0);
assert.ok(variantFiveRows.every((row) => row.token.value === "5px"));
const variantEightSource = structuredClone(variantSource);
variantEightSource.structures!.structures[0].editor!.overrides[
  optionId
].slots!.paddingLeft = {
  value: { kind: "number", value: 8, unit: "px" },
};
variantEightSource.structures = synchronizeVariantIdentities(
  variantEightSource.structures!,
  variantEightSource.modeSets,
);
const variantEightRows = buildTshirtArtifacts(
  variantEightSource,
).semantics.filter(
  (row) =>
    row.optionId === optionId && row.bindingIds.includes(variantBindingId),
);
assert.deepEqual(
  variantEightRows.map((row) => row.token.uuid),
  variantFiveRows.map((row) => row.token.uuid),
  "Variant literal layout edits retain their synchronized identity.",
);
assert.ok(variantEightRows.every((row) => row.token.value === "8px"));
assert.equal(
  canonicalJson(
    variantSource.structures!.structures[0].editor!.semanticIdentities,
  ),
  canonicalJson(
    variantEightSource.structures!.structures[0].editor!.semanticIdentities,
  ),
);

console.log(
  "Literal layout and leaf bindings generate stable contextual semantics, preserve primitive isolation, and retain unitless typography.",
);
