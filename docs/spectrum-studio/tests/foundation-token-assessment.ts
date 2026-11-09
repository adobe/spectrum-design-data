// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import {
  comparableScalars,
  compareFoundationValue,
  differenceText,
  foundationValueType,
} from "../src/features/design-data/foundationValues";
import {
  assessColorsAndOpacities,
  resolutionRequests,
} from "../src/features/design-data/colorOpacityAssessment";
import type {
  AnalysisInput,
  AnalysisRecord,
} from "../src/features/design-data/comparison";

const record = (
  property: string,
  value: unknown,
  extra: Partial<AnalysisRecord> = {},
): AnalysisRecord => ({
  id: property,
  identity: property,
  category: "tokens",
  source: "fixture",
  pointer: "",
  classification: "authored",
  name: property,
  structuredName: { property },
  value,
  ...extra,
});
const input = (records: AnalysisRecord[]): AnalysisInput => ({
  records,
  source: {
    kind: "reference",
    hash: "fixture",
    root: "fixture",
    revision: "fixture",
    version: "fixture",
    dirty: false,
    validator: "fixture",
  },
  inventoryStatus: "complete",
  errors: [],
  limitations: [],
  schemas: [],
  categories: ["tokens"],
});
const cases = [
  ["font-size", "typography", 18, 16, "px"],
  ["spacing", "spacing", 8, 8, "px"],
  ["width", "size", 20, 24, "px"],
  ["corner-radius", "radius", 6, 4, "px"],
  ["opacity", "opacity", 0.2, 0.35, ""],
] as const;
assert.equal(foundationValueType(record("key-color", "red")), "color");
for (const [property, type, app, reference, unit] of cases) {
  assert.equal(foundationValueType(record(property, reference)), type);
  const assessment = assessColorsAndOpacities(
    input([record(property, app, { unit })]),
    input([record(property, reference, { unit })]),
  );
  assert.equal(assessment.concepts[0].type, type);
  assert.equal(
    assessment.concepts[0].rows[0].verdict,
    app === reference ? "pass" : "fail",
  );
  assert.equal(
    assessment.concepts[0].rows[0].difference?.value,
    app - reference,
  );
}
assert.deepEqual(comparableScalars("1s", "1000ms"), {
  app: 1000,
  reference: 1000,
  unit: "ms",
});
assert.equal(comparableScalars("1rem", "16px"), undefined);
assert.equal(comparableScalars("2px", 2), undefined);
assert.equal(
  compareFoundationValue("typography", "Arial", "Arial", "", "", "font-family")
    .verdict,
  "pass",
);
assert.equal(
  compareFoundationValue(
    "typography",
    "Arial",
    "Helvetica",
    "",
    "",
    "font-family",
  ).verdict,
  "fail",
);
assert.equal(
  compareFoundationValue(
    "typography",
    "invalid",
    "invalid",
    "",
    "",
    "font-size",
  ).verdict,
  "unassessable",
);
assert.equal(
  compareFoundationValue("size", "1rem", "16px").verdict,
  "unassessable",
);
assert.equal(
  compareFoundationValue("motion", 100, 100).verdict,
  "unassessable",
);
const shadow = [
  { x: "0px", y: "2px", blur: "4px", spread: "0px", color: "black" },
];
assert.equal(
  compareFoundationValue("elevation", shadow, shadow).verdict,
  "pass",
);
assert.equal(
  compareFoundationValue("elevation", shadow, [{ ...shadow[0], y: "3px" }])
    .verdict,
  "fail",
);
assert.equal(
  compareFoundationValue("elevation", "invalid", shadow).verdict,
  "unassessable",
);
assert.equal(differenceText({ difference: { value: 2, unit: "px" } }), "+2px");
assert.equal(differenceText({ difference: { value: -0, unit: "" } }), "0");
assert.equal(differenceText({ deltaE2000: 2.34 }), "ΔE 2.34");
const unavailable = assessColorsAndOpacities(
  input([]),
  input([record("duration", 100)]),
);
assert.equal(unavailable.concepts[0].type, "motion");
assert.equal(unavailable.concepts[0].verdict, "unassessable");
const all = input(
  cases.map(([property, , , value, unit]) => record(property, value, { unit })),
);
assert.equal(resolutionRequests(all).queries.length, cases.length);
const aliases = {
  ...record("color", "red"),
  id: "alias",
  category: "compatibility-aliases",
  reference: "color",
};
assert.equal(
  assessColorsAndOpacities(input([]), input([aliases])).counts.concepts,
  0,
);
console.log(
  "Foundation categories, normalized differences, shadows, unsupported types and canonical resolution requests pass.",
);
