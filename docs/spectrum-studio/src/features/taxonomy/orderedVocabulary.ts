// Copyright 2026 Adobe. All rights reserved.
import {
  assertTaxonomy,
  normalizeTaxonomyTerms,
  taxonomyValueKey,
  type Classification,
  type TaxonomyDocument,
  type TaxonomyScope,
} from "./model";

export const ORDERED_CATEGORY_IDS = {
  tokenCategory: "e4f99e18-de9b-4e35-8e19-51ef1103e8db",
  role: "11c250f8-e57b-436e-95b8-6296c2b89165",
  affordance: "4357df60-b3b1-4206-bd27-5dea6e7a4474",
  element: "1c9dc5cf-5df3-4d4b-a25a-cf24c7e53efa",
  visibility: "eef4f38f-f4e9-42b9-97d4-0f4d561b4a53",
  attribute: "ca732a26-decb-4746-9afc-3567ec0d445e",
  density: "f65fecd0-3e68-4531-927d-cd52c203c0de",
  shape: "25fb04b2-3b64-410c-aa3d-782ced59b6c3",
  interactiveContext: "8915faa1-1a27-48ce-b4fe-1ba29bf7505b",
  interaction: "73de6ad1-a9b2-47db-8d3a-92ef7ef9ab3b",
  number: "f0ba0ee1-786b-4cf5-ab99-85d8e167407e",
} as const;

export const DEFAULT_GROUP_KEYS = [
  "tokenCategory",
  "colorFamily",
  "contrastLabel",
  "surfaceName",
  "foundationScale",
  "typographyMetric",
  "structure",
  "role",
  "affordance",
  "element",
  "visibility",
  "attribute",
  "constraint",
  "property",
  "axis",
  "position",
  "size",
  "density",
  "shape",
  "interactiveContext",
  "interaction",
  "scaleIndex",
  "number",
] as const;

