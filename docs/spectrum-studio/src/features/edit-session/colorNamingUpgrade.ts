// Copyright 2026 Adobe. All rights reserved.
import { createTaxonomyDefaults } from "../taxonomy/defaults";
import { isTaxonomyDocument } from "../taxonomy/model";

export function upgradeColorNamingSnapshot(snapshot: unknown): unknown {
  if (
    !snapshot ||
    typeof snapshot !== "object" ||
    !("taxonomy" in snapshot) ||
    !isTaxonomyDocument(snapshot.taxonomy)
  )
    return snapshot;
  const taxonomy = snapshot.taxonomy;
  const shipped = createTaxonomyDefaults();
  const property = shipped.categories.find(
    (category) => category.key === "property",
  )!;
  const color = shipped.terms.find(
    (term) => term.categoryId === property.id && term.value === "color",
  )!;
  const previous = taxonomy.terms.find(
    (term) => term.id === color.id && term.categoryId === color.categoryId,
  );
  if (!previous || previous.includeInProjections !== undefined) return snapshot;
  return {
    ...snapshot,
    taxonomy: {
      ...taxonomy,
      terms: taxonomy.terms.map((term) =>
        term.id === color.id ? { ...term, includeInProjections: false } : term,
      ),
    },
  };
}
