// Copyright 2026 Adobe. All rights reserved.
import type {
  AnalysisFinding,
  AnalysisInput,
  AnalysisRecord,
} from "./comparison";
import type { InventoryStatus } from "./coverage";
import type {
  ColorOpacityConcept,
  ValueContext,
} from "./colorOpacityAssessment";
import {
  foundationValueType,
  type FoundationValueType,
} from "./foundationValues";
import { canonicalJson } from "./canonicalJson";
import {
  idStatus,
  matchedBy,
  type IdStatus,
  type MatchedBy,
} from "./tokenPairing";

export const isInventoryToken = (record: AnalysisRecord) =>
  record.category === "tokens" || record.category === "compatibility-aliases";

export const isDeprecatedInventoryToken = (record: AnalysisRecord) =>
  Boolean(record.lifecycle?.deprecatedIn) ||
  record.tokenStatus === "deprecated";

export function unavailableTokenReference(reason: string): AnalysisInput {
  return {
    source: {
      kind: "reference",
      hash: "unavailable",
      revision: "unavailable",
      root: "unavailable",
      version: "unavailable",
      validator: "unavailable",
      dirty: null,
    },
    records: [],
    categories: [],
    schemas: [],
    inventoryStatus: "unavailable",
    errors: [reason],
    limitations: ["Reference absence and value agreement cannot be assessed."],
  };
}

export function inventoryTokenLabel(record: AnalysisRecord): string {
  const legacy = record.structuredName?.legacyKey;
  return record.name.startsWith("{") && typeof legacy === "string"
    ? legacy
    : record.name;
}

export interface TokenInventoryEntry {
  id: string;
  side: "app" | "reference";
  record: AnalysisRecord;
  label: string;
  type?: FoundationValueType;
  presence:
    | "matched"
    | "app-only"
    | "reference-only"
    | "unconfirmed"
    | "ambiguous";
  requiredRowIds: string[];
  counterparts: string[];
  /** How the pair was found, when every counterpart agrees. Names never establish identity. */
  matchedBy?: MatchedBy;
  /** Whether the Studio token already uses design-data's row UUID, when every counterpart agrees. */
  idStatus?: IdStatus;
  reason?: string;
  values: { context: ValueContext; value: unknown; issue: string | null }[];
}

export interface TokenInventory {
  entries: TokenInventoryEntry[];
  status: { app: InventoryStatus; reference: InventoryStatus | "stale" };
  exclusions: { source: string; reason: string }[];
  issues: string[];
}

