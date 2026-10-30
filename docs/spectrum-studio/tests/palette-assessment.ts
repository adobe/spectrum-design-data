// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  assessPalette,
  exactPaletteColor,
  paletteMarkdown,
  paletteSchemeSummary,
} from "../src/features/design-data/paletteAssessment";
import {
  canonicalJson,
  compareDesignData,
  reportMarkdown,
  reportWithFreshness,
  type AnalysisInput,
  type AnalysisRecord,
  type ReviewedMapping,
} from "../src/features/design-data/comparison";
import { referenceRecords } from "../scripts/design-data-loader";
import {
  gapRegisterIssues,
  type GapEntry,
} from "../src/features/design-data/gaps";
import { reviewedColorMappings } from "../src/features/design-data/mappings";

const row = (
  id: string,
  extra: Partial<AnalysisRecord> = {},
): AnalysisRecord => ({
  id,
  identity: id,
  conceptId: "gray-100-concept",
  category: "tokens",
  name: "Do not parse this label",
  classification: "generated",
  source: "tokens/color-palette.tokens.json",
  pointer: `/${id}`,
  structuredName: { property: "color", colorFamily: "gray", scaleIndex: 100 },
  context: { colorScheme: "light", contrast: "regular" },
  value: "#fff",
  ...extra,
});
const declarations = (): AnalysisRecord[] => [
  ...[
    {
      name: "colorScheme",
      modes: ["light", "dark", "wireframe"],
      default: "light",
    },
    { name: "contrast", modes: ["regular", "high"], default: "regular" },
  ].map((value) => row(`mode:${value.name}`, { category: "mode-sets", value })),
  row("family:gray", {
    category: "registry",
    vocabulary: "color-family",
    value: { id: "gray" },
  }),
  row("family:blue", {
    category: "registry",
    vocabulary: "color-family",
    value: { id: "blue" },
  }),
];
const input = (
  records: AnalysisRecord[],
  kind: AnalysisInput["source"]["kind"] = "defaults",
): AnalysisInput => ({
  source: {
    kind,
    hash: "fixture-hash",
    revision: "a".repeat(40),
    dirty: false,
    root: "fixture",
    version: "fixture",
    validator: "fixture",
  },
  records: [...declarations(), ...records],
  categories: ["tokens", "mode-sets", "registry"],
  schemas: [],
  errors: [],
  limitations: [],
  inventoryStatus: "complete",
});
const app = () =>
  input([
    row("app:light", { source: "app", conceptId: "app-concept" }),
    row("app:dark", {
      source: "app",
      conceptId: "app-concept",
      context: { colorScheme: "dark", contrast: "regular" },
      value: "#000",
    }),
  ]);
const reference = () =>
  input(
    [
      row("ref:light"),
      row("ref:dark", {
        context: { colorScheme: "dark", contrast: "regular" },
        value: "rgb(0, 0, 0)",
      }),
    ],
    "reference",
  );
const assess = (a = app(), r = reference(), mappings: ReviewedMapping[] = []) =>
  assessPalette(a, r, mappings, []);
const before = canonicalJson([app(), reference()]);
const complete = assess();
assert.equal(complete.counts.complete, 1);
assert.equal(complete.counts.represented, 1);
assert.equal(complete.counts.equalRows, 2);
assert.equal(complete.completionPercent, 100);
assert.equal(
  paletteSchemeSummary(complete.concepts[0], "light"),
  "100% aligned",
);
assert.equal(complete.concepts[0].alignment, "exact");
assert.equal(complete.counts.exactAligned, 1);
assert.equal(
  paletteSchemeSummary(complete.concepts[0], "wireframe"),
  "not required",
);
assert.equal(before, canonicalJson([app(), reference()]));
assert.equal(
  canonicalJson(complete),
  canonicalJson(
    assess(
      { ...app(), records: app().records.reverse() },
      { ...reference(), records: reference().records.reverse() },
    ),
  ),
  "Record ordering must not change assessment.",
);

for (const [a, b] of [
  ["#ffffff", "rgb(255,255,255)"],
  ["#808080", "rgb(128 128 128)"],
  ["hsl(0 100% 50%)", "#ff0000"],
  ["color(display-p3 1 0 0)", "color(display-p3 1 0 0)"],
  ["rgba(255,0,0,0.5)", "rgb(255 0 0 / 50%)"],
])
  assert.equal(exactPaletteColor(a, b).value, "equal", `${a} equals ${b}`);
