// Copyright 2026 Adobe. All rights reserved.
import type { CSSProperties } from "react";
import type { GeneratedShadow } from "../elevation/model";
import { shadowCss } from "../elevation/generate";
import type {
  Classification,
  TaxonomyProjection,
  TaxonomySourceContext,
} from "../taxonomy/model";
import { ORDERED_CATEGORY_IDS } from "../taxonomy/orderedVocabulary";
import {
  STRUCTURE_CATEGORY_IDS,
  STRUCTURE_TERM_IDS,
} from "../structures/vocabulary";

export type ValuePreviewKind =
  | "opacity"
  | "color"
  | "text-color"
  | "border-color"
  | "border-width"
  | "font-size"
  | "font-weight"
  | "font-family"
  | "line-height"
  | "icon-size"
  | "icon-color"
  | "block"
  | "radius"
  | "shadow"
  | "shadow-blur"
  | "shadow-offset-x"
  | "shadow-offset-y"
  | "shadow-spread"
  | "shadow-color";
export type PreviewUnit = "px" | "rem" | "em" | "multiplier" | "";
export type ValuePreviewDescriptor =
  | { kind: ValuePreviewKind; value: number | string; unit?: PreviewUnit }
  | { kind: "unavailable"; message: string };

export interface PreviewTextOptions {
  fontSize?: number;
  fontWeight?: CSSProperties["fontWeight"];
  fontStyle?: CSSProperties["fontStyle"];
  fontFamily?: string;
}
export const PREVIEW_DEFAULTS = {
  squareSize: 24,
  fontSize: 16,
  iconSize: 16,
  shadowSize: 20,
  blockHeight: 12,
} as const;

// These are existing Registry identities, not new preview-specific vocabulary.
export const PREVIEW_TERM_IDS = {
  text: "34e351e7-37c2-4df2-ac75-4f04e25272f3",
  workflowIcon: "b8b5a40d-a9c1-49bd-8df7-ed52571b4206",
  uiIcon: "c8bb5451-b245-4de7-806a-ea006a15a1ae",
  border: "157a59a8-44dd-4c1d-ac39-487201482d84",
  background: "d52e1d8b-48e0-4a02-9668-8c7cb5e25a62",
  shadow: "1c482aeb-cb4d-4a0b-a36b-109017829881",
  color: "73d1c87a-7ca9-4f40-9404-8ae65dc26833",
  size: "273990a0-e71e-4249-9628-7e8fa689747b",
  thickness: "766c6a6a-b0b7-4b5a-b6c2-6cad686ddeab",
  lineHeight: "25628e5a-e4d7-4a41-adba-4fc01ab76343",
  unitlessLineHeight: "845cdc7d-14e9-4e24-a69e-28d4968ec1dd",
  blur: "b44f2c34-0bd1-434a-bbdf-e76ff1faa47d",
  offset: "c8a9ce12-b5e9-4104-b9a4-cb4324ec80b8",
  length: "dbabc8b1-acf4-49da-817a-ec82cbb76796",
} as const;

export function createValuePreview(
  kind: ValuePreviewKind,
  value: number | string,
  unit?: PreviewUnit,
): ValuePreviewDescriptor {
  return { kind, value, ...(unit !== undefined && { unit }) };
}
export function unavailablePreview(message: string): ValuePreviewDescriptor {
  return { kind: "unavailable", message };
}

