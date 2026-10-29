// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import {
  architectureMarkdown,
  buildArchitectureAssessment,
  isArchitectureAssessment,
  sdkExecutionEvidence,
  type AssessmentProfile,
  type AssessmentRegistry,
} from "../src/features/design-data/assessment";
import {
  canonicalJson,
  compareDesignData,
  reportMarkdown,
  type AnalysisInput,
} from "../src/features/design-data/comparison";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  rm,
  symlink,
} from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { appRoot } from "../scripts/design-data-loader";
import {
  assertEvidencePath,
  loadArchitectureAssessment,
  observeAssessmentEvidence,
} from "../scripts/design-data-assessment";
import { architectureRegistry } from "../src/features/design-data/assessmentRegistry";
import {
  analysisRows,
  architecturalEvidence,
} from "../src/views/analysis/reportRows";

const profile: AssessmentProfile = {
  id: "fixture",
  label: "Reviewed fixture",
  kind: "working-tree",
  root: "fixture",
  reviewedRevision: "review-1",
  observedRevision: "now",
  status: "available",
  limitation: "Byte checks only.",
};
const hash = "1".repeat(64);
const registry: AssessmentRegistry = {
  version: "fixture-v1",
  evidence: [
    {
      id: "E1",
      profileId: "fixture",
      authority: "specification",
      method: "source-review",
      path: "spec.md",
      format: "file",
      location: "contract",
      reviewedSha256: hash,
      reviewedAt: "2026-10-05",
      statement: "Reviewed source.",
    },
  ],
  requirements: [
    {
      id: "T1",
      title: "Portable definitions",
      statement: "Intent is portable; schema proposal is not accepted.",
      status: "confirmed-direction",
      evidenceIds: ["E1"],
      decision: "open",
    },
  ],
  findings: [
    {
      id: "JTC-fixture",
      title: "Schema support gap",
      plane: "target-contract",
      classification: "schema-expressiveness-gap",
      priority: "high",
      scope: "Authoring definitions",
      statement: "Equal token values do not prove portable recipes.",
      consequence: "Intent can be lost.",
      recommendation: "Review authoring schema.",
      owner: "joint",
      evidenceIds: ["E1"],
      requirementIds: ["T1"],
      decision: "open",
      discriminatingCheck: "Round-trip the recipe.",
    },
  ],
};
const matched = buildArchitectureAssessment(
  registry,
  [profile],
  [{ evidenceId: "E1", sha256: hash }],
);
assert.equal(matched.schemaVersion, 1);
assert.equal(matched.findings[0].freshness, "reviewed-snapshot");
assert.equal(matched.evidence[0].execution, "review-not-rerun");
assert.equal(matched.evidence[0].verification.method, "sha256-only");
assert.equal(matched.requirements[0].decision, "open");
assert.equal(matched.requirements[0].freshness, "reviewed-snapshot");
assert.equal(isArchitectureAssessment(matched), true);
assert.equal(isArchitectureAssessment({ ...matched, schemaVersion: 2 }), false);
assert.equal(
  isArchitectureAssessment({
    ...matched,
    evidence: [{ ...matched.evidence[0], execution: "passed-now" }],
  }),
  false,
);
assert.equal(
  isArchitectureAssessment({
    ...matched,
    findings: [{ ...matched.findings[0], decision: "closed" }],
  }),
  false,
);
assert.equal(
  buildArchitectureAssessment(
    registry,
    [profile],
    [{ evidenceId: "E1", sha256: "2".repeat(64) }],
  ).findings[0].freshness,
  "stale",
);
assert.equal(
  buildArchitectureAssessment(registry, [profile], []).findings[0].freshness,
  "unverified",
);
assert.equal(
  buildArchitectureAssessment(registry, [profile], []).requirements[0]
    .freshness,
  "unverified",
);
assert.equal(
  buildArchitectureAssessment(
    registry,
    [{ ...profile, status: "tracked-ref-advanced" }],
    [{ evidenceId: "E1", sha256: hash }],
  ).findings[0].freshness,
  "stale",
);
const partial = buildArchitectureAssessment(
  registry,
  [profile],
  [],
  ["Required input unavailable"],
);
assert.equal(partial.findings.length, 1);
assert.deepEqual(partial.requiredInputFailures, ["Required input unavailable"]);
assert(architectureMarkdown(partial).includes("not rerun"));
assert.equal("healthScore" in matched, false);
assert.equal("metrics" in matched, false);
assert.equal(
  canonicalJson(matched),
  canonicalJson(
    buildArchitectureAssessment(
      registry,
      [profile],
      [{ evidenceId: "E1", sha256: hash }],
    ),
  ),
);
assert.throws(
  () =>
    buildArchitectureAssessment(
      { ...registry, evidence: [...registry.evidence, registry.evidence[0]] },
      [profile],
      [],
    ),
  /Invalid evidence identity/,
);
assert.throws(
  () =>
    buildArchitectureAssessment(
      {
        ...registry,
        findings: [{ ...registry.findings[0], evidenceIds: ["missing"] }],
      },
      [profile],
      [],
    ),
  /Unresolved assessment reference/,
);
assert.throws(
  () =>
    buildArchitectureAssessment(
      registry,
      [profile],
      [{ evidenceId: "E1", sha256: "bad" }],
    ),
  /Invalid observed SHA/,
);
assert.throws(
  () =>
    buildArchitectureAssessment(
      {
        ...registry,
        evidence: [
          { ...registry.evidence[0], method: "executed-check" } as never,
        ],
      },
      [profile],
      [],
    ),
  /Unsupported assessment method/,
);
assert.throws(
  () =>
    buildArchitectureAssessment(
      {
        ...registry,
        findings: [{ ...registry.findings[0], decision: "closed" } as never],
      },
      [profile],
      [],
    ),
  /Unapproved finding closure/,
);
const before = canonicalJson(registry);
const detached = buildArchitectureAssessment(
  registry,
  [profile],
  [{ evidenceId: "E1", sha256: hash }],
);
detached.findings[0].evidenceIds.push("mutated-output");
assert.equal(
  canonicalJson(registry),
  before,
  "Returned assessment metadata cannot mutate the reviewed registry",
);

