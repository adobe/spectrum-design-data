// Copyright 2026 Adobe. All rights reserved.
import {
  COMPONENT_SIZES,
  type ComponentSize,
} from "../foundations/componentSizes";
import {
  assertTaxonomy,
  taxonomyValueKey,
  type TaxonomyCategory,
  type TaxonomyDocument,
  type TaxonomyTerm,
} from "./model";

export const VARIANT_CATEGORY_IDS = {
  structure: "b07988e3-0510-4bf5-a531-86ea718b1003",
  size: "b07988e3-0510-4bf5-a531-86ea718b1004",
} as const;
export const SIZE_TERM_IDS: Record<ComponentSize, string> = {
  xs: "b07988e3-0510-4bf5-a531-86ea718b1500",
  s: "b07988e3-0510-4bf5-a531-86ea718b1501",
  m: "b07988e3-0510-4bf5-a531-86ea718b1502",
  l: "b07988e3-0510-4bf5-a531-86ea718b1503",
  xl: "b07988e3-0510-4bf5-a531-86ea718b1504",
};
export const VARIANT_CATEGORIES: TaxonomyCategory[] = [
  { id: VARIANT_CATEGORY_IDS.structure, key: "structure", name: "Structure" },
  { id: VARIANT_CATEGORY_IDS.size, key: "size", name: "Size" },
].map((category) => ({
  ...category,
  description: "",
  valueType: "string",
  cardinality: "one",
  scopes: ["structures"],
  required: false,
  includeInProjections: true,
}));
export const SIZE_TERMS: TaxonomyTerm[] = COMPONENT_SIZES.map((size) => ({
  id: SIZE_TERM_IDS[size.id],
  categoryId: VARIANT_CATEGORY_IDS.size,
  value: size.label,
  description: "",
}));

export function sizeFromTerm(id: string): ComponentSize | undefined {
  return COMPONENT_SIZES.find((size) => SIZE_TERM_IDS[size.id] === id)?.id;
}

/** Add only absent dependencies; conflicting identities and authored labels are never replaced. */
export function upgradeVariantVocabulary(
  document: TaxonomyDocument,
): TaxonomyDocument {
  const next = structuredClone(document);
  for (const category of VARIANT_CATEGORIES) {
    const existing = next.categories.find((item) => item.id === category.id);
    if (existing) {
      if (
        existing.key !== category.key ||
        existing.valueType !== "string" ||
        existing.cardinality !== "one"
      ) {
        throw new Error(
          `Cannot enable T-shirt generation: incompatible ${category.name} category.`,
        );
      }
      if (!existing.scopes.includes("structures"))
        existing.scopes.push("structures");
    } else {
      if (next.categories.some((item) => item.key === category.key))
        throw new Error(
          `The ${category.name} field already has another Registry identity. Review its mapping.`,
        );
      next.categories.push(structuredClone(category));
      next.order.push(category.id);
    }
  }
  for (const term of SIZE_TERMS) {
    const existing = next.terms.find((item) => item.id === term.id);
    if (existing) {
      if (existing.categoryId !== term.categoryId)
        throw new Error(
          "A T-shirt size term belongs to an incompatible category.",
        );
    } else {
      if (
        next.terms.some(
          (item) =>
            taxonomyValueKey(item.value) === taxonomyValueKey(term.value),
        )
      ) {
        throw new Error(
          `"${term.value}" already has another Registry identity. Review its mapping.`,
        );
      }
      next.terms.push(structuredClone(term));
    }
  }
  assertTaxonomy(next);
  return next;
}