export function classificationPreviewKind(
  classification: Classification,
): ValuePreviewKind | undefined {
  const element = classification[ORDERED_CATEGORY_IDS.element];
  const attribute = classification[ORDERED_CATEGORY_IDS.attribute];
  const property = classification[STRUCTURE_CATEGORY_IDS.property];
  const icon =
    element === PREVIEW_TERM_IDS.workflowIcon ||
    element === PREVIEW_TERM_IDS.uiIcon;
  if (
    property === PREVIEW_TERM_IDS.lineHeight ||
    property === PREVIEW_TERM_IDS.unitlessLineHeight
  )
    return "line-height";
  if (property === STRUCTURE_TERM_IDS.radius) return "radius";
  if (attribute === PREVIEW_TERM_IDS.shadow) {
    if (property === PREVIEW_TERM_IDS.color) return "shadow-color";
    if (property === PREVIEW_TERM_IDS.blur) return "shadow-blur";
    if (property === PREVIEW_TERM_IDS.offset) {
      const axis = classification[STRUCTURE_CATEGORY_IDS.axis];
      if (axis === STRUCTURE_TERM_IDS.horizontal) return "shadow-offset-x";
      if (axis === undefined || axis === STRUCTURE_TERM_IDS.vertical)
        return "shadow-offset-y";
    }
  }
  if (attribute === PREVIEW_TERM_IDS.border) {
    if (property === PREVIEW_TERM_IDS.color) return "border-color";
    if (
      [
        PREVIEW_TERM_IDS.size,
        PREVIEW_TERM_IDS.thickness,
        STRUCTURE_TERM_IDS.width,
      ].some((id) => id === property)
    )
      return "border-width";
  }
  if (property === PREVIEW_TERM_IDS.color) {
    if (attribute === PREVIEW_TERM_IDS.background) return "color";
    if (element === PREVIEW_TERM_IDS.text) return "text-color";
    if (icon) return "icon-color";
    if (!element) return "color";
  }
  if (property === PREVIEW_TERM_IDS.size) {
    if (element === PREVIEW_TERM_IDS.text) return "font-size";
    if (icon) return "icon-size";
    if (!element && !attribute) return "block";
  }
  if (
    !attribute &&
    [
      PREVIEW_TERM_IDS.length,
      STRUCTURE_TERM_IDS.width,
      STRUCTURE_TERM_IDS.height,
      STRUCTURE_TERM_IDS.gap,
      STRUCTURE_TERM_IDS.padding,
    ].some((id) => id === property)
  )
    return "block";
  return undefined;
}

export interface PreviewValueSource {
  value: number | string;
  type: string;
  groupId: string;
  unit: "px" | "";
  projection?: Pick<TaxonomyProjection, "classification">;
  taxonomySource?: Pick<TaxonomySourceContext, "governed">;
  validationError?: string;
  semantic?: { classification: Classification; target: { metricId?: string } };
  valuePreview?: ValuePreviewDescriptor;
}

export function sourceValuePreview(
  source: PreviewValueSource,
  value: number | string = source.value,
): ValuePreviewDescriptor {
  if (source.validationError) return unavailablePreview(source.validationError);
  if (source.valuePreview && value === source.value) return source.valuePreview;
  if (source.type === "elevation") return createValuePreview("shadow", value);
  if (source.type === "opacity") return createValuePreview("opacity", value);
  const classification =
    source.projection?.classification ??
    source.taxonomySource?.governed ??
    source.semantic?.classification ??
    {};
  if (
    [
      ORDERED_CATEGORY_IDS.element,
      ORDERED_CATEGORY_IDS.attribute,
      STRUCTURE_CATEGORY_IDS.property,
      STRUCTURE_CATEGORY_IDS.axis,
    ].some((category) => Array.isArray(classification[category]))
  )
    return unavailablePreview(
      "Preview classification must have one term per group.",
    );
  const kind = classificationPreviewKind(classification);
  if (kind)
    return createValuePreview(
      kind,
      value,
      classification[STRUCTURE_CATEGORY_IDS.property] ===
        PREVIEW_TERM_IDS.unitlessLineHeight
        ? "multiplier"
        : source.unit,
    );
  const explicitUse =
    classification[ORDERED_CATEGORY_IDS.element] !== undefined ||
    classification[ORDERED_CATEGORY_IDS.attribute] !== undefined ||
    classification[STRUCTURE_CATEGORY_IDS.property] !== undefined;
  if (explicitUse)
    return unavailablePreview(
      "No visual preview is defined for this classification.",
    );
  const metric = source.semantic?.target.metricId ?? source.groupId;
  if (source.type === "typography") {
    if (metric === "font-size")
      return createValuePreview("font-size", value, source.unit);
    if (metric === "workflow-icon-size")
      return createValuePreview("icon-size", value, source.unit);
    if (metric.endsWith("-unitlessLineHeight"))
      return createValuePreview("line-height", value, "multiplier");
    if (metric.endsWith("-lineHeight"))
      return createValuePreview("line-height", value, source.unit);
  }
  if (source.type === "colors") return createValuePreview("color", value);
  if (source.type === "spacing" || source.type === "size")
    return createValuePreview("block", value, source.unit);
  if (source.type === "radius")
    return createValuePreview("radius", value, source.unit);
  return unavailablePreview("This value has no supported visual preview.");
}

export function shadowValuePreview(
  shadows: readonly GeneratedShadow[],
): ValuePreviewDescriptor {
  return createValuePreview("shadow", shadowCss({ shadows: [...shadows] }));
}

