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
} from "../src/features/taxonomy/model";

const initial = structuredClone(dataset.system.taxonomy);
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
  defaults.order.map(
    (id) => defaults.categories.find((category) => category.id === id)!.key,
  ),
  DEFAULT_GROUP_KEYS,
);
const projection = (values: Record<string, string | number>) =>
  projectClassification(
    defaults,
    classificationFromValues(defaults, values),
    values.colorName || values.surfaceName
      ? "colors"
      : values.tokenCategory
        ? "spacing"
        : "typography",
  );
for (const [fields, expected] of [
  [{ element: "Text", property: "size", scaleIndex: 100 }, "text-size-100"],
  [
    { element: "Body", property: "Line height", scaleIndex: 100 },
    "body-line-height-100",
  ],
  [
    { element: "Body", property: "Unitless line height", scaleIndex: 100 },
    "body-unitless-line-height-100",
  ],
  [
    { element: "Workflow-icon", property: "size", scaleIndex: 100 },
    "workflow-icon-size-100",
  ],
  [{ tokenCategory: "Spacing", scaleIndex: 100 }, "spacing-100"],
  [{ property: "size", scaleIndex: 100 }, "size-100"],
  [{ property: "radius", scaleIndex: 100 }, "radius-100"],
  [
    {
      tokenCategory: "Spacing",
      structure: "Base",
      axis: "Horizontal",
      scaleIndex: 100,
    },
    "spacing-base-horizontal-100",
  ],
  [
    {
      tokenCategory: "Spacing",
      structure: "Base",
      property: "gap",
      scaleIndex: 100,
    },
    "spacing-base-gap-100",
  ],
  [
    { element: "Surface", attribute: "Shadow", scaleIndex: 100 },
    "surface-shadow-100",
  ],
  [
    { surfaceName: "Floating surface", property: "color" },
    "floating-surface-color",
  ],
  [
    { colorName: "Illustrator Orange", property: "color" },
    "illustrator-orange-color",
  ],
] as [Record<string, string | number>, string][]) {
  const output = projection(fields);
  assert.deepEqual(output.issues, [], expected);
  assert.equal(output.name, expected);
  const reorderedFields = Object.fromEntries(Object.entries(fields).reverse());
  assert.equal(
    projection(reorderedFields).name,
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
    (category) => category.key === "colorName",
  )!.id,
  value: "Body",
  description: "",
});
assert.throws(() => upgradeOrderedVocabulary(collision), /owned|ownership/);
const multiTerm = structuredClone(initial);
const colors = multiTerm.categories.find(
  (category) => category.key === "colorName",
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
  dataset.system.taxonomy,
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
