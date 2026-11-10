// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createDefaultSnapshot } from "../src/features/edit-session/state";
import { buildTshirtArtifacts } from "../src/features/design-data/tshirtArtifacts";
import {
  toPortableStructures,
  fromPortableStructures,
  type StructureContractResult,
} from "../src/features/structures/portableConversion";
import { configuredStructure } from "../src/features/structures/configuration";
import {
  EMPTY_STRUCTURE_PREVIEW,
  emptyStructureEditor,
} from "../src/features/structures/variants";
import {
  createBooleanProperty,
  createLocalVariantProperty,
} from "../src/features/option-groups/model";
import {
  createStructure,
  structureBindingId,
} from "../src/features/structures/model";
import { createElement } from "../src/features/structures/elements";
import { registerTerm } from "../src/features/taxonomy/model";
import type { TaxonomyNameReference } from "../src/features/taxonomy/naming";
import type { PortableStructuresDocument } from "../src/features/structures/portableModel";
import {
  evaluatePortableStructure,
  setStructureConfiguration,
  type EffectiveStructure,
} from "../src/features/structures/portableOperations";

function ready<T>(result: StructureContractResult<T>): T {
  assert.equal(result.status, "ready", JSON.stringify(result));
  if (result.status !== "ready")
    throw new Error("Expected a complete contract.");
  return result.value;
}

const snapshot = createDefaultSnapshot();
const original = structuredClone(snapshot);
const source = snapshot.structures!;
let taxonomy = structuredClone(snapshot.taxonomy!);
const structureCategory = taxonomy.categories.find(
  (category) => category.key === "structure",
)!;
const densityCategory = taxonomy.categories.find(
  (category) => category.key === "density",
)!;
const names: Record<string, TaxonomyNameReference> = {};
// These are reviewed fixture bindings, not a production name-inference policy.
for (const structure of source.structures) {
  let registered = taxonomy.terms.find(
    (term) =>
      term.categoryId === structureCategory.id &&
      term.value === structure.name.toLowerCase(),
  );
  if (structure.name === "Text")
    registered = taxonomy.terms.find(
      (term) => term.id === "34e351e7-37c2-4df2-ac75-4f04e25272f3",
    );
  if (!registered) {
    const id = crypto.randomUUID();
    taxonomy = registerTerm(taxonomy, structureCategory.id, structure.name, id);
    registered = taxonomy.terms.find((term) => term.id === id);
  }
  assert.ok(registered);
  names[structure.conceptId] = {
    categoryId: registered.categoryId,
    termId: registered.id,
  };
}
const list = source.structures.find(
  (structure) => structure.name === "List-item",
)!;
const density = list.editor!.properties.find(
  (property) => property.name === "Density",
)!;
const categories = { [density.id]: densityCategory.id };
const portable = ready(
  toPortableStructures(source, taxonomy, names, categories),
);
assert.deepEqual(
  snapshot,
  original,
  "Conversion must not mutate source or Registry.",
);
assert.equal(portable.structures.length, 10);
assert.ok(portable.structures.every((structure) => !("editor" in structure)));
const portableList = portable.structures.find(
  (structure) => structure.conceptId === list.conceptId,
)!;
assert.ok(typeof portableList.name !== "string");
const portableListName = portableList.name;
assert.equal(
  portableListName.termId,
  "c0abaa73-3a65-4d2d-854e-410c098f86b0",
  "Reuse the existing List-item term, not its token-generation name.",
);
const portableDensity = portableList.options.find(
  (option) => option.id === density.id,
)!;
assert.equal(portableDensity.kind, "variant");
if (portableDensity.kind !== "variant") throw new Error("Expected Density.");
assert.deepEqual(portableDensity.name, { categoryId: densityCategory.id });
assert.deepEqual(
  portableDensity.values.map((value) => value.name),
  [
    {
      categoryId: densityCategory.id,
      termId: "b9e315d9-ad01-46e4-8371-fa51af88fe53",
    },
    {
      categoryId: densityCategory.id,
      termId: "6bc36b92-e824-4946-8340-147d5cc95cc5",
    },
  ],
);
assert.deepEqual(
  portableDensity.classification,
  density.kind === "variant" ? density.classification : {},
);
assert.deepEqual(portableList.generation, list.generation);
assert.ok(
  portableList.options
    .filter((option) => option.kind === "boolean")
    .every(
      (option) => !("classification" in option) && !("categoryId" in option),
    ),
);
assert.ok(portable.publications.length > 0);
assert.deepEqual(
  portable.examples.map((example) => example.glyph).sort(),
  source.structures
    .flatMap((structure) =>
      (structure.elements ?? []).flatMap((element) =>
        "glyph" in element && element.glyph !== undefined
          ? [element.glyph]
          : [],
      ),
    )
    .sort(),
);
assert.ok(
  portable.structures.every((structure) =>
    (structure.elements ?? []).every((child) => !("glyph" in child)),
  ),
);

