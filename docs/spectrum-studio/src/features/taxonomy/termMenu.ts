// Copyright 2026 Adobe. All rights reserved.
import type {
  Classification,
  TaxonomyCategory,
  TaxonomyDocument,
  TaxonomyScope,
  TaxonomyTerm,
} from "./model";
import { termLabel } from "./termPresentation";
import { categoryAllowsTier, type TokenTier } from "../tokens/tier";

export interface TermMatch {
  term: TaxonomyTerm;
  category: TaxonomyCategory;
  score: number;
}

function orderedCategories(taxonomy: TaxonomyDocument): TaxonomyCategory[] {
  const byId = new Map(taxonomy.categories.map((item) => [item.id, item]));
  const ordered = taxonomy.order.flatMap((id) => byId.get(id) ?? []);
  return [
    ...ordered,
    ...taxonomy.categories.filter((item) => !taxonomy.order.includes(item.id)),
  ];
}

function hasTerm(classification: Classification, categoryId: string) {
  const assigned = classification[categoryId];
  return Array.isArray(assigned) ? assigned.length > 0 : Boolean(assigned);
}

/**
 * Categories the term menu offers for one token: they apply to its token type
 * and tier, and do not already hold a term. Empty categories stay listed.
 */
export function applicableCategories(
  taxonomy: TaxonomyDocument,
  scope: TaxonomyScope,
  tier: TokenTier | undefined,
  classification: Classification,
): TaxonomyCategory[] {
  return orderedCategories(taxonomy).filter(
    (item) =>
      item.scopes.includes(scope) &&
      categoryAllowsTier(item, tier) &&
      !hasTerm(classification, item.id),
  );
}

export function categoryTerms(
  taxonomy: TaxonomyDocument,
  categoryId: string,
): TaxonomyTerm[] {
  return taxonomy.terms.filter((term) => term.categoryId === categoryId);
}

const includes = (text: string, query: string) =>
  text.toLowerCase().includes(query);

function termScore(
  query: string,
  words: string[],
  term: TaxonomyTerm,
  category: TaxonomyCategory,
): number {
  const raw = String(term.value).toLowerCase();
  const label = termLabel(term.value).toLowerCase();
  const names = [label, raw];
  if (names.some((name) => name === query)) return 100;
  if (names.some((name) => name.startsWith(query))) return 80;
  if (
    names.some((name) =>
      name.split(/[\s-]+/).some((word) => word.startsWith(query)),
    )
  )
    return 60;
  if (names.some((name) => name.includes(query))) return 40;
  if (includes(category.name, query)) return 30;
  if (includes(term.description, query)) return 20;
  if (includes(category.description, query)) return 10;
  const text = [
    label,
    raw,
    category.name,
    term.description,
    category.description,
  ]
    .join(" ")
    .toLowerCase();
  return words.length > 1 && words.every((word) => text.includes(word)) ? 5 : 0;
}

/**
 * Ranks terms against a search query. Term names rank above category names,
 * which rank above descriptions. Ties keep category then term order.
 */
export function rankTermMatches(
  query: string,
  categories: readonly TaxonomyCategory[],
  terms: readonly TaxonomyTerm[],
): TermMatch[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  const words = normalized.split(/\s+/);
  return categories
    .flatMap((category) =>
      terms
        .filter((term) => term.categoryId === category.id)
        .map((term) => ({
          term,
          category,
          score: termScore(normalized, words, term, category),
        })),
    )
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score);
}

/** Sets the category's single term, replacing any term it held before. */
export function assignTerm(
  classification: Classification,
  category: TaxonomyCategory,
  termId: string,
): Classification {
  return {
    ...classification,
    [category.id]: category.cardinality === "ordered" ? [termId] : termId,
  };
}
