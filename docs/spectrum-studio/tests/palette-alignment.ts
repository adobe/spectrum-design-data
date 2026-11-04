// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import Color from "colorjs.io";
import {
  assessPalette,
  exactPaletteColor,
  paletteAlignmentLabel,
  paletteMarkdown,
  paletteSchemeSummary,
} from "../src/features/design-data/paletteAssessment";
import {
  compareDesignData,
  reportMarkdown,
  reportWithFreshness,
  type AnalysisInput,
  type AnalysisRecord,
} from "../src/features/design-data/comparison";

const record = (
  id: string,
  category: string,
  value: unknown,
  extra: Partial<AnalysisRecord> = {},
): AnalysisRecord => ({
  id,
  identity: id,
  category,
  value,
  name: id,
  classification: "generated",
  source: "fixture",
  pointer: `/${id}`,
  ...extra,
});
const source = (
  kind: AnalysisInput["source"]["kind"],
): AnalysisInput["source"] => ({
  kind,
  hash: "fixture",
  revision: "a".repeat(40),
  dirty: false,
  root: "fixture",
  version: "fixture",
  validator: "fixture",
});
const input = (reference: boolean): AnalysisInput => ({
  source: source(reference ? "reference" : "defaults"),
  categories: ["tokens", "registry", "mode-sets"],
  schemas: [],
  errors: [],
  limitations: [],
  inventoryStatus: "complete",
  records: [
    record("scheme", "mode-sets", {
      name: "colorScheme",
      modes: ["light", "dark"],
      default: "light",
    }),
    record("contrast", "mode-sets", {
      name: "contrast",
      modes: ["regular"],
      default: "regular",
    }),
    record("gray", "registry", { id: "gray" }, { vocabulary: "color-family" }),
    ...[100, 200, 300].flatMap((index) =>
      ["light", "dark"].map((mode) =>
        record(
          `${reference ? "ref" : "app"}:${index}:${mode}`,
          "tokens",
          reference || index === 100
            ? "rgb(218, 218, 218)"
            : index === 200
              ? "rgb(217, 217, 217)"
              : "rgb(150, 218, 218)",
          {
            conceptId: `${reference ? "ref" : "app"}:${index}`,
            source: reference ? "tokens/color-palette.tokens.json" : "fixture",
            structuredName: {
              property: "color",
              colorFamily: "gray",
              scaleIndex: index,
            },
            context: { colorScheme: mode, contrast: "regular" },
          },
        ),
      ),
    ),
  ],
});

for (let channel = 0; channel < 255; channel++) {
  const a = `rgb(${channel}, ${channel}, ${channel})`;
  const b = `rgb(${channel + 1}, ${channel + 1}, ${channel + 1})`;
  assert.equal(exactPaletteColor(a, b).valueAlignment, "close");
  assert.equal(exactPaletteColor(b, a).valueAlignment, "close");
}
for (const [a, b, expected] of [
  ["#d9d9d9", "rgb(218, 218, 218)", "close"],
  ["rgb(218, 217, 216)", "rgb(217, 218, 217)", "close"],
  ["rgb(217, 217, 217)", "rgb(218.000001, 217, 217)", "close"],
  ["rgb(256, 0, 0)", "rgb(255, 0, 0)", "close"],
  ["rgb(-1, 0, 0)", "rgb(0, 0, 0)", "close"],
  ["rgb(217, 217, 217)", "rgb(221, 221, 221)", "close"],
  ["color(display-p3 1 0.1 0.1)", "color(display-p3 0.99 0.1 0.1)", "close"],
  ["color(display-p3 1 0 0)", "rgb(255, 0, 0)", "different"],
  ["rgba(217, 217, 217, 0.5)", "rgba(218, 218, 218, 0.5)", "close"],
  ["rgba(217, 217, 217, 0.5)", "rgba(218, 218, 218, 0.51)", "different"],
  ["#d9d9d9", "rgb(217, 217, 217)", "exact"],
  ["var(--gray)", "var(--gray)", "unassessable"],
  ["currentcolor", "currentcolor", "unassessable"],
  ["rgb(none 0 0)", "#000", "unassessable"],
] as const)
  assert.equal(
    exactPaletteColor(a, b).valueAlignment,
    expected,
    `${a} vs ${b}`,
  );

