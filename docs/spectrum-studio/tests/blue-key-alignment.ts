// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { referenceRecords } from "../scripts/design-data-loader";
import { designSystemDefaults } from "../src/data/defaults";
import { concreteColor } from "../src/features/color-system/data-vis/colors";
import {
  colorJsSpace,
  outputGamut,
} from "../src/features/color-system/outputSettings";
import {
  MAX_CHROMA,
  paletteColorCss,
} from "../src/features/color-system/paletteValue";
import { computeAnalysisComparison } from "../src/features/design-data/analysisWork";
import {
  canonicalJson,
  type AnalysisInput,
} from "../src/features/design-data/comparison";
import type {
  ColorOpacityAssessment,
  ColorOpacityRow,
} from "../src/features/design-data/colorOpacityAssessment";
import { projectAuthoringDataset } from "../src/features/design-data/projection";
import { exactPaletteColor } from "../src/features/design-data/paletteAssessment";
import {
  inventoryComparisonRows,
  tokenComparisonRows,
} from "../src/views/analysis/tokenComparisonPresentation";

type Sample = { index: number; row: ColorOpacityRow };
const acceptable = (row: Pick<ColorOpacityRow, "verdict">) =>
  row.verdict === "pass" || row.verdict === "acceptable";
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const distance = (row: ColorOpacityRow) => {
  assert.equal(typeof row.deltaE2000, "number");
  assert.ok(Number.isFinite(row.deltaE2000));
  return row.deltaE2000!;
};
const rowKey = (row: ColorOpacityRow) =>
  canonicalJson([row.reference.id, row.context]);
const newFailures = (before: Sample[], after: Sample[]) =>
  after.filter(
    ({ row }, index) => acceptable(before[index].row) && !acceptable(row),
  );
const blueRows = (assessment: ColorOpacityAssessment): Sample[] =>
  assessment.concepts
    .filter((concept) => concept.type === "color" && concept.family === "blue")
    .flatMap((concept) =>
      concept.rows.map((row) => {
        const index = row.reference.structuredName?.scaleIndex;
        assert.equal(typeof index, "number");
        return { index: Number(index), row };
      }),
    )
    .sort(
      (a, b) =>
        a.index - b.index ||
        canonicalJson(a.row.context).localeCompare(
          canonicalJson(b.row.context),
        ),
    );

function selectKeys(samples: Sample[]) {
  const dark = samples
    .filter(({ row }) => row.context.colorScheme === "dark")
    .sort((a, b) => a.index - b.index);
  assert.ok(dark.length > 0);
  assert.equal(new Set(dark.map(({ index }) => index)).size, dark.length);
  const regions: Sample[][] = [];
  let region: Sample[] = [];
  for (const sample of dark) {
    if (!acceptable(sample.row)) region.push(sample);
    else if (region.length) {
      regions.push(region);
      region = [];
    }
  }
  if (region.length) regions.push(region);
  assert.ok(regions.length > 0, "No failing Dark region needs an added key.");
  const worstFirst = (a: Sample, b: Sample) =>
    distance(b.row) - distance(a.row) || a.index - b.index;
  regions.sort(
    (a, b) =>
      b.length - a.length ||
      Math.max(...b.map(({ row }) => distance(row))) -
        Math.max(...a.map(({ row }) => distance(row))) ||
      a[0].index - b[0].index,
  );
  const main = regions[0];
  const middle = main
    .slice(Math.floor((main.length - 1) / 2), Math.floor(main.length / 2) + 1)
    .sort(worstFirst)[0];
  return {
    regions: regions.map((group) => group.map(({ index }) => index)),
    midpoint: middle,
    largest: regions.flat().sort(worstFirst)[0],
  };
}

