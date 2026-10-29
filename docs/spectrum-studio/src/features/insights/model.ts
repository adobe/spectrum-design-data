// Copyright 2026 Adobe. All rights reserved.
import type { FoundationId } from "../modes/parameters";

export type HealthPillarId =
  | "systematicity"
  | "accessibility"
  | "consistency"
  | "adaptivity"
  | "conformance";

export interface HealthPillar {
  id: HealthPillarId;
  label: string;
  /** 0–1 */
  score: number;
  /** Score at the previous release (0–1), for the trend. */
  previousScore: number;
  summary: string;
}

export type AttentionSeverity = "critical" | "warning" | "info";

export interface AttentionItem {
  id: string;
  severity: AttentionSeverity;
  title: string;
  impact: string;
  pillarId: HealthPillarId;
  foundationId?: FoundationId;
  platformId?: string;
  suggestedAction: string;
}

export interface PlatformDivergenceCell {
  platformId: string;
  foundationId: FoundationId;
  overriddenCount: number;
  totalCount: number;
}

export interface DivergentToken {
  tokenName: string;
  foundationId: FoundationId;
  platformIds: string[];
  recommendation: "promote" | "expected";
}

export interface FoundationDerivation {
  foundationId: FoundationId;
  generated: number;
  ruleDerived: number;
  overridden: number;
  /** Overrides whose generated base value changed after the override was made. */
  staleOverridden: number;
}

export interface ModeCombinationAccessibility {
  id: string;
  modeLabels: string[];
  passing: number;
  total: number;
  /** A combination evaluated at the end of an adaptive parameter's range. */
  isAdaptiveExtreme: boolean;
}

export type CoverageCapability =
  | "formula"
  | "modes"
  | "adaptiveParameters"
  | "tokens"
  | "cssOutput"
  | "designDataExport";

export type CoverageStatus = "complete" | "partial" | "missing";

export interface FoundationCoverage {
  foundationId: FoundationId;
  capabilities: Record<CoverageCapability, CoverageStatus>;
}

export interface SystemInsights {
  pillars: HealthPillar[];
  attention: AttentionItem[];
  divergence: {
    cells: PlatformDivergenceCell[];
    topTokens: DivergentToken[];
  };
  derivation: FoundationDerivation[];
  accessibility: ModeCombinationAccessibility[];
  coverage: FoundationCoverage[];
}
