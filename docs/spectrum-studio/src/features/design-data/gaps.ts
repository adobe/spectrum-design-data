// Copyright 2026 Adobe. All rights reserved.
import registerData from "../../data/design-data-gaps.json" with { type: "json" };
import type { AnalysisFinding, AnalysisInput } from "./comparison";
import { architectureRegistry } from "./assessmentRegistry";
import Ajv from "ajv";

export type GapKind =
  | "app-capability"
  | "spec-schema"
  | "sdk"
  | "token-content"
  | "intentional-policy"
  | "unassessable";
export interface GapCriterion {
  id: string;
  description: string;
  check: "manual" | "mapped-records" | "value-parity";
  evidence: string[];
  reviewedRevision?: string;
}
export interface GapEntry {
  id: string;
  title: string;
  links: string[];
  kind: GapKind;
  direction: "app-to-reference" | "reference-to-app" | "joint";
  owner: "leonardo" | "upstream" | "joint";
  scope: string;
  profile: string;
  revision: string;
  implementation:
    | "open"
    | "in progress"
    | "implemented"
    | "verified"
    | "blocked";
  disposition:
    | "not assessed"
    | "partial"
    | "aligned"
    | "intentional difference";
  rfc: {
    status:
      | "not required"
      | "needed"
      | "drafted"
      | "submitted"
      | "accepted"
      | "rejected";
    link?: string;
  };
  expected: { app: string; reference: string; rationale: string }[];
  criteria: GapCriterion[];
  blockers: string[];
  history: { date: string; event: string; evidence: string[] }[];
}
export interface GapRegister {
  schemaVersion: 1;
  gaps: GapEntry[];
}
export interface GapResult {
  gap: GapEntry;
  dataset: AnalysisInput["source"]["kind"];
  provisional: boolean;
  freshness: "current" | "stale" | "unavailable";
  disposition: GapEntry["disposition"] | "unassessable";
  represented: number;
  denominator: number;
  criteria: { id: string; passed: boolean; evidence: string[] }[];
}
const kinds: GapKind[] = [
  "app-capability",
  "spec-schema",
  "sdk",
  "token-content",
  "intentional-policy",
  "unassessable",
];
const text = { type: "string", minLength: 1 };
const texts = { type: "array", items: text };
const record = (
  properties: Record<string, unknown>,
  optional: string[] = [],
) => ({
  type: "object",
  properties,
  additionalProperties: false,
  required: Object.keys(properties).filter((key) => !optional.includes(key)),
});
export const gapRegisterSchema = {
  $id: "urn:leonardo:alignment-gap-register:1",
  ...record({
    schemaVersion: { const: 1 },
    gaps: {
      type: "array",
      items: record({
        id: { type: "string", pattern: "^LTAX-[0-9]{3}$" },
        title: text,
        links: texts,
        kind: { enum: kinds },
        direction: { enum: ["app-to-reference", "reference-to-app", "joint"] },
        owner: { enum: ["leonardo", "upstream", "joint"] },
        scope: text,
        profile: text,
        revision: { type: "string", pattern: "^[a-f0-9]{40}$" },
        implementation: {
          enum: ["open", "in progress", "implemented", "verified", "blocked"],
        },
        disposition: {
          enum: [
            "not assessed",
            "partial",
            "aligned",
            "intentional difference",
          ],
        },
        rfc: record(
          {
            status: {
              enum: [
                "not required",
                "needed",
                "drafted",
                "submitted",
                "accepted",
                "rejected",
              ],
            },
            link: text,
          },
          ["link"],
        ),
        expected: {
          type: "array",
          items: record({ app: text, reference: text, rationale: text }),
        },
        criteria: {
          type: "array",
          minItems: 1,
          items: record(
            {
              id: text,
              description: text,
              check: { enum: ["manual", "mapped-records", "value-parity"] },
              evidence: texts,
              reviewedRevision: { type: "string", pattern: "^[a-f0-9]{40}$" },
            },
            ["reviewedRevision"],
          ),
        },
        blockers: texts,
        history: {
          type: "array",
          items: record({
            date: { type: "string", pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}$" },
            event: text,
            evidence: texts,
          }),
        },
      }),
    },
  }),
};
const validateRegister = new Ajv({ allErrors: true }).compile<GapRegister>(
  gapRegisterSchema,
);
export function gapRegisterIssues(value: unknown): string[] {
  if (!validateRegister(value))
    return (validateRegister.errors ?? []).map(
      (error) => `${error.instancePath}: ${error.message}`,
    );
  const issues: string[] = [],
    ids = new Set<string>();
  const links = new Set(
    architectureRegistry.findings.map((finding) => finding.id),
  );
  for (const id of [
    "GAP-001",
    "GAP-002",
    "GAP-003",
    "GAP-004",
    "GAP-005",
    "GAP-006",
    "GAP-007",
    "GAP-008",
    "GAP-009",
  ])
    links.add(id);
  for (const gap of value.gaps as GapEntry[]) {
    if (
      !gap ||
      typeof gap !== "object" ||
      !/^LTAX-\d{3}$/.test(gap.id) ||
      ids.has(gap.id)
    ) {
      issues.push("Invalid or duplicate stable gap ID.");
      continue;
    }
    ids.add(gap.id);
    if (
      !gap.title ||
      !gap.scope ||
      !gap.profile ||
      !/^[a-f0-9]{40}$/.test(gap.revision) ||
      !kinds.includes(gap.kind) ||
      !["app-to-reference", "reference-to-app", "joint"].includes(
        gap.direction,
      ) ||
      !["leonardo", "upstream", "joint"].includes(gap.owner) ||
      !["open", "in progress", "implemented", "verified", "blocked"].includes(
        gap.implementation,
      ) ||
      ![
        "not assessed",
        "partial",
        "aligned",
        "intentional difference",
      ].includes(gap.disposition) ||
      gap.profile !== "reference-checkout" ||
      !gap.rfc ||
      ![
        "not required",
        "needed",
        "drafted",
        "submitted",
        "accepted",
        "rejected",
      ].includes(gap.rfc.status) ||
      !Array.isArray(gap.links) ||
      gap.links.some((id) => !links.has(id)) ||
      !Array.isArray(gap.criteria) ||
      !gap.criteria.length ||
      !Array.isArray(gap.expected) ||
      !Array.isArray(gap.blockers) ||
      !Array.isArray(gap.history)
    ) {
      issues.push(`${gap.id}: invalid lifecycle, references or scope.`);
      continue;
    }
    if (
      new Set(gap.criteria.map((criterion) => criterion.id)).size !==
      gap.criteria.length
    )
      issues.push(`${gap.id}: duplicate criterion IDs.`);
    for (const criterion of gap.criteria)
      if (
        !criterion.id ||
        !criterion.description ||
        !["manual", "mapped-records", "value-parity"].includes(
          criterion.check,
        ) ||
        !Array.isArray(criterion.evidence)
      )
        issues.push(`${gap.id}: invalid criterion.`);
    if (
      new Set(gap.expected.map((record) => record.reference)).size !==
        gap.expected.length ||
      new Set(gap.expected.map((record) => record.app)).size !==
        gap.expected.length ||
      gap.expected.some(
        (record) => !record.app || !record.reference || !record.rationale,
      )
    )
      issues.push(`${gap.id}: ambiguous scoped identity mapping.`);
    if (
      gap.criteria.some((criterion) => criterion.check !== "manual") &&
      !gap.expected.length
    )
      issues.push(
        `${gap.id}: machine coverage requires an explicit nonempty expected set.`,
      );
    if (
      gap.disposition === "aligned" &&
      (gap.blockers.length ||
        gap.criteria.some(
          (criterion) =>
            criterion.check === "manual" &&
            (!criterion.evidence.length ||
              criterion.reviewedRevision !== gap.revision),
        ) ||
        !["not required", "accepted"].includes(gap.rfc.status))
    )
      issues.push(
        `${gap.id}: aligned disposition lacks explicit acceptance evidence.`,
      );
  }
  return issues;
}
/**
 * Problems found in the shipped register. These are diagnostics: a malformed register must not stop the app or
 * the Analysis page from loading. `pnpm check:design-data-gaps` and `pnpm test:design-data-gaps` still fail on them.
 */