const synthetic = (index: number, deltaE2000: number): Sample => ({
  index,
  row: {
    id: `row-${index}`,
    reference: {
      id: `reference-${index}`,
      name: `blue-${index}`,
      category: "tokens",
      source: "fixture",
      pointer: "/",
      classification: "generated",
    },
    context: { colorScheme: "dark", contrast: "regular" },
    deltaE2000,
    verdict: deltaE2000 < 2 ? "acceptable" : "fail",
    issues: [],
    appChain: [],
    referenceChain: [],
  },
});
const selection = selectKeys([
  synthetic(100, 1),
  synthetic(200, 3),
  synthetic(300, 4),
  synthetic(400, 2.5),
  synthetic(500, 1),
  synthetic(600, 5),
]);
assert.equal(selection.midpoint.index, 300);
assert.equal(selection.largest.index, 600);
assert.deepEqual(selection.regions, [[200, 300, 400], [600]]);
assert.equal(
  selectKeys([synthetic(100, 3), synthetic(200, 4)]).midpoint.index,
  200,
  "An even region uses the middle token with the larger error.",
);
assert.equal(
  selectKeys([synthetic(100, 3), synthetic(200, 1), synthetic(300, 4)]).midpoint
    .index,
  300,
  "Equal-size regions prefer the larger worst error.",
);
assert.equal(acceptable({ verdict: "unassessable" }), false);
assert.equal(acceptable({ verdict: "fail" }), false);
assert.deepEqual(
  newFailures(
    [synthetic(100, 1.99), synthetic(200, 3)],
    [synthetic(100, 2), synthetic(200, 4)],
  ).map(({ index }) => index),
  [100],
  "Crossing the strict threshold rejects a trial; an existing failure stays visible.",
);
assert.equal(
  newFailures([synthetic(100, 0)], [synthetic(100, 1.99)]).length,
  0,
  "An exact-to-acceptable change is not a new failure.",
);

