// Copyright 2026 Adobe. All rights reserved.
import type { AuthoredSlot, OverviewId } from "../changelog/registry";
import { FOUNDATION_LABELS } from "../changelog/registry";
import type { Ratio } from "./model";
import { ratio } from "./summaries";
import type { BarSegment, BarTone } from "./segments";
import type { ImpactMetricRow } from "./metrics";

const SYSTEM_CATEGORIES: Record<string, { label: string; tone: BarTone }> = {
  foundations: { label: "Foundations", tone: "orange" },
  registry: { label: "Registry", tone: "cyan" },
  formulas: { label: "Formulas and interpolations", tone: "purple" },
  rules: { label: "Rules", tone: "blue" },
  modes: { label: "Modes", tone: "seafoam" },
  platforms: { label: "Platforms", tone: "indigo" },
  structures: { label: "Design", tone: "yellow" },
  components: { label: "Components", tone: "magenta" },
  "token-authoring": { label: "Token authoring", tone: "red" },
};
const FOUNDATION_TONES: BarTone[] = [
  "orange",
  "seafoam",
  "purple",
  "yellow",
  "magenta",
  "cyan",
];
export interface AuthoredImpactSummary {
  headline: Ratio;
  segments: BarSegment[];
  rows: ImpactMetricRow[];
  manualOverrides: number;
}
export function summarizeAuthoredImpact(
  slots: readonly AuthoredSlot[],
  section: OverviewId,
): AuthoredImpactSummary {
  const inventory = slots.filter(
    (slot) =>
      section === "system" ||
      (section === "foundations" && slot.foundation) ||
      section === slot.overview,
  );
  const groups = new Map<string, AuthoredSlot[]>();
  for (const slot of inventory) {
    const category =
      section === "foundations"
        ? slot.foundation!
        : section === "system"
          ? slot.category === "interpolations"
            ? "formulas"
            : slot.category === "aliases" || slot.category === "token-edits"
              ? "token-authoring"
              : slot.foundation && slot.category !== "modes"
                ? "foundations"
                : slot.category
          : slot.category;
    groups.set(category, [...(groups.get(category) ?? []), slot]);
  }
  const headline = ratio(
    inventory.filter((slot) => slot.changed).length,
    inventory.length,
  );
  const rows: ImpactMetricRow[] = [],
    segments: BarSegment[] = [];
  for (const [index, [category, records]] of [...groups].entries()) {
    const count = records.filter((slot) => slot.changed).length;
    const name =
      section === "foundations"
        ? (FOUNDATION_LABELS[category] ?? category)
        : (SYSTEM_CATEGORIES[category]?.label ?? category);
    rows.push({
      id: `${section}-${category}`,
      label: `${name} values changed`,
      emphasis: "primary",
      ratio: ratio(count, records.length),
      showPercent: true,
      groupStart: false,
    });
    if (count)
      segments.push({
        id: category,
        label: name,
        fraction: count / inventory.length,
        tone:
          section === "foundations"
            ? FOUNDATION_TONES[index % FOUNDATION_TONES.length]
            : (SYSTEM_CATEGORIES[category]?.tone ?? "blue"),
      });
  }
  return {
    headline,
    rows,
    segments,
    manualOverrides: inventory.reduce(
      (count, slot) => count + (slot.manualCount ?? (slot.manual ? 1 : 0)),
      0,
    ),
  };
}