export function buildTokenInventory(
  app: AnalysisInput,
  reference: AnalysisInput,
  concepts: readonly ColorOpacityConcept[],
  resolve: (
    record: AnalysisRecord,
    input: AnalysisInput,
  ) => TokenInventoryEntry["values"],
  findings: readonly AnalysisFinding[] = [],
): TokenInventory {
  const links = new Map<
    string,
    {
      rows: Set<string>;
      counterparts: Set<string>;
      // Counterparts paired through a mode row, and the concepts of those rows.
      byMode: Set<string>;
      concepts: Set<string>;
    }
  >();
  const link = (id: string) => {
    const existing = links.get(id);
    if (existing) return existing;
    const created = {
      rows: new Set<string>(),
      counterparts: new Set<string>(),
      byMode: new Set<string>(),
      concepts: new Set<string>(),
    };
    links.set(id, created);
    return created;
  };
  const key = (side: string, id: string) => JSON.stringify([side, id]);
  const reviewed = new Set<string>();
  for (const finding of findings) {
    if (
      !finding.app ||
      !finding.reference ||
      finding.classification === "ambiguous" ||
      finding.confidence === "unassessable"
    )
      continue;
    if (finding.confidence === "reviewed-mapping")
      reviewed.add(key(finding.app.id, finding.reference.id));
    for (const side of ["app", "reference"] as const) {
      const record = finding[side]!;
      const other = side === "app" ? finding.reference : finding.app;
      link(key(side, record.id)).counterparts.add(other.id);
    }
  }
  for (const concept of concepts)
    for (const row of concept.rows)
      for (const side of ["app", "reference"] as const) {
        const record = row[side];
        if (!record) continue;
        const entry = link(key(side, record.id));
        entry.rows.add(row.id);
        const other = side === "app" ? row.reference : row.app;
        if (!other) continue;
        entry.counterparts.add(other.id);
        entry.byMode.add(other.id);
        entry.concepts.add(concept.id);
      }
  const complete = [app, reference].every(
    (input) => input.inventoryStatus === "complete" && !input.errors.length,
  );
  const ambiguous = new Set(
    concepts.flatMap((concept) =>
      concept.rows.flatMap((row) =>
        (row.candidateIds?.length ?? 0) > 1
          ? [
              key("reference", row.reference.id),
              ...row.candidateIds!.map((id) => key("app", id)),
            ]
          : [],
      ),
    ),
  );
  const issues: string[] = [];
  const recordsById = (input: AnalysisInput) => {
    const byId = new Map<string, AnalysisRecord>();
    for (const record of input.records)
      if (isInventoryToken(record) && !byId.has(record.id))
        byId.set(record.id, record);
    return byId;
  };
  const sides = { app: recordsById(app), reference: recordsById(reference) };
  const pairing = (
    side: "app" | "reference",
    record: AnalysisRecord,
    counterparts: string[],
  ) => {
    const results = counterparts.map((id) => {
      const other = sides[side === "app" ? "reference" : "app"].get(id);
      if (!other) return undefined;
      const [left, right] = side === "app" ? [record, other] : [other, record];
      return {
        matchedBy: matchedBy(left, right, reviewed.has(key(left.id, right.id))),
        idStatus: idStatus(left, right),
      };
    });
    const [first] = results;
    return first &&
      results.every(
        (result) =>
          result?.matchedBy === first.matchedBy &&
          result.idStatus === first.idStatus,
      )
      ? first
      : {};
  };
  // One record paired with several counterparts is still a single match when
  // every pairing is a mode row of the same color concept, such as a
  // mode-independent alias compared with per-mode rows.
  const modeFanOut = (
    link:
      | {
          counterparts: Set<string>;
          byMode: Set<string>;
          concepts: Set<string>;
        }
      | undefined,
  ) =>
    !!link &&
    link.concepts.size === 1 &&
    [...link.counterparts].every((id) => link.byMode.has(id));
  const entries = (["app", "reference"] as const).flatMap((side) => {
    const input = side === "app" ? app : reference;
    const seen = new Map<string, number>();
    return input.records
      .filter(isInventoryToken)
      .sort(
        (left, right) =>
          left.id.localeCompare(right.id, "en") ||
          canonicalJson(left).localeCompare(canonicalJson(right), "en"),
      )
      .map((record): TokenInventoryEntry => {
        const occurrence = seen.get(record.id) ?? 0;
        if (occurrence > 0)
          issues.push(`${side}: duplicate token record ID ${record.id}.`);
        seen.set(record.id, occurrence + 1);
        const link = links.get(key(side, record.id));
        const type = foundationValueType(record);
        const counterparts = [...(link?.counterparts ?? [])].sort();
        const presence: TokenInventoryEntry["presence"] =
          ambiguous.has(key(side, record.id)) ||
          (counterparts.length > 1 && !modeFanOut(link))
            ? "ambiguous"
            : counterparts.length
              ? "matched"
              : !complete
                ? "unconfirmed"
                : side === "app"
                  ? "app-only"
                  : "reference-only";
        return {
          id: `${key(side, record.id)}:${occurrence}`,
          side,
          record,
          label: inventoryTokenLabel(record),
          type,
          presence,
          requiredRowIds: [...(link?.rows ?? [])].sort(),
          counterparts,
          ...(presence === "matched"
            ? pairing(side, record, counterparts)
            : {}),
          reason: isDeprecatedInventoryToken(record)
            ? `${record.lifecycle?.deprecatedIn ? `Deprecated in ${record.lifecycle.deprecatedIn}` : "Pending deprecation"}; excluded from migration scoring.`
            : record.category === "compatibility-aliases"
              ? "Compatibility alias; excluded from migration scoring."
              : !type
                ? "Unclassified token; comparison is not supported."
                : !link?.rows.size
                  ? "No required comparison value; excluded from migration scoring."
                  : undefined,
          values: resolve(record, input),
        };
      });
  });
  return {
    entries,
    status: {
      app:
        app.errors.length && app.inventoryStatus === "complete"
          ? "partial"
          : (app.inventoryStatus ?? "unavailable"),
      reference:
        reference.errors.length && reference.inventoryStatus === "complete"
          ? "partial"
          : (reference.inventoryStatus ?? "unavailable"),
    },
    exclusions: [
      ...(app.inventoryExclusions ?? []),
      ...(reference.inventoryExclusions ?? []),
    ],
    issues: [
      ...app.errors,
      ...reference.errors,
      ...(app.outputIssues ?? []).map((issue) => issue.message),
      ...issues,
    ],
  };
}

export function tokenInventoryMarkdown(inventory: TokenInventory): string {
  const cell = (value: unknown) =>
    String(value ?? "Unavailable")
      .replaceAll("|", "\\|")
      .replaceAll("\n", " ");
  return [
    "### Complete token inventory",
    "",
    `App inventory: ${inventory.status.app}. Design-data inventory: ${inventory.status.reference}. Inventory rows are not migration requirements.`,
    "",
    "| Source | Token | Record ID | Presence | Context | Value | Notes |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...inventory.entries.flatMap((entry) =>
      entry.values.map(
        (value) =>
          `| ${entry.side} | ${cell(entry.label)} | ${cell(entry.record.id)} | ${entry.presence} | ${cell(canonicalJson(value.context))} | ${cell(canonicalJson(value.value))} | ${cell([entry.reason, value.issue].filter(Boolean).join(" "))} |`,
      ),
    ),
    ...inventory.exclusions.map(
      (item) => `- Excluded source ${cell(item.source)}: ${cell(item.reason)}`,
    ),
    ...inventory.issues.map((issue) => `- Inventory issue: ${cell(issue)}`),
  ].join("\n");
}
