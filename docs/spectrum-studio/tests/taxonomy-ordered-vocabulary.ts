// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import dataset from "../src/data/design-system.defaults.json" with { type: "json" };
import {
  classificationFromValues,
  defaultOrderedGroups,
  DEFAULT_GROUP_KEYS,
  upgradeOrderedVocabulary,
} from "../src/features/taxonomy/orderedVocabulary";
import {
  assertTaxonomy,
  projectClassification,
  type TaxonomyScope,
} from "../src/features/taxonomy/model";
import { orderedVocabularyFixture } from "./fixtures/orderedVocabulary";

assertTaxonomy(dataset.system.taxonomy);
const initial = orderedVocabularyFixture(dataset.system.taxonomy);
assertTaxonomy(initial);
const vocabulary = upgradeOrderedVocabulary(initial);
assertTaxonomy(vocabulary);
assert.deepEqual(
  upgradeOrderedVocabulary(vocabulary),
  vocabulary,
  "Upgrades do not regenerate checked-in identities.",
);
assert.deepEqual(
  vocabulary.order.slice(0, initial.order.length),
  initial.order,
  "Upgrades preserve custom order.",
);
const defaults = { ...vocabulary, order: defaultOrderedGroups(vocabulary) };
assert.deepEqual(
  defaults.order
    .slice(0, DEFAULT_GROUP_KEYS.length)
    .map(
      (id) => defaults.categories.find((category) => category.id === id)!.key,
    ),
  DEFAULT_GROUP_KEYS,
);
const legacyGroups = new Set<string>(DEFAULT_GROUP_KEYS);
assert.deepEqual(
  defaults.order.slice(DEFAULT_GROUP_KEYS.length),
  initial.order.filter(
    (id) =>
      !legacyGroups.has(
        initial.categories.find((category) => category.id === id)!.key,
      ),
  ),
  "Other groups retain their relative order after the explicit legacy groups.",
);
const missingGroup = structuredClone(vocabulary);
const contrastGroup = missingGroup.categories.find(
  (category) => category.key === "contrastLabel",
)!;
missingGroup.categories = missingGroup.categories.filter(
  (category) => category.id !== contrastGroup.id,
);
missingGroup.order = missingGroup.order.filter((id) => id !== contrastGroup.id);
assert.throws(
  () => defaultOrderedGroups(missingGroup),
  /Missing default taxonomy group contrastLabel/,
);
const projection = (
  values: Record<string, string | number>,
  scope: TaxonomyScope,
) =>
  projectClassification(
    defaults,
    classificationFromValues(defaults, values),
    scope,
  );
for (const [fields, expected, scope] of [
  [
    { element: "Text", property: "size", scaleIndex: 100 },
    "text-size-100",
    "typography",
  ],
  [
    { element: "Body", property: "Line height", scaleIndex: 100 },
    "body-line-height-100",
    "typography",
  ],
  [
    { element: "Body", property: "Unitless line height", scaleIndex: 100 },
    "body-unitless-line-height-100",
    "typography",
  ],
  [
    { element: "Workflow-icon", property: "size", scaleIndex: 100 },
    "workflow-icon-size-100",
    "typography",
  ],
  [{ property: "spacing", scaleIndex: 100 }, "spacing-100", "spacing"],
  [{ property: "size", scaleIndex: 100 }, "size-100", "size"],
  [
    { property: "corner radius", scaleIndex: 100 },
    "corner-radius-100",
    "radius",
  ],
  [
    {
      property: "spacing",
      structure: "Base",
      axis: "Horizontal",
      scaleIndex: 100,
    },
    "base-spacing-horizontal-100",
    "spacing",
  ],
  [
    { structure: "Base", property: "gap", scaleIndex: 100 },
    "base-gap-100",
    "spacing",
  ],
  [
    { element: "Surface", attribute: "Shadow", scaleIndex: 100 },
    "surface-shadow-100",
    "elevation",
  ],
  [
    { surfaceName: "Floating surface", property: "color" },
    "floating-surface-color",
    "colors",
  ],
  [
    { colorFamily: "Illustrator Orange", property: "color" },
    "illustrator-orange-color",
    "colors",
  ],
] as [Record<string, string | number>, string, TaxonomyScope][]) {
  const output = projection(fields, scope);
  assert.deepEqual(output.issues, [], expected);
  assert.equal(output.name, expected);
  const reorderedFields = Object.fromEntries(Object.entries(fields).reverse());
  assert.equal(
    projection(reorderedFields, scope).name,
    expected,
    "Object order cannot override the Registry order.",
  );
}
for (const key of ["constraint", "axis", "structure", "size"]) {
  assert.equal(
    vocabulary.categories.find((category) => category.key === key)!.id,
    initial.categories.find((category) => category.key === key)!.id,
  );
}
for (const term of initial.terms.filter(
  (term) => !["spacing", "overlay", "Shadow"].includes(String(term.value)),
)) {
  assert.deepEqual(
    vocabulary.terms.find((after) => after.id === term.id),
    term,
    "Unrelated and custom terms remain intact.",
  );
}
assert.throws(
  () => classificationFromValues(defaults, { element: "unknown" }),
  /Unresolved/,
);
const collision = structuredClone(initial);
collision.terms.push({
  id: crypto.randomUUID(),
  categoryId: collision.categories.find(
    (category) => category.key === "colorFamily",
  )!.id,
  value: "Body",
  description: "",
});
assert.throws(() => upgradeOrderedVocabulary(collision), /owned|ownership/);
const multiTerm = structuredClone(initial);
const colors = multiTerm.categories.find(
  (category) => category.key === "colorFamily",
)!;
colors.cardinality = "ordered";
multiTerm.classifications = {
  imported: {
    [colors.id]: multiTerm.terms
      .filter((term) => term.categoryId === colors.id)
      .slice(0, 2)
      .map((term) => term.id),
  },
};
const multiTermBefore = structuredClone(multiTerm);
assert.throws(
  () => upgradeOrderedVocabulary(multiTerm),
  /ordered-term assignments/,
);
assert.deepEqual(
  multiTerm,
  multiTermBefore,
  "Unsupported multi-term input is retained for review, not truncated.",
);
assert.deepEqual(
  initial,
  orderedVocabularyFixture(dataset.system.taxonomy),
  "The upgrade never mutates its input.",
);
const authored = structuredClone(initial);
const customProperty = authored.categories.find(
  (category) => category.key === "property",
)!;
customProperty.required = false;
customProperty.includeInProjections = false;
customProperty.scopes = ["typography"];
const customAxis = authored.categories.find(
  (category) => category.key === "axis",
)!;
customAxis.scopes = ["spacing", "size"];
assert.deepEqual(
  upgradeOrderedVocabulary(authored).categories.find(
    (category) => category.id === customProperty.id,
  ),
  customProperty,
);
assert.deepEqual(
  upgradeOrderedVocabulary(authored).categories.find(
    (category) => category.id === customAxis.id,
  ),
  customAxis,
  "Authored scopes and inclusion flags are not replaced by new defaults.",
);
console.log(
  "Requested group order, seed vocabulary, exact output examples, identity and preservation checks passed.",
);
