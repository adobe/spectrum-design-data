// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import {
  compareDesignData,
  type AnalysisInput,
  type AnalysisRecord,
} from "../src/features/design-data/comparison";

const record = (
  id: string,
  extra: Partial<AnalysisRecord> = {},
): AnalysisRecord => ({
  id,
  identity: id,
  category: "tokens",
  source: "tokens/fixture.json",
  pointer: "",
  classification: "authored",
  name: id,
  value: 8,
  ...extra,
});
const input = (
  records: AnalysisRecord[],
  kind: "working" | "reference",
): AnalysisInput => ({
  source: {
    kind,
    root: "fixture",
    hash: kind,
    revision: "fixture",
    dirty: false,
    version: "fixture",
    validator: "fixture",
  },
  records,
  categories: ["tokens"],
  schemas: [],
  errors: [],
  limitations: [],
});
const left = record("left", { identity: "shared" });
const first = record("first", { identity: "shared" });
const second = record("second", { identity: "other" });
const mapping = {
  app: "left",
  reference: "second",
  rationale: "Fixture mapping",
};
const ambiguous = compareDesignData(
  input([left], "working"),
  input([first, second], "reference"),
  [mapping],
);
assert(
  ambiguous.findings.some(
    (row) => row.app?.id === "left" && row.classification === "ambiguous",
  ),
);
const same = compareDesignData(
  input([left], "working"),
  input([first], "reference"),
  [{ ...mapping, reference: "first" }],
);
assert.equal(
  same.metrics[0].matched,
  1,
  "An identity and a mapping to the same record are not duplicate candidates.",
);
const duplicate = compareDesignData(
  input([left, left], "working"),
  input([first], "reference"),
  [],
);
assert.equal(
  duplicate.findings.filter(
    (row) => row.app?.id === "left" && row.classification === "ambiguous",
  ).length,
  2,
);
const duplicateReference = compareDesignData(
  input([left], "working"),
  input([first, first], "reference"),
  [],
);
assert(
  duplicateReference.findings.some(
    (row) => row.app?.id === "left" && row.classification === "ambiguous",
  ),
);
const concept = compareDesignData(
  input(
    [
      record("left", {
        conceptId: "concept",
        identity: "exact",
        context: { colorScheme: "dark" },
      }),
    ],
    "working",
  ),
  input(
    [
      record("different", {
        conceptId: "concept",
        identity: "different",
        context: { colorScheme: "dark" },
      }),
      record("exact", {
        conceptId: "concept",
        identity: "exact",
        context: { colorScheme: "light" },
      }),
    ],
    "reference",
  ),
  [],
);
assert(
  concept.findings.some(
    (row) => row.app?.id === "left" && row.reference?.id === "exact",
  ),
);
assert(
  !concept.findings.some(
    (row) => row.app?.id === "left" && row.reference?.id === "different",
  ),
);
const many = Array.from({ length: 1200 }, (_, index) => record(`row-${index}`));
const report = compareDesignData(
  input(many, "working"),
  input(many, "reference"),
  [],
);
assert.equal(report.metrics[0].matched, many.length);
assert.deepEqual(
  report.findings
    .filter((row) => row.app && row.reference)
    .map((row) => row.app!.id),
  many.map((row) => row.id),
  "Indexes preserve reference matching and app finding order.",
);
console.log(
  "Indexed comparison: identity/mapping union, exact concepts, duplicate ambiguity and stable order passed.",
);
