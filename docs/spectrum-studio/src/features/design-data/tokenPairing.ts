// Copyright 2026 Adobe. All rights reserved.
import type { AnalysisRecord } from "./comparison";
import { toComparisonName } from "./taxonomyCrosswalk";

/**
 * Shared token pairing rules for migration analysis. Both matchers
 * (`compareDesignData` and `assessColorsAndOpacities`) use these, so a token
 * pairs the same way everywhere. App names go through the taxonomy crosswalk
 * here and nowhere else in the analysis; design-data names are used as-is.
 */
export type PairingSide = "app" | "reference";

/** How a pair was found, strongest first. Names never establish identity. */
export type MatchedBy = "id" | "concept" | "reviewed" | "name";

/** Whether a paired Studio token already carries design-data's row UUID. */
export type IdStatus = "same" | "differs";

export function comparisonName(
  record: AnalysisRecord,
  side: PairingSide,
  vocabulary: readonly AnalysisRecord[],
  axes: readonly string[],
): Record<string, unknown> {
  const name = record.structuredName ?? {};
  const translated =
    side === "app"
      ? toComparisonName(name, { tokenType: record.tokenType })
      : name;
  return Object.fromEntries(
    Object.entries(translated)
      .filter(([key]) => !axes.includes(key) && key !== "legacyKey")
      .map(([key, value]) => {
        if (typeof value === "string") {
          const candidates = vocabulary.filter((entry) => {
            const term = entry.value as Record<string, unknown>;
            return term.id === value || term.label === value;
          });
          if (candidates.length === 1)
            value = (candidates[0].value as Record<string, unknown>).id;
        }
        return [key, Array.isArray(value) ? [...value].sort() : value];
      }),
  );
}

export function matchedBy(
  app: AnalysisRecord,
  reference: AnalysisRecord,
  reviewed = false,
): MatchedBy {
  if (app.identity !== undefined && app.identity === reference.identity)
    return "id";
  if (app.conceptId && app.conceptId === reference.conceptId) return "concept";
  return reviewed ? "reviewed" : "name";
}

export function idStatus(
  app: AnalysisRecord,
  reference: AnalysisRecord,
): IdStatus {
  return app.identity !== undefined && app.identity === reference.identity
    ? "same"
    : "differs";
}
