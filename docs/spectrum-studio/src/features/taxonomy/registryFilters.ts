// Copyright 2026 Adobe. All rights reserved.
import { TOKEN_TIERS, type TokenTier } from "../tokens/tier";
import { TAXONOMY_TOKEN_TYPES, type TaxonomyCategory } from "./model";

export type TaxonomyTokenType = (typeof TAXONOMY_TOKEN_TYPES)[number];

/** Temporary Registry board view state; never written to design data. */
export interface RegistryFilters {
  tiers: readonly TokenTier[];
  types: readonly TaxonomyTokenType[];
}

export const ALL_REGISTRY_FILTERS: RegistryFilters = {
  tiers: TOKEN_TIERS,
  types: TAXONOMY_TOKEN_TYPES,
};

export const REGISTRY_FILTER_ALL = "all";

const selectsAll = (options: readonly string[], selected: readonly string[]) =>
  options.every((option) => selected.includes(option));

export function categoryMatchesRegistryFilters(
  category: Pick<TaxonomyCategory, "allowedTokenTiers" | "scopes">,
  filters: RegistryFilters,
): boolean {
  const tierMatch =
    selectsAll(TOKEN_TIERS, filters.tiers) ||
    category.allowedTokenTiers === undefined ||
    category.allowedTokenTiers.some((tier) => filters.tiers.includes(tier));
  // Categories without token types only appear while every type is shown.
  const typeMatch =
    selectsAll(TAXONOMY_TOKEN_TYPES, filters.types) ||
    category.scopes.some((scope) =>
      (filters.types as readonly string[]).includes(scope),
    );
  return tierMatch && typeMatch;
}

/** Picker keys for a selection: every option selected also checks All. */
export function registryFilterKeys(
  options: readonly string[],
  selected: readonly string[],
): string[] {
  return selectsAll(options, selected)
    ? [REGISTRY_FILTER_ALL, ...options]
    : options.filter((option) => selected.includes(option));
}

/** Applies a picker change; All toggles between every option and none. */
export function nextRegistryFilterSelection<T extends string>(
  options: readonly T[],
  previous: readonly T[],
  keys: readonly string[],
): T[] {
  const hadAll = selectsAll(options, previous);
  const hasAll = keys.includes(REGISTRY_FILTER_ALL);
  if (hasAll && !hadAll) return [...options];
  if (!hasAll && hadAll && selectsAll(options, keys)) return [];
  return options.filter((option) => keys.includes(option));
}
