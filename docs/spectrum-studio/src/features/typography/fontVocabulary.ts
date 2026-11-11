// Copyright 2026 Adobe. All rights reserved.
import {
  registerTerm,
  taxonomyValueKey,
  type TaxonomyDocument,
} from "../taxonomy/model";
import type { TypographyFont } from "./model";
import { kebabCaseNameFormatter } from "../taxonomy/formatting";

const FAMILY_CATEGORY_ID = "8c5383a1-6f48-49c5-bb9b-fffe7c9aec41";
const FAMILY_TERM_IDS: Record<string, string> = {
  "sans-serif": "c014ec31-45cb-49f0-b532-3996117b4b91",
  serif: "faf27668-2c4a-401e-8d82-ab35d403ea82",
  monospace: "99a6a290-13cd-4a6c-8d93-54a714f10c54",
};

export function withFontVocabulary(
  registry: TaxonomyDocument,
  fonts: readonly TypographyFont[],
  allocations = new Map<string, string>(),
): TaxonomyDocument {
  let next = registry;
  if (!next.categories.some((category) => category.key === "family")) {
    next = {
      ...next,
      categories: [
        ...next.categories,
        {
          id: FAMILY_CATEGORY_ID,
          key: "family",
          name: "Family",
          description: "The family of a font-family primitive.",
          valueType: "string",
          cardinality: "one",
          scopes: ["typography"],
          required: false,
          includeInProjections: true,
        },
      ],
      order: [...next.order, FAMILY_CATEGORY_ID],
    };
  }
  for (const [field, value] of [
    ["property", "font-family"],
    ...fonts
      .filter(
        (font) =>
          !font.nameReference ||
          !next.terms.some((term) => term.id === font.nameReference?.termId),
      )
      .map((font) => ["family", kebabCaseNameFormatter.formatValue(font.name)]),
  ]) {
    const category = next.categories.find((category) => category.key === field);
    if (!category || !value) continue;
    if (
      next.terms.some(
        (term) =>
          term.categoryId === category.id &&
          taxonomyValueKey(term.value) === value,
      )
    )
      continue;
    if (
      next.terms.some(
        (term) =>
          term.categoryId !== category.id &&
          taxonomyValueKey(term.value) === value,
      )
    )
      continue;
    const key = `font-term:${field}:${value}`;
    const id =
      allocations.get(key) ??
      (field === "family"
        ? FAMILY_TERM_IDS[value]
        : "7bb75e52-f0dc-41ec-a132-8e249d4f7d47") ??
      crypto.randomUUID();
    allocations.set(key, id);
    next = registerTerm(next, category.id, value, id);
  }
  return next;
}

export function reconcileFontNames(
  registry: TaxonomyDocument,
  fonts: readonly TypographyFont[],
  allocations?: Map<string, string>,
) {
  const taxonomy = withFontVocabulary(registry, fonts, allocations);
  const category = taxonomy.categories.find(
    (category) => category.key === "family",
  );
  return {
    taxonomy,
    fonts: fonts.map((font) => {
      if (font.nameReference) return font;
      const term = taxonomy.terms.find(
        (term) =>
          term.categoryId === category?.id &&
          taxonomyValueKey(term.value) ===
            kebabCaseNameFormatter.formatValue(font.name),
      );
      return category && term
        ? {
            ...font,
            nameReference: { categoryId: category.id, termId: term.id },
          }
        : font;
    }),
  };
}
