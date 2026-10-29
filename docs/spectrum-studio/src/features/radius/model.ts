// Copyright 2026 Adobe. All rights reserved.
import {
  isDimensionDocument,
  type DimensionDocument,
  type DimensionScale,
  type GeneratedDimensionValue,
} from "../scales/foundation";

export const RADIUS_SCHEMA_VERSION = 1;
export type RadiusDocument = DimensionDocument<typeof RADIUS_SCHEMA_VERSION>;
export type RadiusScale = DimensionScale;
export type GeneratedRadiusValue = GeneratedDimensionValue;
export function isRadiusDocument(value: unknown): value is RadiusDocument {
  return isDimensionDocument(value, RADIUS_SCHEMA_VERSION);
}