const restored = ready(
  fromPortableStructures(
    JSON.parse(JSON.stringify(portable)) as PortableStructuresDocument,
    taxonomy,
  ),
);
assert.deepEqual(
  buildTshirtArtifacts(
    { ...snapshot, structures: restored, taxonomy },
    "shipped",
  ),
  buildTshirtArtifacts(snapshot, "shipped"),
  "Every generated row and all metadata remain exact.",
);
for (const before of source.structures) {
  const after = restored.structures.find(
    (structure) => structure.conceptId === before.conceptId,
  )!;
  assert.deepEqual(after.properties, before.properties);
  assert.deepEqual(after.elements, before.elements);
  assert.deepEqual(after.generation, before.generation);
  assert.deepEqual(
    after.editor?.semanticIdentities,
    before.editor?.semanticIdentities,
  );
  for (const [path, scope] of Object.entries(before.editor?.layouts ?? {}))
    assert.deepEqual(
      after.editor?.layouts?.[path]?.semanticIdentities,
      scope.semanticIdentities,
    );
}

const resolvedFields = (result: ReturnType<typeof configuredStructure>) => {
  const { name: _name, nameRef: _nameRef, ...structure } = result.structure;
  void _name;
  void _nameRef;
  return {
    structure,
    visibility: result.visibility,
    order: result.order,
    sizes: result.sizes,
    previewOnlySlots: result.previewOnlySlots,
  };
};
const variants = list.editor!.properties.filter(
  (property) => property.kind === "variant",
);
const booleans = list.editor!.properties.filter(
  (property) => property.kind === "boolean",
);
const restoredList = restored.structures.find(
  (structure) => structure.conceptId === list.conceptId,
)!;
let combinations = 0;
for (let variantBits = 0; variantBits < 16; variantBits++) {
  for (let booleanBits = 0; booleanBits < 64; booleanBits++) {
    const preview = {
      ...EMPTY_STRUCTURE_PREVIEW,
      options: Object.fromEntries(
        variants.map((variant, index) => [
          variant.id,
          variant.options[(variantBits >> index) & 1].id,
        ]),
      ),
      booleans: Object.fromEntries(
        booleans.map((boolean, index) => [
          boolean.id,
          Boolean((booleanBits >> index) & 1),
        ]),
      ),
    };
    for (const path of ["", ...Object.keys(list.editor!.layouts ?? {})]) {
      const before = configuredStructure(list, path, source.structures, {
        [list.conceptId]: preview,
      });
      const after = configuredStructure(
        restoredList,
        path,
        restored.structures,
        { [list.conceptId]: preview },
      );
      assert.deepEqual(resolvedFields(after), resolvedFields(before));
      assert.equal(after.issues.length, before.issues.length);
    }
    combinations++;
  }
}
assert.equal(combinations, 1024);

// Repeated owned occurrences, local options, ordering and complete leaf snapshots.
const root = createStructure("Contract parent");
const layout = createStructure("Contract layout");
layout.parentStructureId = root.conceptId;
const icon = createElement("workflowIcon");
const slot = createElement("slot");
layout.elements = [icon, slot];
const first = {
  id: crypto.randomUUID(),
  kind: "structureReference" as const,
  structureId: layout.conceptId,
};
const second = { ...first, id: crypto.randomUUID() };
root.elements = [first, second];
const local = createLocalVariantProperty("Local option");
const visible = createBooleanProperty("Show icon");
root.editor = {
  ...emptyStructureEditor(),
  properties: [local, visible],
  layouts: {
    [`/${first.id}`]: {
      visibilityBindings: {
        [icon.id]: { propertyId: visible.id, inverted: true },
      },
      overrides: {
        [local.options[1].id]: {
          slots: { paddingTop: null },
          order: [slot.id, icon.id],
          visibility: { [slot.id]: false },
          elements: {
            [icon.id]: { ...icon, glyph: "Add" },
            [slot.id]: { ...slot, name: "Changed slot" },
          },
        },
      },
    },
  },
};
const custom = { schemaVersion: 7 as const, structures: [root, layout] };
for (const structure of custom.structures) {
  const id = crypto.randomUUID();
  taxonomy = registerTerm(taxonomy, structureCategory.id, structure.name, id);
  names[structure.conceptId] = { categoryId: structureCategory.id, termId: id };
}
const customPortable = ready(toPortableStructures(custom, taxonomy, names));
const customRestored = ready(fromPortableStructures(customPortable, taxonomy));
const state = {
  ...EMPTY_STRUCTURE_PREVIEW,
  options: { [local.id]: local.options[1].id },
  booleans: { [visible.id]: true },
};
for (const path of [`/${first.id}`, `/${second.id}`]) {
  const before = configuredStructure(root, path, custom.structures, {
    [root.conceptId]: state,
  });
  const after = configuredStructure(
    customRestored.structures[0],
    path,
    customRestored.structures,
    { [root.conceptId]: state },
  );
  assert.deepEqual(resolvedFields(after), resolvedFields(before));
}
assert.deepEqual(
  customRestored.structures[0].editor!.layouts![`/${first.id}`].overrides,
  root.editor.layouts![`/${first.id}`].overrides,
);