for (const [a, b] of [
  ["rgb(128 128 128)", "rgb(128.00001 128 128)"],
  ["#fff", "rgb(255 255 255 / 0.9999999)"],
  ["color(display-p3 1 0 0)", "#ff0000"],
  ["rgb(256 0 0)", "rgb(255 0 0)"],
])
  assert.equal(
    exactPaletteColor(a, b).value,
    "different",
    `${a} differs from ${b}`,
  );
for (const value of [
  "currentcolor",
  "var(--color)",
  "rgb(none 0 0)",
  "not a color",
])
  assert.equal(exactPaletteColor(value, value).value, "unassessable");
assert.equal(exactPaletteColor(undefined, "#000").value, "unassessable");
const close = app();
close.records.at(-1)!.value = "rgb(0.001 0 0)";
assert.equal(assess(close).counts.complete, 0);
assert.equal(assess(close).counts.equalRows, 1);
assert.equal(
  paletteSchemeSummary(assess(close).concepts[0], "dark"),
  "Close enough",
);
assert.equal(assess(close).concepts[0].alignment, "close");
assert.equal(assess(close).counts.closeEnough, 1);
assert.equal(assess(close).counts.closeRows, 1);
assert.equal(assess(close).counts.notAligned, 0);
assert.equal(
  assess(close).completionPercent,
  0,
  "Tolerance does not inflate exact completion.",
);
assert(exactPaletteColor("#000", "rgb(0.001 0 0)").deltaE2000! < 0.1);

for (const [left, right, expected] of [
  ["rgb(217, 217, 217)", "rgb(218, 218, 218)", "close"],
  ["rgb(218, 218, 218)", "rgb(217, 217, 217)", "close"],
  ["rgb(216, 217, 218)", "rgb(217, 218, 217)", "close"],
  ["rgb(0, 0, 0)", "rgb(1, 1, 1)", "close"],
  ["rgb(255, 255, 255)", "rgb(254, 254, 254)", "close"],
  ["#d9d9d9", "rgb(218, 218, 218)", "close"],
  ["rgba(217, 217, 217, 0.5)", "rgba(218, 218, 218, 0.5)", "close"],
  ["rgb(217, 217, 217)", "rgb(219, 217, 217)", "different"],
  ["rgb(217, 217, 217)", "rgb(218.000001, 217, 217)", "different"],
  ["rgba(217, 217, 217, 0.5)", "rgba(218, 218, 218, 0.51)", "different"],
  ["rgb(256, 0, 0)", "rgb(255, 0, 0)", "different"],
  ["color(display-p3 1 0 0)", "rgb(255, 0, 0)", "different"],
  ["var(--gray)", "var(--gray)", "unassessable"],
  ["rgb(none 0 0)", "#000", "unassessable"],
  ["#d9d9d9", "rgb(217, 217, 217)", "exact"],
] as const) {
  assert.equal(
    exactPaletteColor(left, right).valueAlignment,
    expected,
    `${left} vs ${right}`,
  );
}
const nearGray = app();
const grayReference = reference();
for (const record of nearGray.records.filter(
  (item) => item.category === "tokens",
))
  record.value = "rgb(217, 217, 217)";
for (const record of grayReference.records.filter(
  (item) => item.category === "tokens",
))
  record.value = "rgb(218, 218, 218)";
const nearAssessment = assess(nearGray, grayReference);
assert.equal(nearAssessment.concepts[0].alignment, "close");
assert.equal(nearAssessment.counts.closeEnough, 1);
assert.equal(nearAssessment.counts.closeRows, 2);
assert.equal(nearAssessment.counts.equalRows, 0);
assert.equal(nearAssessment.counts.complete, 0);
assert.equal(nearAssessment.policy.maxSrgbChannelDifference, 1);
assert.equal(nearAssessment.policy.alphaTolerance, 0);
for (const row of nearAssessment.concepts[0].rows)
  assert(
    row.rgbChannelDifferences!.every((delta) => Math.abs(delta - 1) < 1e-10),
  );
assert.match(paletteMarkdown(nearAssessment), /Close enough: 1/);
assert.match(paletteMarkdown(nearAssessment), /\| Close enough \|/);
nearGray.records.at(-1)!.value = "rgb(220, 218, 218)";
assert.equal(
  assess(nearGray, grayReference).concepts[0].alignment,
  "different",
);
assert.equal(assess(nearGray, grayReference).counts.notAligned, 1);
assert.equal(
  paletteSchemeSummary(assess(nearGray, grayReference).concepts[0], "dark"),
  "Not aligned",
);

