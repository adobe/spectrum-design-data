// Copyright 2026 Adobe. All rights reserved.
import type { Classification, DimensionScope, TaxonomyDocument } from "./model";
import type { TaxonomyNameReference } from "./naming";
import { classificationFromValues } from "./orderedVocabulary";
import { taxonomyValueKey } from "./model";

export interface ClassifiedNameReference extends TaxonomyNameReference {
  classification?: Classification;
}

const dimensionNames: Record<
  string,
  { scope: DimensionScope; termId: string; values: Record<string, string> }
> = {
  "spacing-scale-1": {
    scope: "spacing",
    termId: "55198c75-7de7-4284-ba9a-0eaa2e47aeb7",
    values: { tokenCategory: "Spacing" },
  },
  "size-scale-1": {
    scope: "size",
    termId: "55198c75-7de7-4284-ba9a-0eaa2e47aeb7",
    values: { property: "size" },
  },
  "radius-scale-5eb175b0-4f95-4e9f-9937-4f7f84ae7572": {
    scope: "radius",
    termId: "55198c75-7de7-4284-ba9a-0eaa2e47aeb7",
    values: { property: "radius" },
  },
  "spacing-scale-af9cf747-5c46-41a8-b37c-1fe306f506c4": {
    scope: "spacing",
    termId: "ead04990-42c3-4483-ba37-c77410f31c57",
    values: { tokenCategory: "Spacing", structure: "Base", axis: "Horizontal" },
  },
  "spacing-scale-95a2557d-d4bb-4102-a129-2b1f33ddf5cc": {
    scope: "spacing",
    termId: "240bd9ba-271a-405d-9514-a627942d6b42",
    values: { tokenCategory: "Spacing", structure: "Base", property: "gap" },
  },
};

export function dimensionNameClassification(
  scope: DimensionScope,
  reference: TaxonomyNameReference,
  taxonomy: TaxonomyDocument,
): Classification {
  return {
    ...classificationFromValues(
      taxonomy,
      scope === "spacing" ? { tokenCategory: "Spacing" } : { property: scope },
    ),
    [reference.categoryId]: reference.termId,
  };
}

export function upgradeDimensionName(
  scope: DimensionScope,
  sourceId: string,
  reference: ClassifiedNameReference,
  taxonomy: TaxonomyDocument,
): ClassifiedNameReference {
  if (reference.classification) return structuredClone(reference);
  const mapping = dimensionNames[sourceId];
  const value = taxonomy.terms.find(
    (term) => term.id === reference.termId,
  )?.value;
  const shippedLabel =
    sourceId === "spacing-scale-af9cf747-5c46-41a8-b37c-1fe306f506c4"
      ? "Base horizontal spacing"
      : sourceId === "spacing-scale-95a2557d-d4bb-4102-a129-2b1f33ddf5cc"
        ? "Base gap"
        : "Global";
  const classification =
    mapping?.scope === scope &&
    reference.termId === mapping.termId &&
    taxonomyValueKey(value ?? "") === taxonomyValueKey(shippedLabel)
      ? classificationFromValues(taxonomy, mapping.values)
      : dimensionNameClassification(scope, reference, taxonomy);
  return { ...reference, classification };
}

const metricMappings: Record<
  string,
  { termId: string; element: string; property: string }
> = {
  "font-size": {
    termId: "5fa1d788-9cac-432e-bd81-59f6f44cca74",
    element: "Text",
    property: "size",
  },
  "workflow-icon-size": {
    termId: "3c05ef8a-5db5-4dc7-ba17-b4a49bcf6572",
    element: "Workflow-icon",
    property: "size",
  },
  "body-lineHeight": {
    termId: "e2cf6b2b-51e6-4f21-bd2f-648e7f926bc0",
    element: "Body",
    property: "Line height",
  },
  "body-unitlessLineHeight": {
    termId: "6e24c1d3-9ce0-45e1-bb08-63a4b27a84cf",
    element: "Body",
    property: "Unitless line height",
  },
  "heading-lineHeight": {
    termId: "8b5b07df-4e82-43b7-82b3-4424d2e23804",
    element: "Heading",
    property: "Line height",
  },
  "heading-unitlessLineHeight": {
    termId: "2e8c45ba-2485-4471-a25f-3df1cf3aed15",
    element: "Heading",
    property: "Unitless line height",
  },
  "component-lineHeight": {
    termId: "7895eec1-0f02-4916-98de-2d720300dfed",
    element: "Component",
    property: "Line height",
  },
  "component-unitlessLineHeight": {
    termId: "e3498a74-2fbd-4767-b5c3-6bf2072cdb2a",
    element: "Component",
    property: "Unitless line height",
  },
};

export function upgradeMetricName(
  metricId: string,
  reference: ClassifiedNameReference,
  taxonomy: TaxonomyDocument,
): ClassifiedNameReference {
  if (reference.classification) return structuredClone(reference);
  const mapping = metricMappings[metricId];
  const term = taxonomy.terms.find((term) => term.id === reference.termId);
  if (!term)
    throw new Error(`Typography metric ${metricId} has an unavailable name.`);
  if (
    mapping?.termId === reference.termId &&
    taxonomyValueKey(term.value) === taxonomyValueKey(metricId)
  ) {
    const classification = classificationFromValues(taxonomy, {
      element: mapping.element,
      property: mapping.property,
    });
    const element = taxonomy.categories.find(
      (category) => category.key === "element",
    )!;
    return {
      categoryId: element.id,
      termId: String(classification[element.id]),
      classification,
    };
  }
  const property = metricId.endsWith("-unitlessLineHeight")
    ? "Unitless line height"
    : metricId.endsWith("-lineHeight")
      ? "Line height"
      : "size";
  return {
    ...reference,
    classification: {
      [reference.categoryId]: reference.termId,
      ...classificationFromValues(taxonomy, { property }),
    },
  };
}

export function upgradeElevationName(
  reference: ClassifiedNameReference,
  taxonomy: TaxonomyDocument,
): ClassifiedNameReference {
  if (reference.classification) return structuredClone(reference);
  const term = taxonomy.terms.find((term) => term.id === reference.termId);
  const values = { element: "Surface", attribute: "Shadow" };
  const classification = classificationFromValues(taxonomy, values);
  if (
    reference.termId !== "0d8d551f-3797-4c69-abd5-e111a4f799b9" ||
    taxonomyValueKey(term?.value ?? "") !== "elevation scale"
  ) {
    classification[reference.categoryId] = reference.termId;
  }
  return { ...reference, classification };
}
