// Copyright 2026 Adobe. All rights reserved.
import {
  evaluateExpression,
  isExpressionIdentifier,
  isReservedExpressionName,
  parseExpressionCached,
  type ParsedExpression,
} from "./expression";
import { expressionToLatex } from "./expressionLatex";

export type ScaleTypeKind =
  | "type-scale"
  | "geometric"
  | "linear"
  | "expression";

export interface TypeScaleAdaptation {
  interpolationId: string;
  ratioAtSmallest: number;
  ratioAtLargest: number;
}

/** A named numeric input shared by formulas and interpolations. */
export interface FormulaParameter {
  id: string;
  label: string;
  default: number;
  min?: number;
  max?: number;
  step: number;
  /** Whether a foundation may bind this part to a mode parameter. */
  adaptable: boolean;
}

/** A formula part; the foundation may set its own value only when `overridable` is on. */
export interface ScaleTypeParameter extends FormulaParameter {
  /** Whether a foundation may set its own value for this part. */
  overridable: boolean;
}

/** The value at index 0. The formula supplies a default; a foundation may override it when allowed. */
export interface ScaleTypeBase {
  default: number;
  step: number;
  adaptable: boolean;
  overridable: boolean;
}

/** A named formula: index → value. Steps (the range of indices) belong to the foundation that uses it. */
export interface ScaleType {
  id: string;
  name: string;
  description: string;
  kind: ScaleTypeKind;
  parameters: ScaleTypeParameter[];
  base: ScaleTypeBase;
  /** Custom only. Variables: `i`, `base`, and the parameter ids. */
  expression?: string;
  /** Reserved for items that cannot be edited or deleted. */
  locked?: boolean;
  /** Required for the canonical Type scale; never an optional adaptive switch. */
  textSizeAdaptation?: TypeScaleAdaptation;
}

/** Ids from before formulas were user-defined; kept to migrate old references and as the hidden fallback. */
export const GEOMETRIC_SCALE_TYPE_ID = "scale-type-geometric";
export const LINEAR_SCALE_TYPE_ID = "scale-type-linear";

export const TYPOGRAPHY_SCALE_TYPE_ID = "scale-type-typography";
export const SPACING_SCALE_TYPE_ID = "scale-type-spacing";
export const SIZE_SCALE_TYPE_ID = "scale-type-size";
export const RADIUS_SCALE_TYPE_ID = "scale-type-radius";

const GEOMETRIC_TEMPLATE: readonly ScaleTypeParameter[] = [
  {
    id: "ratio",
    label: "Ratio",
    default: 1.25,
    min: 0.5,
    max: 3,
    step: 0.001,
    adaptable: false,
    overridable: false,
  },
  {
    id: "offset",
    label: "Offset",
    default: 0,
    step: 1,
    adaptable: false,
    overridable: false,
  },
];
const LINEAR_TEMPLATE: readonly ScaleTypeParameter[] = [
  {
    id: "step",
    label: "Step",
    default: 4,
    step: 1,
    adaptable: false,
    overridable: false,
  },
];

/** Parameters of the formula types as they were when Geometric and Linear were built in; used to keep old values exact. */
export const LEGACY_BUILT_IN_PARAMETERS: Readonly<
  Record<string, Readonly<Record<string, number>>>
> = {
  [GEOMETRIC_SCALE_TYPE_ID]: { ratio: 1.25, offset: 0 },
  [LINEAR_SCALE_TYPE_ID]: { step: 4 },
};

function allowAll(
  parameters: readonly ScaleTypeParameter[],
  values: Readonly<Record<string, number>>,
): ScaleTypeParameter[] {
  return parameters.map((parameter) => ({
    ...parameter,
    default: values[parameter.id] ?? parameter.default,
    adaptable: true,
    overridable: true,
  }));
}

