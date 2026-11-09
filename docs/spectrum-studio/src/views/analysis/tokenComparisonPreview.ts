// Copyright 2026 Adobe. All rights reserved.
import {
  createValuePreview,
  classificationPreviewKind,
  unavailablePreview,
  type ValuePreviewDescriptor,
  type ValuePreviewKind,
  type PreviewUnit,
} from "../../features/tokens/valuePreview";
import {
  scalarValue,
  shadowLayers,
  foundationProperty,
} from "../../features/design-data/foundationValues";
import { shadowText } from "../../features/tokens/tokenAssignments";
import {
  normalizedOpacity,
  type ColorOpacityConcept,
  type ColorOpacityRow,
} from "../../features/design-data/colorOpacityAssessment";

export function comparisonValuePreview(
  concept: ColorOpacityConcept,
  row: ColorOpacityRow,
  side: "app" | "reference",
): ValuePreviewDescriptor {
  const value = side === "app" ? row.appValue : row.referenceValue;
  const record = side === "app" ? row.app : row.reference;
  if (value === undefined || value === null)
    return unavailablePreview("This value cannot be resolved.");
  if (concept.type === "color")
    return typeof value === "string"
      ? createValuePreview("color", value)
      : unavailablePreview("A resolved color is required.");
  if (concept.type === "opacity") {
    const alpha = normalizedOpacity(value);
    return alpha === undefined
      ? unavailablePreview("A resolved opacity is required.")
      : createValuePreview("opacity", alpha);
  }
  if (concept.type === "elevation") {
    try {
      return createValuePreview("shadow", shadowText(shadowLayers(value)));
    } catch (error) {
      return unavailablePreview(
        error instanceof Error ? error.message : String(error),
      );
    }
  }
  if (concept.type === "motion")
    return unavailablePreview("Motion preview is not available.");
  const property = record ? foundationProperty(record) : undefined;
  const kinds: Record<string, ValuePreviewKind> = {
    "font-size": "font-size",
    "font-family": "font-family",
    "font-weight": "font-weight",
    "line-height": "line-height",
    "unitless-line-height": "line-height",
    "line-height-multiplier": "line-height",
    "icon-size": "icon-size",
  };
  const kind =
    (record?.taxonomy &&
      classificationPreviewKind(record.taxonomy.classification)) ||
    kinds[String(property)] ||
    (concept.type === "radius" ? "radius" : "block");
  const scalar = scalarValue(value, record?.unit);
  if (scalar) {
    if (!["", "px", "rem", "em"].includes(scalar.unit))
      return unavailablePreview("This unit is not supported by the preview.");
    return createValuePreview(
      kind,
      scalar.value,
      property === "unitless-line-height" ||
        property === "line-height-multiplier"
        ? "multiplier"
        : (scalar.unit as PreviewUnit),
    );
  }
  return typeof value === "string" && kind === "font-family"
    ? createValuePreview(kind, value)
    : unavailablePreview("This value has no supported visual preview.");
}
