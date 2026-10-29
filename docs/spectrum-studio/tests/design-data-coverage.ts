// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import {
  compareDesignData,
  canonicalJson,
  reportMarkdown,
  type AnalysisInput,
  type AnalysisRecord,
} from "../src/features/design-data/comparison";

const row = (
  id: string,
  extra: Partial<AnalysisRecord> = {},
): AnalysisRecord => ({
  id,
  category: "tokens",
  name: id,
  source: "fixture",
  pointer: "",
  classification: "generated",
  value: 8,
  structuredName: { property: "color" },
  ...extra,
});
const input = (
  records: AnalysisRecord[],
  kind: "defaults" | "reference",
): AnalysisInput => ({
  source: {
    kind,
    root: "fixture",
    hash: "fixture",
    revision: "fixture",
    dirty: false,
    version: "fixture",
    validator: "fixture",
  },
  records,
  categories: [...new Set(records.map((record) => record.category))],
  schemas: [],
  errors: [],
  limitations: [],
  inventoryStatus: "complete",
});
const app = input(
  [
    row("a-light", {
      identity: "light",
      conceptId: "app-color",
      context: { colorScheme: "light" },
    }),
    row("a-dark", {
      identity: "dark",
      conceptId: "app-color",
      context: { colorScheme: "dark" },
    }),
    row("native-only", { conceptId: "other-app-color" }),
    row("empty-overrides", {
      category: "authoring/tokenOverrides",
      value: {},
      classification: "authored",
    }),
  ],
  "defaults",
);
const reference = input(
  [
    row("r-light", {
      identity: "light",
      conceptId: "ref-color",
      context: { colorScheme: "light" },
    }),
    row("r-dark", {
      identity: "dark",
      conceptId: "ref-color",
      context: { colorScheme: "dark" },
      value: 10,
    }),
    row("unmapped", { conceptId: "unmapped-color" }),
    row("semantic", {
      conceptId: "semantic-color",
      structuredName: { property: "color", colorRole: "accent" },
    }),
    row("component", {
      category: "components",
      classification: "authored",
      value: { name: "Button" },
    }),
    row("unclassified", {
      conceptId: "unknown-kind",
      structuredName: { property: "opaque" },
    }),
  ],
  "reference",
);
const report = compareDesignData(app, reference);
const coverage = report.coverage!;
assert.equal(coverage.allTokens.counts.concepts.reference, 4);
assert.equal(coverage.allTokens.counts.concepts.app, 2);
assert.equal(coverage.allTokens.counts.concepts.represented, 1);
assert.equal(coverage.allTokens.counts.concepts.percent, 25);
assert.equal(coverage.allTokens.counts.rows.reference, 5);
assert.equal(coverage.allTokens.counts.rows.represented, 2);
assert.equal(coverage.allTokens.counts.rows.percent, 40);
assert.equal(coverage.values.equal, 1);
assert.equal(coverage.values.different, 1);
assert.equal(
  coverage.values.agreementPercent,
  50,
  "Value agreement is not data presence",
);
assert.equal(coverage.allTokens.counts.concepts.missing, 1);
assert.equal(
  coverage.allTokens.counts.concepts.unknown,
  2,
  "Unmapped and unclassified data is not missing",
);
assert.equal(
  coverage.categories.find((group) => group.id === "category:components")
    ?.counts.concepts.percent,
  0,
);
assert.equal(
  coverage.categories.find((group) => group.id === "category:components")
    ?.counts.concepts.missingPercent,
  100,
);
assert.equal(
  coverage.categories.find((group) => group.id === "category:tokenOverrides")
    ?.counts.concepts.app,
  0,
  "Empty native maps are not authored override data",
);
assert.equal(
  coverage.tokenTypes.find((group) => group.id === "type:color")?.counts
    .concepts.reference,
  3,
);
assert.equal(
  coverage.schemas.compatibilityPercent,
  null,
  "Schema compatibility cannot be inferred from inventory counts",
);
assert(reportMarkdown(report).includes("Data coverage overview"));
assert.equal(
  canonicalJson(coverage),
  canonicalJson(
    compareDesignData(
      { ...app, records: [...app.records].reverse() },
      { ...reference, records: [...reference.records].reverse() },
    ).coverage,
  ),
);
const partial = compareDesignData(
  { ...app, errors: ["Generation failed"], inventoryStatus: "partial" },
  reference,
).coverage!;
assert.equal(
  partial.categories.find((group) => group.id === "category:components")?.counts
    .concepts.missing,
  0,
);
assert.equal(
  partial.categories.find((group) => group.id === "category:components")?.counts
    .concepts.unknown,
  1,
);
const noReference = compareDesignData(app, input([], "reference")).coverage!;
assert.equal(
  noReference.allTokens.counts.concepts.percent,
  null,
  "An empty denominator is not 0% coverage",
);
const ambiguous = compareDesignData(
  input([row("same-a", { identity: "duplicate" })], "defaults"),
  input(
    [
      row("same-b", { identity: "duplicate" }),
      row("same-c", { identity: "duplicate" }),
    ],
    "reference",
  ),
).coverage!;
assert.equal(ambiguous.allTokens.counts.rows.represented, 0);
assert.equal(ambiguous.allTokens.counts.rows.unknown, 2);
const alias = compareDesignData(
  input([row("left", { identity: "alias" })], "defaults"),
  input(
    [row("right", { identity: "alias", reference: "unresolved" })],
    "reference",
  ),
).coverage!;
assert.equal(alias.allTokens.counts.rows.represented, 1);
assert.equal(alias.values.notCompared, 1);
console.log(
  "Human-readable coverage denominator, absence, unknown, ambiguity, concepts and value-separation checks passed.",
);