/** Shipped formulas match the values the foundations used before formulas were user-defined. */
export const SCALE_TYPE_DEFAULTS: readonly ScaleType[] = [
  {
    id: TYPOGRAPHY_SCALE_TYPE_ID,
    name: "Type scale",
    description: "Each size is the previous one times the ratio.",
    kind: "type-scale",
    parameters: allowAll(
      GEOMETRIC_TEMPLATE.filter((parameter) => parameter.id === "ratio"),
      { ratio: 1.125 },
    ),
    base: { default: 14, step: 1, adaptable: true, overridable: true },
    textSizeAdaptation: {
      interpolationId: "interpolation-linear",
      ratioAtSmallest: 1.066,
      ratioAtLargest: 1.066,
    },
  },
  {
    id: SPACING_SCALE_TYPE_ID,
    name: "Spacing",
    description:
      "Geometric spacing; the offset is the floor values approach below the base.",
    kind: "geometric",
    parameters: allowAll(GEOMETRIC_TEMPLATE, { ratio: 1.2025, offset: -6 }),
    base: { default: 8, step: 1, adaptable: true, overridable: true },
  },
  {
    id: SIZE_SCALE_TYPE_ID,
    name: "Size",
    description: "Each size adds a fixed step to the previous one.",
    kind: "linear",
    parameters: allowAll(LINEAR_TEMPLATE, { step: 8 }),
    base: { default: 24, step: 1, adaptable: true, overridable: true },
  },
  {
    id: RADIUS_SCALE_TYPE_ID,
    name: "Radius",
    description:
      "Each corner radius adds a fixed increment to the previous one.",
    kind: "linear",
    parameters: allowAll(LINEAR_TEMPLATE, { step: 2 }),
    base: { default: 8, step: 1, adaptable: true, overridable: true },
  },
  ...ELEVATION_FORMULAS,
];

/** Stands in when a reference points at a formula that does not exist; never listed. */
export const FALLBACK_SCALE_TYPE: ScaleType = {
  id: GEOMETRIC_SCALE_TYPE_ID,
  name: "Geometric",
  description: "",
  kind: "geometric",
  parameters: allowAll(GEOMETRIC_TEMPLATE, {}),
  base: { default: 8, step: 1, adaptable: true, overridable: true },
};

export const EXPRESSION_SCALE_TYPE_VARIABLES = ["i", "base"] as const;

export function expressionVariableNames(
  scaleType: Pick<ScaleType, "parameters">,
) {
  return [
    ...EXPRESSION_SCALE_TYPE_VARIABLES,
    ...scaleType.parameters.map((parameter) => parameter.id),
  ];
}

function parseScaleTypeExpression(scaleType: ScaleType): ParsedExpression {
  return parseExpressionCached(
    scaleType.expression ?? "",
    expressionVariableNames(scaleType),
  );
}

/** Human-readable problems that stop a scale type from generating values; empty when it is valid. */
export function scaleTypeIssues(scaleType: ScaleType): string[] {
  const issues: string[] = [];
  if (
    scaleType.id === TYPOGRAPHY_SCALE_TYPE_ID ||
    scaleType.kind === "type-scale"
  ) {
    if (
      scaleType.id !== TYPOGRAPHY_SCALE_TYPE_ID ||
      scaleType.kind !== "type-scale"
    )
      issues.push(
        "The shared Type scale cannot change identity or formula type.",
      );
    if (
      scaleType.parameters.length !== 1 ||
      scaleType.parameters[0]?.id !== "ratio"
    )
      issues.push("Type scale has only a Ratio parameter.");
    if (
      !scaleType.base.adaptable ||
      !scaleType.parameters[0]?.adaptable ||
      !scaleType.base.overridable ||
      !scaleType.parameters[0]?.overridable
    )
      issues.push(
        "Type scale always follows Text size and supports explicit consumer bases.",
      );
    const adaptation = scaleType.textSizeAdaptation;
    if (
      !adaptation?.interpolationId ||
      ![adaptation.ratioAtSmallest, adaptation.ratioAtLargest].every(
        (value) => Number.isFinite(value) && value >= 0.5 && value <= 3,
      )
    )
      issues.push(
        "Enter adaptive ratios between 0.5 and 3 and select an interpolation.",
      );
    if (scaleType.base.default <= 0)
      issues.push("Type scale needs a positive base size.");
    if (
      !Number.isFinite(scaleType.parameters[0]?.default) ||
      scaleType.parameters[0].default < 0.5 ||
      scaleType.parameters[0].default > 3
    )
      issues.push("Enter a ratio between 0.5 and 3.");
    if (scaleType.expression !== undefined)
      issues.push("Type scale does not use a custom expression.");
  }
  const seen = new Set<string>();
  for (const parameter of scaleType.parameters) {
    if (scaleType.kind === "expression") {
      if (
        !isExpressionIdentifier(parameter.id) ||
        isReservedExpressionName(parameter.id) ||
        (EXPRESSION_SCALE_TYPE_VARIABLES as readonly string[]).includes(
          parameter.id,
        )
      ) {
        issues.push(`"${parameter.id}" cannot be used as a parameter name.`);
      }
    }
    if (seen.has(parameter.id))
      issues.push(`Parameter "${parameter.id}" is defined twice.`);
    seen.add(parameter.id);
    if (
      !Number.isFinite(parameter.default) ||
      !Number.isFinite(parameter.step) ||
      parameter.step <= 0
    )
      issues.push(
        `Parameter "${parameter.id}" needs a number default and a positive step.`,
      );
    if (
      parameter.min !== undefined &&
      parameter.max !== undefined &&
      parameter.min > parameter.max
    )
      issues.push(
        `Parameter "${parameter.id}" has a minimum above its maximum.`,
      );
  }
  if (
    !Number.isFinite(scaleType.base.default) ||
    !Number.isFinite(scaleType.base.step) ||
    scaleType.base.step <= 0
  )
    issues.push("The base value needs a number default and a positive step.");
  if (scaleType.kind === "expression") {
    const parsed = parseScaleTypeExpression(scaleType);
    if (!parsed.ok) issues.push(parsed.error);
  }
  return issues;
}