const wireframe = reference();
wireframe.records.push(
  row("ref:wireframe", {
    context: { colorScheme: "wireframe", contrast: "regular" },
  }),
);
assert.equal(assess(app(), wireframe).counts.rows, 3);
assert.equal(assess(app(), wireframe).counts.complete, 0);
assert.equal(
  paletteSchemeSummary(assess(app(), wireframe).concepts[0], "wireframe"),
  "not matched",
);
assert.equal(
  assess(app(), wireframe).concepts[0].rows.find(
    (item) => item.context.colorScheme === "wireframe",
  )!.counterpart,
  "not matched",
);
const missing = app();
missing.records.pop();
assert.equal(assess(missing).completionPercent, 0);
assert.equal(
  assess(missing).concepts[0].alignment,
  "different",
  "Missing modes are not close enough.",
);
const noDefault = app();
noDefault.records.find((item) => item.id === "app:light")!.context = {};
const defaulted = assess(noDefault);
assert.equal(defaulted.counts.complete, 1);
noDefault.records = noDefault.records.filter(
  (item) => item.id !== "mode:colorScheme",
);
assert.equal(assess(noDefault).counts.complete, 0);
const duplicateDefault = app();
duplicateDefault.records.push({
  ...duplicateDefault.records[0],
  id: "another-mode",
});
assert.equal(assess(duplicateDefault).counts.complete, 0);
const conflict = app();
conflict.records.at(-1)!.structuredName = {
  property: "color",
  colorFamily: "gray",
  scaleIndex: 100,
  colorScheme: "light",
};
assert.equal(assess(conflict).counts.complete, 0);
const duplicate = app();
duplicate.records.push(
  row("app:duplicate", { source: "app", conceptId: "app-concept" }),
);
assert.equal(assess(duplicate).counts.complete, 0);
assert.equal(
  assess(duplicate).concepts[0].rows.find(
    (item) => item.context.colorScheme === "light",
  )!.counterpart,
  "ambiguous",
);
const duplicateIdentity = app();
duplicateIdentity.records.push(
  row("different-id", {
    identity: "app:dark",
    context: { colorScheme: "wireframe", contrast: "regular" },
  }),
);
assert.equal(assess(duplicateIdentity).counts.complete, 0);
const noConcept = reference();
delete noConcept.records.at(-1)!.conceptId;
assert.equal(assess(app(), noConcept).completionPercent, null);
const repeatedContext = reference();
repeatedContext.records.push(row("repeated"));
assert.equal(assess(app(), repeatedContext).completionPercent, null);
const deprecated = reference();
deprecated.records.push(
  row("deprecated", {
    conceptId: "retired",
    lifecycle: { deprecatedIn: "1.0.0" },
  }),
);
assert.equal(assess(app(), deprecated).counts.excludedDeprecated, 1);
assert.equal(assess(app(), deprecated).counts.rows, 2);
assert.equal(
  assess(app(), deprecated).counts.complete,
  1,
  "Non-deprecated private rows are included by the loader, not excluded.",
);
for (const state of ["partial", "unavailable"] as const)
  assert.equal(
    assess(app(), { ...reference(), inventoryStatus: state }).completionPercent,
    null,
  );
assert.equal(assess(app(), input([], "reference")).completionPercent, null);
assert.equal(
  assess({ ...app(), source: { ...app().source, kind: "working" } }).baseline,
  "provisional",
);
const unknownFamily = reference();
unknownFamily.records = unknownFamily.records.filter(
  (item) => item.id !== "family:gray",
);
assert.equal(assess(app(), unknownFamily).counts.complete, 0);
assert.equal(assess(app(), unknownFamily).completionPercent, null);

const translated = app();
for (const record of translated.records.filter(
  (item) => item.category === "tokens",
))
  record.structuredName = {
    property: "color",
    colorName: "gray",
    contrastValue: "100",
  };
