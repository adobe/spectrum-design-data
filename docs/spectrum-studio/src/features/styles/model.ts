// Copyright 2026 Adobe. All rights reserved.
import { taxonomyIdPattern, type Classification } from "../taxonomy/model";
import type { TaxonomyNameReference } from "../taxonomy/naming";
import type { OptionProperty } from "../option-groups/model";

export const STYLE_KINDS = ["text", "icon", "background", "border"] as const;
export type StyleKind = (typeof STYLE_KINDS)[number];
export type StyleProperty =
  | "color"
  | "fontFamily"
  | "fontWeight"
  | "lineHeight"
  | "borderWidth";
export type StyleBinding =
  | { $ref: string; value?: never }
  | { value: string | number; $ref?: never };
export type StyleColor =
  | { kind: "single"; binding: StyleBinding }
  | { kind: "families"; familyIds: string[]; scaleIndex: number };
export interface StyleAppearance {
  color: StyleColor;
  fontFamily?: StyleBinding;
  fontWeight?: StyleBinding;
  lineHeight?: { metricId: string };
  borderWidth?: StyleBinding;
}
export interface StyleRuleApplication {
  id: string;
  ruleId: string;
  outputIds: string[];
}
export interface StyleRecipe {
  id: string;
  kind: StyleKind;
  name: TaxonomyNameReference;
  classification: Classification;
  appearance: StyleAppearance;
  options: OptionProperty[];
  differences: { [optionId: string]: Partial<StyleAppearance> };
  applications: StyleRuleApplication[];
}
export interface StylePublication {
  id: string;
  recipeId: string;
  key: string;
  rows: { [modeKey: string]: string };
}
export interface StylesDocument {
  schemaVersion: 1;
  recipes: StyleRecipe[];
  publications: StylePublication[];
  examples: { [recipeId: string]: { icon: string | null } };
}
export const EMPTY_STYLES: StylesDocument = {
  schemaVersion: 1,
  recipes: [],
  publications: [],
  examples: {},
};
export const STYLE_LABELS: Record<StyleKind, string> = {
  text: "Text styles",
  icon: "Icon styles",
  background: "Background styles",
  border: "Border styles",
};
export const STYLE_PROPERTIES: Record<StyleKind, readonly StyleProperty[]> = {
  text: ["color", "fontFamily", "fontWeight", "lineHeight"],
  icon: ["color"],
  background: ["color"],
  border: ["color", "borderWidth"],
};

const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const uuid = (value: unknown): value is string =>
  typeof value === "string" && taxonomyIdPattern.test(value);
const binding = (value: unknown): value is StyleBinding =>
  record(value) &&
  ((typeof value.$ref === "string" && Object.keys(value).length === 1) ||
    (Object.keys(value).length === 1 &&
      (typeof value.value === "string" ||
        (typeof value.value === "number" && Number.isFinite(value.value)))));
const classification = (value: unknown): value is Classification =>
  record(value) &&
  Object.values(value).every(
    (entry) =>
      typeof entry === "string" ||
      (Array.isArray(entry) && entry.every((id) => typeof id === "string")),
  );
export function isStyleAppearance(value: unknown, partial = false): boolean {
  if (!record(value)) return false;
  if (
    Object.keys(value).some(
      (key) =>
        ![
          "color",
          "fontFamily",
          "fontWeight",
          "lineHeight",
          "borderWidth",
        ].includes(key),
    )
  )
    return false;
  if (!partial || value.color !== undefined) {
    const color = value.color;
    if (!record(color)) return false;
    if (color.kind === "single") {
      if (!binding(color.binding)) return false;
    } else if (color.kind === "families") {
      if (
        !Array.isArray(color.familyIds) ||
        !color.familyIds.every((id) => typeof id === "string") ||
        new Set(color.familyIds).size !== color.familyIds.length ||
        !Number.isSafeInteger(color.scaleIndex)
      )
        return false;
    } else return false;
  }
  return (
    ["fontFamily", "fontWeight", "borderWidth"].every(
      (key) => value[key] === undefined || binding(value[key]),
    ) &&
    (value.lineHeight === undefined ||
      (record(value.lineHeight) &&
        typeof value.lineHeight.metricId === "string"))
  );
}
export function isStylesDocument(value: unknown): value is StylesDocument {
  if (
    !record(value) ||
    value.schemaVersion !== 1 ||
    !Array.isArray(value.recipes) ||
    !Array.isArray(value.publications) ||
    !record(value.examples)
  )
    return false;
  const ids = new Set<string>();
  const publicationKeys = new Set<string>();
  const claim = (value: unknown) => {
    if (!uuid(value) || ids.has(value)) return false;
    ids.add(value);
    return true;
  };
  return (
    value.recipes.every((recipe) => {
      if (
        !record(recipe) ||
        !claim(recipe.id) ||
        !STYLE_KINDS.some((kind) => kind === recipe.kind) ||
        !record(recipe.name) ||
        !uuid(recipe.name.categoryId) ||
        !uuid(recipe.name.termId) ||
        !classification(recipe.classification) ||
        !isStyleAppearance(recipe.appearance) ||
        !Array.isArray(recipe.options) ||
        !record(recipe.differences) ||
        !Object.values(recipe.differences).every((entry) =>
          isStyleAppearance(entry, true),
        ) ||
        !Array.isArray(recipe.applications)
      )
        return false;
      return (
        recipe.options.every(
          (option) =>
            record(option) &&
            claim(option.id) &&
            typeof option.name === "string" &&
            !!option.name.trim() &&
            (option.kind === "boolean"
              ? typeof option.defaultValue === "boolean"
              : option.kind === "variant" &&
                typeof option.defaultOptionId === "string" &&
                classification(option.classification) &&
                Array.isArray(option.options) &&
                option.options.length > 0 &&
                option.options.some(
                  (entry) =>
                    record(entry) && entry.id === option.defaultOptionId,
                ) &&
                option.options.every(
                  (entry) =>
                    record(entry) &&
                    claim(entry.id) &&
                    typeof entry.name === "string" &&
                    !!entry.name.trim() &&
                    classification(entry.classification),
                )),
        ) &&
        recipe.applications.every(
          (entry) =>
            record(entry) &&
            claim(entry.id) &&
            typeof entry.ruleId === "string" &&
            Array.isArray(entry.outputIds) &&
            new Set(entry.outputIds).size === entry.outputIds.length &&
            entry.outputIds.every((id) => typeof id === "string"),
        )
      );
    }) &&
    value.publications.every((entry) => {
      if (
        !record(entry) ||
        !claim(entry.id) ||
        !uuid(entry.recipeId) ||
        typeof entry.key !== "string" ||
        !record(entry.rows) ||
        !Object.values(entry.rows).every(claim)
      )
        return false;
      const key = JSON.stringify([entry.recipeId, entry.key]);
      if (publicationKeys.has(key)) return false;
      publicationKeys.add(key);
      return true;
    }) &&
    Object.values(value.examples).every(
      (entry) =>
        record(entry) &&
        (entry.icon === null || typeof entry.icon === "string"),
    )
  );
}
