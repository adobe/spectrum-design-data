// Copyright 2026 Adobe. All rights reserved.
import { createDefaultSnapshot } from "../../src/features/edit-session/state";
import {
  taxonomyEmissionKey,
  type TaxonomyCategory,
} from "../../src/features/taxonomy/model";
import {
  indexRegistryReferences,
  type RegistryReference,
} from "../../src/features/taxonomy/registryReferences";

export const registryCategoryIds = [
  "a1000000-0000-4000-8000-000000000001",
  "a1000000-0000-4000-8000-000000000002",
  "a1000000-0000-4000-8000-000000000003",
];
export const registryTermId = "a1000000-0000-4000-8000-000000000004";

export function createRegistrySnapshot() {
  const snapshot = createDefaultSnapshot();
  const taxonomy = snapshot.taxonomy;
  if (!taxonomy)
    throw new Error("The Registry story requires shipped taxonomy defaults.");
  const categories: TaxonomyCategory[] = registryCategoryIds.map(
    (id, index) => ({
      id,
      key: taxonomyEmissionKey(id),
      name: ["Example role", "Example surface", "Example empty"][index],
      description:
        index === 1
          ? "A longer description that wraps naturally inside a category card."
          : "",
      valueType: "string",
      cardinality: "one",
      scopes: ["colors", "typography"],
      required: false,
      includeInProjections: true,
    }),
  );
  return {
    ...snapshot,
    taxonomy: {
      ...taxonomy,
      categories: [...categories, ...taxonomy.categories],
      order: [...registryCategoryIds, ...taxonomy.order],
      terms: [
        ...taxonomy.terms,
        {
          id: registryTermId,
          categoryId: registryCategoryIds[0],
          value: "registry example",
          description: "A shared example term.",
        },
      ],
    },
  };
}

const reference = {
  classification: { [registryCategoryIds[0]]: registryTermId },
};
export const registryStoryReferences = indexRegistryReferences([
  ...["Example color token", "Example text token"].map(
    (label, index): RegistryReference => ({
      ...reference,
      id: `example-token:${index}`,
      label,
      group: "Token uses",
      owner: "Tokens",
      href: "#tokens",
    }),
  ),
  {
    ...reference,
    id: "example-foundation",
    label: "Example color scale",
    group: "Authoring references",
    owner: "Foundations",
    href: "#foundations",
    foundation: "colors",
  },
]);
