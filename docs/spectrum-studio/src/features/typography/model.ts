// Copyright 2026 Adobe. All rights reserved.
import {
  isFoundationPublishingMetadata,
  type FoundationPublishingMetadata,
} from "../foundations/types";
import {
  isInterpolationMapping,
  type InterpolationMapping,
} from "../scales/interpolationDefinition";
import { TYPOGRAPHY_SCALE_TYPE_ID } from "../scales/scaleType";
import type { TaxonomyNameReference } from "../taxonomy/naming";
import { isTypographyUnit, type TypographyUnit } from "./units";
import {
  isComponentSize,
  type ComponentSize,
} from "../foundations/componentSizes";

export {
  COMPONENT_SIZES,
  componentSizeIndex,
  isComponentSize,
  type ComponentSize,
} from "../foundations/componentSizes";
export type TypographyMetricId =
  | "font-size"
  | "workflow-icon-size"
  | `${string}-lineHeight`
  | `${string}-unitlessLineHeight`;
export const TYPOGRAPHY_SCHEMA_VERSION = 8;
export const TEXT_ZOOM_MIN = -4;
export const TEXT_ZOOM_MAX = 8;
export const clampTextZoom = (value: number) =>
  Math.min(TEXT_ZOOM_MAX, Math.max(TEXT_ZOOM_MIN, Math.round(value)));

export interface TypographyLineHeight {
  id: string;
  defaultValue: number;
  isAdaptive: boolean;
  /** Distinguishes a never-enabled mapping from a configured mapping that is temporarily disabled. */
  hasAdaptiveSettings: boolean;
  adaptive: InterpolationMapping;
}

export type TypographyIconography =
  | { alignment: "text"; baseSize: number }
  | { alignment: "line-height"; baseSize: number; lineHeightId: string };

export interface TypographyMetricNames {
  [id: string]: TaxonomyNameReference;
  "font-size": TaxonomyNameReference;
  "workflow-icon-size": TaxonomyNameReference;
}

export interface TypographyDocument extends FoundationPublishingMetadata {
  schemaVersion: typeof TYPOGRAPHY_SCHEMA_VERSION;
  metricNames: TypographyMetricNames;
  scaleTypeId: string;
  outputUnit: TypographyUnit;
  smallSizes: number;
  largeSizes: number;
  /** Retained until product defaults and their size/spacing presentation are defined (EPIC-2.5). */
  componentSize: ComponentSize;
  textZoom: number;
  minTextSize: number;
  maxTextSize: number;
  textRoundingRuleId: string;
  lineHeightRoundingRuleId: string;
  lineHeights: TypographyLineHeight[];
  previewLineHeightId: string;
  iconography: TypographyIconography;
}

export interface GeneratedLineHeight {
  length: number;
  multiplier: number;
}

export interface GeneratedTypographyToken {
  name: string;
  position: number;
  scale: number;
  fontSize: number;
  lineHeights: Record<string, GeneratedLineHeight>;
  iconSize: number;
  ratio: number;
  textZoom: number;
}

const positive = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;
export function isTypographyLineHeight(
  value: unknown,
): value is TypographyLineHeight {
  if (!value || typeof value !== "object") return false;
  const card = value as Partial<TypographyLineHeight>;
  return (
    typeof card.id === "string" &&
    card.id.length > 0 &&
    positive(card.defaultValue) &&
    typeof card.isAdaptive === "boolean" &&
    typeof card.hasAdaptiveSettings === "boolean" &&
    (!card.isAdaptive || card.hasAdaptiveSettings) &&
    isInterpolationMapping(card.adaptive) &&
    positive(card.adaptive.from) &&
    positive(card.adaptive.outputAtFrom) &&
    positive(card.adaptive.outputAtTo)
  );
}

export function typographyMetricIds(
  document: Pick<TypographyDocument, "lineHeights">,
): TypographyMetricId[] {
  return [
    "font-size",
    ...document.lineHeights.flatMap((card): TypographyMetricId[] => [
      `${card.id}-lineHeight`,
      `${card.id}-unitlessLineHeight`,
    ]),
    "workflow-icon-size",
  ];
}

export function isTypographyDocument(
  value: unknown,
): value is TypographyDocument {
  if (!value || typeof value !== "object") return false;
  const document = value as Partial<TypographyDocument>;
  if (
    document.schemaVersion !== TYPOGRAPHY_SCHEMA_VERSION ||
    !isFoundationPublishingMetadata(document) ||
    document.scaleTypeId !== TYPOGRAPHY_SCALE_TYPE_ID ||
    !isTypographyUnit(document.outputUnit) ||
    !Number.isInteger(document.smallSizes) ||
    document.smallSizes! < 0 ||
    document.smallSizes! > 3 ||
    !Number.isInteger(document.largeSizes) ||
    document.largeSizes! < 0 ||
    document.largeSizes! > 14 ||
    !isComponentSize(document.componentSize) ||
    !Number.isInteger(document.textZoom) ||
    document.textZoom! < TEXT_ZOOM_MIN ||
    document.textZoom! > TEXT_ZOOM_MAX ||
    !positive(document.minTextSize) ||
    !positive(document.maxTextSize) ||
    document.minTextSize > document.maxTextSize ||
    typeof document.textRoundingRuleId !== "string" ||
    typeof document.lineHeightRoundingRuleId !== "string" ||
    !Array.isArray(document.lineHeights) ||
    !document.lineHeights.every(isTypographyLineHeight) ||
    new Set(document.lineHeights.map((card) => card.id)).size !==
      document.lineHeights.length ||
    !document.lineHeights.some(
      (card) => card.id === document.previewLineHeightId,
    )
  )
    return false;
  const icons = document.iconography;
  if (
    !icons ||
    !positive(icons.baseSize) ||
    (icons.alignment !== "text" && icons.alignment !== "line-height") ||
    (icons.alignment === "line-height" &&
      !document.lineHeights.some((card) => card.id === icons.lineHeightId))
  )
    return false;
  return typographyMetricIds(document as TypographyDocument).every((id) => {
    const reference = document.metricNames?.[id];
    return (
      reference &&
      typeof reference.categoryId === "string" &&
      typeof reference.termId === "string"
    );
  });
}
