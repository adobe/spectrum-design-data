// Copyright 2026 Adobe. All rights reserved.
import {
  dimensionScaleSlug,
  isDimensionDocument,
  isDimensionScale,
  type DimensionDocument,
  type DimensionScale,
  type GeneratedDimensionValue,
} from "../scales/foundation";

// 2: scales name a shipped formula instead of built-in Geometric or Linear, and base is an optional override.
export const SIZE_SCHEMA_VERSION = 2;

export type SizeScale = DimensionScale;
export type SizeDocument = DimensionDocument<typeof SIZE_SCHEMA_VERSION>;
export type GeneratedSizeValue = GeneratedDimensionValue;

export const isSizeScale = isDimensionScale;

export function isSizeDocument(value: unknown): value is SizeDocument {
  return isDimensionDocument(value, SIZE_SCHEMA_VERSION);
}

export const sizeScaleSlug = dimensionScaleSlug;
