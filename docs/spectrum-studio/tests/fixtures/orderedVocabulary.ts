// Copyright 2026 Adobe. All rights reserved.
import type { TaxonomyDocument } from "../../src/features/taxonomy/model";

export function orderedVocabularyFixture(
  base: TaxonomyDocument,
): TaxonomyDocument {
  const document = structuredClone(base);
  for (const category of [
    {
      id: "c67a7e16-b99f-4b9f-8e53-18bcd6fe2c2c",
      key: "contrastLabel",
      name: "Contrast label",
      scopes: ["colors"],
    },
    {
      id: "3b8d399b-9a38-4c85-b3da-fa242530b721",
      key: "typographyMetric",
      name: "Typography metric",
      scopes: ["typography"],
    },
  ] as const) {
    document.categories.push({
      ...category,
      scopes: [...category.scopes],
      description: "",
      valueType: "string",
      cardinality: "one",
      required: false,
      includeInProjections: true,
    });
    document.order.push(category.id);
  }
  return document;
}
