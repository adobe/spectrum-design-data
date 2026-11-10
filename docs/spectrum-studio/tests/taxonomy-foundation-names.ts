// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import dataset from "../src/data/design-system.defaults.json" with { type: "json" };
import { designSystemDefaults } from "../src/data/defaults";
import { canonicalDesignSystemDataset } from "../src/features/design-data/validation";
import {
  assertTaxonomy,
  projectClassification,
} from "../src/features/taxonomy/model";
import {
  classificationFromValues,
  defaultOrderedGroups,
  upgradeOrderedVocabulary,
} from "../src/features/taxonomy/orderedVocabulary";
import {
  upgradeDimensionName,
  upgradeElevationName,
  upgradeMetricName,
  type ClassifiedNameReference,
} from "../src/features/taxonomy/foundationNames";
import { LEGACY_TYPOGRAPHY_METRICS } from "./fixtures/legacyTypography";
import { orderedVocabularyFixture } from "./fixtures/orderedVocabulary";

assertTaxonomy(dataset.system.taxonomy);
const input = orderedVocabularyFixture(dataset.system.taxonomy);
input.terms.push({
  id: "ead04990-42c3-4483-ba37-c77410f31c57",
  categoryId: "dfcbbcb5-6519-4a25-b437-1e25fec967b4",
  value: "Base horizontal spacing",
  description: "Formerly shipped source used by the migration fixture.",
});
const upgraded = upgradeOrderedVocabulary(input);
const taxonomy = { ...upgraded, order: defaultOrderedGroups(upgraded) };
const current = canonicalDesignSystemDataset(designSystemDefaults);
function name(
  reference: ClassifiedNameReference,
  scope: "spacing" | "size" | "radius" | "typography" | "elevation",
) {
  const projection = projectClassification(
    taxonomy,
    {
      ...reference.classification,
      ...classificationFromValues(taxonomy, { scaleIndex: 100 }),
    },
    scope,
  );
  assert.deepEqual(projection.issues, []);
  return projection.name;
}
for (const scope of ["spacing", "size", "radius"] as const) {
  for (const scale of current.system.foundations[scope].scales) {
    const before = structuredClone(scale);
    const reference = upgradeDimensionName(
      scope,
      scale.id,
      scale.name,
      taxonomy,
    );
    assert.deepEqual(
      reference,
      scale.name,
      "Current explicit source classifications are not reinterpreted as legacy names.",
    );
    assert.equal(reference.termId, scale.name.termId);
    assert.deepEqual(scale, before);
    assert.deepEqual(
      upgradeDimensionName(scope, scale.id, reference, taxonomy),
      reference,
    );
  }
}
for (const [scope, sourceId, termId, expected] of [
  [
    "spacing",
    "spacing-scale-1",
    "55198c75-7de7-4284-ba9a-0eaa2e47aeb7",
    "spacing-100",
  ],
  [
    "spacing",
    "spacing-scale-af9cf747-5c46-41a8-b37c-1fe306f506c4",
    "ead04990-42c3-4483-ba37-c77410f31c57",
    "spacing-base-horizontal-100",
  ],
  [
    "spacing",
    "spacing-scale-95a2557d-d4bb-4102-a129-2b1f33ddf5cc",
    "240bd9ba-271a-405d-9514-a627942d6b42",
    "spacing-base-gap-100",
  ],
  ["size", "size-scale-1", "55198c75-7de7-4284-ba9a-0eaa2e47aeb7", "size-100"],
  [
    "radius",
    "radius-scale-5eb175b0-4f95-4e9f-9937-4f7f84ae7572",
    "55198c75-7de7-4284-ba9a-0eaa2e47aeb7",
    "radius-100",
  ],
] as const) {
  const legacy = { categoryId: "dfcbbcb5-6519-4a25-b437-1e25fec967b4", termId };
  const reference = upgradeDimensionName(scope, sourceId, legacy, taxonomy);
  assert.equal(name(reference, scope), expected);
  assert.equal(reference.termId, termId);
  assert.deepEqual(
    upgradeDimensionName(scope, sourceId, reference, taxonomy),
    reference,
  );
  assert.deepEqual(legacy, {
    categoryId: "dfcbbcb5-6519-4a25-b437-1e25fec967b4",
    termId,
  });
  const custom = upgradeDimensionName(scope, "custom-scale", legacy, taxonomy);
  assert.ok(
    name(custom, scope).includes("global") ||
      name(custom, scope).includes("base"),
    "Custom sources retain their native name instead of guessing a classification.",
  );
}
for (const [metricId, reference] of Object.entries(
  dataset.system.foundations.typography.metricNames,
)) {
  const upgradedName = upgradeMetricName(metricId, reference, taxonomy);
  const expectedName =
    metricId === "font-size"
      ? "text-size-100"
      : metricId === "workflow-icon-size"
        ? "workflow-icon-size-100"
        : `${metricId.replace("-unitlessLineHeight", "-unitless-line-height").replace("-lineHeight", "-line-height")}-100`;
  assert.equal(name(upgradedName, "typography"), expectedName);
  assert.deepEqual(
    upgradeMetricName(metricId, upgradedName, taxonomy),
    upgradedName,
  );
}
assert.equal(
  name(
    upgradeElevationName(dataset.system.foundations.elevation.name, taxonomy),
    "elevation",
  ),
  "surface-shadow-100",
);
const metricCategory = "3b8d399b-9a38-4c85-b3da-fa242530b721";
const legacy = {
  ...taxonomy,
  terms: [
    ...taxonomy.terms,
    ...LEGACY_TYPOGRAPHY_METRICS.map(([value, id]) => ({
      id,
      categoryId: metricCategory,
      value,
      description: "Previously shipped metric",
    })),
  ],
};
assertTaxonomy(legacy);
const before = structuredClone(legacy);
for (const [metric, termId] of LEGACY_TYPOGRAPHY_METRICS) {
  assert.equal(
    taxonomy.terms.some((term) => term.id === termId || term.value === metric),
    false,
    "Current defaults must not depend on the old metric records used by this historical fixture.",
  );
  assert.deepEqual(
    upgradeMetricName(metric, { categoryId: metricCategory, termId }, legacy),
    dataset.system.foundations.typography.metricNames[metric],
    "Known legacy references map to the checked-in Element and Property UUIDs.",
  );
}
const fontId = LEGACY_TYPOGRAPHY_METRICS[0][1];
const custom = {
  ...legacy,
  terms: legacy.terms.map((term) =>
    term.id === fontId ? { ...term, value: "Authored metric label" } : term,
  ),
};
const customName = upgradeMetricName(
  "font-size",
  { categoryId: metricCategory, termId: fontId },
  custom,
);
assert.equal(customName.categoryId, metricCategory);
assert.equal(customName.termId, fontId);
assert.equal(
  customName.classification![metricCategory],
  fontId,
  "An authored old metric is not replaced just because its UUID was once shipped.",
);
assert.deepEqual(
  legacy,
  before,
  "Default catalog cleanup does not mutate imported legacy data.",
);
console.log(
  "Explicit native foundation name migrations, source identity, custom preservation and idempotence passed.",
);
