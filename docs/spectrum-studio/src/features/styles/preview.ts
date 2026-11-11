// Copyright 2026 Adobe. All rights reserved.
import type { CSSProperties } from "react";
import { measureOutputContrast } from "../color-system/outputContrast";
import type { RgbGamut } from "../color-system/colorMath";
import type { ValuePreviewDescriptor } from "../tokens/valuePreview";
import type { StyleRecipe } from "./model";
import type { StyleRow } from "./generation";
import { canvasLabel } from "../structures/canvasGrid";

export function styleVariantLabel(
  recipe: StyleRecipe,
  optionIds: readonly string[],
) {
  return recipe.options
    .filter((property) => property.kind === "variant")
    .flatMap((property) =>
      property.options
        .filter((option) => optionIds.includes(option.id))
        .map((option) => canvasLabel(option.name)),
    )
    .join(" + ");
}

export function stylePreview(
  recipe: StyleRecipe,
  rows: StyleRow[],
  surface: string,
  gamut: RgbGamut,
): { preview: ValuePreviewDescriptor; appearance: CSSProperties } {
  const color = rows.find((row) => row.property === "color");
  if (!color)
    return {
      preview: {
        kind: "unavailable",
        message: "The style color is unavailable.",
      },
      appearance: {},
    };
  const appearance: CSSProperties = {};
  const value = (property: StyleRow["property"]) =>
    rows.find((row) => row.property === property)?.value;
  if (recipe.kind === "text") {
    if (value("fontFamily") !== undefined)
      appearance.fontFamily = String(value("fontFamily"));
    if (value("fontWeight") !== undefined)
      appearance.fontWeight = value("fontWeight");
    if (value("lineHeight") !== undefined)
      appearance.lineHeight = value("lineHeight");
  }
  if (recipe.kind === "border") {
    const width = rows.find((row) => row.property === "borderWidth");
    if (!width)
      return {
        preview: {
          kind: "unavailable",
          message: "The border width is unavailable.",
        },
        appearance: {},
      };
    appearance.borderWidth = `${width.value}${width.unit}`;
    appearance.background = "transparent";
  }
  if (
    recipe.kind === "background" &&
    measureOutputContrast(String(color.value), surface, gamut) < 3
  )
    appearance.boxShadow =
      "inset 0 0 0 1px var(--elements-preview-divider, rgb(0 0 0 / 20%))";
  return {
    preview: {
      kind:
        recipe.kind === "text"
          ? "text-color"
          : recipe.kind === "icon"
            ? "icon-color"
            : recipe.kind === "border"
              ? "border-color"
              : "color",
      value: color.value,
    },
    appearance,
  };
}
