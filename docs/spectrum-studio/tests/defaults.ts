// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import dataset from "../src/data/design-system.defaults.json" with { type: "json" };
import {
  createColorDefaults,
  designSystemDefaults,
} from "../src/data/defaults";
import {
  canonicalDesignSystemDataset,
  composeDesignSystemDefaults,
  DatasetValidationError,
} from "../src/features/design-data/validation";
import { SCALE_TYPE_DEFAULTS } from "../src/features/scales/scaleType";
import { createRule } from "../src/features/logic/model";
import { projectClassification } from "../src/features/taxonomy/model";

const complete = composeDesignSystemDefaults(dataset, SCALE_TYPE_DEFAULTS);
const canonical = canonicalDesignSystemDataset(complete);
const { scaleTypes, ...system } = canonical.system;
assert.deepEqual(
  { ...canonical, system },
  dataset,
  "composition round-trips every canonical shipped JSON value without persisting resolved labels",
);
assert.deepEqual(
  scaleTypes,
  SCALE_TYPE_DEFAULTS,
  "composition includes all code-defined formula defaults",
);
assert.notEqual(
  complete.system.foundations.color,
  dataset.system.foundations.color,
);
assert.notEqual(scaleTypes[0], SCALE_TYPE_DEFAULTS[0]);
assert.ok(Object.isFrozen(designSystemDefaults.system.scaleTypes[0]));
assert.deepEqual(createColorDefaults(), complete.system.foundations.color);
assert.deepEqual(
  composeDesignSystemDefaults(canonical, []),
  complete,
  "complete input retains its own formula library",
);

const taxonomy = dataset.system.taxonomy;
const elementCategory = "1c9dc5cf-5df3-4d4b-a25a-cf24c7e53efa";
const propertyCategory = "0bb57816-c2eb-4d6c-bfb1-ac5d7520e88a";
const attributeCategory = "ca732a26-decb-4746-9afc-3567ec0d445e";
const metricCategory = "3b8d399b-9a38-4c85-b3da-fa242530b721";
assert.equal(
  taxonomy.categories.find((category) => category.id === metricCategory)?.key,
  "typographyMetric",
  "Keep the approved source-name category identity and order, not its obsolete compound seed terms.",
);
assert.equal(
  taxonomy.terms.filter((term) => term.categoryId === metricCategory).length,
  0,
);
assert.equal(
  taxonomy.terms.some(
    (term) => term.value === "typography" || term.value === "Elevation scale",
  ),
  false,
);
const mappings = [
  [
    "font-size",
    "34e351e7-37c2-4df2-ac75-4f04e25272f3",
    "Text",
    "273990a0-e71e-4249-9628-7e8fa689747b",
    "size",
    "text-size-100",
  ],
  [
    "workflow-icon-size",
    "b8b5a40d-a9c1-49bd-8df7-ed52571b4206",
    "Workflow-icon",
    "273990a0-e71e-4249-9628-7e8fa689747b",
    "size",
    "workflow-icon-size-100",
  ],
  [
    "body-lineHeight",
    "1853e628-2844-45e9-8a8c-fe305d941f09",
    "Body",
    "25628e5a-e4d7-4a41-adba-4fc01ab76343",
    "Line height",
    "body-line-height-100",
  ],
  [
    "body-unitlessLineHeight",
    "1853e628-2844-45e9-8a8c-fe305d941f09",
    "Body",
    "845cdc7d-14e9-4e24-a69e-28d4968ec1dd",
    "Unitless line height",
    "body-unitless-line-height-100",
  ],
  [
    "heading-lineHeight",
    "89fa5d09-9e0c-48cd-9666-4935afbe86e8",
    "Heading",
    "25628e5a-e4d7-4a41-adba-4fc01ab76343",
    "Line height",
    "heading-line-height-100",
  ],
  [
    "heading-unitlessLineHeight",
    "89fa5d09-9e0c-48cd-9666-4935afbe86e8",
    "Heading",
    "845cdc7d-14e9-4e24-a69e-28d4968ec1dd",
    "Unitless line height",
    "heading-unitless-line-height-100",
  ],
  [
    "component-lineHeight",
    "ac662c53-df93-4c8a-aecd-2981b2446d67",
    "Component",
    "25628e5a-e4d7-4a41-adba-4fc01ab76343",
    "Line height",
    "component-line-height-100",
  ],
  [
    "component-unitlessLineHeight",
    "ac662c53-df93-4c8a-aecd-2981b2446d67",
    "Component",
    "845cdc7d-14e9-4e24-a69e-28d4968ec1dd",
    "Unitless line height",
    "component-unitless-line-height-100",
  ],
] as const;
assert.deepEqual(
  Object.keys(dataset.system.foundations.typography.metricNames).sort(),
  mappings.map(([metric]) => metric).sort(),
  "Internal metric keys remain intact even though they are no longer taxonomy vocabulary.",
);
for (const [
  metric,
  elementId,
  elementValue,
  propertyId,
  propertyValue,
  name,
] of mappings) {
  assert.deepEqual(dataset.system.foundations.typography.metricNames[metric], {
    categoryId: elementCategory,
    termId: elementId,
    classification: {
      [elementCategory]: elementId,
      [propertyCategory]: propertyId,
    },
  });
  assert.equal(
    taxonomy.terms.find(
      (term) => term.id === elementId && term.categoryId === elementCategory,
    )?.value,
    elementValue,
  );
  assert.equal(
    taxonomy.terms.find(
      (term) => term.id === propertyId && term.categoryId === propertyCategory,
    )?.value,
    propertyValue,
  );
  const projection = projectClassification(
    taxonomy,
    {
      [elementCategory]: elementId,
      [propertyCategory]: propertyId,
      "fe55c281-7565-40c8-b9d1-3b5f1cfff917":
        "7683d5ff-0c7a-4ee3-8331-2ab6e58e6d2b",
    },
    "typography",
  );
  assert.deepEqual(projection.issues, []);
  assert.equal(projection.name, name);
}
assert.deepEqual(dataset.system.foundations.elevation.name, {
  categoryId: elementCategory,
  termId: "5b1c777b-5cb8-444d-940b-9e6202f0d060",
  classification: {
    [elementCategory]: "5b1c777b-5cb8-444d-940b-9e6202f0d060",
    [attributeCategory]: "1c482aeb-cb4d-4a0b-a36b-109017829881",
  },
});
assert.equal(
  taxonomy.terms.find(
    (term) => term.id === "1c482aeb-cb4d-4a0b-a36b-109017829881",
  )?.categoryId,
  attributeCategory,
);
assert.equal(
  taxonomy.terms.find(
    (term) => term.id === "ccfdbc1d-60a4-4c7f-ac64-51961c2fa5e9",
  )?.value,
  "Floating surface",
);
assert.equal(
  taxonomy.terms.find(
    (term) => term.id === "39b46d90-7157-4a98-9902-723d72646617",
  )?.value,
  "elevation",
  "The native Structure elevation slot still needs its Property term.",
);