const vocabulary: Record<string, readonly (readonly [string, string])[]> = {
  tokenCategory: [["014d018b-da56-4a93-9190-753ad548a4c2", "spacing"]],
  role: [
    ["d20e0d12-0915-4d33-91f4-ba1b6272326f", "positive"],
    ["b1529dac-f806-4cf4-828e-18053154d25f", "negative"],
    ["c987efac-c9dd-413b-8f9d-973815d089e4", "informative"],
    ["63da69ae-6929-4d6f-ae36-6750a5d315b0", "warning"],
    ["bb9dd37e-a07f-4602-97df-faec059917c7", "neutral"],
    ["6e32af80-32c2-4c5a-afb3-e8ed734543d3", "accent"],
  ],
  affordance: [
    ["a5172f9f-230b-4be8-923c-e9c29e236d7f", "drop-target"],
    ["f90152cb-85a8-4705-a687-42444c165906", "focus-ring"],
    ["fd85e5ef-e972-4338-8926-408aa70d317f", "selection-indicator"],
    ["ac4d88f1-5527-45cf-96e8-f2cc41c2e356", "drag-handle"],
  ],
  element: [
    ["34e351e7-37c2-4df2-ac75-4f04e25272f3", "text"],
    ["44d05161-a960-4fed-ac11-723b4021cca0", "visual"],
    ["b8b5a40d-a9c1-49bd-8df7-ed52571b4206", "workflow-icon"],
    ["c8bb5451-b245-4de7-806a-ea006a15a1ae", "ui-icon"],
    ["03556ff4-f6e6-48bd-89a8-91d9c78ce730", "bar"],
    ["a34bad93-394a-4cfb-b0be-7c9a20121a8a", "control"],
    ["e4673609-c0e2-4901-a8c5-575760c91268", "pasteboard"],
    ["d0ebe9d1-5047-4c6a-b4ea-2b7c93247763", "page"],
    ["fad3c19d-37af-42c3-91bb-ca66256a8319", "section"],
    ["dc9261fa-bc9b-45c6-b33d-bbb52adfff25", "artboard"],
    ["5b1c777b-5cb8-444d-940b-9e6202f0d060", "surface"],
    ["1853e628-2844-45e9-8a8c-fe305d941f09", "body"],
    ["89fa5d09-9e0c-48cd-9666-4935afbe86e8", "heading"],
    ["ac662c53-df93-4c8a-aecd-2981b2446d67", "component"],
  ],
  visibility: [
    ["66bee4d1-0ec4-49c7-bb9d-652a18c28554", "subtle"],
    ["c87612a6-a139-4ebd-a444-6a0937d3ba69", "subdued"],
    ["cfea4437-94b0-4354-a0d9-0e1d5cb1039a", "emphasized"],
  ],
  attribute: [
    ["157a59a8-44dd-4c1d-ac39-487201482d84", "border"],
    ["d52e1d8b-48e0-4a02-9668-8c7cb5e25a62", "background"],
    ["800c0491-1be2-462b-b59d-903646a1ae28", "dash"],
    ["1c482aeb-cb4d-4a0b-a36b-109017829881", "shadow"],
    ["e5643915-92be-4bf0-a173-9c5701342d8a", "corner"],
    ["69d020c3-e3f0-475b-b906-7a937961e149", "overlay"],
    ["bb4daecc-46ac-4f99-80d0-2bffc1d81343", "gradient"],
  ],
  density: [
    ["b9e315d9-ad01-46e4-8371-fa51af88fe53", "regular"],
    ["bf3202a6-0725-45da-a1b2-0e79ae284f42", "compact"],
    ["6bc36b92-e824-4946-8340-147d5cc95cc5", "spacious"],
  ],
  shape: [["96e228e5-00f8-44f3-ace4-63d0e5067d44", "uniform"]],
  interactiveContext: [
    ["50becbf0-9cf5-4df6-a656-dd9cb1d66a60", "selected"],
    ["b22bd8a4-08c2-4186-ba99-cda3b29ad344", "disabled"],
    ["f35609ce-cce8-422a-a504-fd4e7a92e792", "loading"],
  ],
  interaction: [
    ["7e0af4fe-fa80-4f0a-ab95-448324ee8e9a", "default"],
    ["47dccbe1-70ac-4879-a770-93f292b48907", "hover"],
    ["83361a0d-207e-43fc-83c9-259346571c22", "focus"],
    ["1ef67476-ec27-4587-99b3-85512a392fa7", "down"],
    ["e5660667-58fe-4c1c-b914-dfdef87116e0", "drag"],
  ],
  structure: [
    ["b5cf8569-078f-40b1-8207-dddddd3aa2a5", "base"],
    ["8de84d9d-f5b9-41fb-a714-1a64e970aca1", "list"],
    ["c0abaa73-3a65-4d2d-854e-410c098f86b0", "list-item"],
    ["ac7d89f6-b1bb-476f-a03a-8e356017b4d2", "container"],
    ["4402f568-5db9-4cee-93a3-e3e9421dd170", "accessory"],
    ["9f9a1661-59c5-48c5-9a6a-0338e3cefd97", "accessory-item"],
    ["09a56b81-da7a-4a40-a4be-bfcde9bd11d7", "banner"],
    ["c36f68a9-0175-49d3-8495-222761fbe0a8", "group"],
    ["809c6732-5e80-438c-9f7d-ce817894c0b1", "field"],
    ["2241056b-4ca1-4a13-ab03-cdad385e1de7", "form"],
    ["aecefcb0-9505-4985-a297-d21e42113fd8", "app"],
  ],
  property: [
    ["995ee216-3c2a-4269-bd5c-a3a9b474ead7", "indent"],
    ["31d59200-639b-4c93-8fbf-fc7df5f0ce2a", "opacity"],
    ["dbabc8b1-acf4-49da-817a-ec82cbb76796", "length"],
    ["b44f2c34-0bd1-434a-bbdf-e76ff1faa47d", "blur"],
    ["c8a9ce12-b5e9-4104-b9a4-cb4324ec80b8", "offset"],
    ["56f9f8bd-2914-4c71-b4b9-1f1a3eb7c192", "angle"],
    ["9f41e456-c913-40cd-8d21-f70f62c01524", "step"],
    ["571849ff-8090-4cf2-b1ed-6ccae9bf82d1", "aspect-ratio"],
    ["766c6a6a-b0b7-4b5a-b6c2-6cad686ddeab", "thickness"],
    ["1fd3e56e-f57d-48ab-ba5b-09b6e42c0c0b", "stop"],
    ["25628e5a-e4d7-4a41-adba-4fc01ab76343", "line height"],
    ["845cdc7d-14e9-4e24-a69e-28d4968ec1dd", "unitless line height"],
  ],
  position: [
    ["e0af254c-29c0-4898-8d7d-843831772822", "start"],
    ["41f11fc2-0dca-4379-95d0-7fc082458f36", "end"],
    ["58d98056-7c04-4915-91b7-3c11a14b7f09", "affixed"],
  ],
  size: [
    ["82296acb-a06d-4e86-aa3b-fb33aea29b3b", "3x-small"],
    ["bf90cb12-60ed-4f9e-8508-4f33501cd8c9", "2x-small"],
    ["2d438e52-5d4e-4ab7-8126-45059bf5195d", "2x-large"],
    ["d6748cb2-9ff0-4ef6-8848-fbdeb8377f73", "3x-large"],
  ],
};

