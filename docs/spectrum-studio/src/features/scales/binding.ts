// Copyright 2026 Adobe. All rights reserved.
import type { InterpolationMethod, ParameterBinding } from "./interpolation";

/** Span of the mode parameter a binding follows; `neutral` is its unadjusted value. */
export interface BindingRange {
  min: number;
  max: number;
  neutral: number;
}

/** Every point starts at the parameter's current value, so enabling adaptivity changes nothing until an end is edited. */
export function createBinding(
  modeParameterId: string,
  range: BindingRange,
  value: number,
  method: InterpolationMethod = "linear",
): ParameterBinding {
  const ats = [...new Set([range.min, range.neutral, range.max])].sort(
    (a, b) => a - b,
  );
  return { modeParameterId, method, points: ats.map((at) => ({ at, value })) };
}

export function setBindingPoint(
  binding: ParameterBinding,
  at: number,
  value: number,
): ParameterBinding {
  return {
    ...binding,
    points: binding.points.map((point) =>
      point.at === at ? { ...point, value } : point,
    ),
  };
}