function pixelLength(
  value: number | string,
  unit: PreviewUnit | undefined,
  fontSize: number,
): number | undefined {
  const match =
    typeof value === "string"
      ? /^([+-]?(?:\d+\.?\d*|\.\d+))(px|rem|em)?$/i.exec(value.trim())
      : undefined;
  if (typeof value === "string" && !match) return undefined;
  const number = typeof value === "number" ? value : Number(match![1]);
  const explicitUnit = match?.[2]?.toLowerCase();
  if (explicitUnit && unit && explicitUnit !== unit) return undefined;
  const resolvedUnit = explicitUnit ?? unit;
  const pixels =
    number *
    (resolvedUnit === "rem"
      ? 16
      : resolvedUnit === "em" || resolvedUnit === "multiplier"
        ? fontSize
        : 1);
  return Number.isFinite(pixels) ? pixels : undefined;
}

export type PreviewPresentation =
  | { status: "ready"; styles: CSSProperties }
  | { status: "unavailable"; message: string };

export function valuePreviewPresentation(
  preview: ValuePreviewDescriptor,
  options: PreviewTextOptions = {},
): PreviewPresentation {
  if (preview.kind === "unavailable")
    return { status: "unavailable", message: preview.message };
  const fontSize = options.fontSize ?? PREVIEW_DEFAULTS.fontSize;
  if (!Number.isFinite(fontSize) || fontSize <= 0)
    return {
      status: "unavailable",
      message: "Preview text size must be finite and positive.",
    };
  const { kind, value } = preview;
  if (kind === "opacity") {
    const alpha = typeof value === "number" ? value : Number(value);
    return Number.isFinite(alpha) && alpha >= 0 && alpha <= 1
      ? {
          status: "ready",
          styles: { backgroundColor: `rgb(0 0 0 / ${alpha})` },
        }
      : { status: "unavailable", message: "Opacity must be between 0 and 1." };
  }
  if (kind === "font-weight") {
    const weight = typeof value === "number" ? value : Number(value);
    if (typeof value === "string" && ["normal", "bold"].includes(value))
      return {
        status: "ready",
        styles: { fontWeight: value === "bold" ? "bold" : "normal" },
      };
    return Number.isFinite(weight) && weight >= 1 && weight <= 1000
      ? { status: "ready", styles: { fontWeight: weight } }
      : {
          status: "unavailable",
          message: "Font weight must be between 1 and 1000, normal, or bold.",
        };
  }
  if (kind === "font-family")
    return typeof value === "string" && value.trim()
      ? { status: "ready", styles: { fontFamily: value } }
      : { status: "unavailable", message: "A font family is required." };
  if (kind === "shadow")
    return typeof value === "string" && value.trim()
      ? { status: "ready", styles: { boxShadow: value } }
      : {
          status: "unavailable",
          message: "A complete shadow value is required.",
        };
  if (
    [
      "color",
      "text-color",
      "border-color",
      "icon-color",
      "shadow-color",
    ].includes(kind)
  ) {
    if (typeof value !== "string" || !value.trim())
      return { status: "unavailable", message: "A color value is required." };
    const styles: CSSProperties =
      kind === "color"
        ? { backgroundColor: value }
        : kind === "border-color"
          ? { borderColor: value }
          : kind === "shadow-color"
            ? { boxShadow: `0px 2px 4px 0px ${value}` }
            : { color: value };
    return { status: "ready", styles };
  }
  const length = pixelLength(value, preview.unit, fontSize);
  if (
    length === undefined ||
    (length < 0 &&
      !["shadow-offset-x", "shadow-offset-y", "shadow-spread"].includes(kind))
  ) {
    return {
      status: "unavailable",
      message: "This preview requires a finite compatible length.",
    };
  }
  const styles: CSSProperties =
    kind === "border-width"
      ? { borderWidth: length }
      : kind === "font-size"
        ? { fontSize: length }
        : kind === "line-height"
          ? { height: length, lineHeight: `${length}px` }
          : kind === "icon-size"
            ? { width: length, height: length }
            : kind === "radius"
              ? { borderTopLeftRadius: length }
              : kind === "shadow-blur"
                ? {
                    boxShadow: `0px 2px ${length}px 0px var(--spectrum-gray-600)`,
                  }
                : kind === "shadow-offset-x"
                  ? {
                      boxShadow: `${length}px 2px 4px 0px var(--spectrum-gray-600)`,
                    }
                  : kind === "shadow-offset-y"
                    ? {
                        boxShadow: `0px ${length}px 4px 0px var(--spectrum-gray-600)`,
                      }
                    : kind === "shadow-spread"
                      ? {
                          boxShadow: `0px 2px 4px ${length}px var(--spectrum-gray-600)`,
                        }
                      : { width: length };
  return { status: "ready", styles };
}