const labels: Record<keyof typeof ORDERED_CATEGORY_IDS, string> = {
  tokenCategory: "Token category",
  role: "Role",
  affordance: "Affordance",
  element: "Element",
  visibility: "Visibility",
  attribute: "Attribute",
  density: "Density",
  shape: "Shape",
  interactiveContext: "Interactive context",
  interaction: "Interaction",
  number: "Number",
};
const allScopes: TaxonomyScope[] = [
  "colors",
  "typography",
  "spacing",
  "size",
  "radius",
  "elevation",
  "structures",
];

export function classificationFromValues(
  document: TaxonomyDocument,
  values: Record<string, string | number>,
): Classification {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => {
      const category = document.categories.find((item) => item.key === key);
      const term = document.terms.find(
        (item) =>
          item.categoryId === category?.id &&
          taxonomyValueKey(item.value) === taxonomyValueKey(value),
      );
      if (!category || !term || typeof term.value !== typeof value)
        throw new Error(`Unresolved ${key} classification: ${value}.`);
      return [category.id, term.id];
    }),
  );
}

/** Fixed checked-in IDs make this upgrade deterministic and preserve custom records. */
export function upgradeOrderedVocabulary(
  previous: TaxonomyDocument,
): TaxonomyDocument {
  assertTaxonomy(previous);
  if (
    Object.values(previous.classifications).some((classification) =>
      Object.values(classification).some(Array.isArray),
    )
  ) {
    throw new Error(
      "Review ordered-term assignments before upgrading to one term per group. Your existing data has not been changed.",
    );
  }
  const document = structuredClone(previous);
  for (const [key, id] of Object.entries(ORDERED_CATEGORY_IDS)) {
    const existing = document.categories.find(
      (category) => category.key === key || category.id === id,
    );
    if (existing) {
      if (existing.id !== id || existing.key !== key)
        throw new Error(
          `Review the existing ${key} Registry identity before upgrading.`,
        );
      continue;
    }
    document.categories.push({
      id,
      key,
      name: labels[key as keyof typeof labels],
      description: "",
      valueType: key === "number" ? "number" : "string",
      cardinality: "one",
      scopes: [...allScopes],
      required: false,
      includeInProjections: true,
    });
    document.order.push(id);
  }
  for (const category of document.categories) {
    category.cardinality = "one";
    if (
      ["structure", "constraint", "axis", "position", "size"].includes(
        category.key,
      ) &&
      category.scopes.length === 1 &&
      category.scopes[0] === "structures"
    )
      category.scopes = [...allScopes];
    if (
      category.key === "property" &&
      category.required &&
      !category.includeInProjections
    ) {
      category.required = false;
      category.includeInProjections = true;
    }
    if (category.key === "constraint" && category.name === "Constraint")
      category.name = "Property constraint";
    if (category.key === "axis" && category.name === "Axis")
      category.name = "Orientation";
  }
  for (const [id, before, after] of [
    ["ccfdbc1d-60a4-4c7f-ac64-51961c2fa5e9", "overlay", "Floating surface"],
    ["0d8d551f-3797-4c69-abd5-e111a4f799b9", "Shadow", "Elevation scale"],
  ]) {
    const term = document.terms.find((item) => item.id === id);
    if (term && term.value === before) term.value = after;
  }
  const spacing = document.terms.find(
    (term) =>
      term.id === "e08abb17-faa1-4b6e-97ed-a7ee9af32af5" &&
      taxonomyValueKey(term.value) === "spacing",
  );
  if (spacing) {
    if (
      Object.values(document.classifications).some((classification) =>
        Object.values(classification).flat().includes(spacing.id),
      )
    ) {
      throw new Error(
        "Review custom Spacing classifications before migrating its category.",
      );
    }
    document.terms = document.terms.filter((term) => term.id !== spacing.id);
  }
  for (const [key, entries] of Object.entries(vocabulary)) {
    const category = document.categories.find((item) => item.key === key);
    if (!category)
      throw new Error(
        `The ${key} category is required before its vocabulary can be upgraded.`,
      );
    for (const [id, value] of entries) {
      const existing = document.terms.find(
        (term) =>
          taxonomyValueKey(term.value) === taxonomyValueKey(value) ||
          term.id === id,
      );
      if (existing) {
        if (
          existing.categoryId !== category.id ||
          taxonomyValueKey(existing.value) !== taxonomyValueKey(value)
        )
          throw new Error(`Review "${value}" ownership before upgrading.`);
      } else
        document.terms.push({
          id,
          categoryId: category.id,
          value,
          description: "",
        });
    }
  }
  assertTaxonomy(document);
  return normalizeTaxonomyTerms(document);
}

export function defaultOrderedGroups(document: TaxonomyDocument): string[] {
  const ordered = DEFAULT_GROUP_KEYS.map((key) => {
    const category = document.categories.find((item) => item.key === key);
    if (!category) throw new Error(`Missing default taxonomy group ${key}.`);
    return category.id;
  });
  return [...ordered, ...document.order.filter((id) => !ordered.includes(id))];
}
