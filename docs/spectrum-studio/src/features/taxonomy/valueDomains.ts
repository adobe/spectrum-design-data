// Copyright 2026 Adobe. All rights reserved.
import type { TaxonomyCategory, TaxonomyTerm, TaxonomyValue } from "./model";

export function taxonomyValueIssue(
  category: Pick<TaxonomyCategory, "key" | "valueType">,
  value: TaxonomyValue,
): string | undefined {
  if (typeof value !== category.valueType)
    return "Choose a value that matches this category's type.";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "Enter a finite number.";
    if (
      category.key === "number" &&
      (!Number.isSafeInteger(value) || value < 1)
    )
      return "Enter a positive whole number within the safe integer range.";
  } else if (!value.trim()) return "Enter a term.";
  return undefined;
}

export function numericValuesMayBeShared(
  first: Pick<TaxonomyTerm, "categoryId" | "value">,
  second: Pick<TaxonomyTerm, "categoryId" | "value">,
  categories: readonly Pick<TaxonomyCategory, "id" | "key" | "valueType">[],
): boolean {
  if (
    typeof first.value !== "number" ||
    typeof second.value !== "number" ||
    first.categoryId === second.categoryId
  )
    return false;
  const categoryKeys = [first, second].map(
    (term) =>
      categories.find(
        (category) =>
          category.id === term.categoryId && category.valueType === "number",
      )?.key,
  );
  return categoryKeys.includes("scaleIndex") && categoryKeys.includes("number");
}
