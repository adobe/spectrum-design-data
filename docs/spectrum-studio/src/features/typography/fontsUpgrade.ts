// Copyright 2026 Adobe. All rights reserved.
import dataset from "../../data/design-system.defaults.json" with { type: "json" };
import { TYPOGRAPHY_SCHEMA_VERSION, isTypographyFont } from "./model";
import { reconcileFontNames } from "./fontVocabulary";
import { isTaxonomyDocument } from "../taxonomy/model";

export function upgradeTypographyFontsDocument(
  value: unknown,
  allocations = new Map<string, string>(),
): unknown {
  if (
    !value ||
    typeof value !== "object" ||
    !("schemaVersion" in value) ||
    (value.schemaVersion !== 9 && value.schemaVersion !== 10)
  )
    return value;
  const fonts =
    "fonts" in value
      ? value.fonts
      : dataset.system.foundations.typography.fonts;
  const allocate = (id: string, field: "uuid" | "conceptId") => {
    const shipped = dataset.system.foundations.typography.fonts.find(
      (font) => font.id === id,
    );
    if (shipped) return shipped[field];
    const key = `font:${id}:${field}`;
    let uuid = allocations.get(key);
    if (!uuid) {
      uuid = crypto.randomUUID();
      allocations.set(key, uuid);
    }
    return uuid;
  };
  return {
    ...value,
    schemaVersion: TYPOGRAPHY_SCHEMA_VERSION,
    fonts: Array.isArray(fonts)
      ? fonts.map((font: unknown) => {
          if (
            !font ||
            typeof font !== "object" ||
            !("id" in font) ||
            typeof font.id !== "string"
          )
            return font;
          return {
            ...font,
            ...(!("uuid" in font) && { uuid: allocate(font.id, "uuid") }),
            ...(!("conceptId" in font) && {
              conceptId: allocate(font.id, "conceptId"),
            }),
          };
        })
      : fonts,
  };
}

export function upgradeTypographyFontsSnapshot(
  value: unknown,
  allocations?: Map<string, string>,
): unknown {
  if (!value || typeof value !== "object" || !("typography" in value))
    return value;
  let typography = upgradeTypographyFontsDocument(
    value.typography,
    allocations,
  );
  const named =
    "taxonomy" in value &&
    isTaxonomyDocument(value.taxonomy) &&
    typography &&
    typeof typography === "object" &&
    "fonts" in typography &&
    Array.isArray(typography.fonts) &&
    typography.fonts.every(isTypographyFont)
      ? reconcileFontNames(value.taxonomy, typography.fonts, allocations)
      : undefined;
  const taxonomy = named?.taxonomy;
  if (
    named &&
    typography &&
    typeof typography === "object" &&
    "fonts" in typography &&
    Array.isArray(typography.fonts)
  ) {
    const fonts = typography.fonts;
    if (named.fonts.some((font, index) => font !== fonts[index]))
      typography = { ...typography, fonts: named.fonts };
  }
  return typography === value.typography &&
    (!taxonomy ||
      taxonomy === ("taxonomy" in value ? value.taxonomy : undefined))
    ? value
    : { ...value, typography, ...(taxonomy && { taxonomy }) };
}
