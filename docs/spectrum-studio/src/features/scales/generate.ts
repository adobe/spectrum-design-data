// Copyright 2026 Adobe. All rights reserved.
import {
  applyRoundingRule,
  resolveRule,
  roundingFactorFor,
} from "../logic/evaluate";
import { RULE_DEFAULTS } from "../logic/defaults";
import type { Rule } from "../logic/model";
import {
  evaluateInterpolationMapping,
  type Interpolation,
  type InterpolationMapping,
} from "./interpolationDefinition";
import { resolveBinding, type ParameterBinding } from "./interpolation";
import {
  resolveBaseValue,
  resolveParameterValues,
  resolveScaleType,
  SCALE_TYPE_DEFAULTS,
  scaleTypeValue,
  type ScaleType,
} from "./scaleType";

import { clampScaleRange, scaleStepName } from "./stepNames";
export {
  SCALE_BELOW_MAX,
  SCALE_ABOVE_MAX,
  belowStepSize,
  clampScaleRange,
  scaleStepName,
} from "./stepNames";

/** Binding key for the scale's own base value. */
export const BASE_BINDING_KEY = "base";

export interface ScaleSettings {
  scaleTypeId: string;
  /** Overrides the formula's base; ignored when the formula does not allow it. */
  base?: number;
  below: number;
  above: number;
  /** Per-scale overrides of the formula's parameters; only parts the formula allows take effect. */
  parameters: { [parameterId: string]: number };
  /** Keyed by parameter id, or `base`. */
  bindings?: { [parameterId: string]: ParameterBinding };
  roundingRuleId: string;
}

export interface GeneratedScaleValue {
  index: number;
  step: number;
  raw: number;
  factor: number;
  value: number;
}

export interface ScaleLibrary {
  scaleTypes?: readonly ScaleType[];
  rules?: readonly Rule[];
}

/** Current value of each mode parameter, keyed by parameter id (e.g. `typography.textZoom`). */
export type ModeParameterValues = Readonly<Record<string, number>>;

/** Applies overrides, then bindings (a binding wins) for the given mode parameter values. */
export function resolveScaleInputs(
  scaleType: ScaleType,
  settings: ScaleSettings,
  modeValues: ModeParameterValues = {},
) {
  const parameters = resolveParameterValues(scaleType, settings.parameters);
  for (const parameter of scaleType.parameters) {
    const binding = parameter.adaptable
      ? settings.bindings?.[parameter.id]
      : undefined;
    const input = binding ? modeValues[binding.modeParameterId] : undefined;
    if (binding && input !== undefined)
      parameters[parameter.id] = resolveBinding(binding, input);
  }
  const baseBinding = settings.bindings?.[BASE_BINDING_KEY];
  const baseInput = baseBinding
    ? modeValues[baseBinding.modeParameterId]
    : undefined;
  const base =
    baseBinding && baseInput !== undefined
      ? resolveBinding(baseBinding, baseInput)
      : resolveBaseValue(scaleType, settings.base);
  return { base, parameters };
}

/** Single generation path for scales: preview, tokens, and change tracking should all call this. */
export function generateScale(
  settings: ScaleSettings,
  library: ScaleLibrary = {},
  modeValues: ModeParameterValues = {},
): GeneratedScaleValue[] {
  const scaleType = resolveScaleType(
    library.scaleTypes ?? SCALE_TYPE_DEFAULTS,
    settings.scaleTypeId,
  );
  const rule = resolveRule(
    library.rules ?? RULE_DEFAULTS,
    settings.roundingRuleId,
  );
  const { below, above } = clampScaleRange(settings.below, settings.above);
  const { base, parameters } = resolveScaleInputs(
    scaleType,
    settings,
    modeValues,
  );
  const values: GeneratedScaleValue[] = [];
  for (let index = -below; index <= above; index++) {
    const raw = scaleTypeValue(scaleType, index, base, parameters);
    values.push({
      index,
      step: scaleStepName(index, below),
      raw,
      factor: roundingFactorFor(rule, raw),
      value: applyRoundingRule(rule, raw),
    });
  }
  return values;
}

/** Derived scale: one value per source value, passed through an interpolation. It follows the source's range and step names. */
export function generateDerivedScale(
  source: readonly Pick<GeneratedScaleValue, "index" | "step" | "value">[],
  interpolation: Interpolation,
  mapping: InterpolationMapping,
  roundingRuleId: string,
  rules: readonly Rule[] = RULE_DEFAULTS,
): GeneratedScaleValue[] {
  const rule = resolveRule(rules, roundingRuleId);
  return source.map(({ index, step, value }) => {
    const raw = evaluateInterpolationMapping(interpolation, mapping, value);
    return {
      index,
      step,
      raw,
      factor: roundingFactorFor(rule, raw),
      value: applyRoundingRule(rule, raw),
    };
  });
}

export type ScaleIssue = "invalid" | "non-positive" | "duplicate";

/** Values must be finite, positive and distinct so every token has its own value. */
export function scaleIssues(
  values: readonly Pick<GeneratedScaleValue, "value">[],
): ScaleIssue[] {
  const issues: ScaleIssue[] = [];
  const finite = values.map((entry) => entry.value).filter(Number.isFinite);
  if (finite.length !== values.length) issues.push("invalid");
  if (finite.some((value) => value <= 0)) issues.push("non-positive");
  if (new Set(finite).size !== finite.length) issues.push("duplicate");
  return issues;
}
