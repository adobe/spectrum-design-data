// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import {
  summarizeModeResults,
  matchesModeSelection,
  modeResultsMarkdown,
} from "../src/features/design-data/modeResults";
import {
  colorOpacityTree,
  comparisonPaint,
} from "../src/views/analysis/colorOpacityPresentation";
import type {
  ColorOpacityConcept,
  ColorOpacityRow,
} from "../src/features/design-data/colorOpacityAssessment";
import {
  compareDesignData,
  reportWithFreshness,
} from "../src/features/design-data/comparison";

const row = (
  id: string,
  context: Record<string, string>,
  verdict: ColorOpacityRow["verdict"],
): ColorOpacityRow => ({
  id,
  context,
  verdict,
  issues: [],
  appChain: [],
  referenceChain: [],
  reference: {
    id,
    name: id,
    category: "tokens",
    source: "fixture",
    pointer: "",
    classification: "generated",
  },
});
const concepts: ColorOpacityConcept[] = [
  {
    id: "gray",
    label: "gray-100",
    type: "color",
    family: "gray",
    verdict: "fail",
    differences: [],
    rows: [
      row("light", { colorScheme: "light", contrast: "regular" }, "pass"),
      row("dark", { colorScheme: "dark", contrast: "regular" }, "fail"),
      row("dark-high", { colorScheme: "dark", contrast: "high" }, "acceptable"),
    ],
  },
  {
    id: "overlay",
    label: "overlay-opacity",
    type: "opacity",
    verdict: "unassessable",
    differences: [],
    rows: [
      row("light", { colorScheme: "light" }, "acceptable"),
      row("dark", { colorScheme: "dark" }, "unassessable"),
    ],
  },
  {
    id: "constant",
    label: "constant",
    type: "color",
    verdict: "pass",
    differences: [],
    rows: [row("constant", {}, "pass")],
  },
];
const before = JSON.stringify(concepts);
const summaries = summarizeModeResults(concepts);
const light = summaries.find(
  (row) => row.axis === "colorScheme" && row.mode === "light",
)!;
const dark = summaries.find(
  (row) => row.axis === "colorScheme" && row.mode === "dark",
)!;
assert.deepEqual(light.counts, {
  pass: 1,
  acceptable: 1,
  fail: 0,
  unassessable: 0,
});
assert.equal(light.alignedPercent, 100);
assert.equal(light.tokens, 2);
assert.equal(light.values, 2);
assert.deepEqual(dark.counts, {
  pass: 0,
  acceptable: 1,
  fail: 1,
  unassessable: 1,
});
assert.equal(
  dark.tokens,
  2,
  "A token with several Dark contexts is counted once in token totals.",
);
assert.equal(dark.values, 3);
assert.equal(
  dark.alignedPercent,
  100 / 3,
  "Unavailable evidence remains in the denominator.",
);
assert.equal(
  summaries.find((row) => row.axis === "colorScheme" && row.mode === null)
    ?.values,
  1,
);
assert.equal(
  summaries.find((row) => row.axis === "contrast" && row.mode === null)?.values,
  3,
);
assert.deepEqual(summarizeModeResults([...concepts].reverse()), summaries);
assert.deepEqual(
  summarizeModeResults([...concepts, concepts[0]]),
  summaries,
  "Repeated evidence is not double counted.",
);
assert.deepEqual(summarizeModeResults([]), []);
assert.deepEqual(summarizeModeResults([{ id: "empty", rows: [] }]), []);
assert(
  summarizeModeResults(concepts, false).every(
    (row) =>
      row.counts.unassessable === row.values && row.alignedPercent === null,
  ),
);
assert(
  summarizeModeResults([
    {
      id: "unknown",
      rows: [row("unknown", { colorScheme: "light" }, "unassessable")],
    },
  ]).every((row) => row.alignedPercent === null),
);
assert(matchesModeSelection({}, {}));
assert(matchesModeSelection({}, { contrast: null }));
assert(
  !matchesModeSelection({}, { contrast: "regular" }),
  "Missing axes are never assumed to be their defaults.",
);
assert(
  matchesModeSelection(
    { colorScheme: "dark", contrast: "high" },
    { colorScheme: "dark", contrast: "high" },
  ),
);
assert(
  !matchesModeSelection(
    { colorScheme: "light", contrast: "high" },
    { colorScheme: "dark", contrast: "high" },
  ),
);

