// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createStore } from "jotai";
import {
  assertStoredSnapshot,
  createDefaultSnapshot,
} from "../src/features/edit-session/state";
import { createStructure } from "../src/features/structures/model";
import {
  createElement,
  elementBindingId,
} from "../src/features/structures/elements";
import { primitiveReferencesAtom } from "../src/features/tokens/primitiveReferenceState";
import type { PrimitiveReference } from "../src/features/tokens/primitiveReferences";
import {
  canonicalTokenModeKey,
  tokenModeSetIds,
} from "../src/features/tokens/browserModel";
import { buildTshirtArtifacts } from "../src/features/design-data/tshirtArtifacts";
import {
  appendStructureLeafRows,
  appendVariantLeafRows,
} from "../src/features/design-data/structureVariantLeaves";
import { modeSelections } from "../src/features/modes/combinations";
import { SIZE_TERM_IDS } from "../src/features/taxonomy/variantVocabulary";
import { inlineFixtureReferences } from "./fixtures/componentReferences";

const source = inlineFixtureReferences(
  createDefaultSnapshot(),
  (target) => target.kind === "semantic",
);
const references = createStore().get(primitiveReferencesAtom);
const anchor = references.find(
  (reference) =>
    reference.metricId?.endsWith("-unitlessLineHeight") &&
    reference.index === 0,
)!;
assert.ok(anchor);
const sibling = references.find(
  (reference) =>
    reference.metricId === anchor.metricId && reference.index === 1,
)!;
assert.ok(sibling);
const template = source.structures!.structures[0];
const structure = createStructure(template.name);
structure.nameRef = structuredClone(template.nameRef);
structure.generation = {
  ...structuredClone(template.generation!),
  sizeTermIds: [SIZE_TERM_IDS.m],
  applications: [],
};
const element = createElement("text");
const bindingId = elementBindingId(element.id, "lineHeight");
element.bindings = [
  {
    id: bindingId,
    slot: "lineHeight",
    family: "typography",
    $ref: anchor.id,
  },
];
structure.elements = [element];
source.structures = { ...source.structures!, structures: [structure] };
assertStoredSnapshot(source);
const baseline = buildTshirtArtifacts(source);
assert.ok(baseline.semantics.length > 0);
const emptyBundle = {
  ...structuredClone(baseline),
  tokens: [],
  semantics: [],
  primitiveLineage: [],
};
const emptySource = new Proxy(
  {
    ...source,
    structures: { ...source.structures, structures: [] },
  },
  {
    get(target, key, receiver) {
      assert.notEqual(
        key,
        "spacing",
        "A Structure without leaf bindings needs no leaf reference catalog.",
      );
      return Reflect.get(target, key, receiver);
    },
  },
);
const beforeEmptyLeaves = structuredClone(emptyBundle);
appendStructureLeafRows(emptySource, emptyBundle);
assert.deepEqual(emptyBundle, beforeEmptyLeaves);
let resourcePreparations = 0;
const measuredSource = new Proxy(source, {
  get(target, key, receiver) {
    if (key === "spacing") resourcePreparations++;
    return Reflect.get(target, key, receiver);
  },
});
appendStructureLeafRows(measuredSource, emptyBundle);
assert.equal(resourcePreparations, 1);
assert.deepEqual(
  emptyBundle.semantics,
  baseline.semantics,
  "Lazy resource preparation preserves every generated leaf record.",
);
resourcePreparations = 0;
appendVariantLeafRows(measuredSource, emptyBundle);
assert.equal(
  resourcePreparations,
  0,
  "A default-only leaf needs no second variant reference catalog.",
);
assert.deepEqual(emptyBundle.semantics, baseline.semantics);
const baselineSelection = baseline.semantics[0].selection;
const defaultSelection = Object.fromEntries(
  source.modeSets.map((axis) => [axis.id, axis.defaultModeId]),
);
const scheme = source.modeSets.find((axis) => axis.key === "colorScheme")!;
const contrast = source.modeSets.find((axis) => axis.key === "contrast")!;
const edited = structuredClone(source);
function override(
  reference: PrimitiveReference,
  modeKey: string,
  value: number,
) {
  const previous = edited.browserTokenEdits![reference.nativeId];
  assert.ok(previous?.authoring?.identity);
  edited.browserTokenEdits![reference.nativeId] = {
    ...previous,
    values: {
      ...previous.values,
      [modeKey]: { value, baseline: reference.value },
    },
  };
}
override(anchor, canonicalTokenModeKey(defaultSelection), 1.23456789);
override(
  sibling,
  canonicalTokenModeKey({
    ...defaultSelection,
    [contrast.id]: contrast.modes.find(
      (mode) => mode.id !== contrast.defaultModeId,
    )!.id,
  }),
  1.98765432,
);
const original = structuredClone(edited);
const generated = buildTshirtArtifacts(edited);
assert.deepEqual(
  edited,
  original,
  "Context resolution does not rewrite sources.",
);
const expectedAxes = new Set([
  ...Object.keys(baselineSelection),
  scheme.id,
  contrast.id,
]);
const selections = modeSelections(
  source.modeSets.filter((axis) => expectedAxes.has(axis.id)),
);
assert.equal(generated.semantics.length, selections.length);
assert.deepEqual(
  new Set(
    generated.semantics.map((row) => canonicalTokenModeKey(row.selection)),
  ),
  new Set(selections.map(canonicalTokenModeKey)),
  "More-specific source contexts are joined, not emitted as incomplete selections.",
);
for (const row of generated.semantics) {
  assert.deepEqual(
    new Set(tokenModeSetIds(canonicalTokenModeKey(row.selection))),
    expectedAxes,
  );
  assert.deepEqual(row.bindingIds, [bindingId]);
  const baselineRow = baseline.semantics.find((candidate) =>
    Object.entries(candidate.selection).every(
      ([axis, mode]) => row.selection[axis] === mode,
    ),
  )!;
  assert.ok(baselineRow);
  const overridden = Object.entries(defaultSelection).every(
    ([axis, mode]) => row.selection[axis] === mode,
  );
  assert.equal(
    row.target.value,
    overridden ? 1.23456789 : baselineRow.target.value,
  );
}
assertStoredSnapshot(edited);
console.log(
  "Leaf modes: mixed per-step dependencies resolve complete shared contexts, preserve unrelated values and validate without mutating sources.",
);
