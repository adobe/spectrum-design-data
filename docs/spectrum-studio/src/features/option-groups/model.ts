// Copyright 2026 Adobe. All rights reserved.
import type { Classification, TaxonomyDocument } from "../taxonomy/model";

export interface BooleanProperty {
  id: string;
  kind: "boolean";
  name: string;
  defaultValue: boolean;
}

export interface VariantOption {
  id: string;
  name: string;
  classification: Classification;
}

export interface VariantProperty {
  id: string;
  kind: "variant";
  name: string;
  classification: Classification;
  defaultOptionId: string;
  options: VariantOption[];
}

export type OptionProperty = BooleanProperty | VariantProperty;

export function classificationIssues(
  classification: Classification,
  taxonomy: TaxonomyDocument,
): string[] {
  return Object.entries(classification).flatMap(([categoryId, assigned]) => {
    const category = taxonomy.categories.find((item) => item.id === categoryId);
    if (!category || !category.scopes.includes("structures"))
      return ["Choose a Registry category available to Structures."];
    const ids = typeof assigned === "string" ? [assigned] : assigned;
    if (!ids.length || new Set(ids).size !== ids.length)
      return [`${category.name}: choose distinct Registry terms.`];
    if (category.cardinality === "one" && ids.length !== 1)
      return [`${category.name}: choose one Registry term.`];
    return ids.some(
      (id) =>
        !taxonomy.terms.some(
          (term) => term.id === id && term.categoryId === categoryId,
        ),
    )
      ? [`${category.name}: a selected Registry term is unavailable.`]
      : [];
  });
}

export function mergeClassifications(
  ...classifications: readonly Classification[]
): { classification: Classification; issues: string[] } {
  const classification: Classification = {};
  const issues: string[] = [];
  for (const source of classifications) {
    for (const [category, assigned] of Object.entries(source)) {
      const previous = classification[category];
      if (
        previous !== undefined &&
        JSON.stringify(previous) !== JSON.stringify(assigned)
      ) {
        issues.push(
          `Conflicting Registry assignments for category ${category}.`,
        );
      } else classification[category] = assigned;
    }
  }
  return { classification, issues };
}

export function createBooleanProperty(name: string): BooleanProperty {
  if (!name.trim()) throw new Error("Give the boolean a name.");
  return {
    id: crypto.randomUUID(),
    kind: "boolean",
    name: name.trim(),
    defaultValue: true,
  };
}

export function createVariantProperty(
  name: string,
  classification: Classification,
  options: readonly { name: string; classification: Classification }[],
): VariantProperty {
  if (!name.trim() || !Object.keys(classification).length)
    throw new Error("Choose a Registry term for the property.");
  if (options.length < 2)
    throw new Error(
      "A new variant property needs a default and another option.",
    );
  const entries = options.map((option) => {
    if (!option.name.trim() || !Object.keys(option.classification).length)
      throw new Error("Choose a Registry term for every option.");
    return {
      ...structuredClone(option),
      name: option.name.trim(),
      id: crypto.randomUUID(),
    };
  });
  return {
    id: crypto.randomUUID(),
    kind: "variant",
    name: name.trim(),
    classification: structuredClone(classification),
    defaultOptionId: entries[0].id,
    options: entries,
  };
}
