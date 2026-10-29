// Copyright 2026 Adobe. All rights reserved.
import { FOUNDATIONS } from "../modes/parameters";
import type {
  FoundationImpactSummary,
  ImpactCategory,
  Ratio,
  TierImpactSummary,
  TokenImpactSummary,
  TokenTier,
} from "./model";

export type MetricVisibility = "always" | "whenNonZero" | "planned";

export interface ImpactMetricRow {
  id: string;
  label: string;
  emphasis: "primary" | "detail";
  ratio: Ratio;
  showPercent: boolean;
  /** Starts a new visual group of rows. */
  groupStart: boolean;
}

export interface ImpactMetricDefinition<S> {
  id: string;
  visibility: MetricVisibility;
  rows: (summary: S) => Omit<ImpactMetricRow, "groupStart">[];
}

interface TierDefinition {
  label: string;
  valuesLabel: string;
  /** Semantic reference changes are planned; enable once aliases can be retargeted. */
  showReferences: boolean;
}

const TIERS: Record<TokenTier, TierDefinition> = {
  primitive: {
    label: "Primitive",
    valuesLabel: "values changed",
    showReferences: false,
  },
  semantic: {
    label: "Semantic",
    valuesLabel: "resolved values changed",
    showReferences: true,
  },
};

export function categoryLabel(category: ImpactCategory) {
  if (category === "modes") return "Mode-related";
  if (category === "logic") return "Rule";
  if (category === "registry") return "Registry";
  if (category === "structures") return "Structure";
  return (
    FOUNDATIONS.find((foundation) => foundation.id === category)?.label ??
    category
  );
}

function tierRows(
  tier: TierImpactSummary,
): Omit<ImpactMetricRow, "groupStart">[] {
  const definition = TIERS[tier.tier];
  return [
    {
      id: `${tier.tier}-affected`,
      label: `${definition.label} tokens affected`,
      emphasis: "primary",
      ratio: tier.affected,
      showPercent: true,
    },
    ...(definition.showReferences
      ? [
          {
            id: `${tier.tier}-references`,
            label: `${definition.label} references changed`,
            emphasis: "detail" as const,
            ratio: tier.referencesChanged,
            showPercent: true,
          },
        ]
      : []),
    {
      id: `${tier.tier}-values`,
      label: `${definition.label} ${definition.valuesLabel}`,
      emphasis: "detail",
      ratio: tier.valuesChanged,
      showPercent: true,
    },
  ];
}

/** Ordered list of token-impact metrics; each definition expands to rows for whatever the summary contains. */
export const TOKEN_IMPACT_METRICS: readonly ImpactMetricDefinition<TokenImpactSummary>[] =
  [
    ...(["primitive", "semantic"] as const).map(
      (tier): ImpactMetricDefinition<TokenImpactSummary> => ({
        id: `tier-${tier}`,
        visibility: "always",
        rows: (summary) =>
          summary.tiers
            .filter((candidate) => candidate.tier === tier)
            .flatMap(tierRows),
      }),
    ),
    {
      id: "categories",
      visibility: "whenNonZero",
      rows: (summary) =>
        summary.categories.map((category) => ({
          id: `category-${category.category}`,
          label: `${categoryLabel(category.category)} tokens affected`,
          emphasis: "detail",
          ratio: category.affected,
          showPercent: true,
        })),
    },
    {
      id: "manual-overrides",
      visibility: "always",
      rows: (summary) => [
        {
          id: "manual-overrides",
          label: "Manual token overrides",
          emphasis: "detail",
          ratio: summary.manualOverrides,
          showPercent: true,
        },
      ],
    },
  ];

export const FOUNDATION_IMPACT_METRICS: readonly ImpactMetricDefinition<FoundationImpactSummary>[] =
  [
    {
      id: "categories",
      visibility: "whenNonZero",
      rows: (summary) =>
        summary.categories.map((category) => ({
          id: `foundation-${category.category}`,
          label: `${categoryLabel(category.category)} edits`,
          emphasis: "primary",
          ratio: category.affected,
          showPercent: false,
        })),
    },
  ];

export function visibleMetricRows<S>(
  definitions: readonly ImpactMetricDefinition<S>[],
  summary: S,
): ImpactMetricRow[] {
  return definitions.flatMap((definition) => {
    if (definition.visibility === "planned") return [];
    const rows = definition
      .rows(summary)
      .filter(
        (row) => definition.visibility !== "whenNonZero" || row.ratio.count > 0,
      );
    return rows.map((row, index) => ({ ...row, groupStart: index === 0 }));
  });
}
