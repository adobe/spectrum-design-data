// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import {
  paletteClassificationChanges,
  paletteContextLabel,
  paletteDifferenceFields,
  paletteValueChanges,
} from "../src/views/analysis/palettePresentation";
import type {
  PaletteConceptAssessment,
  PaletteModeAssessment,
} from "../src/features/design-data/paletteAssessment";

assert.deepEqual(
  paletteDifferenceFields({
    appField: "colorName",
    field: "colorFamily",
    app: "Gray",
    reference: "gray",
  }),
  [
    { key: "Color family field", before: "colorName", after: "colorFamily" },
    { key: "Color family", before: "Gray", after: "gray" },
  ],
  "A field rename and a term-value difference are separate decisions.",
);
assert.deepEqual(
  paletteDifferenceFields({
    appField: "colorName",
    field: "colorFamily",
    app: "gray",
    reference: "gray",
  }),
  [{ key: "Color family field", before: "colorName", after: "colorFamily" }],
);
assert.deepEqual(
  paletteDifferenceFields({
    appField: "scaleIndex",
    field: "scaleIndex",
    app: "100",
    reference: 100,
  }),
  [{ key: "Scale index", before: "100 (text)", after: "100 (number)" }],
);
assert.deepEqual(
  paletteDifferenceFields({
    appField: "custom",
    field: "custom",
    app: { unchanged: 2, options: { enabled: true }, values: [1, 2] },
    reference: {
      unchanged: 2,
      options: { enabled: false },
      values: [1, 3],
      added: null,
    },
  }),
  [
    { key: "Custom /options/enabled", before: "true", after: "false" },
    { key: "Custom /values/1", before: "2", after: "3" },
    { key: "Custom /added", before: "Not set", after: "None" },
  ],
);
assert.deepEqual(
  paletteDifferenceFields({
    appField: "custom",
    field: "custom",
    app: [],
    reference: {},
  }),
  [{ key: "Custom type", before: "List", after: "Object" }],
);
assert.deepEqual(
  paletteDifferenceFields({
    appField: "custom",
    field: "custom",
    app: { "a/b": 1, a: { b: 2 } },
    reference: { "a/b": 3, a: { b: 2 } },
  }),
  [{ key: "Custom /a~1b", before: "1", after: "3" }],
  "Property paths remain distinct even when a key contains a path separator.",
);
assert.deepEqual(
  paletteDifferenceFields({
    appField: "extra",
    field: "extra",
    app: "retire",
  }),
  [{ key: "Extra", before: "retire", after: "Not set" }],
);
assert.equal(
  paletteContextLabel({ colorScheme: "light", contrast: "regular" }),
  "Light / Regular",
);

const row = (mode: string): PaletteModeAssessment => ({
  reference: {
    id: `reference:${mode}`,
    category: "tokens",
    source: "fixture",
    pointer: `/${mode}`,
    name: "gray-100",
    classification: "authored",
    value: "#ddd",
  },
  app: {
    id: `app:${mode}`,
    category: "tokens",
    source: "fixture",
    pointer: `/${mode}`,
    name: "gray-100",
    classification: "generated",
    value: "#eee",
  },
  context: { colorScheme: mode, contrast: "regular" },
  counterpart: "represented",
  classification: "different",
  differences: [
    {
      field: "colorFamily",
      appField: "colorFamily",
      app: "Gray",
      reference: "gray",
    },
  ],
  issues: [],
  exceptions: [],
  value: "different",
  valueAlignment: "different",
});
const concept: PaletteConceptAssessment = {
  id: "gray-100",
  label: "gray-100",
  family: "gray",
  identityCertain: true,
  represented: true,
  complete: false,
  alignment: "different",
  rows: [row("light"), row("dark")],
};
const before = structuredClone(concept);
const classifications = paletteClassificationChanges(concept);
assert.equal(
  classifications.fields.length,
  1,
  "Shared classification differences appear once.",
);
assert.equal(
  classifications.fields[0].context,
  undefined,
  "A shared difference needs no repeated mode label.",
);
concept.rows[1].differences[0].app = "Other";
assert.deepEqual(
  paletteClassificationChanges(concept).fields.map(
    (field) => field.context?.label,
  ),
  ["Light / Regular", "Dark / Regular"],
);
concept.rows = before.rows;
const values = paletteValueChanges(concept);
assert.equal(values.fields.length, 2, "All required mode rows remain visible.");
assert.equal(values.fields[0].beforePreview?.kind, "color");
assert.equal(
  values.fields[0].beforePreview?.kind === "color" &&
    values.fields[0].beforePreview.value,
  "#eee",
);
assert.equal(
  values.fields[0].afterPreview?.kind === "color" &&
    values.fields[0].afterPreview.value,
  "#ddd",
);
assert(
  values.fields.every((field) => !field.address && !field.generated),
  "Comparison is read-only, not an authored Changes operation.",
);
assert.deepEqual(
  concept,
  before,
  "Presentation never changes the assessment or its counts.",
);
delete concept.rows[1].app;
concept.rows[1].counterpart = "not matched";
concept.rows[1].value = "unassessable";
assert.equal(paletteValueChanges(concept).fields[1].before, "No counterpart");
assert.equal(paletteValueChanges(concept).fields[1].beforePreview, undefined);
concept.rows[1].counterpart = "ambiguous";
assert.equal(
  paletteValueChanges(concept).fields[1].before,
  "Multiple counterparts",
);
console.log("Palette field-by-field presentation passed.");
