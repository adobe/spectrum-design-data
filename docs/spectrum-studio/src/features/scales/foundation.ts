// Copyright 2026 Adobe. All rights reserved.
import { isRuleList, type Rule } from "../logic/model";
import { RULE_DEFAULTS } from "../logic/defaults";
import {
  isFoundationPublishingMetadata,
  type FoundationPublishingMetadata,
} from "../foundations/types";
import {
  generateScale,
  scaleIssues,
  type ModeParameterValues,
  type ScaleIssue,
  type ScaleSettings,
} from "./generate";
import { isBindingRecord } from "./interpolation";
import {
  migrateScaleReference,
  SCALE_TYPE_DEFAULTS,
  type ScaleType,
} from "./scaleType";
import type { TaxonomyNameReference } from "../taxonomy/naming";
import { foundationNameSegment } from "../taxonomy/formatting";

/** A scale type plus the base, range, and parameter overrides that make one scale of dimensions. Index 0 is the base. */
export interface DimensionScale
  extends FoundationPublishingMetadata, ScaleSettings {
  id: string;
  name: string;
  nameRef?: TaxonomyNameReference;
}

/** The saved shape shared by every foundation made of dimension scales, such as spacing and size. */
export interface DimensionDocument<Version extends number = number> {
  schemaVersion: Version;
  scales: DimensionScale[];
  /** Rules staged for the rule library on load. */
  pendingRules?: Rule[];
}

export interface GeneratedDimensionValue {
  name: string;
  scaleId: string;
  /** Position relative to the base: negative below it, 0 at the base. */
  index: number;
  /** Token step: base 100, larger (index + 1) × 100, smaller by the shared naming rule. */
  step: number;
  raw: number;
  factor: number;
  value: number;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNumberRecord(value: unknown): value is Record<string, number> {
  return (
    !!value &&
    typeof value === "object" &&
    Object.values(value).every(isFiniteNumber)
  );
}

export function isDimensionScale(value: unknown): value is DimensionScale {
  if (!value || typeof value !== "object") return false;
  const scale = value as Partial<DimensionScale>;
  return (
    typeof scale.id === "string" &&
    isFoundationPublishingMetadata(scale) &&
    typeof scale.name === "string" &&
    typeof scale.scaleTypeId === "string" &&
    (scale.base === undefined || isFiniteNumber(scale.base)) &&
    isFiniteNumber(scale.below) &&
    isFiniteNumber(scale.above) &&
    isNumberRecord(scale.parameters) &&
    (scale.bindings === undefined || isBindingRecord(scale.bindings)) &&
    typeof scale.roundingRuleId === "string"
  );
}

export function isDimensionDocument<Version extends number>(
  value: unknown,
  schemaVersion: Version,
): value is DimensionDocument<Version> {
  if (!value || typeof value !== "object") return false;
  const document = value as Partial<DimensionDocument>;
  return (
    document.schemaVersion === schemaVersion &&
    Array.isArray(document.scales) &&
    document.scales.every(isDimensionScale) &&
    (document.pendingRules === undefined || isRuleList(document.pendingRules))
  );
}

/** Re-points scales that used built-in Geometric or Linear at shipped formulas; every value stays the same. */
export function migrateDimensionScalesToFormulas<Version extends number>(
  data: unknown,
  schemaVersion: Version,
  geometricTargetId: string,
): DimensionDocument<Version> | null {
  if (
    !data ||
    typeof data !== "object" ||
    !Array.isArray((data as { scales?: unknown }).scales)
  )
    return null;
  const scales = (data as { scales: DimensionScale[] }).scales.map((scale) => {
    const reference = migrateScaleReference(
      {
        scaleTypeId: scale.scaleTypeId,
        parameters: scale.parameters ?? {},
        base: scale.base,
      },
      geometricTargetId,
    );
    const { base, ...rest } = scale;
    void base;
    return {
      ...rest,
      scaleTypeId: reference.scaleTypeId,
      parameters: reference.parameters,
      ...(reference.base !== undefined && { base: reference.base }),
    };
  });
  const migrated = { ...(data as object), schemaVersion, scales };
  return isDimensionDocument(migrated, schemaVersion) ? migrated : null;
}

/** Lowercase, hyphenated name used in token names: "Global" → "global". */
export function dimensionScaleSlug(name: string) {
  return foundationNameSegment(name);
}

export function dimensionTokenName(
  prefix: string,
  scaleName: string,
  step: number,
) {
  return `${prefix}-${dimensionScaleSlug(scaleName)}-${step}`;
}

/** Single generation path for a dimension foundation's Elements view, tokens, and change tracking. */
export function generateDimensionScale(
  prefix: string,
  scale: DimensionScale,
  rules: readonly Rule[] = RULE_DEFAULTS,
  scaleTypes: readonly ScaleType[] = SCALE_TYPE_DEFAULTS,
  modeValues: ModeParameterValues = {},
): GeneratedDimensionValue[] {
  return generateScale(scale, { rules, scaleTypes }, modeValues).map(
    (value) => ({
      ...value,
      name: dimensionTokenName(prefix, scale.name, value.step),
      scaleId: scale.id,
    }),
  );
}

export type DimensionScaleIssue = ScaleIssue;

/** Values must be finite, positive and distinct so every token has its own value. */
export const dimensionScaleIssues: (
  values: readonly GeneratedDimensionValue[],
) => DimensionScaleIssue[] = scaleIssues;