export const gapRegisterLoadIssues: readonly string[] =
  gapRegisterIssues(registerData);
if (gapRegisterLoadIssues.length)
  console.error(
    `Gap register has problems (src/data/design-data-gaps.json):\n${gapRegisterLoadIssues.join("\n")}`,
  );
export const gapRegister = registerData as GapRegister;

export function assessGaps(
  app: AnalysisInput,
  reference: AnalysisInput | undefined,
  findings: AnalysisFinding[],
  register: GapRegister = gapRegister,
  stale = false,
): GapResult[] {
  return register.gaps.map((gap) => {
    const freshness =
      gap.profile !== "reference-checkout" ||
      !reference ||
      reference.inventoryStatus === "unavailable" ||
      reference.errors.length ||
      app.errors.length
        ? "unavailable"
        : stale ||
            reference.source.revision !== gap.revision ||
            reference.source.dirty === true
          ? "stale"
          : "current";
    const counterpart = (expected: GapEntry["expected"][number]) => {
      const left = app.records.find((record) => record.id === expected.app);
      const right = reference?.records.find(
        (record) => record.id === expected.reference,
      );
      const sample = app.outputMetadata?.observations.find(
        (observation) => observation.recordId === expected.app,
      );
      const pair = findings.filter(
        (finding) =>
          finding.app?.id === expected.app &&
          finding.reference?.id === expected.reference,
      );
      return (
        !!left &&
        !!right &&
        !left.taxonomy?.issues.length &&
        !!sample &&
        ["generated-output", "authored-source-record"].includes(
          sample.origin,
        ) &&
        pair.length > 0 &&
        pair.every(
          (finding) =>
            finding.confidence !== "unassessable" &&
            ![
              "ambiguous",
              "unassessable",
              "invalid-input",
              "field-gap",
              "type-gap",
              "mode-gap",
              "platform-gap",
              "structure-difference",
            ].includes(finding.classification),
        )
      );
    };
    const represented = gap.expected.filter(counterpart).length;
    const criteria = gap.criteria.map((criterion) => ({
      id: criterion.id,
      passed:
        freshness === "current" &&
        (criterion.check === "manual"
          ? criterion.evidence.length > 0 &&
            criterion.reviewedRevision === gap.revision
          : represented === gap.expected.length &&
            gap.expected.length > 0 &&
            (criterion.check !== "value-parity" ||
              gap.expected.every((expected) =>
                findings.some(
                  (finding) =>
                    finding.app?.id === expected.app &&
                    finding.reference?.id === expected.reference &&
                    finding.classification === "equal",
                ),
              ))),
      evidence: criterion.evidence,
    }));
    const accepted =
      criteria.every((criterion) => criterion.passed) &&
      !gap.blockers.length &&
      ["not required", "accepted"].includes(gap.rfc.status);
    return {
      gap,
      dataset: app.source.kind,
      provisional: app.source.kind === "working",
      freshness,
      represented,
      denominator: gap.expected.length,
      criteria,
      disposition:
        freshness !== "current"
          ? "unassessable"
          : gap.disposition === "intentional difference"
            ? "intentional difference"
            : accepted
              ? "aligned"
              : represented || criteria.some((criterion) => criterion.passed)
                ? "partial"
                : "not assessed",
    };
  });
}
export function gapsMarkdown(results: GapResult[]): string {
  const text = (value: string) =>
    value.replaceAll("|", "\\|").replaceAll("\n", " ");
  return [
    "## Canonical gap register",
    "",
    "| Gap | Kind | Implementation | Alignment | RFC | Scope | Evidence freshness | Mapped / expected |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ...results.map(
      (result) =>
        `| ${result.gap.id}: ${text(result.gap.title)} | ${result.gap.kind} | ${result.gap.implementation} | ${result.disposition}${result.provisional ? " (provisional)" : ""} | ${result.gap.rfc.status} | ${text(result.gap.scope)} | ${result.freshness} | ${result.represented} / ${result.denominator} |`,
    ),
    "",
    "A zero denominator is not a passed content check. Manual architecture and RFC acceptance require recorded evidence; previews and unrelated records cannot close gaps.",
    ...results.flatMap((result) => [
      "",
      `### ${result.gap.id}`,
      `Profile: ${result.gap.profile} @ ${result.gap.revision}. Owner: ${result.gap.owner}. Direction: ${result.gap.direction}. Links: ${result.gap.links.join(", ")}.`,
      ...result.gap.criteria.map(
        (criterion) =>
          `- ${criterion.id}: ${criterion.description} (${result.criteria.find((item) => item.id === criterion.id)?.passed ? "passed" : "not accepted"}). Evidence: ${criterion.evidence.join(", ") || "none"}.`,
      ),
      `Blockers: ${result.gap.blockers.join("; ") || "none"}.`,
    ]),
  ].join("\n");
}
