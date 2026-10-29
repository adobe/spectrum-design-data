// Copyright 2026 Adobe. All rights reserved.
import type {
  CategoryImpactSummary,
  FoundationImpactSummary,
  FoundationParameterRecord,
  ImpactCategory,
  Ratio,
  TierImpactSummary,
  TokenImpactRecord,
  TokenImpactSummary,
  TokenTier,
} from "./model";

export const TOKEN_TIER_ORDER: readonly TokenTier[] = ["primitive", "semantic"];

export function ratio(count: number, total: number): Ratio {
  return { count, total, fraction: total > 0 ? count / total : null };
}

export function isTokenAffected(record: TokenImpactRecord) {
  return (
    record.nameChanged ||
    !!record.metadataChanged ||
    record.manuallyOverridden ||
    !!record.referenceChanged ||
    !!record.referencesAffectedToken ||
    record.modeValues.some((value) => value.changed)
  );
}

function hasChangedValue(record: TokenImpactRecord) {
  return record.modeValues.some((value) => value.changed);
}

function groupBy<T, K>(items: T[], key: (item: T) => K) {
  const groups = new Map<K, T[]>();
  for (const item of items)
    groups.set(key(item), [...(groups.get(key(item)) ?? []), item]);
  return groups;
}

function summarizeTier(
  tier: TokenTier,
  records: TokenImpactRecord[],
): TierImpactSummary {
  const values = records.flatMap((record) => record.modeValues);
  const references = records.filter(
    (record) => record.referenceAssessment === "assessed",
  );
  const referenceValues = references.flatMap(
    (record) =>
      record.referenceValues ?? [
        { valueId: record.tokenId, changed: !!record.referenceChanged },
      ],
  );
  return {
    tier,
    affected: ratio(records.filter(isTokenAffected).length, records.length),
    valueChangedTokens: ratio(
      records.filter(hasChangedValue).length,
      records.length,
    ),
    valuesChanged: ratio(
      values.filter((value) => value.changed).length,
      values.length,
    ),
    referencesChanged: ratio(
      referenceValues.filter((value) => value.changed).length,
      referenceValues.length,
    ),
  };
}

export function summarizeTokenImpact(
  records: TokenImpactRecord[],
): TokenImpactSummary {
  const byTier = groupBy(records, (record) => record.tier);
  const byCategory = groupBy(records, (record) => record.category);
  return {
    affected: ratio(records.filter(isTokenAffected).length, records.length),
    valueChanged: ratio(records.filter(hasChangedValue).length, records.length),
    tiers: TOKEN_TIER_ORDER.filter((tier) => byTier.has(tier)).map((tier) =>
      summarizeTier(tier, byTier.get(tier)!),
    ),
    categories: [...byCategory].map(
      ([category, items]): CategoryImpactSummary => ({
        category,
        affected: ratio(items.filter(isTokenAffected).length, items.length),
      }),
    ),
    manualOverrides: ratio(
      records.filter((record) => record.manuallyOverridden).length,
      records.length,
    ),
  };
}

export function summarizeFoundationImpact(
  records: FoundationParameterRecord[],
): FoundationImpactSummary {
  const byCategory = groupBy(records, (record) => record.category);
  return {
    edited: ratio(
      records.filter((record) => record.edited).length,
      records.length,
    ),
    // Category shares use the overall denominator so segments stack to the headline.
    categories: [...byCategory].map(
      ([category, items]: [ImpactCategory, FoundationParameterRecord[]]) => ({
        category,
        affected: ratio(
          items.filter((record) => record.edited).length,
          records.length,
        ),
      }),
    ),
  };
}
