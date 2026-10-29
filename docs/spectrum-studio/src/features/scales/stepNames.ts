// Copyright 2026 Adobe. All rights reserved.
export const SCALE_BELOW_MAX = 9;
export const SCALE_ABOVE_MAX = 40;
const BELOW_STEP_SIZES = [50, 25, 20, 10, 5, 2, 1] as const;

/** Largest clean step that keeps all below-base indices under 100. */
export function belowStepSize(below: number) {
  const count = Math.max(1, Math.round(below));
  return BELOW_STEP_SIZES.find((size) => count * size < 100) ?? 1;
}

export function scaleStepName(index: number, below: number) {
  return index >= 0 ? (index + 1) * 100 : 100 + index * belowStepSize(below);
}

export function clampScaleRange(below: number, above: number) {
  return {
    below: Math.min(SCALE_BELOW_MAX, Math.max(0, Math.round(below))),
    above: Math.min(SCALE_ABOVE_MAX, Math.max(0, Math.round(above))),
  };
}