const unnamed = structuredClone(source);
for (const structure of unnamed.structures) delete structure.nameRef;
assert.equal(toPortableStructures(unnamed, taxonomy, {}).status, "unavailable");
assert.equal(
  toPortableStructures(source, taxonomy, names, {
    [density.id]: structureCategory.id,
  }).status,
  "unavailable",
);
const invalidName = structuredClone(portable);
assert.ok(typeof invalidName.structures[0].name !== "string");
invalidName.structures[0].name.termId = crypto.randomUUID();
assert.equal(
  fromPortableStructures(invalidName, taxonomy).status,
  "unavailable",
);
const invalidTarget = structuredClone(customPortable);
invalidTarget.structures[0].configuration[0].target.path = [
  crypto.randomUUID(),
];
assert.equal(
  fromPortableStructures(invalidTarget, taxonomy).status,
  "unavailable",
);
const invalidValue = structuredClone(customPortable);
invalidValue.structures[0].configuration.find(
  (entry) => entry.when,
)!.when!.valueId = crypto.randomUUID();
assert.equal(
  fromPortableStructures(invalidValue, taxonomy).status,
  "unavailable",
);
const invalidBinding = structuredClone(customPortable);
const bindingEffect = invalidBinding.structures[0].configuration.find(
  (entry) => entry.effect.kind === "binding",
)!.effect;
if (bindingEffect.kind !== "binding") throw new Error("Expected binding.");
bindingEffect.bindingId = structureBindingId(crypto.randomUUID(), "paddingTop");
assert.equal(
  fromPortableStructures(invalidBinding, taxonomy).status,
  "unavailable",
);
const duplicateWrite = structuredClone(customPortable);
duplicateWrite.structures[0].configuration.push(
  structuredClone(duplicateWrite.structures[0].configuration[0]),
);
assert.equal(
  fromPortableStructures(duplicateWrite, taxonomy).status,
  "unavailable",
);
const invalidUuid = structuredClone(customPortable);
invalidUuid.structures[0].conceptId = "contract-parent";
assert.equal(
  fromPortableStructures(invalidUuid, taxonomy).status,
  "unavailable",
);
const cycle = structuredClone(customPortable);
cycle.structures[1].elements!.push({
  id: crypto.randomUUID(),
  kind: "structureReference",
  structureId: root.conceptId,
});
assert.equal(fromPortableStructures(cycle, taxonomy).status, "unavailable");
const duplicatePublications = structuredClone(portable);
duplicatePublications.publications.push(
  structuredClone(portable.publications[0]),
);
assert.equal(
  fromPortableStructures(duplicatePublications, taxonomy).status,
  "unavailable",
);
const invalidElement = structuredClone(customPortable);
const elementEffect = invalidElement.structures[0].configuration.find(
  (entry) => entry.effect.kind === "visibility",
)!.effect;
if (elementEffect.kind !== "visibility")
  throw new Error("Expected visibility.");
elementEffect.elementId = crypto.randomUUID();
assert.equal(
  fromPortableStructures(invalidElement, taxonomy).status,
  "unavailable",
);

const incompleteLeaf = structuredClone(customPortable);
const leafEntry = incompleteLeaf.structures[0].configuration.find(
  (entry) => entry.effect.kind === "elementFields",
)!;
assert.ok(leafEntry);
if (leafEntry.effect.kind !== "elementFields")
  throw new Error("Expected leaf.");
Reflect.deleteProperty(leafEntry.effect.fields, "bindings");
assert.equal(
  fromPortableStructures(incompleteLeaf, taxonomy).status,
  "unavailable",
  "Reject unsupported sparse snapshots rather than silently pinning inherited fields.",
);
const missingRemoval = structuredClone(customPortable);
const incompleteOptional = missingRemoval.structures[0].configuration.find(
  (entry) => entry.effect.kind === "elementFields",
)!.effect;
if (incompleteOptional.kind !== "elementFields")
  throw new Error("Expected leaf.");
incompleteOptional.unset = [];
assert.equal(
  fromPortableStructures(missingRemoval, taxonomy).status,
  "unavailable",
);
const missingResource = structuredClone(customPortable);
missingResource.examples = missingResource.examples.filter(
  (example) => !example.when,
);
assert.equal(
  fromPortableStructures(missingResource, taxonomy).status,
  "unavailable",
);

