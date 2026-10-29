// Copyright 2026 Adobe. All rights reserved.
import dataset from "../../data/design-system.defaults.json" with { type: "json" };
import { assertTaxonomy, type TaxonomyDocument } from "./model";

export function createTaxonomyDefaults(): TaxonomyDocument {
  const document = dataset.system.taxonomy;
  assertTaxonomy(document);
  const { categories, terms, order } = document;
  const property = categories.find((category) => category.key === "property");
  if (!property)
    throw new Error("Shipped taxonomy requires the Property category.");
  return structuredClone({
    schemaVersion: 1,
    categories,
    terms: terms.filter((term) => term.categoryId === property.id),
    order,
    classifications: {},
  });
}