export function isFormulaParameter(value: unknown): value is FormulaParameter {
  if (!value || typeof value !== "object") return false;
  const parameter = value as Partial<FormulaParameter>;
  return (
    typeof parameter.id === "string" &&
    typeof parameter.label === "string" &&
    Number.isFinite(parameter.default) &&
    Number.isFinite(parameter.step) &&
    (parameter.min === undefined || Number.isFinite(parameter.min)) &&
    (parameter.max === undefined || Number.isFinite(parameter.max)) &&
    typeof parameter.adaptable === "boolean"
  );
}

export function isScaleTypeParameter(
  value: unknown,
): value is ScaleTypeParameter {
  return (
    isFormulaParameter(value) &&
    typeof (value as Partial<ScaleTypeParameter>).overridable === "boolean"
  );
}

export function isScaleTypeBase(value: unknown): value is ScaleTypeBase {
  if (!value || typeof value !== "object") return false;
  const base = value as Partial<ScaleTypeBase>;
  return (
    Number.isFinite(base.default) &&
    Number.isFinite(base.step) &&
    typeof base.adaptable === "boolean" &&
    typeof base.overridable === "boolean"
  );
}

export function isScaleType(value: unknown): value is ScaleType {
  if (!value || typeof value !== "object") return false;
  const scaleType = value as Partial<ScaleType>;
  return (
    typeof scaleType.id === "string" &&
    typeof scaleType.name === "string" &&
    typeof scaleType.description === "string" &&
    (scaleType.kind === "type-scale" ||
      scaleType.kind === "geometric" ||
      scaleType.kind === "linear" ||
      scaleType.kind === "expression") &&
    Array.isArray(scaleType.parameters) &&
    scaleType.parameters.every(isScaleTypeParameter) &&
    isScaleTypeBase(scaleType.base) &&
    (scaleType.expression === undefined ||
      typeof scaleType.expression === "string") &&
    (scaleType.locked === undefined || typeof scaleType.locked === "boolean") &&
    ((scaleType.id !== TYPOGRAPHY_SCALE_TYPE_ID &&
      scaleType.kind !== "type-scale") ||
      scaleTypeIssues(scaleType as ScaleType).length === 0)
  );
}

/** A new formula of the chosen type; nothing is overridable or adaptive until the author allows it. */
export function createScaleType(kind: ScaleTypeKind = "expression"): ScaleType {
  if (kind === "type-scale")
    throw new Error("The shared Type scale already exists.");
  const identity = {
    id: `scale-type-custom-${crypto.randomUUID()}`,
    name: "New formula",
    description: "",
    base: { default: 8, step: 1, adaptable: false, overridable: false },
  };
  if (kind === "expression") {
    return {
      ...identity,
      kind,
      parameters: structuredClone([...LINEAR_TEMPLATE]),
      expression: "base + i * step",
    };
  }
  return {
    ...identity,
    kind,
    parameters: structuredClone([
      ...(kind === "geometric" ? GEOMETRIC_TEMPLATE : LINEAR_TEMPLATE),
    ]),
  };
}

