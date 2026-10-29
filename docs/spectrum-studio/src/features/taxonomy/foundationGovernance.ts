// Copyright 2026 Adobe. All rights reserved.
import type { TaxonomyNameReference } from "./naming";
import type {
  Classification,
  TaxonomyDocument,
  TaxonomyScope,
  TaxonomySourceContext,
} from "./model";
import type { ColorSystemDocument } from "../color-system/model";
import type { TypographyDocument } from "../typography/model";
import type { DimensionDocument } from "../scales/foundation";
import { clampScaleRange, scaleStepName } from "../scales/stepNames";
import { assertColorGovernance } from "./colorGovernance";
import { DIMENSION_SCOPES } from "./model";
import type { ElevationDocument } from "../elevation/model";
import type { Rule } from "../logic/model";

export function governedFoundationContext(
  document: TaxonomyDocument,
  scope: TaxonomyScope,
  name: TaxonomyNameReference,
  id: string,
  index?: number,
): TaxonomySourceContext {
  const classification: Classification = name.classification
    ? { ...name.classification }
    : { [name.categoryId]: name.termId };
  const property = document.categories.find(
    (category) => category.key === "property",
  );
  if (
    name.classification &&
    ["typography", "size", "radius"].includes(scope) &&
    (!property || !classification[property.id])
  ) {
    throw new Error(
      `The ${scope} foundation requires a registered Property assignment.`,
    );
  }
  const fields: [string, string | number][] = name.classification
    ? []
    : [["property", scope === "colors" ? "color" : scope]];
  if (index !== undefined) fields.push(["scaleIndex", index]);
  for (const [key, value] of fields) {
    const category = document.categories.find(
      (category) => category.key === key,
    );
    const term = document.terms.find(
      (term) => term.categoryId === category?.id && term.value === value,
    );
    if (
      !category ||
      category.cardinality !== "one" ||
      category.valueType !== typeof value ||
      !category.scopes.includes(scope) ||
      !term
    ) {
      throw new Error(
        `The ${scope} foundation requires a registered ${key} term for ${value}. Types and steps are governed by the foundation.`,
      );
    }
    classification[category.id] = term.id;
  }
  return {
    id,
    ...(index !== undefined && { stepId: String(index) }),
    governed: classification,
  };
}

export function assertFoundationGovernance(
  foundations: {
    color: ColorSystemDocument;
    typography: TypographyDocument;
    spacing: DimensionDocument;
    size: DimensionDocument;
    radius?: DimensionDocument;
    elevation?: ElevationDocument;
  },
  taxonomy: TaxonomyDocument,
  rules?: readonly Rule[],
) {
  assertColorGovernance(foundations.color, taxonomy, rules);
  const assertStep = (
    scope: TaxonomyScope,
    name: TaxonomyNameReference | undefined,
    sourceId: string,
    step: number,
    tokenId: string,
  ) => {
    if (!name) throw new Error(`Source ${sourceId} has no registered name.`);
    governedFoundationContext(taxonomy, scope, name, sourceId, step);
    if (taxonomy.classifications[tokenId])
      throw new Error(
        `Generated token ${tokenId} cannot override foundation-governed classification.`,
      );
  };
  for (const scope of DIMENSION_SCOPES)
    for (const scale of foundations[scope]?.scales ?? []) {
      const { below, above } = clampScaleRange(scale.below, scale.above);
      for (let position = -below; position <= above; position++) {
        const step = scaleStepName(position, below);
        assertStep(
          scope,
          scale.nameRef,
          `${scope}:${scale.id}`,
          step,
          `${scope}-${scale.id}-${step}`,
        );
      }
      if (foundations.elevation) {
        const document = foundations.elevation;
        governedFoundationContext(
          taxonomy,
          "elevation",
          document.name,
          `elevation:${document.id}`,
        );
        for (
          let index = -document.below;
          document.layers.length && index <= document.above;
          index++
        ) {
          assertStep(
            "elevation",
            document.name,
            `elevation:${document.id}`,
            scaleStepName(index, document.below),
            `elevation-${document.id}-${index}`,
          );
        }
      }
    }
  const typography = foundations.typography;
  if (!typography.metricNames)
    throw new Error("Typography metrics must reference registered names.");
  const { below, above } = clampScaleRange(
    typography.smallSizes,
    typography.largeSizes,
  );
  for (const [id, name] of Object.entries(typography.metricNames))
    for (let position = -below; position <= above; position++) {
      const step = scaleStepName(position, below);
      assertStep(
        "typography",
        name,
        `typography:${id}`,
        step,
        `typography-${id}-${step}`,
      );
    }
}