const originalDeltaE = Color.prototype.deltaE;
try {
  Color.prototype.deltaE = function () {
    throw new Error("Exact colors must not calculate Delta E.");
  };
  assert.equal(
    exactPaletteColor("#d9d9d9", "rgb(217, 217, 217)").valueAlignment,
    "exact",
  );
  for (const [distance, expected] of [
    [2 - Number.EPSILON, "close"],
    [2, "different"],
    [2 + Number.EPSILON * 2, "different"],
    [Number.NaN, "unassessable"],
    [Infinity, "unassessable"],
  ] as const) {
    Color.prototype.deltaE = function (_other, method) {
      assert.equal(method, "2000");
      return distance;
    };
    const result = exactPaletteColor("#d9d9d9", "#dadada");
    assert.equal(result.valueAlignment, expected, `Delta E ${distance}`);
    assert.equal(
      result.value,
      expected === "unassessable" ? "unassessable" : "different",
    );
  }
} finally {
  Color.prototype.deltaE = originalDeltaE;
}
for (const [a, b, expected] of [
  ["lab(50% 2.6772 -79.7751)", "lab(50% 0 -82.7485)", "different"],
  ["lab(50% -1.3802 -84.2814)", "lab(50% 0 -82.7485)", "close"],
] as const) {
  const result = exactPaletteColor(a, b);
  assert.equal(result.valueAlignment, expected);
  assert.equal(exactPaletteColor(b, a).valueAlignment, expected);
  assert.equal(result.value, "different");
}
const app = input(false),
  reference = input(true);
const original = JSON.stringify([app, reference]);
const assessment = assessPalette(app, reference, [], []);
assert.equal(JSON.stringify([app, reference]), original);
assert.deepEqual(
  assessment.concepts.map((concept) => concept.alignment),
  ["exact", "close", "different"],
);
assert.deepEqual(
  assessment.concepts.map((concept) =>
    paletteAlignmentLabel(concept.alignment),
  ),
  ["100% aligned", "Close enough", "Not aligned"],
);
assert.equal(assessment.counts.exactAligned, 1);
assert.equal(assessment.counts.closeEnough, 1);
assert.equal(assessment.counts.notAligned, 1);
assert.equal(assessment.counts.unassessable, 0);
assert.equal(assessment.counts.equalRows, 2);
assert.equal(assessment.counts.closeRows, 2);
assert.equal(assessment.counts.complete, 1);
assert.equal(assessment.completionPercent, (1 / 3) * 100);
assert.equal(
  paletteSchemeSummary(assessment.concepts[1], "light"),
  "Close enough",
);
assert(
  assessment.concepts[1].rows.every(
    (row) =>
      row.value === "different" &&
      row.rgbChannelDifferences!.every((delta) => Math.abs(delta - 1) < 1e-10),
  ),
);
const mixed = structuredClone(app);
mixed.records.find((row) => row.id === "app:200:light")!.value =
  "rgb(218, 218, 218)";
assert.equal(
  assessPalette(mixed, reference, [], []).concepts[1].alignment,
  "close",
);
mixed.records.find((row) => row.id === "app:200:dark")!.value =
  "rgb(150, 218, 218)";
assert.equal(
  assessPalette(mixed, reference, [], []).concepts[1].alignment,
  "different",
);
const missing = structuredClone(app);
missing.records = missing.records.filter((row) => row.id !== "app:200:dark");
assert.equal(
  assessPalette(missing, reference, [], []).concepts[1].alignment,
  "different",
);
const invalid = structuredClone(app);
invalid.records.find((row) => row.id === "app:200:dark")!.value =
  "var(--unknown)";
assert.equal(
  assessPalette(invalid, reference, [], []).concepts[1].alignment,
  "unassessable",
);
const classified = structuredClone(app);
classified.records.find(
  (row) => row.id === "app:200:dark",
)!.structuredName!.unexpected = "extra";
assert.equal(
  assessPalette(classified, reference, [], []).concepts[1].alignment,
  "different",
);
const ambiguous = structuredClone(app);
ambiguous.records.push({
  ...ambiguous.records.find((row) => row.id === "app:200:dark")!,
  id: "duplicate",
  identity: "duplicate",
});
assert.equal(
  assessPalette(ambiguous, reference, [], []).concepts[1].alignment,
  "unassessable",
);
const report = compareDesignData(app, reference);
assert.deepEqual(report.palette, assessment);
assert.match(
  paletteMarkdown(assessment),
  /100% aligned: 1\. Close enough: 1\. Not aligned: 1/,
);
assert.match(reportMarkdown(report), /\| Close enough \|/);
assert.deepEqual(
  JSON.parse(JSON.stringify(report)).palette.counts,
  assessment.counts,
);
const stale = reportWithFreshness(report, "stale");
assert.equal(stale.palette!.completionPercent, null);
assert.equal(stale.palette!.assessable, false);
assert.deepEqual(
  stale.palette!.counts,
  assessment.counts,
  "Stale counts are retained as observations, not a current completion score.",
);
console.log(
  "Palette alignment: Delta E 2000 strict threshold, exact-match short circuit, wide gamut, alpha, classification/mode safeguards and report parity passed.",
);
