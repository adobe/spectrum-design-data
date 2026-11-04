// Copyright 2026 Adobe. All rights reserved.
export type ColorScaleInterpolation = "oklch" | "rgb";

export function scaleInterpolation(scale: {
  interpolation?: ColorScaleInterpolation;
}): ColorScaleInterpolation {
  return scale.interpolation ?? "oklch";
}
