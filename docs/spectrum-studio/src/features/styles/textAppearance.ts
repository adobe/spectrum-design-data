// Copyright 2026 Adobe. All rights reserved.
import type { CSSProperties } from "react";
import type { TextStyleReference } from "../structures/elements";
import type { Structure } from "../structures/model";
import { leafElements } from "../structures/children";
import type { StyleArtifacts } from "./generation";
import type { StylesDocument } from "./model";
import { styleVariants } from "./generation";

export interface TextStyleSource {
  document: StylesDocument;
  artifacts: StyleArtifacts;
  modeKey: string;
}

export function textStyleReferenceIssues(
  reference: TextStyleReference,
  document: StylesDocument,
): string[] {
  const recipe = document.recipes.find(
    (recipe) => recipe.id === reference.recipeId,
  );
  if (!recipe || recipe.kind !== "text")
    return ["The referenced Text Style is unavailable or incompatible."];
  return Object.entries(reference.options).flatMap(([propertyId, optionId]) => {
    const property = recipe.options.find((entry) => entry.id === propertyId);
    return property?.kind === "variant" &&
      property.options.some((option) => option.id === optionId)
      ? []
      : ["The referenced Text Style option is unavailable."];
  });
}

export function structureTextStyleIssues(
  structures: readonly Structure[],
  document: StylesDocument,
): string[] {
  return structures.flatMap((structure) => [
    ...leafElements(structure).flatMap((element) =>
      element.textStyle
        ? textStyleReferenceIssues(element.textStyle, document)
        : [],
    ),
    ...Object.values(structure.editor?.overrides ?? {}).flatMap((override) =>
      Object.values(override.elements ?? {}).flatMap((element) =>
        element.textStyle
          ? textStyleReferenceIssues(element.textStyle, document)
          : [],
      ),
    ),
    ...Object.values(structure.editor?.layouts ?? {}).flatMap((layout) =>
      Object.values(layout.overrides ?? {}).flatMap((override) =>
        Object.values(override.elements ?? {}).flatMap((element) =>
          element.textStyle
            ? textStyleReferenceIssues(element.textStyle, document)
            : [],
        ),
      ),
    ),
  ]);
}

export function resolveTextStyleAppearance(
  reference: TextStyleReference,
  source: TextStyleSource,
  scaleIndex: number | undefined,
): { appearance: CSSProperties; issues: string[] } {
  const issues = textStyleReferenceIssues(reference, source.document);
  if (issues.length) return { appearance: {}, issues };
  const recipe = source.document.recipes.find(
    (recipe) => recipe.id === reference.recipeId,
  )!;
  const optionIds = recipe.options.flatMap((property) =>
    property.kind === "variant"
      ? [reference.options[property.id] ?? property.defaultOptionId]
      : [],
  );
  const selected = styleVariants(recipe).find(
    (variant) =>
      variant.optionIds.length === optionIds.length &&
      variant.optionIds.every((id) => optionIds.includes(id)),
  );
  if (!selected)
    return {
      appearance: {},
      issues: ["The Text Style variant is unavailable."],
    };
  const rows = source.artifacts.rows.filter(
    (row) =>
      row.recipeId === recipe.id &&
      row.modeKey === source.modeKey &&
      !row.outputId &&
      row.optionIds.length === optionIds.length &&
      row.optionIds.every((id) => optionIds.includes(id)),
  );
  issues.push(
    ...source.artifacts.issues
      .filter((issue) => !issue.recipeId || issue.recipeId === recipe.id)
      .map((issue) => issue.message),
  );
  const appearance: CSSProperties = {};
  for (const property of [
    "color",
    "fontFamily",
    "fontWeight",
    "lineHeight",
  ] as const) {
    const candidates = rows.filter(
      (row) =>
        row.property === property &&
        (property !== "lineHeight" || row.scaleIndex === scaleIndex),
    );
    if (candidates.length > 1) {
      issues.push(`Text Style ${property} is ambiguous.`);
      continue;
    }
    const row = candidates[0];
    if (!row) {
      if (selected.appearance[property])
        issues.push(
          property === "lineHeight"
            ? "Text Style line height needs an available typography scale index."
            : `The Text Style ${property} is unavailable.`,
        );
      continue;
    }
    if (property === "color" || property === "fontFamily")
      appearance[property] = String(row.value);
    else appearance[property] = row.value;
  }
  return { appearance, issues: [...new Set(issues)] };
}