const mappings = reviewedColorMappings(translated, reference());
assert.equal(mappings.length, 2);
const mapped = assess(translated, reference(), mappings);
assert.equal(mapped.counts.represented, 1);
assert.equal(mapped.counts.complete, 0);
assert.equal(mapped.counts.equalRows, 2);
assert.equal(mapped.concepts[0].rows[0].classification, "different");
assert.equal(
  mapped.concepts[0].alignment,
  "different",
  "Equal values cannot waive classification gaps.",
);
const gap: GapEntry = {
  id: "LTAX-999",
  title: "Test-only reviewed translation",
  links: [],
  kind: "spec-schema",
  direction: "joint",
  owner: "joint",
  scope: "These exact pairs and their reviewed field translations",
  profile: "reference-checkout",
  revision: reference().source.revision,
  implementation: "verified",
  disposition: "partial",
  rfc: { status: "drafted", link: "docs/rfcs/fixture.md" },
  expected: mappings.map((mapping) => ({ ...mapping })),
  criteria: [
    {
      id: "manual",
      description: "Review",
      check: "manual",
      evidence: [],
      reviewedRevision: reference().source.revision,
    },
  ],
  blockers: [],
  history: [],
};
const proposed = assessPalette(translated, reference(), mappings, [gap]);
assert.equal(proposed.concepts[0].rows[0].classification, "proposed exception");
assert.equal(proposed.counts.complete, 0);
const acceptedGap = {
  ...gap,
  rfc: { ...gap.rfc, status: "accepted" as const },
};
const scopedRegister = {
  schemaVersion: 1,
  gaps: [
    {
      ...gap,
      expected: gap.expected.map((pair) => ({
        app: pair.app,
        reference: pair.reference,
        rationale: pair.rationale,
        nameFields: pair.nameFields,
      })),
    },
  ],
};
assert.deepEqual(gapRegisterIssues(scopedRegister), []);
assert(
  gapRegisterIssues({
    ...scopedRegister,
    gaps: [
      {
        ...scopedRegister.gaps[0],
        expected: [
          {
            app: "fixture",
            reference: "fixture",
            rationale: "fixture",
            nameFields: {
              colorName: { reference: "colorFamily", normalization: "guess" },
            },
          },
        ],
      },
    ],
  }).length > 0,
  "The register rejects undeclared field normalization policies.",
);
assert.equal(
  assessPalette(translated, reference(), mappings, [acceptedGap]).counts
    .complete,
  1,
);
assert.equal(
  assessPalette(translated, reference(), mappings, [
    {
      ...acceptedGap,
      expected: acceptedGap.expected.map((pair) => ({
        app: pair.app,
        reference: pair.reference,
        rationale: pair.rationale,
      })),
    },
  ]).counts.complete,
  0,
  "An accepted pair without an explicit field scope cannot waive classification differences.",
);
assert.equal(
  assessPalette(translated, reference(), mappings, [
    {
      ...acceptedGap,
      expected: acceptedGap.expected.map((pair) => ({
        ...pair,
        nameFields: { colorName: { reference: "colorFamily" } },
      })),
    },
  ]).counts.complete,
  0,
  "A field translation added after RFC review cannot expand the accepted scope.",
);
assert.equal(
  assessPalette(
    translated,
    { ...reference(), source: { ...reference().source, dirty: true } },
    mappings,
    [acceptedGap],
  ).counts.complete,
  0,
);
assert.equal(
  assessPalette(translated, reference(), mappings, [
    { ...acceptedGap, revision: "stale" },
  ]).counts.complete,
  0,
);
translated.records.at(-1)!.structuredName!.unexpected = "extra";
assert.equal(
  assessPalette(translated, reference(), mappings, [acceptedGap]).counts
    .complete,
  0,
);
const invalidType = app();
invalidType.records.at(-1)!.structuredName!.scaleIndex = "100";
const explicit = [
  { app: "app:dark", reference: "ref:dark", rationale: "Fixture pair only" },
];
assert.equal(assess(invalidType, reference(), explicit).counts.complete, 0);

const blueApp = app();
const blueRef = reference();
blueApp.records.push(
  row("app:blue", {
    conceptId: "app-blue",
    structuredName: { property: "color", colorFamily: "blue", scaleIndex: 100 },
  }),
);
blueRef.records.push(
  row("ref:blue", {
    conceptId: "ref-blue",
    structuredName: { property: "color", colorFamily: "blue", scaleIndex: 100 },
  }),
);
assert.equal(assess(blueApp, blueRef).counts.complete, 2);
blueApp.records.at(-1)!.conceptId = "app-concept";
assert.equal(
  assess(blueApp, blueRef).completionPercent,
  null,
  "One app concept cannot establish two reference concepts.",
);
const alias = reference();
alias.records.at(-1)!.reference = "unresolved";
assert.equal(assess(app(), alias).counts.complete, 0);
assert.equal(assess(app(), alias).concepts[0].alignment, "unassessable");
const dimensionUnit = app();
dimensionUnit.records.at(-1)!.unit = "px";
assert.equal(assess(dimensionUnit).counts.complete, 0);

