// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import {
  assessGaps,
  gapRegister,
  gapRegisterIssues,
  gapsMarkdown,
  type GapRegister,
} from "../src/features/design-data/gaps";
import {
  compareDesignData,
  type AnalysisInput,
  type AnalysisRecord,
} from "../src/features/design-data/comparison";
import { emptyOutputMetadata } from "../src/features/design-data/materialization";

assert.deepEqual(gapRegisterIssues(gapRegister), []);
const template = gapRegister.gaps.find((gap) => gap.id === "LTAX-002")!;
const revision = template.revision;
const row = (id: string): AnalysisRecord => ({
  id,
  category: "tokens",
  name: id,
  identity: "same",
  conceptId: id,
  classification: "generated",
  source: "fixture",
  pointer: "",
  value: 8,
});
const input = (
  kind: "saved" | "working" | "reference",
  records: AnalysisRecord[],
): AnalysisInput => ({
  source: {
    kind,
    root: "fixture",
    revision,
    hash: "fixture",
    dirty: false,
    version: "fixture",
    validator: "fixture",
  },
  records,
  categories: ["tokens"],
  schemas: [],
  errors: [],
  limitations: [],
  inventoryStatus: "complete",
  outputMetadata: {
    ...emptyOutputMetadata(),
    observations: records.map((record) => ({
      recordId: record.id,
      origin: "generated-output",
      assignmentIds: [],
      lineage: "generator-source-only",
    })),
  },
});
const app = input("saved", [row("a")]),
  reference = input("reference", [row("r")]);
const register: GapRegister = {
  schemaVersion: 1,
  gaps: [
    {
      ...structuredClone(template),
      kind: "token-content",
      implementation: "verified",
      rfc: { status: "not required" },
      blockers: [],
      expected: [
        {
          app: "a",
          reference: "r",
          rationale: "Reviewed fixture identity mapping",
        },
      ],
      criteria: [
        {
          id: "records",
          description: "Scoped mapped records",
          check: "mapped-records",
          evidence: [],
        },
      ],
    },
  ],
};
assert.deepEqual(gapRegisterIssues(register), []);
const findings = compareDesignData(app, reference).findings;
assert.equal(
  assessGaps(app, reference, findings, register)[0].disposition,
  "aligned",
);
assert.notEqual(
  assessGaps(
    { ...app, outputMetadata: undefined },
    reference,
    findings,
    register,
  )[0].disposition,
  "aligned",
);
assert.equal(
  assessGaps({ ...app, records: [] }, reference, findings, register)[0]
    .represented,
  0,
);
assert.notEqual(
  assessGaps(
    { ...app, records: [row("unrelated")] },
    reference,
    findings,
    register,
  )[0].disposition,
  "aligned",
);
assert.equal(
  assessGaps(
    app,
    { ...reference, source: { ...reference.source, revision: "changed" } },
    findings,
    register,
  )[0].disposition,
  "unassessable",
);
assert.equal(
  assessGaps(app, undefined, findings, register)[0].freshness,
  "unavailable",
);
const unsupported = structuredClone(register);
unsupported.gaps[0].profile = "unsupported";
assert(gapRegisterIssues(unsupported).length);
assert.equal(
  assessGaps(app, reference, findings, unsupported)[0].freshness,
  "unavailable",
);
const sample = {
  ...app,
  outputMetadata: {
    ...emptyOutputMetadata(),
    observations: [
      {
        recordId: "a",
        origin: "evaluation-sample" as const,
        assignmentIds: [],
        lineage: "generator-source-only" as const,
      },
    ],
  },
};
assert.notEqual(
  assessGaps(sample, reference, findings, register)[0].disposition,
  "aligned",
);
assert.equal(
  assessGaps(app, reference, findings, register, true)[0].disposition,
  "unassessable",
);
assert.equal(
  assessGaps(
    { ...app, source: { ...app.source, kind: "working" } },
    reference,
    findings,
    register,
  )[0].provisional,
  true,
);
const rfc = structuredClone(register);
rfc.gaps[0].rfc.status = "needed";
assert.notEqual(
  assessGaps(app, reference, findings, rfc)[0].disposition,
  "aligned",
);
const manual = structuredClone(register);
manual.gaps[0].criteria.push({
  id: "manual",
  description: "Architecture acceptance",
  check: "manual",
  evidence: [],
});
assert.notEqual(
  assessGaps(app, reference, findings, manual)[0].disposition,
  "aligned",
);
manual.gaps[0].criteria[1].evidence = ["review-record"];
manual.gaps[0].criteria[1].reviewedRevision = revision;
assert.equal(
  assessGaps(app, reference, findings, manual)[0].disposition,
  "aligned",
);
const invalidPair = [
  ...findings,
  { ...findings[0], classification: "type-gap" as const },
];
assert.notEqual(
  assessGaps(app, reference, invalidPair, register)[0].disposition,
  "aligned",
);
const noDenominator = structuredClone(register);
noDenominator.gaps[0].expected = [];
assert(
  gapRegisterIssues(noDenominator).some((issue) =>
    issue.includes("expected set"),
  ),
);
assert(
  gapsMarkdown(assessGaps(app, reference, findings, register)).includes(
    "1 / 1",
  ),
);
console.log(
  "Canonical gaps: scoped closure, regression, staleness, provisional progress and RFC/manual gates passed.",
);
