// Copyright 2026 Adobe. All rights reserved.
import type { FoundationId } from "../modes/parameters";
import type { PlatformDivergenceCell, SystemInsights } from "./model";

const DIVERGENCE_TOTALS: Record<FoundationId, number> = {
  color: 278,
  typography: 55,
  spacing: 64,
  size: 53,
  radius: 23,
  elevation: 22,
  motion: 20,
  opacity: 17,
};

// Overridden token counts per platform, in DIVERGENCE_TOTALS foundation order.
const DIVERGENCE_OVERRIDES: Record<string, number[]> = {
  react: [4, 0, 1, 0, 0, 0, 0, 0],
  "web-components": [6, 1, 2, 1, 0, 1, 0, 0],
  ios: [31, 21, 12, 9, 4, 8, 6, 0],
  android: [24, 14, 9, 11, 2, 10, 5, 0],
  drover: [12, 3, 4, 2, 1, 2, 1, 0],
  qt: [40, 9, 15, 14, 6, 7, 9, 0],
};

const divergenceCells: PlatformDivergenceCell[] = Object.entries(
  DIVERGENCE_OVERRIDES,
).flatMap(([platformId, counts]) =>
  (Object.keys(DIVERGENCE_TOTALS) as FoundationId[]).map(
    (foundationId, index) => ({
      platformId,
      foundationId,
      overriddenCount: counts[index],
      totalCount: DIVERGENCE_TOTALS[foundationId],
    }),
  ),
);