const report = compareDesignData(app(), reference());
assert.equal(report.palette!.counts.complete, 1);
assert(reportMarkdown(report).includes(paletteMarkdown(report.palette!)));
const stale = reportWithFreshness(report, "stale");
assert.equal(stale.palette!.completionPercent, null);
assert.equal(stale.palette!.assessable, false);
assert.equal(stale.palette!.freshness, "stale");
assert(reportMarkdown(stale).includes("Completion: unavailable"));

// Exercise the real reference adapter without invoking the SDK or writing data.
const root = new URL("../../../", import.meta.url);
const load = async (path: string) =>
  JSON.parse(await readFile(new URL(path, root), "utf8")) as unknown;
const canonical = input(
  [
    ...referenceRecords(
      "tokens/color-palette.tokens.json",
      await load("packages/design-data/tokens/color-palette.tokens.json"),
    ),
    ...referenceRecords(
      "registry/color-families.json",
      await load("packages/design-data/registry/color-families.json"),
    ),
    ...referenceRecords(
      "mode-sets/color-scheme.json",
      await load("packages/design-data/mode-sets/color-scheme.json"),
    ),
    ...referenceRecords(
      "mode-sets/contrast.json",
      await load("packages/design-data/mode-sets/contrast.json"),
    ),
  ],
  "reference",
);
canonical.records = canonical.records.filter(
  (item) => !item.id.startsWith("family:") && !item.id.startsWith("mode:"),
);
const actualRows = canonical.records.filter(
  (item) => item.category === "tokens" && !item.lifecycle?.deprecatedIn,
);
const mirrored = input(
  actualRows.map((item) => ({
    ...structuredClone(item),
    id: `mirror:${item.id}`,
    identity: `mirror:${item.identity}`,
    conceptId: `mirror:${item.conceptId}`,
    classification: "generated",
  })),
);
mirrored.records = mirrored.records.filter(
  (item) => !item.id.startsWith("mode:"),
);
mirrored.records.push(
  ...canonical.records.filter((item) => item.category === "mode-sets"),
);
const snapshot = canonicalJson([mirrored, canonical]);
const actual = assess(mirrored, canonical);
assert(actual.counts.concepts > 0);
assert.equal(actual.counts.equalRows, actualRows.length);
assert.equal(actual.counts.complete, actual.counts.concepts);
assert(actual.counts.excludedDeprecated > 0);
assert.equal(snapshot, canonicalJson([mirrored, canonical]));
assert(actual.concepts.some((concept) => concept.family === "gray"));
assert(actual.concepts.some((concept) => concept.family === "blue"));
console.log(
  "Palette fixture assessment and canonical-reference regression checks passed.",
);
const { defaultsAnalysisInput } =
  await import("../src/features/design-data/projection");
const shipped = defaultsAnalysisInput();
const shippedSnapshot = canonicalJson(shipped);
const baseline = compareDesignData(shipped, canonical).palette!;
assert.equal(canonicalJson(shipped), shippedSnapshot);
const gray100 = baseline.concepts.find(
  (concept) => concept.family === "gray" && concept.label === "gray-100",
)!;
assert(gray100);
assert(
  gray100.rows.some((mode) => mode.context.colorScheme === "light" && mode.app),
);
assert(
  gray100.rows.some((mode) => mode.context.colorScheme === "dark" && mode.app),
);
assert(
  gray100.rows
    .filter((mode) => mode.app)
    .every((mode) => mode.classification === "aligned"),
);
assert.equal(
  baseline.counts.complete,
  0,
  "Lowercase classification agreement does not conceal missing modes or value differences.",
);
console.log(
  `Shipped baseline: ${baseline.counts.represented}/${baseline.counts.concepts} represented; ${baseline.counts.equalRows}/${baseline.counts.rows} exact mode values; ${baseline.counts.complete} complete. Gray-100: ${gray100.rows.map((mode) => `${mode.context.colorScheme}=${mode.value}`).join(", ")}.`,
);
console.log(
  `Palette assessment passed, including ${actual.counts.concepts} canonical concepts and ${actual.counts.rows} mode rows (${fileURLToPath(root)}).`,
);
