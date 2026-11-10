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
    { rows: Set<string>; counterparts: Set<string> }
  >();
  const key = (side: string, id: string) => JSON.stringify([side, id]);
  for (const finding of findings) {
    if (
      !finding.app ||
      !finding.reference ||
      finding.classification === "ambiguous" ||
      finding.confidence === "unassessable"
    )
      continue;
    for (const side of ["app", "reference"] as const) {
      const record = finding[side]!;
      const other = side === "app" ? finding.reference : finding.app;
      const id = key(side, record.id);
      const link = links.get(id) ?? {
        rows: new Set<string>(),
        counterparts: new Set<string>(),
      };
      link.counterparts.add(other.id);
      links.set(id, link);
    }
  }
  for (const concept of concepts)
    for (const row of concept.rows)
      for (const side of ["app", "reference"] as const) {
        const record = row[side];
        if (!record) continue;
        const id = key(side, record.id);
        const link = links.get(id) ?? {
          rows: new Set<string>(),
          counterparts: new Set<string>(),
        };
        link.rows.add(row.id);
        const other = side === "app" ? row.reference : row.app;
        if (other) link.counterparts.add(other.id);
        links.set(id, link);
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
        return {
          id: `${key(side, record.id)}:${occurrence}`,
          side,
          record,
          label: inventoryTokenLabel(record),
          type,
          presence:
            counterparts.length > 1 || ambiguous.has(key(side, record.id))
              ? "ambiguous"
              : counterparts.length
                ? "matched"
                : !complete
                  ? "unconfirmed"
                  : side === "app"
                    ? "app-only"
                    : "reference-only",
          requiredRowIds: [...(link?.rows ?? [])].sort(),
          counterparts,
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
    issues: [...app.errors, ...reference.errors, ...issues],
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
