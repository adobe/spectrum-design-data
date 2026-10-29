// Copyright 2026 Adobe. All rights reserved.
import type { Atom } from "jotai";
import type { FoundationId } from "../modes/parameters";

export type TokenTier = "primitive" | "semantic";

export type ImpactCategory =
  | FoundationId
  | "modes"
  | "logic"
  | "registry"
  | "structures";

export interface ModeValueImpact {
  /** Stable id of one token value in one mode combination. */
  valueId: string;
  changed: boolean;
}

/** One tracked token, including unchanged ones, so denominators come from the records themselves. */
export interface TokenImpactRecord {
  tokenId: string;
  tier: TokenTier;
  category: ImpactCategory;
  modeValues: ModeValueImpact[];
  nameChanged: boolean;
  metadataChanged?: boolean;
  /** Semantic tokens only: the alias target itself changed. */
  referenceChanged?: boolean;
  referenceValues?: ModeValueImpact[];
  referenceAssessment?: "assessed" | "unavailable";
  /** Semantic tokens only: references a token affected by this change. */
  referencesAffectedToken?: boolean;
  manuallyOverridden: boolean;
}

/** One authored value: a scale stop, a contrast value, a setting, or a mode-override slot. */
export interface FoundationParameterRecord {
  id: string;
  category: ImpactCategory;
  edited: boolean;
}

/** Only register sources that have a saved-change baseline and revert behavior. */
export interface TokenImpactSource {
  id: string;
  recordsAtom: Atom<TokenImpactRecord[]>;
}

export interface FoundationImpactSource {
  id: string;
  recordsAtom: Atom<FoundationParameterRecord[]>;
}

export interface Ratio {
  count: number;
  total: number;
  /** null when there is nothing to measure. */
  fraction: number | null;
}

export interface TierImpactSummary {
  tier: TokenTier;
  affected: Ratio;
  valueChangedTokens: Ratio;
  valuesChanged: Ratio;
  referencesChanged: Ratio;
}

export interface CategoryImpactSummary {
  category: ImpactCategory;
  affected: Ratio;
}

export interface TokenImpactSummary {
  affected: Ratio;
  valueChanged: Ratio;
  tiers: TierImpactSummary[];
  categories: CategoryImpactSummary[];
  manualOverrides: Ratio;
}

export interface FoundationImpactSummary {
  edited: Ratio;
  categories: CategoryImpactSummary[];
}
