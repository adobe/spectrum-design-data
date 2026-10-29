// Copyright 2026 Adobe. All rights reserved.
import { assertTaxonomy, taxonomyValueKey } from "../taxonomy/model";
import {
  STRUCTURE_CATEGORIES,
  STRUCTURE_CATEGORY_IDS,
  STRUCTURE_TERMS,
} from "../structures/vocabulary";
import { isSnapshot, type EditSessionSnapshot } from "./state";
import { upgradeElevationSnapshot } from "./elevationUpgrade";

export function upgradeStructuresSnapshot(
  input: unknown,
  version: 1 | 2 | 3,
): EditSessionSnapshot {
  const original =
    version < 3 ? upgradeElevationSnapshot(input, version) : input;
  if (!isSnapshot(original) || !original?.taxonomy)
    throw new Error("Older authoring data is invalid or incomplete.");
  const snapshot = structuredClone(original);
  const taxonomy = snapshot.taxonomy!;
  const property = taxonomy.categories.find(
    (category) => category.id === STRUCTURE_CATEGORY_IDS.property,
  );
  if (
    !property ||
    property.key !== "property" ||
    property.valueType !== "string" ||
    property.cardinality !== "one"
  )
    throw new Error(
      "Cannot upgrade Structures: incompatible Property category.",
    );
  if (!property.scopes.includes("structures"))
    property.scopes.push("structures");
  for (const category of STRUCTURE_CATEGORIES) {
    const existing = taxonomy.categories.find(
      (item) => item.id === category.id,
    );
    if (existing) {
      if (
        existing.key !== category.key ||
        existing.valueType !== category.valueType ||
        existing.cardinality !== category.cardinality
      )
        throw new Error(
          `Cannot upgrade Structures: incompatible ${category.name} category.`,
        );
      if (!existing.scopes.includes("structures"))
        existing.scopes.push("structures");
    } else {
      if (taxonomy.categories.some((item) => item.key === category.key))
        throw new Error(
          `Cannot upgrade Structures: ${category.name} already has a different identity. Review its mapping before upgrading.`,
        );
      taxonomy.categories.push(structuredClone(category));
      taxonomy.order.push(category.id);
    }
  }
  for (const term of STRUCTURE_TERMS) {
    const existing = taxonomy.terms.find((item) => item.id === term.id);
    if (existing) {
      if (existing.categoryId !== term.categoryId)
        throw new Error(
          "Cannot upgrade Structures: incompatible term ownership.",
        );
    } else {
      if (
        taxonomy.terms.some(
          (item) =>
            taxonomyValueKey(item.value) === taxonomyValueKey(term.value),
        )
      )
        throw new Error(
          `Cannot upgrade Structures: "${term.value}" already has a different identity. Review its mapping before upgrading.`,
        );
      taxonomy.terms.push(structuredClone(term));
    }
  }
  assertTaxonomy(taxonomy);
  if (!snapshot.structures)
    snapshot.structures = { schemaVersion: 1, structures: [] };
  return snapshot;
}