const effective = ready(
  evaluatePortableStructure(customPortable, taxonomy, root.conceptId, {
    [root.conceptId]: { options: state.options, booleans: state.booleans },
  }),
);
const selectedOccurrence = effective.children[0].structure!;
assert.equal(
  selectedOccurrence.children.length,
  2,
  "Layers retain hidden authored nodes.",
);
assert.ok(selectedOccurrence.children.every((child) => !child.visible));
assert.deepEqual(
  selectedOccurrence.children.map((child) => child.authored.id),
  [slot.id, icon.id],
);
assert.ok(
  effective.children[1].structure!.children.every((child) => child.visible),
);
assert.equal(
  selectedOccurrence.configuration.length,
  customPortable.structures[0].configuration.length,
);

const originalPortable = structuredClone(customPortable);
const visibilityEntry = customPortable.structures[0].configuration.find(
  (entry) => entry.effect.kind === "visibility",
)!;
assert.equal(visibilityEntry.effect.kind, "visibility");
const edited = ready(
  setStructureConfiguration(customPortable, taxonomy, {
    ...visibilityEntry,
    effect: { kind: "visibility", elementId: slot.id, visible: true },
  }),
);
assert.deepEqual(customPortable, originalPortable);
assert.equal(
  edited.structures[0].configuration.length,
  customPortable.structures[0].configuration.length,
);
assert.deepEqual(edited.publications, customPortable.publications);
const editedGraph = ready(
  evaluatePortableStructure(edited, taxonomy, root.conceptId, {
    [root.conceptId]: state,
  }),
);
assert.equal(editedGraph.children[0].structure!.children[0].visible, true);
assert.equal(editedGraph.children[0].structure!.children[1].visible, false);
assert.equal(
  setStructureConfiguration(customPortable, taxonomy, {
    ...visibilityEntry,
    target: { structureId: root.conceptId, path: [crypto.randomUUID()] },
  }).status,
  "unavailable",
);

function findDefinition(
  graph: EffectiveStructure,
  id: string,
): EffectiveStructure | undefined {
  if (graph.resolved.conceptId === id) return graph;
  for (const child of graph.children) {
    const found = child.structure && findDefinition(child.structure, id);
    if (found) return found;
  }
}
const base = source.structures.find((structure) => structure.name === "Base")!;
const baseVariant = base.editor!.properties.find(
  (option) => option.kind === "variant",
)!;
assert.equal(baseVariant.kind, "variant");
if (baseVariant.kind !== "variant") throw new Error("Expected Base variant.");
const standaloneBaseChoice = {
  options: { [baseVariant.id]: baseVariant.options[1].id },
  booleans: {},
};
const defaultListGraph = ready(
  evaluatePortableStructure(portable, taxonomy, list.conceptId),
);
const basePreviewListGraph = ready(
  evaluatePortableStructure(portable, taxonomy, list.conceptId, {
    [base.conceptId]: standaloneBaseChoice,
  }),
);
assert.ok(findDefinition(defaultListGraph, base.conceptId));
assert.deepEqual(
  findDefinition(basePreviewListGraph, base.conceptId),
  findDefinition(defaultListGraph, base.conceptId),
  "Independent Base references use source defaults, not standalone preview choices.",
);

const originalRandomUuid = crypto.randomUUID;
try {
  crypto.randomUUID = () => {
    throw new Error("Read/edit interpretation must not allocate identities.");
  };
  ready(toPortableStructures(source, taxonomy, names, categories));
  ready(fromPortableStructures(portable, taxonomy));
  ready(evaluatePortableStructure(portable, taxonomy, list.conceptId));
  ready(setStructureConfiguration(customPortable, taxonomy, visibilityEntry));
} finally {
  crypto.randomUUID = originalRandomUuid;
}

const renamed = structuredClone(taxonomy);
renamed.terms.find((term) => term.id === portableListName.termId)!.value =
  "renamed-list-item";
const renamedSource = ready(fromPortableStructures(portable, renamed));
assert.equal(
  renamedSource.structures.find(
    (structure) => structure.conceptId === list.conceptId,
  )!.name,
  "Renamed-list-item",
);
assert.equal(
  renamedSource.structures.find(
    (structure) => structure.conceptId === list.conceptId,
  )!.generation!.nameRef!.termId,
  list.generation!.nameRef!.termId,
);
assert.deepEqual(
  portable,
  ready(toPortableStructures(source, taxonomy, names, categories)),
);
console.log(
  "Portable Structure contract: output and identities preserved across 1,024 parent configurations; headless graph, narrow edits, source isolation and invalid-target diagnostics verified.",
);
