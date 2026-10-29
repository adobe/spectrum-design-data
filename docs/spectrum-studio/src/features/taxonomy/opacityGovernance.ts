// Copyright 2026 Adobe. All rights reserved.
import type { OpacityDocument } from "../opacity/model";
import { registerTerm, type TaxonomyDocument } from "./model";

/** Structurally compatible with `TermContribution`; kept local so pure output stays free of runtime state. */
export interface OpacityTermContribution {
  sourceId: string;
  field: "scaleIndex";
  value: number;
}

export const OPACITY_PROPERTY_TERM_ID = "31d59200-639b-4c93-8fbf-fc7df5f0ce2a";

export function opacityTermContributions(
  document: OpacityDocument,
): OpacityTermContribution[] {
  return document.levels.map((level, index) => ({
    sourceId: level.id,
    field: "scaleIndex" as const,
    value: (index + 1) * 100,
  }));
}

/**
 * Mutation/upgrade boundary only: extend the existing vocabulary, never generate
 * Registry identities while rendering token values or exports. `allocateId`
 * receives the scale-index value so callers can share identities by value.
 */
export function registerOpacityVocabulary(
  taxonomy: TaxonomyDocument,
  document: OpacityDocument,
  allocateId: (value: number) => string = () => crypto.randomUUID(),
): TaxonomyDocument {
  let changed = false;
  const categories = taxonomy.categories.map((category) => {
    if (
      !["property", "scaleIndex"].includes(category.key) ||
      category.scopes.includes("opacity")
    )
      return category;
    changed = true;
    return { ...category, scopes: [...category.scopes, "opacity" as const] };
  });
  let next = changed ? { ...taxonomy, categories } : taxonomy;
  const category = categories.find((item) => item.key === "scaleIndex");
  if (
    !category ||
    category.valueType !== "number" ||
    category.cardinality !== "one"
  )
    return next;
  for (const contribution of opacityTermContributions(document)) {
    if (
      next.terms.some(
        (term) =>
          term.categoryId === category.id && term.value === contribution.value,
      )
    )
      continue;
    next = registerTerm(
      next,
      category.id,
      contribution.value,
      allocateId(contribution.value),
    );
  }
  return next;
}

export function opacityVocabularyIssues(taxonomy: TaxonomyDocument): string[] {
  const property = taxonomy.categories.find(
    (category) => category.key === "property",
  );
  const index = taxonomy.categories.find(
    (category) => category.key === "scaleIndex",
  );
  return [
    ...(!property?.scopes.includes("opacity")
      ? ["Property must include the opacity scope."]
      : []),
    ...(!index?.scopes.includes("opacity")
      ? ["Scale index must include the opacity scope."]
      : []),
    ...(!taxonomy.terms.some(
      (term) =>
        term.id === OPACITY_PROPERTY_TERM_ID &&
        term.categoryId === property?.id,
    )
      ? [
          "The existing Opacity Property term is unavailable; restore its Registry identity.",
        ]
      : []),
  ];
}
