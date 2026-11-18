// Copyright 2026 Adobe. All rights reserved.
import { registerTerm, type TaxonomyDocument } from "../taxonomy/model";

export function registerStyleName(document: TaxonomyDocument, name: string) {
  if (!name.trim()) throw new Error("Give the style a name.");
  const existing = document.terms.find((term) => {
    const category = document.categories.find(
      (category) => category.id === term.categoryId,
    );
    return (
      typeof term.value === "string" &&
      term.value.trim().toLowerCase() === name.trim().toLowerCase() &&
      category?.valueType === "string" &&
      category.cardinality === "one" &&
      category.scopes.includes("styles") &&
      (!category.allowedTokenTiers ||
        category.allowedTokenTiers.includes("semantic"))
    );
  });
  if (existing)
    return {
      taxonomy: document,
      name: { categoryId: existing.categoryId, termId: existing.id },
    };
  const category = document.categories.find(
    (category) => category.key === "style",
  );
  if (!category)
    throw new Error("Choose an available Style Registry category.");
  const termId = crypto.randomUUID();
  return {
    taxonomy: registerTerm(document, category.id, name.trim(), termId),
    name: { categoryId: category.id, termId },
  };
}
