// Copyright 2026 Adobe. All rights reserved.
import { parseExpressionCached, evaluateExpression } from "./expression";
import {
  clampedPercentage,
  interpolate,
  INTERPOLATION_METHODS,
  isInterpolationMethod,
  type InterpolationMethod,
} from "./interpolation";
import { isFormulaParameter, type FormulaParameter } from "./scaleType";

interface InterpolationBase {
  id: string;
  name: string;
  description: string;
  /** Built-in interpolations other data falls back to; they cannot be edited or deleted. */
  locked?: boolean;
}

/** A reusable blending method. Input and output endpoints belong to each consumer. */
export interface MethodInterpolation extends InterpolationBase {
  kind: "method";
  method: InterpolationMethod;
}

/** value → value formula. Variables: `x` and the parameter ids. */
export interface ExpressionInterpolation extends InterpolationBase {
  kind: "expression";
  parameters: FormulaParameter[];
  expression: string;
}

export type Interpolation = MethodInterpolation | ExpressionInterpolation;

export const INTERPOLATION_INPUT_VARIABLE = "x";

export const INTERPOLATION_KINDS: readonly {
  id: Interpolation["kind"];
  label: string;
}[] = [
  { id: "method", label: "Method" },
  { id: "expression", label: "Custom expression" },
];

export function interpolationKindLabel(kind: Interpolation["kind"]) {
  return INTERPOLATION_KINDS.find((item) => item.id === kind)?.label ?? kind;
}

/** Short label for card badges: the method's name, or Custom. */
export function interpolationBadgeLabel(interpolation: Interpolation) {
  if (interpolation.kind === "expression") return "Custom";
  return (
    INTERPOLATION_METHODS.find((method) => method.id === interpolation.method)
      ?.label ?? interpolation.method
  );
}

export function renameLegacyInterpolationId(id: string) {
  return id.startsWith("curve-")
    ? `interpolation-${id.slice("curve-".length)}`
    : id;
}

/** Stored before curves became interpolations: `curve-*` ids and the `interpolate` kind. */
export function upgradeLegacyInterpolation(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const item = { ...(value as Record<string, unknown>) };
  if (typeof item.id === "string")
    item.id = renameLegacyInterpolationId(item.id);
  if (item.kind === "interpolate") item.kind = "method";
  return item;
}

export function createInterpolation(): Interpolation {
  return {
    id: `interpolation-custom-${crypto.randomUUID()}`,
    name: "New interpolation",
    description: "",
    kind: "method",
    method: "linear",
  };
}

/** Switching kind keeps identity and replaces the definition with that kind's defaults. */
export function withInterpolationKind(
  interpolation: Interpolation,
  kind: Interpolation["kind"],
): Interpolation {
  if (kind === interpolation.kind) return interpolation;
  const { id, name, description, locked } = interpolation;
  const identity = {
    id,
    name,
    description,
    ...(locked !== undefined && { locked }),
  };
  if (kind === "expression")
    return { ...identity, kind, parameters: [], expression: "x" };
  return { ...identity, kind, method: "linear" };
}

export function summarizeInterpolation(interpolation: Interpolation) {
  if (interpolation.kind === "expression") return interpolation.expression;
  return (
    INTERPOLATION_METHODS.find((method) => method.id === interpolation.method)
      ?.label ?? interpolation.method
  );
}

export function isInterpolation(value: unknown): value is Interpolation {
  if (!value || typeof value !== "object") return false;
  const interpolation = value as Partial<
    Record<keyof MethodInterpolation | keyof ExpressionInterpolation, unknown>
  >;
  if (
    typeof interpolation.id !== "string" ||
    typeof interpolation.name !== "string" ||
    typeof interpolation.description !== "string"
  )
    return false;
  if (
    interpolation.locked !== undefined &&
    typeof interpolation.locked !== "boolean"
  )
    return false;
  if (interpolation.kind === "method") {
    return isInterpolationMethod(interpolation.method);
  }
  return (
    interpolation.kind === "expression" &&
    typeof interpolation.expression === "string" &&
    Array.isArray(interpolation.parameters) &&
    interpolation.parameters.every(isFormulaParameter)
  );
}

