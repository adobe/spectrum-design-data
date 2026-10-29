// Copyright 2026 Adobe. All rights reserved.
import { interpolate } from "./interpolation";
import {
  evaluateInterpolation,
  type Interpolation,
} from "./interpolationDefinition";
import {
  resolveParameterValues,
  scaleTypeValue,
  type ScaleType,
} from "./scaleType";

/** Cards plot indices -4 to 8 from the formula's own base, so every formula is judged on the same range. */
export const SCALE_PREVIEW_FIRST_INDEX = -4;
export const SCALE_PREVIEW_LAST_INDEX = 8;

export interface ScalePreviewPoint {
  index: number;
  /** NaN when the formula has no value at this index. */
  value: number;
}

export function scalePreviewPoints(scaleType: ScaleType): ScalePreviewPoint[] {
  const parameters = resolveParameterValues(scaleType);
  const points: ScalePreviewPoint[] = [];
  for (
    let index = SCALE_PREVIEW_FIRST_INDEX;
    index <= SCALE_PREVIEW_LAST_INDEX;
    index += 1
  ) {
    points.push({
      index,
      value: scaleTypeValue(
        scaleType,
        index,
        scaleType.base.default,
        parameters,
      ),
    });
  }
  return points;
}

export interface InterpolationPreview {
  /** Both axes run 0 to 1. */
  points: { x: number; y: number }[];
  /** A custom expression has no input range, so it is plotted for x from 0 to 1 and fitted to the square vertically. */
  isFitted: boolean;
  /** Outputs that the square's 0 and 1 stand for; only meaningful when fitted. */
  fittedRange?: [number, number];
}

export const INTERPOLATION_PREVIEW_STEPS = 48;

/** The shape of an interpolation as a pure 0 to 1 mapping, regardless of the input and output ranges it is used with. */
export function interpolationPreview(
  interpolation: Interpolation,
  steps = INTERPOLATION_PREVIEW_STEPS,
): InterpolationPreview {
  if (interpolation.kind === "method") {
    const { method } = interpolation;
    const [from, to] = [1, 2];
    const points = Array.from({ length: steps + 1 }, (_, step) => {
      const x = step / steps;
      return { x, y: (interpolate(method, from, to, x) - from) / (to - from) };
    });
    return { points, isFitted: false };
  }
  const samples = Array.from({ length: steps + 1 }, (_, step) => {
    const x = step / steps;
    return { x, value: evaluateInterpolation(interpolation, x) };
  });
  const finite = samples
    .filter((sample) => Number.isFinite(sample.value))
    .map((sample) => sample.value);
  if (finite.length === 0) return { points: [], isFitted: true };
  const low = Math.min(...finite);
  const high = Math.max(...finite);
  const span = high - low;
  return {
    points: samples
      .filter((sample) => Number.isFinite(sample.value))
      .map((sample) => ({
        x: sample.x,
        y: span === 0 ? 0.5 : (sample.value - low) / span,
      })),
    isFitted: true,
    fittedRange: [low, high],
  };
}
