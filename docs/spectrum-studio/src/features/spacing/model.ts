// Copyright 2026 Adobe. All rights reserved.
import {
  dimensionScaleSlug,
  isDimensionDocument,
  isDimensionScale,
  type DimensionDocument,
  type DimensionScale,
  type GeneratedDimensionValue,
} from "../scales/foundation";

// 4: scales name a shipped formula instead of built-in Geometric or Linear, and base is an optional override.
export const SPACING_SCHEMA_VERSION = 4;

export type SpacingScale = DimensionScale;
export type SpacingDocument = DimensionDocument<typeof SPACING_SCHEMA_VERSION>;
export type GeneratedSpacingValue = GeneratedDimensionValue;

export const isSpacingScale = isDimensionScale;

export function isSpacingDocument(value: unknown): value is SpacingDocument {
  return isDimensionDocument(value, SPACING_SCHEMA_VERSION);
}

/** Lowercase, hyphenated name used in token names: "Global" → "global". */
export const spacingScaleSlug = dimensionScaleSlug;
