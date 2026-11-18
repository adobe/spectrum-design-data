// Copyright 2026 Adobe. All rights reserved.
import type { AnalysisInput } from "./comparison";
import {
  isDeprecatedInventoryToken,
  type TokenInventory,
  type TokenInventoryEntry,
} from "./tokenInventory";
import type { MatchedBy } from "./tokenPairing";

/**
 * Read-only identity report: which design-data IDs each Studio token would
 * take if the two adopted shared IDs. Stage 1 of the stable-identity RFC. It
 * proposes nothing for saving and approves no ID change.
 */
export type IdentityGroup =
  | "same-id"
  | "one-candidate"
  | "ambiguous"
  | "missing-mode"
  | "new";

export const identityGroups: readonly IdentityGroup[] = [
  "same-id",
  "one-candidate",
  "ambiguous",
  "missing-mode",
  "new",
];

export interface IdentityTarget {
  referenceId?: string;
  conceptId?: string;
  uuid?: string;
}

export interface IdentityReportItem {
  appId: string;
  label: string;
  family: string;
  group: IdentityGroup;
  matchedBy?: MatchedBy;
  targets: IdentityTarget[];
  note?: string;
}

interface SourceStamp {
  hash: string;
  revision: string;
}

export interface IdentityReport {
  sources: { app: SourceStamp; reference: SourceStamp };
  complete: boolean;
  items: IdentityReportItem[];
  counts: Record<string, Record<IdentityGroup, number>>;
}

const stamp = ({ source }: AnalysisInput): SourceStamp => ({
  hash: source.hash,
  revision: source.revision,
});

const inScope = (entry: TokenInventoryEntry) =>
  entry.record.category === "tokens" &&
  !isDeprecatedInventoryToken(entry.record);

export function buildIdentityReport(
  inventory: TokenInventory,
  app: AnalysisInput,
  reference: AnalysisInput,
): IdentityReport {
  const references = new Map(
    inventory.entries
      .filter((entry) => entry.side === "reference")
      .map((entry) => [entry.record.id, entry]),
  );
  const target = (id: string): IdentityTarget => {
    const record = references.get(id)?.record;
    return {
      referenceId: id,
      conceptId: record?.conceptId,
      uuid: record?.identity,
    };
  };
  const appEntries = inventory.entries.filter(
    (entry) => entry.side === "app" && inScope(entry),
  );
  // Design-data concepts already paired with each Studio concept, for rows
  // whose own mode has no design-data row.
  const pairedConcepts = new Map<string, Set<string>>();
  for (const entry of appEntries)
    if (entry.presence === "matched" && entry.record.conceptId)
      for (const id of entry.counterparts) {
        const conceptId = references.get(id)?.record.conceptId;
        if (!conceptId) continue;
        const set = pairedConcepts.get(entry.record.conceptId) ?? new Set();
        set.add(conceptId);
        pairedConcepts.set(entry.record.conceptId, set);
      }
  const items = appEntries.flatMap((entry): IdentityReportItem[] => {
    const base = {
      appId: entry.record.id,
      label: entry.label,
      family: entry.type ?? "unclassified",
      ...(entry.matchedBy && { matchedBy: entry.matchedBy }),
    };
    if (entry.presence === "unconfirmed") return [];
    if (entry.presence === "ambiguous")
      return [
        {
          ...base,
          group: "ambiguous",
          targets: entry.counterparts.map(target),
          note: "Several design-data tokens could match; review before adopting an ID.",
        },
      ];
    if (entry.presence === "matched") {
      const targets = entry.counterparts.map(target);
      if (entry.idStatus === "same")
        return [{ ...base, group: "same-id", targets }];
      const shared = entry.counterparts.some(
        (id) => (references.get(id)?.counterparts.length ?? 0) > 1,
      );
      if (targets.length === 1 && !shared)
        return [{ ...base, group: "one-candidate", targets }];
      return [
        {
          ...base,
          group: "missing-mode",
          targets,
          note: shared
            ? "Design-data uses one row for several Studio modes; it has no separate row to adopt for this mode."
            : "Studio uses one row for several design-data modes.",
        },
      ];
    }
    const siblings = entry.record.conceptId
      ? pairedConcepts.get(entry.record.conceptId)
      : undefined;
    if (siblings?.size)
      return [
        {
          ...base,
          group: "missing-mode",
          targets: [...siblings].sort().map((conceptId) => ({ conceptId })),
          note: "Design-data has this token but no row for this mode.",
        },
      ];
    return [{ ...base, group: "new", targets: [] }];
  });
  const counts: IdentityReport["counts"] = {};
  for (const item of items) {
    counts[item.family] ??= Object.fromEntries(
      identityGroups.map((group) => [group, 0]),
    ) as Record<IdentityGroup, number>;
    counts[item.family][item.group] += 1;
  }
  return {
    sources: { app: stamp(app), reference: stamp(reference) },
    complete:
      inventory.status.app === "complete" &&
      inventory.status.reference === "complete",
    items,
    counts,
  };
}

/** A report is only valid for the exact inputs it was built from. */
export function isIdentityReportCurrent(
  report: IdentityReport,
  app: AnalysisInput,
  reference: AnalysisInput,
): boolean {
  return (["app", "reference"] as const).every((side) => {
    const now = stamp(side === "app" ? app : reference);
    const then = report.sources[side];
    return now.hash === then.hash && now.revision === then.revision;
  });
}

export function identityReportSummary(report: IdentityReport): string[] {
  return [
    `Identity report (read-only): design-data ${report.sources.reference.revision} ${report.sources.reference.hash}; Studio ${report.sources.app.hash}${report.complete ? "" : "; inventory incomplete"}`,
    `family: ${identityGroups.join(" / ")}`,
    ...Object.keys(report.counts)
      .sort()
      .map(
        (family) =>
          `${family}: ${identityGroups.map((group) => report.counts[family][group]).join(" / ")}`,
      ),
  ];
}