const input = (kind: "defaults" | "reference"): AnalysisInput => ({
  source: {
    kind,
    root: "fixture",
    hash,
    revision: "fixture",
    dirty: false,
    version: "1",
    validator: "fixture",
  },
  records: [],
  categories: [],
  schemas: [],
  errors: [],
  limitations: [],
});
const report = compareDesignData(input("defaults"), input("reference"));
report.architecture = matched;
assert.equal(report.schemaVersion, 1);
assert.equal(report.findings.length, 0);
assert.equal(
  report.architecture.findings.length,
  1,
  "Architectural findings do not require a token match",
);
assert(reportMarkdown(report).includes("Joint target-contract findings"));
assert.equal(report.architecture.requirements[0].decision, "open");
assert.equal(
  analysisRows(report, "generated-output").length,
  report.findings.length,
);
assert.equal(analysisRows(report, "target-contract").length, 2);
assert.equal(
  architecturalEvidence(matched, analysisRows(report, "target-contract")[0])
    .evidence.length,
  1,
);
assert.equal(
  analysisRows({ ...report, architecture: undefined }, "current-state").length,
  0,
  "Missing architecture never invents findings or coverage counts",
);
const transported = compareDesignData(input("defaults"), {
  ...input("reference"),
  architecture: matched,
});
assert.deepEqual(
  transported.architecture,
  matched,
  "The shared engine carries the same additive assessment into browser reports",
);
const partialTransport = compareDesignData(
  { ...input("defaults"), errors: ["Invalid authoring fixture"] },
  { ...input("reference"), architecture: matched },
);
assert.equal(partialTransport.architecture?.findings.length, 1);
assert.deepEqual(partialTransport.architecture?.requiredInputFailures, [
  "App: Invalid authoring fixture",
]);
const sdk = sdkExecutionEvidence({
  validator: "fixture SDK",
  hash,
  resolutionConformance: {
    fixtureHash: hash,
    resolvedValueComparison: "disabled",
    checks: [{ name: "product layer", status: "unsupported" }],
  },
});
assert.equal(sdk.sourceCorrespondence, "not-established");
assert.equal(sdk.pinnedProfileExecution, "not-performed");
assert.equal(sdk.resolution?.checks[0].status, "unsupported");
assert.equal(
  sdkExecutionEvidence({ validator: "unavailable", hash }).availability,
  "unavailable",
);
report.architecture.sdkBinary = sdk;
assert(reportMarkdown(report).includes("separate from reviewed source"));
const equalRow = {
  id: "row",
  identity: "shared",
  category: "tokens",
  name: "Fixture",
  source: "fixture",
  pointer: "/0",
  classification: "generated" as const,
  value: 8,
  unit: "px",
};
const equal = compareDesignData(
  { ...input("defaults"), records: [equalRow], categories: ["tokens"] },
  {
    ...input("reference"),
    records: [{ ...equalRow, id: "other" }],
    categories: ["tokens"],
  },
);
equal.architecture = matched;
assert.equal(equal.findings[0].classification, "equal");
assert.equal(
  equal.architecture.findings[0].decision,
  "open",
  "Equal values never close a semantic/schema requirement",
);

