// Copyright 2026 Adobe. All rights reserved.
import type { ChangeItem } from "../../features/changelog/changes";
import { termLabel } from "../../features/taxonomy/termPresentation";
import type {
  ColorOpacityConcept,
  ColorOpacityRow,
} from "../../features/design-data/colorOpacityAssessment";
import { normalizedOpacity } from "../../features/design-data/colorOpacityAssessment";
import { fieldLabel, paletteDifferenceFields } from "./palettePresentation";
import type { ModeCoverage } from "../../features/design-data/modeCoverage";
import {
  matchesModeSelection,
  type ModeSelection,
} from "../../features/design-data/modeResults";

export function modeCoverageRows(coverage: ModeCoverage) {
  return coverage.sets
    .filter((set) => set.reference || set.result === "unassessable")
    .flatMap((set) => {
      const label = fieldLabel(set.reference?.key ?? set.app?.key ?? "Unknown");
      const defaults =
        set.app &&
        set.reference &&
        set.modes.some(
          (mode) =>
            mode.reference === set.reference?.default &&
            mode.app &&
            mode.app !== set.app?.default,
        )
          ? ` Defaults differ: app ${set.app.default}; design data ${set.reference.default}.`
          : "";
      return !set.app || set.issues.length
        ? [
            {
              id: set.id,
              label,
              mode: "Entire mode set",
              result: set.result,
              evidence: [...set.issues, set.evidence].join(" "),
            },
          ]
        : set.modes
            .filter((mode) => mode.reference)
            .map((mode) => ({
              id: mode.id,
              label,
              mode: termLabel(mode.reference ?? ""),
              result: mode.result,
              evidence: `${mode.reason} ${set.evidence}${defaults}`,
            }));
    });
}

export const valueBadgeVariant = {
  pass: "positive",
  acceptable: "orange",
  fail: "negative",
  unassessable: "neutral",
} as const;

/** Paint for one half of the adjacent comparison swatch; undefined when unavailable. */
export function comparisonPaint(
  value: unknown,
  type: "color" | "opacity",
): { color: string } | { alpha: number } | undefined {
  if (type === "opacity") {
    const alpha = normalizedOpacity(value);
    return alpha === undefined ? undefined : { alpha };
  }
  return typeof value === "string" && value.trim()
    ? { color: value }
    : undefined;
}
export interface ColorOpacityTreeRow {
  id: string;
  label: string;
  concept: ColorOpacityConcept;
  value?: ColorOpacityRow;
  children: ColorOpacityTreeRow[];
}
export function colorOpacityTree(
  concepts: readonly ColorOpacityConcept[],
  query: string,
  verdict: string,
  modes: ModeSelection = {},
  valueResult = "all",
): ColorOpacityTreeRow[] {
  const search = query.trim().toLowerCase();
  return concepts
    .filter(
      (concept) =>
        (verdict === "all" || concept.verdict === verdict) &&
        (!search ||
          `${concept.label} ${concept.family ?? ""} ${concept.type} ${concept.rows
            .map((row) =>
              [
                row.app?.name,
                row.reference.name,
                JSON.stringify(row.app?.structuredName),
                JSON.stringify(row.reference.structuredName),
              ].join(" "),
            )
            .join(" ")}`
            .toLowerCase()
            .includes(search)),
    )
    .map((concept) => ({
      id: `token:${concept.id}`,
      label: [
        concept.label,
        ...new Set(
          concept.rows.flatMap((row) =>
            row.app && row.app.name !== concept.label ? [row.app.name] : [],
          ),
        ),
      ].join(" / "),
      concept,
      children: concept.rows
        .filter(
          (value) =>
            matchesModeSelection(value.context, modes) &&
            (valueResult === "all" || value.verdict === valueResult),
        )
        .map((value) => ({
          id: `mode:${value.id}`,
          label:
            Object.entries(value.context)
              .map(([axis, mode]) => `${fieldLabel(axis)}: ${termLabel(mode)}`)
              .join(", ") || "All modes",
          concept,
          value,
          children: [],
        })),
    }))
    .filter(
      (row) =>
        row.children.length > 0 ||
        (valueResult === "all" && Object.keys(modes).length === 0),
    );
}
export function colorOpacityClassificationChanges(
  concept: ColorOpacityConcept,
): ChangeItem {
  return {
    id: `${concept.id}:classifications`,
    title: concept.label,
    topic: "tokens",
    sourceKind: "token",
    kind: "modified",
    fields: concept.differences.flatMap((difference) =>
      paletteDifferenceFields({
        ...difference,
        appField: difference.field,
      }),
    ),
  };
}
