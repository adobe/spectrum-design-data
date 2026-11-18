// Copyright 2026 Adobe. All rights reserved.
// Deprecation helpers for Registry terms and categories.
// See docs/rfcs/deletion-and-deprecation.md.
import {
  deprecatedLifecycle,
  isDeprecated,
  withLifecycle,
} from "../edit-session/lifecycle";
import type { TaxonomyDocument, TaxonomyTerm } from "./model";
import { termLabel } from "./termPresentation";

function requireTerm(document: TaxonomyDocument, termId: string) {
  const term = document.terms.find((item) => item.id === termId);
  if (!term) throw new Error("The term is no longer in the Registry.");
  return term;
}

/** Active terms in the same category that can replace the given term. */
export function termReplacementCandidates(
  document: TaxonomyDocument,
  termId: string,
): { id: string; label: string }[] {
  const term = document.terms.find((item) => item.id === termId);
  if (!term) return [];
  return document.terms
    .filter(
      (item) =>
        item.id !== term.id &&
        item.categoryId === term.categoryId &&
        !isDeprecated(item),
    )
    .map((item) => ({ id: item.id, label: termLabel(item.value) }));
}

export function deprecateTaxonomyTerm(
  document: TaxonomyDocument,
  termId: string,
  replacedBy?: string,
): TaxonomyDocument {
  requireTerm(document, termId);
  if (
    replacedBy &&
    !termReplacementCandidates(document, termId).some(
      (item) => item.id === replacedBy,
    )
  )
    throw new Error(
      "Choose an active term in the same category as the replacement.",
    );
  return {
    ...document,
    terms: document.terms.map((term) =>
      term.id === termId
        ? withLifecycle(term, deprecatedLifecycle(replacedBy))
        : term,
    ),
  };
}

export function deprecateTaxonomyCategory(
  document: TaxonomyDocument,
  categoryId: string,
): TaxonomyDocument {
  if (!document.categories.some((item) => item.id === categoryId))
    throw new Error("The category is no longer in the Registry.");
  return {
    ...document,
    categories: document.categories.map((category) =>
      category.id === categoryId
        ? withLifecycle(category, deprecatedLifecycle())
        : category,
    ),
  };
}

/** Changes a term's value and keeps its ID, so every reference follows. */
export function renameTaxonomyTerm(
  document: TaxonomyDocument,
  termId: string,
  text: string,
): TaxonomyDocument {
  const term = requireTerm(document, termId);
  const category = document.categories.find(
    (item) => item.id === term.categoryId,
  );
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Enter a name.");
  let value: TaxonomyTerm["value"] = trimmed;
  if (category?.valueType === "number") {
    value = Number(trimmed);
    if (!Number.isFinite(value)) throw new Error("Enter a number.");
  }
  return {
    ...document,
    terms: document.terms.map((item) =>
      item.id === termId ? { ...item, value } : item,
    ),
  };
}

/** Lists deprecated Registry items, terms before their categories. */
export function deprecatedTaxonomyItems(document: TaxonomyDocument) {
  return {
    terms: document.terms.filter((term) => isDeprecated(term)),
    categories: document.categories.filter((category) =>
      isDeprecated(category),
    ),
  };
}