const filtered = colorOpacityTree(concepts, "", "all", {
  colorScheme: "light",
});
assert.equal(filtered.length, 2);
assert(
  filtered.every((item) =>
    item.children.every(
      (child) => child.value?.context.colorScheme === "light",
    ),
  ),
);
assert.equal(
  filtered[0].concept.verdict,
  "fail",
  "A passing Light row does not rewrite the failing whole-token result.",
);
assert.equal(filtered[0].children[0].value?.verdict, "pass");
assert.equal(
  colorOpacityTree(concepts, "", "all", { colorScheme: "dark" }, "fail").length,
  1,
);
assert.equal(
  colorOpacityTree(
    concepts,
    "",
    "all",
    { colorScheme: "dark", contrast: "high" },
    "acceptable",
  )[0].children.length,
  1,
);
assert.equal(
  colorOpacityTree(
    concepts,
    "overlay",
    "all",
    { colorScheme: "dark" },
    "unassessable",
  ).length,
  1,
);
assert.equal(
  colorOpacityTree(concepts, "", "pass", { colorScheme: "light" }).length,
  0,
  "Parent filters stay distinct from per-value filters.",
);
assert.equal(
  colorOpacityTree(concepts, "", "all", { colorScheme: "missing" }).length,
  0,
);
assert.equal(
  colorOpacityTree(concepts, "", "all", { contrast: null }).length,
  2,
);
assert.equal(colorOpacityTree(concepts, "", "all").length, 3);
const emptyConcept: ColorOpacityConcept = {
  ...concepts[0],
  id: "empty",
  verdict: "unassessable",
  rows: [],
};
assert.equal(
  colorOpacityTree([emptyConcept], "", "all").length,
  1,
  "Empty mode inventories remain visible as whole-token findings.",
);
assert.equal(colorOpacityTree([emptyConcept], "", "all", {}, "pass").length, 0);
assert.equal(JSON.stringify(concepts), before);
assert.match(
  modeResultsMarkdown(summaries),
  /\| colorScheme \| light \| 2 \| 2 \| 1 \| 1 \| 0 \| 0 \| 100.0% \|/,
);
assert.match(modeResultsMarkdown(summaries), /Not mode-specific/);
assert.match(modeResultsMarkdown([]), /Results by mode/);
assert(!modeResultsMarkdown(summaries).includes("NaN"));

// Future value domains only need IDs, contexts and row results.
assert.equal(
  summarizeModeResults([
    {
      id: "spacing",
      rows: [{ id: "desktop", context: { scale: "desktop" }, verdict: "fail" }],
    },
  ])[0].counts.fail,
  1,
);
const source = {
  kind: "defaults" as const,
  root: "fixture",
  hash: "fixture",
  revision: "fixture",
  dirty: false,
  version: "fixture",
  validator: "fixture",
};
const input = {
  source,
  records: [],
  errors: [],
  limitations: [],
  categories: [],
  schemas: [],
  inventoryStatus: "complete" as const,
};
const report = compareDesignData(input, {
  ...input,
  source: { ...source, kind: "reference" },
});
report.colorOpacity!.concepts = concepts;
report.colorOpacity!.modeBreakdown = summaries;
const stale = reportWithFreshness(report, "stale");
assert(
  stale.colorOpacity!.modeBreakdown.every(
    (row) =>
      row.alignedPercent === null && row.counts.unassessable === row.values,
  ),
);
console.log(
  "Mode results: per-value counts, distinct token counts, multiple axes, unknown evidence, reusable domains, filtering, stable parents and stale exports pass.",
);

assert.deepEqual(comparisonPaint("rgb(1, 2, 3)", "color"), {
  color: "rgb(1, 2, 3)",
});
assert.equal(comparisonPaint(undefined, "color"), undefined);
assert.equal(comparisonPaint("  ", "color"), undefined);
assert.deepEqual(comparisonPaint(0.5, "opacity"), { alpha: 0.5 });
assert.equal(comparisonPaint("not a number", "opacity"), undefined);
