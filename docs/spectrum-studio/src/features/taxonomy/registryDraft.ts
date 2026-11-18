// Copyright 2026 Adobe. All rights reserved.
import {
  updateTaxonomy,
  type TaxonomyCategory,
  type TaxonomyDocument,
  type TaxonomyTerm,
} from "./model";

export type RegistryOperation =
  | { kind: "category"; category: TaxonomyCategory }
  | { kind: "term"; term: TaxonomyTerm }
  | { kind: "remove-term"; id: string };

export interface RegistryBatch {
  base: TaxonomyDocument;
  operations: readonly RegistryOperation[];
}

export function registryBatchSteps(
  previous: TaxonomyDocument,
  batch: RegistryBatch,
): TaxonomyDocument[] {
  if (batch.base !== previous)
    throw new Error(
      "The Registry changed while this edit was pending. Reopen the editor before applying your change.",
    );
  const steps: TaxonomyDocument[] = [];
  for (const operation of batch.operations) {
    let next: TaxonomyDocument;
    if (operation.kind === "category") {
      if (
        !previous.categories.some((item) => item.id === operation.category.id)
      )
        throw new Error("The category is no longer available.");
      next = {
        ...previous,
        categories: previous.categories.map((item) =>
          item.id === operation.category.id ? operation.category : item,
        ),
      };
    } else if (operation.kind === "term") {
      next = {
        ...previous,
        terms: previous.terms.some((item) => item.id === operation.term.id)
          ? previous.terms.map((item) =>
              item.id === operation.term.id ? operation.term : item,
            )
          : [...previous.terms, operation.term],
      };
    } else {
      if (!previous.terms.some((item) => item.id === operation.id))
        throw new Error("The term is no longer available.");
      next = {
        ...previous,
        terms: previous.terms.filter((item) => item.id !== operation.id),
      };
    }
    previous = updateTaxonomy(previous, next);
    steps.push(previous);
  }
  return steps;
}

export function registryCategoryBatch(
  base: TaxonomyDocument,
  draft: TaxonomyDocument,
  categoryId: string,
): RegistryBatch {
  const category = draft.categories.find((item) => item.id === categoryId);
  if (!category) throw new Error("The category is no longer available.");
  const operations: RegistryOperation[] = [];
  for (const term of base.terms.filter(
    (item) => item.categoryId === categoryId,
  ))
    if (!draft.terms.some((item) => item.id === term.id))
      operations.push({ kind: "remove-term", id: term.id });
  for (const term of draft.terms.filter(
    (item) => item.categoryId === categoryId,
  ))
    if (
      JSON.stringify(base.terms.find((item) => item.id === term.id)) !==
      JSON.stringify(term)
    )
      operations.push({ kind: "term", term });
  if (
    JSON.stringify(base.categories.find((item) => item.id === categoryId)) !==
    JSON.stringify(category)
  )
    operations.push({ kind: "category", category });
  return { base, operations };
}

export function reorderRegistryCategories(
  order: readonly string[],
  moving: string,
  target: string,
  position: "before" | "after",
): string[] {
  if (
    new Set(order).size !== order.length ||
    !order.includes(moving) ||
    !order.includes(target)
  )
    throw new Error("Choose an available category and drop position.");
  if (moving === target) return [...order];
  const next = order.filter((id) => id !== moving);
  next.splice(next.indexOf(target) + (position === "after" ? 1 : 0), 0, moving);
  return next;
}