export function interpolationIssues(interpolation: Interpolation): string[] {
  if (interpolation.kind === "method") return [];
  const parsed = parseExpressionCached(interpolation.expression, [
    INTERPOLATION_INPUT_VARIABLE,
    ...interpolation.parameters.map((parameter) => parameter.id),
  ]);
  if (!parsed.ok) return [parsed.error];
  const endpoints = [0, 1].map((input) =>
    evaluateInterpolation(interpolation, input),
  );
  if (
    Array.from({ length: 101 }, (_, index) =>
      evaluateInterpolation(interpolation, index / 100),
    ).some((value) => !Number.isFinite(value))
  )
    return ["An adaptive shape must stay finite from x = 0 to x = 1."];
  return endpoints.every(
    (value, index) => Number.isFinite(value) && Math.abs(value - index) < 1e-8,
  )
    ? []
    : ["An adaptive shape must return 0 at x = 0 and 1 at x = 1."];
}

export function evaluateInterpolation(
  interpolation: Interpolation,
  input: number,
  parameters: Readonly<Record<string, number>> = {},
): number {
  if (interpolation.kind === "method") {
    return (
      interpolate(interpolation.method, 1, 2, Math.min(1, Math.max(0, input))) -
      1
    );
  }
  const parsed = parseExpressionCached(interpolation.expression, [
    INTERPOLATION_INPUT_VARIABLE,
    ...interpolation.parameters.map((parameter) => parameter.id),
  ]);
  if (!parsed.ok) return NaN;
  const values: Record<string, number> = {};
  for (const parameter of interpolation.parameters)
    values[parameter.id] = Number.isFinite(parameters[parameter.id])
      ? parameters[parameter.id]
      : parameter.default;
  return evaluateExpression(parsed.node, {
    ...values,
    [INTERPOLATION_INPUT_VARIABLE]: input,
  });
}

export interface InterpolationMapping {
  interpolationId: string;
  from: number;
  to: number;
  outputAtFrom: number;
  outputAtTo: number;
}

export function isInterpolationMapping(
  value: unknown,
): value is InterpolationMapping {
  if (!value || typeof value !== "object") return false;
  const mapping = value as Partial<InterpolationMapping>;
  return (
    typeof mapping.interpolationId === "string" &&
    mapping.interpolationId.length > 0 &&
    [mapping.from, mapping.to, mapping.outputAtFrom, mapping.outputAtTo].every(
      Number.isFinite,
    ) &&
    typeof mapping.from === "number" &&
    typeof mapping.to === "number" &&
    mapping.from < mapping.to
  );
}

export function evaluateInterpolationMapping(
  interpolation: Interpolation,
  mapping: InterpolationMapping,
  input: number,
): number {
  if (!isInterpolationMapping(mapping) || !Number.isFinite(input))
    throw new Error("Enter a valid interpolation range and finite input.");
  if (mapping.interpolationId !== interpolation.id)
    throw new Error(
      "The interpolation does not match this mapping's reference.",
    );
  const percent = clampedPercentage(input, mapping.from, mapping.to);
  if (
    interpolation.kind === "method" &&
    interpolation.method === "exponential" &&
    (mapping.outputAtFrom <= 0 || mapping.outputAtTo <= 0)
  )
    throw new Error(
      "Exponential interpolation needs positive output endpoints.",
    );
  const issues = interpolationIssues(interpolation);
  if (issues.length) throw new Error(issues.join(" "));
  const output =
    interpolation.kind === "method"
      ? interpolate(
          interpolation.method,
          mapping.outputAtFrom,
          mapping.outputAtTo,
          percent,
        )
      : interpolate(
          "linear",
          mapping.outputAtFrom,
          mapping.outputAtTo,
          evaluateInterpolation(interpolation, percent),
        );
  if (!Number.isFinite(output))
    throw new Error("This interpolation produces an invalid output.");
  return output;
}
