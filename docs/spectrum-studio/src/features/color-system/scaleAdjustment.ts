// Copyright 2026 Adobe. All rights reserved.
import type { ColorStopInput, ColorSystemDocument } from "./model";
import { isKeyColor, type DataVisPoint } from "./data-vis/model";

export type AdjustmentMethod = "relative" | "absolute";

export interface RelativeScaleAdjustment {
  method: "relative";
  enabled?: boolean;
  hue?: number;
  chroma?: number;
}

export interface AbsoluteScaleAdjustment {
  method: "absolute";
  enabled?: boolean;
  color: ColorStopInput;
}

/** Relative transforms existing keys; absolute derives all ramps from one shared color. */
export type ScaleAdjustment = RelativeScaleAdjustment | AbsoluteScaleAdjustment;

export const DEFAULT_ABSOLUTE_COLOR: Readonly<ColorStopInput> = {
  lightness: 0.5520753942008068,
  hue: 264.09105380487955,
  chroma: 34.43888346780308,
};

export const NEUTRAL_ADJUSTMENT_VALUES = { hue: 0, chroma: 100 } as const;

export const RELATIVE_ADJUSTMENT: RelativeScaleAdjustment = {
  method: "relative",
} as const;

export function normalizedAdjustment(
  adjustment: ScaleAdjustment,
): ScaleAdjustment | undefined {
  if (adjustment.method === "absolute") return adjustment;
  const hue = adjustment.hue ?? NEUTRAL_ADJUSTMENT_VALUES.hue;
  const chroma = adjustment.chroma ?? NEUTRAL_ADJUSTMENT_VALUES.chroma;
  if (hue === 0 && chroma === 100 && adjustment.enabled === undefined)
    return undefined;
  return {
    method: "relative",
    ...(adjustment.enabled !== undefined && { enabled: adjustment.enabled }),
    ...(hue !== 0 && { hue }),
    ...(chroma !== 100 && { chroma }),
  };
}

const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

export function isScaleAdjustment(value: unknown): value is ScaleAdjustment {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  if (!("method" in value)) return false;
  if ("enabled" in value && typeof value.enabled !== "boolean") return false;
  if (value.method === "relative")
    return (
      (!("hue" in value) || finite(value.hue)) &&
      (!("chroma" in value) || finite(value.chroma))
    );
  return (
    value.method === "absolute" && "color" in value && isKeyColor(value.color)
  );
}

function wrapHue(hue: number) {
  return ((hue % 360) + 360) % 360;
}

export function adjustKeyColor<T extends ColorStopInput>(
  color: T,
  adjustment: ScaleAdjustment,
): T {
  if (adjustment.enabled === false) return color;
  if (adjustment.method === "absolute")
    return { ...color, ...adjustment.color };
  const { hue = 0, chroma = 100 } = adjustment;
  return {
    ...color,
    ...(adjustment.hue !== undefined && { hue: wrapHue(color.hue + hue) }),
    ...(adjustment.chroma !== undefined && {
      chroma: Math.min(100, Math.max(0, (color.chroma * chroma) / 100)),
    }),
  };
}

/** Recolors scale key colors and data-vis points that own their key color; references follow the scales. */
export function applyScaleAdjustment(
  document: ColorSystemDocument,
  adjustment: ScaleAdjustment | undefined,
): ColorSystemDocument {
  if (
    !adjustment ||
    adjustment.enabled === false ||
    !normalizedAdjustment(adjustment)
  )
    return document;
  return {
    ...document,
    scales: document.scales.map((scale) =>
      adjustment.method === "absolute"
        ? {
            ...scale,
            interpolation: "rgb",
            stops: [{ id: scale.stops[0].id, ...adjustment.color }],
          }
        : {
            ...scale,
            stops: scale.stops.map((stop) => adjustKeyColor(stop, adjustment)),
          },
    ),
    dataVisScales: document.dataVisScales.map((scale) =>
      scale.kind === "categorical"
        ? scale
        : {
            ...scale,
            points: scale.points.map((point): DataVisPoint => {
              if (point.source.kind !== "key-color" || !point.contrast)
                return point;
              return {
                ...point,
                contrast: point.contrast,
                source: {
                  kind: "key-color",
                  color: adjustKeyColor(point.source.color, adjustment),
                },
              };
            }),
          },
    ),
  };
}
