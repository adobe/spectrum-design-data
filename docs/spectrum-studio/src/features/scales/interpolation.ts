// Copyright 2026 Adobe. All rights reserved.
export type InterpolationMethod = "linear" | "cosine" | "exponential";

export const INTERPOLATION_METHODS: readonly {
  id: InterpolationMethod;
  label: string;
}[] = [
  { id: "linear", label: "Linear" },
  { id: "cosine", label: "Cosine" },
  { id: "exponential", label: "Exponential" },
];

export function isInterpolationMethod(
  value: unknown,
): value is InterpolationMethod {
  return INTERPOLATION_METHODS.some((method) => method.id === value);
}

function lerp(start: number, end: number, percent: number) {
  return start * (1 - percent) + end * percent;
}

/** Exponential needs two positive endpoints; otherwise it behaves as linear. */
export function interpolate(
  method: InterpolationMethod,
  start: number,
  end: number,
  percent: number,
) {
  if (method === "cosine")
    return lerp(start, end, 0.5 * (1 - Math.cos(percent * Math.PI)));
  if (method === "exponential" && start > 0 && end > 0)
    return start * Math.pow(end / start, percent);
  return lerp(start, end, percent);
}

/** Position of `value` within [from, to] as 0…1, clamped; a zero-width range steps at `from`. */
export function clampedPercentage(value: number, from: number, to: number) {
  if (from === to) return value >= from ? 1 : 0;
  return Math.min(1, Math.max(0, (value - from) / (to - from)));
}

export interface BindingPoint {
  /** Value of the bound mode parameter. */
  at: number;
  /** Value the scale parameter takes there. */
  value: number;
}

/** Makes a scale parameter follow a mode parameter; values between points are interpolated, and outside the range they hold the end values. */
export interface ParameterBinding {
  modeParameterId: string;
  method: InterpolationMethod;
  /** At least two points, sorted by `at`. */
  points: BindingPoint[];
}

export function isParameterBinding(value: unknown): value is ParameterBinding {
  if (!value || typeof value !== "object") return false;
  const binding = value as Partial<ParameterBinding>;
  return (
    typeof binding.modeParameterId === "string" &&
    isInterpolationMethod(binding.method) &&
    Array.isArray(binding.points) &&
    binding.points.length >= 2 &&
    binding.points.every(
      (point, index, points) =>
        Number.isFinite(point?.at) &&
        Number.isFinite(point?.value) &&
        (index === 0 || point.at > points[index - 1].at),
    )
  );
}

export function isBindingRecord(
  value: unknown,
): value is Record<string, ParameterBinding> {
  return (
    !!value &&
    typeof value === "object" &&
    Object.values(value).every(isParameterBinding)
  );
}

export function resolveBinding(binding: ParameterBinding, input: number) {
  const { points, method } = binding;
  if (input <= points[0].at) return points[0].value;
  const last = points[points.length - 1];
  if (input >= last.at) return last.value;
  const upper = points.findIndex((point) => point.at >= input);
  const from = points[upper - 1];
  const to = points[upper];
  return interpolate(
    method,
    from.value,
    to.value,
    (input - from.at) / (to.at - from.at),
  );
}
