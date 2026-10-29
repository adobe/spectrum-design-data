// Copyright 2026 Adobe. All rights reserved.
import type {
  FoundationImpactSummary,
  ImpactCategory,
  TokenImpactSummary,
} from "./model";
import { categoryLabel, type ImpactMetricRow } from "./metrics";
import type { ComponentImpactSummary } from "./componentImpact";

export type BarTone =
  | "orange"
  | "orangeSubtle"
  | "blue"
  | "seafoam"
  | "purple"
  | "yellow"
  | "magenta"
  | "cyan"
  | "indigo"
  | "red";

/** Chart-agnostic segment; fractions are shares of the whole bar. */
export interface BarSegment {
  id: string;
  label: string;
  fraction: number;
  tone: BarTone;
}

const CATEGORY_TONES: Record<ImpactCategory, BarTone> = {
  color: "orange",
  modes: "blue",
  logic: "orangeSubtle",
  registry: "cyan",
  typography: "seafoam",
  spacing: "purple",
  size: "yellow",
  radius: "magenta",
  elevation: "cyan",
  motion: "indigo",
  structures: "purple",
};

export function tokenImpactSegments(summary: TokenImpactSummary): BarSegment[] {
  return summary.tiers
    .filter((tier) => tier.affected.count > 0)
    .map((tier) => ({
      id: tier.tier,
      label: tier.tier === "primitive" ? "Primitive" : "Semantic",
      fraction: tier.affected.count / summary.affected.total,
      tone: tier.tier === "primitive" ? "orange" : "blue",
    }));
}

const COMPONENT_TONES: BarTone[] = [
  "magenta",
  "blue",
  "seafoam",
  "purple",
  "yellow",
  "cyan",
  "orange",
  "indigo",
  "red",
];

/** One segment per affected component; fractions use all assignments in all components, so they stack to the headline. */
export function componentImpactSegments(
  summary: ComponentImpactSummary,
): BarSegment[] {
  return summary.components.flatMap((component, index) =>
    component.affected.count > 0 && summary.affected.total > 0
      ? [
          {
            id: component.id,
            label: component.name,
            fraction: component.affected.count / summary.affected.total,
            tone: COMPONENT_TONES[index % COMPONENT_TONES.length]!,
          },
        ]
      : [],
  );
}

/** One row per component: its affected assignments out of its own assignments. */
export function componentImpactRows(
  summary: ComponentImpactSummary,
): ImpactMetricRow[] {
  return summary.components.map((component) => ({
    id: `component-${component.id}`,
    label: component.name,
    emphasis: "primary",
    ratio: component.affected,
    showPercent: true,
    groupStart: false,
  }));
}

export function foundationImpactSegments(
  summary: FoundationImpactSummary,
): BarSegment[] {
  return summary.categories
    .filter((category) => (category.affected.fraction ?? 0) > 0)
    .map((category) => ({
      id: category.category,
      label: categoryLabel(category.category),
      fraction: category.affected.fraction ?? 0,
      tone: CATEGORY_TONES[category.category],
    }));
}
