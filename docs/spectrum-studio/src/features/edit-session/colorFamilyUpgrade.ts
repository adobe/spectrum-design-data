// Copyright 2026 Adobe. All rights reserved.
import type { EditSessionSnapshot } from "./state";

const colorCategoryId = "b8fbee94-999d-4776-bf18-1b807b3f60b0";

/** Only the checked-in legacy field is renamed; classifications continue referencing the same UUIDs. */
export function upgradeColorFamilySnapshot(
  snapshot: EditSessionSnapshot,
): EditSessionSnapshot {
  const taxonomy = snapshot.taxonomy;
  const legacy = taxonomy?.categories.find(
    (category) =>
      category.id === colorCategoryId && category.key === "colorName",
  );
  if (!taxonomy || !legacy) return snapshot;
  if (
    taxonomy.categories.some(
      (category) => category.key === "colorFamily" && category.id !== legacy.id,
    )
  )
    throw new Error(
      "Color family already belongs to another Registry category. Your stored data has not been changed. Review the conflicting category before restoring.",
    );
  return {
    ...snapshot,
    taxonomy: {
      ...taxonomy,
      categories: taxonomy.categories.map((category) =>
        category.id === legacy.id
          ? {
              ...category,
              key: "colorFamily",
              name:
                category.name === "Color name" ? "Color family" : category.name,
            }
          : category,
      ),
    },
  };
}
