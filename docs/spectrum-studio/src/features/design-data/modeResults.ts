// Copyright 2026 Adobe. All rights reserved.
import { canonicalJson } from "./canonicalJson";

export type ModeResult = "pass" | "acceptable" | "fail" | "unassessable";
export type ModeSelection = Readonly<Record<string, string | null>>;
export interface ModeResultRow {
  id: string;
  context: Readonly<Record<string, string>>;
  verdict: ModeResult;
}
export interface ModeResultConcept {
  id: string;
  rows: readonly ModeResultRow[];
}
export interface ModeResultSummary {
  id: string;
  axis: string;
  mode: string | null;
  tokens: number;
  values: number;
  counts: Record<ModeResult, number>;
  alignedPercent: number | null;
}

export function matchesModeSelection(
  context: Readonly<Record<string, string>>,
  selection: ModeSelection,
): boolean {
  return Object.entries(selection).every(
    ([axis, mode]) => (context[axis] ?? null) === mode,
  );
}

/** Counts required values, never parent verdicts or app-only enhancements. */
export function summarizeModeResults(
  concepts: readonly ModeResultConcept[],
  assessable = true,
): ModeResultSummary[] {
  const axes = [
    ...new Set(
      concepts.flatMap((concept) =>
        concept.rows.flatMap((row) => Object.keys(row.context)),
      ),
    ),
  ].sort();
  const groups = new Map<
    string,
    { summary: ModeResultSummary; tokens: Set<string>; rows: Set<string> }
  >();
  for (const concept of concepts) {
    for (const row of concept.rows) {
      for (const axis of axes) {
        const mode = row.context[axis] ?? null;
        const id = canonicalJson([axis, mode]);
        let group = groups.get(id);
        if (!group) {
          group = {
            summary: {
              id,
              axis,
              mode,
              tokens: 0,
              values: 0,
              counts: { pass: 0, acceptable: 0, fail: 0, unassessable: 0 },
              alignedPercent: null,
            },
            tokens: new Set(),
            rows: new Set(),
          };
          groups.set(id, group);
        }
        const rowKey = canonicalJson([concept.id, row.id]);
        if (group.rows.has(rowKey)) continue;
        group.rows.add(rowKey);
        group.tokens.add(concept.id);
        group.summary.counts[assessable ? row.verdict : "unassessable"]++;
        group.summary.values++;
        group.summary.tokens = group.tokens.size;
      }
    }
  }
  return [...groups.values()]
    .map(({ summary }) => ({
      ...summary,
      alignedPercent:
        summary.values && summary.counts.unassessable !== summary.values
          ? (100 * (summary.counts.pass + summary.counts.acceptable)) /
            summary.values
          : null,
    }))
    .sort(
      (a, b) =>
        a.axis.localeCompare(b.axis) ||
        (a.mode ?? "").localeCompare(b.mode ?? ""),
    );
}

export function modeResultsMarkdown(
  summaries: readonly ModeResultSummary[],
): string {
  const cell = (value: string) =>
    value.replaceAll("|", "\\|").replaceAll("\n", " ");
  return [
    "### Results by mode",
    "",
    "Counts describe required mode values, not whole-token verdicts. A value appears once for each axis in its context; do not add counts across axes. Values without an axis are kept separate, not assumed to be its default.",
    "",
    "| Mode set | Mode | Tokens | Required values | Pass | Acceptable | Fail | Unable to evaluate | Pass or acceptable |",
    "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...summaries.map(
      (row) =>
        `| ${cell(row.axis)} | ${cell(row.mode ?? "Not mode-specific")} | ${row.tokens} | ${row.values} | ${row.counts.pass} | ${row.counts.acceptable} | ${row.counts.fail} | ${row.counts.unassessable} | ${row.alignedPercent === null ? "Unavailable" : `${row.alignedPercent.toFixed(1)}%`} |`,
    ),
    "",
  ].join("\n");
}