export const SCALE_TYPE_KINDS: readonly { id: ScaleTypeKind; label: string }[] =
  [
    { id: "geometric", label: "Geometric progression" },
    { id: "linear", label: "Linear" },
    { id: "expression", label: "Custom expression" },
  ];

export function scaleTypeKindLabel(kind: ScaleTypeKind) {
  if (kind === "type-scale") return "Type scale";
  return SCALE_TYPE_KINDS.find((item) => item.id === kind)?.label ?? kind;
}

/** Switching type replaces the parameters and expression with that type's defaults; flags carry over for parts with the same id. */
export function withScaleTypeKind(
  scaleType: ScaleType,
  kind: ScaleTypeKind,
): ScaleType {
  if (kind === "type-scale" && scaleType.id !== TYPOGRAPHY_SCALE_TYPE_ID)
    throw new Error("The shared Type scale already exists.");
  if (scaleType.id === TYPOGRAPHY_SCALE_TYPE_ID && kind !== "type-scale")
    throw new Error("The shared Type scale cannot change formula type.");
  if (kind === scaleType.kind) return scaleType;
  const { expression, ...rest } = scaleType;
  void expression;
  const previous = new Map(
    scaleType.parameters.map((parameter) => [parameter.id, parameter]),
  );
  const template = kind === "geometric" ? GEOMETRIC_TEMPLATE : LINEAR_TEMPLATE;
  const parameters = structuredClone([...template]).map((parameter) => ({
    ...parameter,
    adaptable: previous.get(parameter.id)?.adaptable ?? parameter.adaptable,
    overridable:
      previous.get(parameter.id)?.overridable ?? parameter.overridable,
  }));
  if (kind === "expression")
    return {
      ...rest,
      kind,
      parameters: structuredClone([...LINEAR_TEMPLATE]),
      expression: "base + i * step",
    };
  return { ...rest, kind, parameters };
}

export function summarizeScaleType(scaleType: ScaleType) {
  if (scaleType.kind === "type-scale") return "base × ratio^i";
  if (scaleType.kind === "geometric")
    return "(base − offset) × ratio^i + offset";
  if (scaleType.kind === "linear") return "base + i × step";
  return scaleType.expression ?? "";
}

/** Short label for card badges. */
export function scaleTypeBadgeLabel(kind: ScaleTypeKind) {
  if (kind === "type-scale") return "Type scale";
  return kind === "geometric"
    ? "Geometric"
    : kind === "linear"
      ? "Linear"
      : "Custom";
}

/** LaTeX for the value at index i; null when a custom expression cannot be parsed. */
export function scaleTypeLatex(scaleType: ScaleType): string | null {
  if (scaleType.kind === "type-scale")
    return String.raw`\mathrm{base} \cdot \mathrm{ratio}^{i}`;
  if (scaleType.kind === "geometric")
    return String.raw`(\mathrm{base} - \mathrm{offset}) \cdot \mathrm{ratio}^{i} + \mathrm{offset}`;
  if (scaleType.kind === "linear")
    return String.raw`\mathrm{base} + i \cdot \mathrm{step}`;
  const parsed = parseScaleTypeExpression(scaleType);
  return parsed.ok ? expressionToLatex(parsed.node) : null;
}

/** A missing reference resolves to a hidden geometric formula so generation never breaks. */
export function resolveScaleType(
  scaleTypes: readonly ScaleType[],
  id: string | undefined,
): ScaleType {
  return (
    scaleTypes.find((scaleType) => scaleType.id === id) ?? FALLBACK_SCALE_TYPE
  );
}

/** Overrides win only for parts the formula allows; anything else, missing or non-finite uses the formula value, clamped to its range. */
export function resolveParameterValues(
  scaleType: ScaleType,
  overrides: Readonly<Record<string, number>> = {},
) {
  const values: Record<string, number> = {};
  for (const parameter of scaleType.parameters) {
    const candidate = parameter.overridable
      ? overrides[parameter.id]
      : undefined;
    const value =
      candidate !== undefined && Number.isFinite(candidate)
        ? candidate
        : parameter.default;
    values[parameter.id] = Math.min(
      parameter.max ?? Infinity,
      Math.max(parameter.min ?? -Infinity, value),
    );
  }
  return values;
}