const referencePaths = [
  "tokens/color-palette.tokens.json",
  "registry/color-families.json",
  "mode-sets/color-scheme.json",
  "mode-sets/contrast.json",
];
const referenceHashes: Record<string, string> = {};
const reference: AnalysisInput = {
  source: {
    kind: "reference",
    root: "repository primitive color reference; file hashes in trial evidence",
    hash: "",
    revision: "direct checkout; not SDK-resolved",
    dirty: null,
    version: "fixture",
    validator: "referenceRecords",
  },
  records: [],
  categories: ["tokens", "registry", "mode-sets"],
  schemas: [],
  errors: [],
  limitations: ["Primitive palette only; no SDK alias/cascade resolution."],
  inventoryStatus: "complete",
};
for (const path of referencePaths) {
  const contents = await readFile(
    new URL(`../../../packages/design-data/${path}`, import.meta.url),
    "utf8",
  );
  referenceHashes[path] = hash(contents);
  reference.records.push(...referenceRecords(path, JSON.parse(contents)));
}
reference.source.hash = hash(canonicalJson(referenceHashes));
const defaultsBefore = canonicalJson(designSystemDefaults);
const referenceBefore = canonicalJson(reference);
const baseline = await computeAnalysisComparison({
  type: "compare",
  source: { dataset: "defaults" },
  reference,
});
assert.deepEqual(baseline.app.errors, []);
const baselineAssessment = baseline.report!.colorOpacity!;
const required = blueRows(baselineAssessment);
assert.equal(required.length, 48, "Sixteen Blue concepts require three modes.");
assert.ok(
  required.every(
    ({ row }) =>
      row.app && row.verdict !== "unassessable" && !row.modeFailures?.length,
  ),
);
assert.ok(required.every(({ row }) => row.context.contrast === "regular"));
const keys = selectKeys(required);
const blue = designSystemDefaults.system.foundations.color.scales.find(
  (scale) => scale.id === "scale-48",
)!;
assert.ok(blue);
assert.equal(blue.nameRef?.termId, "6bbab90f-8ed6-4b4f-a6fa-e6b5937c7615");
assert.equal(blue.interpolation, "rgb");
assert.equal(blue.stops.length, 4);
assert.deepEqual(
  projectAuthoringDataset(
    structuredClone(designSystemDefaults),
    baseline.app.source,
  ).records,
  baseline.app.records,
  "The trial projection starts from the actual shipped dataset.",
);
const metadata = ({ index, row }: Sample) => ({
  index,
  referenceId: row.reference.id,
  appId: row.app?.id,
  identity: row.app?.identity,
  conceptId: row.app?.conceptId,
  classification: row.app?.classification,
  context: row.context,
  name: row.app?.name,
  structuredName: row.app?.structuredName,
});
const values = ({ index, row }: Sample) => ({
  ...metadata({ index, row }),
  appValue: row.appValue,
  referenceValue: row.referenceValue,
  verdict: row.verdict,
  deltaE2000: distance(row),
});
const summary = (samples: Sample[]) => ({
  requiredRows: samples.length,
  failingRows: samples.filter(({ row }) => !acceptable(row)).length,
  failingConcepts: new Set(
    samples.filter(({ row }) => !acceptable(row)).map(({ index }) => index),
  ).size,
  exactRows: samples.filter(({ row }) => row.verdict === "pass").length,
  worstDeltaE2000: Math.max(...samples.map(({ row }) => distance(row))),
});
const trials = [];
for (const sample of new Map(
  [keys.midpoint, keys.largest].map((candidate) => [
    rowKey(candidate.row),
    candidate,
  ]),
).values()) {
  assert.equal(typeof sample.row.referenceValue, "string");
  const color = concreteColor(String(sample.row.referenceValue));
  assert.equal(color.alpha, 1, "An opaque scale key cannot replace alpha.");
  const [lightness, chroma, hue] = color.to("oklch").coords;
  assert.ok(typeof lightness === "number" && Number.isFinite(lightness));
  assert.ok(typeof chroma === "number" && Number.isFinite(chroma));
  assert.ok(typeof hue === "number" && Number.isFinite(hue));
  assert.ok(!blue.stops.some((stop) => stop.lightness === lightness));
  const stop = {
    id: `trial-blue-key-${sample.index}`,
    lightness,
    chroma: (chroma / MAX_CHROMA) * 100,
    hue,
  };
  const output =
    designSystemDefaults.system.foundations.color.settings.colorOutput;
  assert.equal(
    exactPaletteColor(paletteColorCss(stop, output), sample.row.referenceValue)
      .value,
    "equal",
    "The full-precision authored key round-trips through the saved output settings.",
  );
  const dataset = structuredClone(designSystemDefaults);
  const trialBlue = dataset.system.foundations.color.scales.find(
    (scale) => scale.id === blue.id,
  )!;
  trialBlue.stops.push(stop);
  assert.deepEqual(trialBlue.stops.slice(0, -1), blue.stops);
  const app = projectAuthoringDataset(dataset, {
    ...baseline.app.source,
    root: `temporary shipped-default clone; Blue ${sample.index} key`,
    revision: "unpersisted one-key trial",
  });
  app.source.hash = hash(canonicalJson(app.records));
  const comparison = await computeAnalysisComparison({
    type: "compare",
    source: { dataset: "defaults" },
    cachedApp: app,
    reference,
  });
  assert.deepEqual(app.errors, []);
  const assessment = comparison.report!.colorOpacity!;
  const rows = blueRows(assessment);
  for (const { row } of rows) {
    assert.ok(
      row.app && row.verdict !== "unassessable" && !row.modeFailures?.length,
    );
    assert.equal(
      concreteColor(String(row.appValue)).alpha,
      concreteColor(String(row.referenceValue)).alpha,
      "A trial must preserve required alpha, including already failing colors.",
    );
    assert.ok(
      concreteColor(String(row.appValue)).inGamut(
        colorJsSpace(outputGamut(output)),
      ),
      "Required serialized output must remain inside the saved output gamut.",
    );
  }
  assert.deepEqual(rows.map(metadata), required.map(metadata));
  assert.equal(assessment.counts.rows, baselineAssessment.counts.rows);
  assert.equal(assessment.counts.concepts, baselineAssessment.counts.concepts);
  assert.equal(
    assessment.counts.excludedDeprecated,
    baselineAssessment.counts.excludedDeprecated,
  );
  assert.deepEqual(
    assessment.concepts.filter((concept) => concept.family !== "blue"),
    baselineAssessment.concepts.filter((concept) => concept.family !== "blue"),
    "Other palette families and required reference-only rows must not change.",
  );
  const presented = tokenComparisonRows(
    assessment.concepts,
    "blue-",
    "all",
    {},
    "all",
    "colors",
  ).filter((entry) => entry.concept.family === "blue");
  assert.equal(presented.length, 16);
  assert.equal(
    presented.flatMap((entry) => entry.children).length,
    required.length,
  );
  assert.equal(
    inventoryComparisonRows(
      assessment.inventory!.entries,
      "blue-",
      "all",
      {},
      "all",
      "colors",
      assessment.enhancements,
    ).length,
    0,
    "Confirmed High extras must not duplicate required Blue comparisons.",
  );
  const enhancements = assessment.enhancements.filter(
    (entry) => entry.app?.structuredName?.colorFamily === "blue",
  );
  assert.equal(
    enhancements.length,
    48,
    "High extras retain their own inventory.",
  );
  assert.ok(enhancements.every((entry) => entry.issue === null));
  assert.ok(
    enhancements.every((entry) =>
      concreteColor(String(entry.value)).inGamut(
        colorJsSpace(outputGamut(output)),
      ),
    ),
  );
  const baselineRecords = new Map(
    baseline.app.records
      .filter((record) => record.category === "tokens")
      .map((record) => [record.id, record]),
  );
  assert.deepEqual(
    app.records.map((record) => record.id),
    baseline.app.records.map((record) => record.id),
  );
  const changedTokens = app.records
    .filter(
      (record) =>
        record.category === "tokens" &&
        canonicalJson(record) !== canonicalJson(baselineRecords.get(record.id)),
    )
    .map((record) => ({
      id: record.id,
      name: record.name,
      family: record.structuredName?.colorFamily,
      context: record.context,
      before: baselineRecords.get(record.id)?.value,
      after: record.value,
      reference: record.reference,
    }));
  assert.ok(changedTokens.length > 0);
  assert.ok(
    changedTokens.every((record) => record.family === "blue"),
    "Direct non-Blue token output, including other palettes, stays unchanged.",
  );
  const regressions = newFailures(required, rows);
  const eligible = regressions.length === 0;
  trials.push({
    strategies: [
      ...(rowKey(sample.row) === rowKey(keys.midpoint.row) ? ["midpoint"] : []),
      ...(rowKey(sample.row) === rowKey(keys.largest.row)
        ? ["largest-error"]
        : []),
    ],
    keyIndex: sample.index,
    referenceValue: sample.row.referenceValue,
    stop,
    inputHash: hash(canonicalJson(dataset)),
    projectedHash: app.source.hash,
    summary: summary(rows),
    regressions: regressions.map(values),
    eligible,
    rows: rows.map(values),
    enhancements: enhancements.map((entry) => ({
      id: entry.id,
      context: entry.context,
      value: entry.value,
      issue: entry.issue,
    })),
    changedTokens,
  });
  trialBlue.stops.pop();
  assert.equal(
    canonicalJson(dataset),
    defaultsBefore,
    "Removing the trial key restores all authored defaults exactly.",
  );
}
assert.equal(canonicalJson(designSystemDefaults), defaultsBefore);
assert.equal(canonicalJson(reference), referenceBefore);
const ranked = trials
  .filter((trial) => trial.eligible)
  .sort(
    (a, b) =>
      a.summary.failingRows - b.summary.failingRows ||
      a.summary.worstDeltaE2000 - b.summary.worstDeltaE2000,
  );
const control = summary(required);
const winner = ranked.find(
  (trial) =>
    trial.summary.failingRows < control.failingRows ||
    (trial.summary.failingRows === control.failingRows &&
      trial.summary.worstDeltaE2000 < control.worstDeltaE2000),
);
console.log(
  JSON.stringify(
    {
      scope:
        "shipped defaults only; temporary independent one-key trials; not applied",
      limitations: reference.limitations,
      defaultsHash: hash(defaultsBefore),
      projectedHash: baseline.app.source.hash,
      referenceHashes,
      blue,
      settings: designSystemDefaults.system.foundations.color.settings,
      failingDarkRegions: keys.regions,
      baseline: { summary: control, rows: required.map(values) },
      trials,
      recommendedKeyIndex: winner?.keyIndex ?? null,
    },
    null,
    2,
  ),
);