function rejects(
  change: (candidate: typeof canonical) => void,
  expected: RegExp,
) {
  const candidate = structuredClone(canonical);
  change(candidate);
  assert.throws(
    () => composeDesignSystemDefaults(candidate, SCALE_TYPE_DEFAULTS),
    (error) =>
      error instanceof DatasetValidationError && expected.test(error.message),
  );
}

assert.throws(
  () => composeDesignSystemDefaults(null, SCALE_TYPE_DEFAULTS),
  DatasetValidationError,
);
assert.throws(
  () =>
    composeDesignSystemDefaults(
      { ...dataset, schemaVersion: 99 },
      SCALE_TYPE_DEFAULTS,
    ),
  DatasetValidationError,
);
rejects((candidate) => {
  candidate.system.platforms.push(candidate.system.platforms[0]);
}, /platforms.*duplicate/);
rejects((candidate) => {
  candidate.system.platforms[0].id = " ";
}, /platforms.*empty/);
rejects((candidate) => {
  candidate.system.modeSets[0].defaultModeId = "missing";
}, /defaultModeId.*unresolved/);
rejects((candidate) => {
  candidate.system.modeSets[0].modes[0].platformIds.push("missing");
}, /platformIds.*unresolved/);
rejects((candidate) => {
  candidate.system.adaptiveClaims["typography.textZoom"] = "missing";
}, /adaptiveClaims.*unresolved/);
rejects((candidate) => {
  candidate.system.foundations.typography.scaleTypeId = "missing";
}, /scaleTypeId.*unresolved/);
rejects((candidate) => {
  candidate.system.foundations.typography.textRoundingRuleId = "missing";
}, /roundingRules.*unresolved/);
rejects((candidate) => {
  candidate.system.foundations.typography.lineHeightRoundingRuleId = "missing";
}, /roundingRules.*unresolved/);
rejects((candidate) => {
  candidate.system.scaleTypes = candidate.system.scaleTypes.filter(
    (formula) =>
      formula.id !== candidate.system.foundations.typography.scaleTypeId,
  );
}, /scaleTypeId.*unresolved/);
rejects((candidate) => {
  candidate.system.scaleTypes[0].kind = "geometric";
}, /invalid formula/);
rejects((candidate) => {
  candidate.system.scaleTypes[0].textSizeAdaptation!.interpolationId =
    "missing";
}, /scaleTypes.*unresolved/);
rejects((candidate) => {
  candidate.system.interpolations[0] = {
    id: "interpolation-linear",
    name: "Invalid",
    description: "",
    kind: "expression",
    parameters: [],
    expression: "x / 2",
  };
}, /interpolations.*shape/);
rejects((candidate) => {
  candidate.system.foundations.typography.lineHeights[0].adaptive.interpolationId =
    "missing";
}, /lineHeights.*unresolved/);
rejects((candidate) => {
  candidate.system.foundations.color.scales[0].stops[0].paletteColorId =
    "missing";
}, /stops.*unresolved/);
rejects((candidate) => {
  candidate.system.foundations.typography.maxTextSize = NaN;
}, /maxTextSize/);
rejects((candidate) => {
  candidate.system.foundations.typography.lineHeights[0].adaptive.to = 0;
}, /lineHeights|Typography/);
rejects((candidate) => {
  candidate.system.scaleTypes[0].parameters.push(
    candidate.system.scaleTypes[0].parameters[0],
  );
}, /parameters.*duplicate/);
rejects((candidate) => {
  candidate.system.scaleTypes[0].base.step = 0;
}, /positive step/);
rejects((candidate) => {
  const rule = createRule("tshirt-sizing");
  candidate.system.rules.push(rule);
  candidate.system.foundations.typography.textRoundingRuleId = rule.id;
}, /roundingRules.*unresolved/);
rejects((candidate) => {
  const rule = createRule("tshirt-sizing");
  candidate.system.rules.push(rule);
  candidate.system.foundations.spacing.scales[0].roundingRuleId = rule.id;
}, /roundingRuleId.*unresolved/);

console.log("Complete authoring defaults checks passed.");
