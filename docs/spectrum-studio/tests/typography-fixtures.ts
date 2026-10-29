// Copyright 2026 Adobe. All rights reserved.
import {
  SCALE_TYPE_DEFAULTS,
  TYPOGRAPHY_SCALE_TYPE_ID,
  type ScaleType,
} from "../src/features/scales/scaleType";

export function typeScaleWithRatios(
  smallest: number,
  largest: number,
  base = 14,
  ratio = 1.125,
): ScaleType[] {
  return SCALE_TYPE_DEFAULTS.map((formula) =>
    formula.id === TYPOGRAPHY_SCALE_TYPE_ID
      ? {
          ...formula,
          base: { ...formula.base, default: base },
          parameters: formula.parameters.map((parameter) => ({
            ...parameter,
            default: ratio,
          })),
          textSizeAdaptation: {
            interpolationId: "interpolation-linear",
            ratioAtSmallest: smallest,
            ratioAtLargest: largest,
          },
        }
      : structuredClone(formula),
  );
}
