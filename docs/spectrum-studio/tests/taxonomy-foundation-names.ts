// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import dataset from "../src/data/design-system.defaults.json" with { type: "json" };
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

assertTaxonomy(dataset.system.taxonomy);
const upgraded = upgradeOrderedVocabulary(dataset.system.taxonomy);
const taxonomy = { ...upgraded, order: defaultOrderedGroups(upgraded) };
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
const expected = [
  "spacing-100",
  "spacing-base-horizontal-100",
  "spacing-base-gap-100",
  "size-100",
  "radius-100",
];
let offset = 0;
for (const scope of ["spacing", "size", "radius"] as const) {
  for (const scale of dataset.system.foundations[scope].scales) {
    const before = structuredClone(scale);
    const reference = upgradeDimensionName(
      scope,
      scale.id,
      scale.name,
      taxonomy,
    );
    assert.equal(name(reference, scope), expected[offset++]);
    assert.equal(reference.termId, scale.name.termId);
    assert.deepEqual(scale, before);
    assert.deepEqual(
      upgradeDimensionName(scope, scale.id, reference, taxonomy),
      reference,
    );
    const custom = upgradeDimensionName(
      scope,
      "custom-scale",
      { categoryId: scale.name.categoryId, termId: scale.name.termId },
      taxonomy,
    );
    assert(
      name(custom, scope).includes("global") ||
        name(custom, scope).includes("base"),
      "Custom sources retain their native name instead of guessing a classification.",
    );
  }
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
