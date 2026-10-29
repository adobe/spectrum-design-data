// Copyright 2026 Adobe. All rights reserved.
import Color from "colorjs.io";
import type { TaxonomyNameReference } from "../taxonomy/naming";
import { SCALE_ABOVE_MAX, SCALE_BELOW_MAX } from "../scales/stepNames";
import {
  ELEVATION_LINEAR_FORMULA_ID,
  ELEVATION_POWER_FORMULA_ID,
} from "./formulas";

export const ELEVATION_SCHEMA_VERSION = 1;
export const ELEVATION_LAYER_MAX = 8;
export interface ShadowLayer {
  /** @pattern ^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$ */
  id: string;
  label: string;
  scaleTypeId: string;
  base: number;
  scale: number;
  opacity: number;
}
export interface ElevationDocument {
  schemaVersion: 1;
  /** @pattern ^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$ */
  id: string;
  name: TaxonomyNameReference;
  below: number;
  above: number;
  depth: number;
  color: string;
  layers: ShadowLayer[];
  hideFromPublishing?: boolean;
}
export interface ElevationOverride {
  depth?: number;
  color?: string;
  layerOpacities?: { [layerId: string]: number };
}
export interface GeneratedShadow {
  layerId: string;
  offsetX: 0;
  offsetY: number;
  blur: number;
  spread: 0;
  color: string;
  opacity: number;
  inset: false;
}
export interface ElevationLevel {
  id: string;
  index: number;
  step: number;
  shadows: GeneratedShadow[];
}
export const finiteRange = (
  value: unknown,
  min: number,
  max = Infinity,
): value is number =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= min &&
  value <= max;
export function isOpaqueShadowColor(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    const color = new Color(value);
    return (
      Number(color.alpha) === 1 &&
      color.coords.every(
        (channel) => channel !== null && Number.isFinite(Number(channel)),
      )
    );
  } catch {
    return false;
  }
}
export function isElevationOverride(
  value: unknown,
): value is ElevationOverride {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const override = value as ElevationOverride;
  return (
    (override.depth === undefined || finiteRange(override.depth, 0, 200)) &&
    (override.color === undefined || isOpaqueShadowColor(override.color)) &&
    (override.layerOpacities === undefined ||
      (!!override.layerOpacities &&
        typeof override.layerOpacities === "object" &&
        !Array.isArray(override.layerOpacities) &&
        Object.values(override.layerOpacities).every((opacity) =>
          finiteRange(opacity, 0, 100),
        )))
  );
}
export function elevationIssues(value: ElevationDocument): string[] {
  const issues: string[] = [];
  const uuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
  if (
    !uuid.test(value.id) ||
    value.layers.some((layer) => !uuid.test(layer.id))
  )
    issues.push("Elevation and its shadows need stable UUID identities.");
  if (
    !Number.isInteger(value.below) ||
    !finiteRange(value.below, 0, SCALE_BELOW_MAX) ||
    !Number.isInteger(value.above) ||
    !finiteRange(value.above, 0, SCALE_ABOVE_MAX)
  )
    issues.push("Enter whole level counts within the supported range.");
  if (!finiteRange(value.depth, 0, 200))
    issues.push("Depth must be between 0% and 200%.");
  if (!isOpaqueShadowColor(value.color))
    issues.push(
      "Choose a valid opaque shadow color. Set opacity on each shadow.",
    );
  if (value.layers.length > ELEVATION_LAYER_MAX)
    issues.push("You can add up to eight shadows.");
  if (
    new Set(value.layers.map((layer) => layer.id)).size !== value.layers.length
  )
    issues.push("Shadow identities must be unique.");
  if (
    new Set(value.layers.map((layer) => layer.label.trim().toLowerCase()))
      .size !== value.layers.length
  )
    issues.push("Give each shadow a different name.");
  for (const layer of value.layers) {
    if (!layer.id || !layer.label.trim())
      issues.push("Give each shadow a name and a stable identity.");
    if (!finiteRange(layer.base, 0) || !finiteRange(layer.opacity, 0, 100))
      issues.push(
        `${layer.label}: enter a non-negative base and opacity between 0% and 100%.`,
      );
    if (
      layer.scaleTypeId !== ELEVATION_POWER_FORMULA_ID &&
      layer.scaleTypeId !== ELEVATION_LINEAR_FORMULA_ID
    )
      issues.push(`${layer.label}: choose Power or Linear.`);
    if (
      !finiteRange(
        layer.scale,
        layer.scaleTypeId === ELEVATION_POWER_FORMULA_ID ? 1 : 0,
      )
    )
      issues.push(
        `${layer.label}: Power needs a scale of at least 1; Linear needs a non-negative increment.`,
      );
    if (
      layer.scaleTypeId === ELEVATION_LINEAR_FORMULA_ID &&
      layer.base - layer.scale * value.below < 0
    )
      issues.push(
        `${layer.label}: smaller levels would have negative blur. Increase the base or reduce the increment or smaller count.`,
      );
  }
  return issues;
}
export function isElevationDocument(
  value: unknown,
): value is ElevationDocument {
  if (!value || typeof value !== "object") return false;
  const document = value as Partial<ElevationDocument>;
  return (
    document.schemaVersion === 1 &&
    typeof document.id === "string" &&
    !!document.id &&
    !!document.name &&
    typeof document.name.categoryId === "string" &&
    typeof document.name.termId === "string" &&
    Array.isArray(document.layers) &&
    document.layers.every(
      (layer: unknown) =>
        !!layer &&
        typeof layer === "object" &&
        typeof (layer as ShadowLayer).id === "string" &&
        typeof (layer as ShadowLayer).label === "string",
    ) &&
    (document.hideFromPublishing === undefined ||
      typeof document.hideFromPublishing === "boolean") &&
    elevationIssues(document as ElevationDocument).length === 0
  );
}