/** The foundation's base when the formula allows overriding it; otherwise the formula's. */
export function resolveBaseValue(scaleType: ScaleType, override?: number) {
  return scaleType.base.overridable && Number.isFinite(override)
    ? (override as number)
    : scaleType.base.default;
}

/** Names of the parts a foundation may set its own value for. */
export function overridablePartLabels(scaleType: ScaleType) {
  return [
    ...(scaleType.base.overridable ? ["Base"] : []),
    ...scaleType.parameters
      .filter((parameter) => parameter.overridable)
      .map((parameter) => parameter.label),
  ];
}

export interface ScaleReference {
  scaleTypeId: string;
  parameters: { [parameterId: string]: number };
  base?: number;
}

/**
 * Re-points a reference that used built-in Geometric or Linear at a shipped formula. Old effective values are kept
 * exactly by storing whatever differs from the new formula as an override; custom formulas keep their reference.
 */
export function migrateScaleReference(
  reference: ScaleReference,
  geometricTargetId: string,
): ScaleReference {
  const legacyDefaults = LEGACY_BUILT_IN_PARAMETERS[reference.scaleTypeId];
  if (!legacyDefaults) return reference;
  const targetId =
    reference.scaleTypeId === GEOMETRIC_SCALE_TYPE_ID
      ? geometricTargetId
      : SIZE_SCALE_TYPE_ID;
  const target = SCALE_TYPE_DEFAULTS.find(
    (candidate) => candidate.id === targetId,
  )!;
  const effective = { ...legacyDefaults, ...reference.parameters };
  const parameters: Record<string, number> = {};
  for (const parameter of target.parameters) {
    const value = effective[parameter.id];
    if (value !== undefined && value !== parameter.default)
      parameters[parameter.id] = value;
  }
  const base =
    reference.base !== undefined && reference.base !== target.base.default
      ? reference.base
      : undefined;
  return {
    scaleTypeId: targetId,
    parameters,
    ...(base !== undefined && { base }),
  };
}

/** Version 1 libraries held locked Geometric and Linear plus authored formulas; authored ones gain a base and stay fully overridable. */
export function migrateScaleTypeLibrary(data: unknown): ScaleType[] | null {
  if (!Array.isArray(data)) return null;
  const authored = data
    .filter(
      (item) =>
        !(
          item &&
          typeof item === "object" &&
          LEGACY_BUILT_IN_PARAMETERS[(item as { id?: string }).id ?? ""] &&
          (item as { locked?: boolean }).locked
        ),
    )
    .map((item) => {
      const scaleType = item as Omit<ScaleType, "base"> & {
        base?: ScaleTypeBase;
      };
      return {
        ...scaleType,
        parameters: (scaleType.parameters ?? []).map((parameter) => ({
          ...parameter,
          overridable: true,
        })),
        base: scaleType.base ?? {
          default: 8,
          step: 1,
          adaptable: true,
          overridable: true,
        },
      };
    });
  const shipped = SCALE_TYPE_DEFAULTS.filter(
    (formula) => !authored.some((item) => item.id === formula.id),
  );
  const migrated = [...structuredClone([...shipped]), ...authored];
  return migrated.every(isScaleType) ? migrated : null;
}

/** Raw (unrounded) value at `index`; `parameters` must come from `resolveParameterValues`, or bindings applied on top of it. */
export function scaleTypeValue(
  scaleType: ScaleType,
  index: number,
  base: number,
  parameters: Readonly<Record<string, number>>,
): number {
  if (scaleType.kind === "type-scale")
    return base * Math.pow(parameters.ratio ?? 1, index);
  if (scaleType.kind === "geometric") {
    const ratio = parameters.ratio ?? 1;
    const offset = parameters.offset ?? 0;
    return (base - offset) * Math.pow(ratio, index) + offset;
  }
  if (scaleType.kind === "linear") return base + index * (parameters.step ?? 0);
  const parsed = parseScaleTypeExpression(scaleType);
  if (!parsed.ok) return NaN;
  return evaluateExpression(parsed.node, { ...parameters, i: index, base });
}
import { ELEVATION_FORMULAS } from "../elevation/formulas";