for (const path of [
  "../outside",
  "/absolute",
  "safe/../../outside",
  "file\nname",
  "sdk/target/binary",
  ".git/config",
  "file:revision",
  "node_modules/data",
  "safe\\outside",
])
  assert.throws(
    () => assertEvidencePath(path),
    /Unsafe assessment evidence path/,
  );
const directory = await mkdtemp(join(tmpdir(), "assessment-evidence-"));
try {
  const file = join(directory, "spec.md");
  await writeFile(file, "reviewed source");
  const expected = createHash("sha256").update("reviewed source").digest("hex");
  const definition = { ...registry.evidence[0], reviewedSha256: expected };
  const temporary = { ...profile, root: directory };
  const observed = await observeAssessmentEvidence(definition, temporary);
  assert.equal(observed.sha256, expected);
  assert.equal(
    buildArchitectureAssessment(
      { ...registry, evidence: [definition] },
      [temporary],
      [observed],
    ).findings[0].freshness,
    "reviewed-snapshot",
  );
  await writeFile(file, "changed source");
  assert.equal(
    buildArchitectureAssessment(
      { ...registry, evidence: [definition] },
      [temporary],
      [await observeAssessmentEvidence(definition, temporary)],
    ).findings[0].freshness,
    "stale",
  );
  assert.equal(
    await readFile(file, "utf8"),
    "changed source",
    "The assessment adapter never restores or rewrites source input",
  );
  await symlink(file, join(directory, "link.md"));
  assert.equal(
    (
      await observeAssessmentEvidence(
        { ...definition, path: "link.md" },
        temporary,
      )
    ).sha256,
    null,
  );
  await mkdir(join(directory, "tree"));
  await writeFile(join(directory, "tree/a.json"), '{"value":1}');
  const tree = { ...definition, path: "tree", format: "json-tree" as const };
  const firstTree = await observeAssessmentEvidence(tree, temporary);
  await writeFile(join(directory, "tree/b.json"), '{"value":2}');
  assert.notEqual(
    (await observeAssessmentEvidence(tree, temporary)).sha256,
    firstTree.sha256,
    "New schema/category files invalidate a reviewed JSON-tree pin",
  );
  const unavailable = await loadArchitectureAssessment(
    join(directory, "missing"),
    ["Required fixture checkout unavailable"],
  );
  assert.equal(unavailable.findings.length, 16);
  assert.equal(unavailable.requirements.length, 8);
  assert.equal(
    unavailable.profiles.find((item) => item.id === "draft-pr1454")?.status,
    "unavailable",
  );
  assert(
    unavailable.findings.some(
      (item) => item.id === "PR1454-001" && item.freshness === "unverified",
    ),
  );
  assert(
    unavailable.evidence.every((item) => item.execution === "review-not-rerun"),
  );
  assert.equal(unavailable.requiredInputFailures.length, 1);

  // Exercise Git-object reading using the app's already-existing commit, never a new commit/ref.
  const revision = execFileSync("git", ["-C", appRoot, "rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  const path = "src/data/design-system.defaults.json";
  const blob = execFileSync("git", [
    "-C",
    appRoot,
    "show",
    `${revision}:${path}`,
  ]);
  const pinned = {
    ...profile,
    root: appRoot,
    kind: "pinned-git" as const,
    reviewedRevision: revision,
  };
  assert.equal(
    (await observeAssessmentEvidence({ ...definition, path }, pinned)).sha256,
    createHash("sha256").update(blob).digest("hex"),
  );
  assert.equal(
    (
      await observeAssessmentEvidence(
        { ...definition, path },
        { ...pinned, reviewedRevision: "0".repeat(40) },
      )
    ).sha256,
    null,
    "Missing immutable objects are not fetched or substituted",
  );
  assert.equal(architectureRegistry.findings.length, 16);
} finally {
  await rm(directory, { recursive: true, force: true });
}
console.log("Architectural assessment model checks passed.");
