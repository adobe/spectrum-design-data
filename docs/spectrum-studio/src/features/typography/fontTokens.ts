// Copyright 2026 Adobe. All rights reserved.
import {
  projectClassification,
  taxonomyValueKey,
  type TaxonomyDocument,
} from "../taxonomy/model";
import type { TypographyFont } from "./model";
import type { BrowserTokenSource } from "../tokens/browserModel";

export const FONT_FAMILY_SCHEMA =
  "https://opensource.adobe.com/spectrum-design-data/schemas/token-types/font-family.json";
export const FONT_FAMILY_PATTERN = /^(?:"?\w+"? ?,? ?)*"?\w+"?$/;

export function fontFamilyOutputIssue(
  token: Pick<BrowserTokenSource, "fontId" | "referenceId" | "name" | "value">,
): string | undefined {
  if (
    token.fontId &&
    !token.referenceId &&
    (typeof token.value !== "string" || !FONT_FAMILY_PATTERN.test(token.value))
  )
    return `Set a valid font family for ${token.name} before exporting.`;
}

export function fontTokenSources(
  fonts: readonly TypographyFont[],
  registry: TaxonomyDocument,
): BrowserTokenSource[] {
  return fonts.map((font) => {
    const classification: Record<string, string> = {};
    for (const [field, value] of [["property", "font-family"]]) {
      const category = registry.categories.find(
        (category) => category.key === field,
      );
      const term = registry.terms.find(
        (term) =>
          term.categoryId === category?.id &&
          taxonomyValueKey(term.value) === value,
      );
      if (category && term) classification[category.id] = term.id;
    }
    if (font.nameReference)
      classification[font.nameReference.categoryId] = font.nameReference.termId;
    const projection = projectClassification(
      registry,
      classification,
      "typography",
    );
    if (
      !Object.hasOwn(projection.flat, "family") ||
      projection.flat.property !== "font-family"
    )
      projection.issues.push("Choose registered Font family and Family terms.");
    return {
      id: font.conceptId,
      sourceId: font.id,
      rowId: font.uuid,
      fontId: font.id,
      tier: "primitive",
      type: "typography",
      groupId: "font-family",
      groupLabel: "Fonts",
      name: projection.name,
      generatedName: projection.name,
      value: font.fontFamily,
      generatedValue: font.fontFamily,
      unit: "",
      projection,
      taxonomyEvidence: { property: "font-family" },
      taxonomySource: { id: font.id, governed: classification },
    };
  });
}
