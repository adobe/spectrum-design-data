// Copyright 2026 Adobe. All rights reserved.
import type { Rule } from "../logic/model";
import { RULE_DEFAULTS } from "../logic/defaults";
import {
  dimensionScaleIssues,
  dimensionTokenName,
  generateDimensionScale,
  type DimensionScaleIssue,
} from "../scales/foundation";
import type { ModeParameterValues } from "../scales/generate";
import { SCALE_TYPE_DEFAULTS, type ScaleType } from "../scales/scaleType";
import type { GeneratedSizeValue, SizeScale } from "./model";

export function sizeTokenName(scaleName: string, step: number) {
  return dimensionTokenName("size", scaleName, step);
}

export function generateSizeScale(
  scale: SizeScale,
  rules: readonly Rule[] = RULE_DEFAULTS,
  scaleTypes: readonly ScaleType[] = SCALE_TYPE_DEFAULTS,
  modeValues: ModeParameterValues = {},
): GeneratedSizeValue[] {
  return generateDimensionScale("size", scale, rules, scaleTypes, modeValues);
}

export type SizeScaleIssue = DimensionScaleIssue;

export const sizeScaleIssues = dimensionScaleIssues;
