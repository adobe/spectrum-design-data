// Copyright 2026 Adobe. All rights reserved.
import type { DimensionScale } from "../scales/foundation";
import { isDimensionScale } from "../scales/dimensionScaleShape";
import { TYPOGRAPHY_SCALE_TYPE_ID } from "../scales/scaleType";

export const ICONS_SCHEMA_VERSION = 1;
/** Workflow is the scale that publishes the existing `typography-workflow-icon-size-*` tokens. */
export const WORKFLOW_ICON_SCALE_ID = "workflow";

export const ICON_SIZE_SOURCES = [
  "follow-typography",
  "formula",
  "line-height",
] as const;
export type IconSizeSource = (typeof ICON_SIZE_SOURCES)[number];

export interface IconScale extends Omit<DimensionScale, "nameRef"> {
  /** Follow Typography uses the shared Type scale and `base`; Formula uses any formula; Line height uses a Typography line height. */
  source: IconSizeSource;
  lineHeightId?: string;
}

export interface IconsDocument {
  schemaVersion: typeof ICONS_SCHEMA_VERSION;
  /** Every icon scale rounds with this rule, so it is set once in System settings. */
  roundingRuleId: string;
  minIconSize: number;
  maxIconSize: number;
  scales: IconScale[];
}

export interface GeneratedIconValue {
  scaleId: string;
  /** Position relative to the base: negative below it, 0 at the base. */
  index: number;
  /** Step name shared with Typography's type steps, such as 50, 100 and 200. */
  step: number;
  raw: number;
  value: number;
}

const positive = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

export function isIconSizeSource(value: unknown): value is IconSizeSource {
  return ICON_SIZE_SOURCES.includes(value as IconSizeSource);
}

export function isIconScale(value: unknown): value is IconScale {
  if (!isDimensionScale(value)) return false;
  const scale = value as Partial<IconScale>;
  return (
    scale.name!.trim().length > 0 &&
    isIconSizeSource(scale.source) &&
    (scale.source !== "follow-typography" ||
      scale.scaleTypeId === TYPOGRAPHY_SCALE_TYPE_ID) &&
    (scale.source === "line-height"
      ? typeof scale.lineHeightId === "string" && scale.lineHeightId.length > 0
      : scale.lineHeightId === undefined)
  );
}

export function isIconsDocument(value: unknown): value is IconsDocument {
  if (!value || typeof value !== "object") return false;
  const document = value as Partial<IconsDocument>;
  return (
    document.schemaVersion === ICONS_SCHEMA_VERSION &&
    typeof document.roundingRuleId === "string" &&
    positive(document.minIconSize) &&
    positive(document.maxIconSize) &&
    document.minIconSize <= document.maxIconSize &&
    Array.isArray(document.scales) &&
    document.scales.every(isIconScale) &&
    document.scales.some((scale) => scale.id === WORKFLOW_ICON_SCALE_ID) &&
    new Set(document.scales.map((scale) => scale.id)).size ===
      document.scales.length &&
    new Set(document.scales.map((scale) => scale.name.trim().toLowerCase()))
      .size === document.scales.length &&
    document.scales.every(
      (scale) => scale.roundingRuleId === document.roundingRuleId,
    )
  );
}

/** Line height cards an Icons document depends on, by scale. */
export function iconLineHeightUses(
  document: IconsDocument,
  lineHeightId: string,
) {
  return document.scales.filter(
    (scale) =>
      scale.source === "line-height" && scale.lineHeightId === lineHeightId,
  );
}

/** The document owns icon rounding; every scale mirrors it so shared scale checks agree. */
export function withIconsRoundingRule(
  document: IconsDocument,
  roundingRuleId: string,
): IconsDocument {
  return {
    ...document,
    roundingRuleId,
    scales: document.scales.map((scale) => ({ ...scale, roundingRuleId })),
  };
}
