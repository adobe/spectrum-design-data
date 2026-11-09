// Copyright 2026 Adobe. All rights reserved.
export const TOKEN_TIERS = ["primitive", "semantic", "component"] as const;
export type TokenTier = (typeof TOKEN_TIERS)[number];
export const UNCLASSIFIED_TIER_MESSAGE =
  "Token tier is unclassified. Review this token's tier.";

export function isTokenTier(value: unknown): value is TokenTier {
  return TOKEN_TIERS.some((tier) => tier === value);
}

export function categoryAllowsTier(
  category: { allowedTokenTiers?: readonly TokenTier[] },
  tier: TokenTier | undefined,
): boolean {
  return (
    category.allowedTokenTiers === undefined ||
    (tier !== undefined && category.allowedTokenTiers.includes(tier))
  );
}