export const SAMPLE_SYSTEM_INSIGHTS: SystemInsights = {
  pillars: [
    {
      id: "systematicity",
      label: "Systematicity",
      score: 0.91,
      previousScore: 0.88,
      summary: "468 of 515 values come from formulas or rules",
    },
    {
      id: "accessibility",
      label: "Accessibility",
      score: 0.98,
      previousScore: 0.99,
      summary: "40 contrast pairs fail across 6 mode combinations",
    },
    {
      id: "consistency",
      label: "Platform consistency",
      score: 0.9,
      previousScore: 0.93,
      summary: "307 platform overrides; QT and iOS diverge most",
    },
    {
      id: "adaptivity",
      label: "Adaptivity",
      score: 0.57,
      previousScore: 0.43,
      summary: "4 of 7 foundations expose user-adjustable parameters",
    },
    {
      id: "conformance",
      label: "Spec conformance",
      score: 0.88,
      previousScore: 0.81,
      summary: "52 of 59 design-data spec rules pass",
    },
  ],
  attention: [
    {
      id: "a11y-dark-high",
      severity: "critical",
      title: "9 contrast pairs fail in Dark · High",
      impact: "Text on accent and informative backgrounds drops below 7:1",
      pillarId: "accessibility",
      foundationId: "color",
      suggestedAction: "Review the failing pairs in Color evaluation",
    },
    {
      id: "promote-accent-background",
      severity: "warning",
      title:
        "accent-background-color-default is overridden on 4 of 6 platforms",
      impact: "Platforms agree with each other but not with the foundation",
      pillarId: "consistency",
      foundationId: "color",
      suggestedAction: "Promote the shared value to the foundation",
    },
    {
      id: "stale-color-overrides",
      severity: "warning",
      title: "7 stale overrides in Color",
      impact: "Their generated values changed after they were overridden",
      pillarId: "systematicity",
      foundationId: "color",
      suggestedAction: "Review stale overrides",
    },
    {
      id: "spec-rules",
      severity: "info",
      title: "7 design-data spec rules fail",
      impact: "Mostly missing mode-set coverage on spacing tokens",
      pillarId: "conformance",
      foundationId: "spacing",
      suggestedAction: "Run spec validation and fix coverage gaps",
    },
  ],
  divergence: {
    cells: divergenceCells,
    topTokens: [
      {
        tokenName: "accent-background-color-default",
        foundationId: "color",
        platformIds: ["ios", "android", "drover", "qt"],
        recommendation: "promote",
      },
      {
        tokenName: "font-size-100",
        foundationId: "typography",
        platformIds: ["ios", "android"],
        recommendation: "expected",
      },
    ],
  },
  derivation: [
    {
      foundationId: "color",
      generated: 212,
      ruleDerived: 48,
      overridden: 11,
      staleOverridden: 7,
    },
    {
      foundationId: "typography",
      generated: 34,
      ruleDerived: 18,
      overridden: 3,
      staleOverridden: 0,
    },
    {
      foundationId: "spacing",
      generated: 16,
      ruleDerived: 40,
      overridden: 6,
      staleOverridden: 2,
    },
    {
      foundationId: "size",
      generated: 12,
      ruleDerived: 36,
      overridden: 4,
      staleOverridden: 1,
    },
    {
      foundationId: "radius",
      generated: 6,
      ruleDerived: 14,
      overridden: 3,
      staleOverridden: 0,
    },
    {
      foundationId: "elevation",
      generated: 8,
      ruleDerived: 6,
      overridden: 5,
      staleOverridden: 3,
    },
    {
      foundationId: "motion",
      generated: 10,
      ruleDerived: 8,
      overridden: 2,
      staleOverridden: 0,
    },
  ],
  accessibility: [
    {
      id: "light-regular",
      modeLabels: ["Light", "Regular"],
      passing: 412,
      total: 412,
      isAdaptiveExtreme: false,
    },
    {
      id: "light-high",
      modeLabels: ["Light", "High"],
      passing: 412,
      total: 412,
      isAdaptiveExtreme: false,
    },
    {
      id: "dark-regular",
      modeLabels: ["Dark", "Regular"],
      passing: 408,
      total: 412,
      isAdaptiveExtreme: false,
    },
    {
      id: "dark-high",
      modeLabels: ["Dark", "High"],
      passing: 403,
      total: 412,
      isAdaptiveExtreme: false,
    },
    {
      id: "lightness-min",
      modeLabels: ["Light", "Regular", "Lowest background lightness"],
      passing: 396,
      total: 412,
      isAdaptiveExtreme: true,
    },
    {
      id: "lightness-max",
      modeLabels: ["Dark", "High", "Highest background lightness"],
      passing: 401,
      total: 412,
      isAdaptiveExtreme: true,
    },
  ],
  coverage: [
    {
      foundationId: "color",
      capabilities: {
        formula: "complete",
        modes: "complete",
        adaptiveParameters: "complete",
        tokens: "complete",
        cssOutput: "complete",
        designDataExport: "partial",
      },
    },
    {
      foundationId: "typography",
      capabilities: {
        formula: "complete",
        modes: "partial",
        adaptiveParameters: "complete",
        tokens: "complete",
        cssOutput: "complete",
        designDataExport: "partial",
      },
    },
    {
      foundationId: "spacing",
      capabilities: {
        formula: "complete",
        modes: "complete",
        adaptiveParameters: "complete",
        tokens: "complete",
        cssOutput: "partial",
        designDataExport: "missing",
      },
    },
    {
      foundationId: "size",
      capabilities: {
        formula: "complete",
        modes: "partial",
        adaptiveParameters: "missing",
        tokens: "complete",
        cssOutput: "partial",
        designDataExport: "missing",
      },
    },
    {
      foundationId: "radius",
      capabilities: {
        formula: "complete",
        modes: "missing",
        adaptiveParameters: "missing",
        tokens: "complete",
        cssOutput: "complete",
        designDataExport: "missing",
      },
    },
    {
      foundationId: "elevation",
      capabilities: {
        formula: "partial",
        modes: "complete",
        adaptiveParameters: "missing",
        tokens: "partial",
        cssOutput: "partial",
        designDataExport: "missing",
      },
    },
    {
      foundationId: "motion",
      capabilities: {
        formula: "complete",
        modes: "missing",
        adaptiveParameters: "complete",
        tokens: "complete",
        cssOutput: "missing",
        designDataExport: "missing",
      },
    },
  ],
};
