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
import type { GeneratedSpacingValue, SpacingScale } from "./model";

export function spacingTokenName(scaleName: string, step: number) {
  return dimensionTokenName("spacing", scaleName, step);
}

/** Single generation path for the Elements view, tokens, and change tracking. */
export function generateSpacingScale(
  scale: SpacingScale,
  rules: readonly Rule[] = RULE_DEFAULTS,
  scaleTypes: readonly ScaleType[] = SCALE_TYPE_DEFAULTS,
  modeValues: ModeParameterValues = {},
): GeneratedSpacingValue[] {
  return generateDimensionScale(
    "spacing",
    scale,
    rules,
    scaleTypes,
    modeValues,
  );
}

export type SpacingScaleIssue = DimensionScaleIssue;

/** Values must be finite, positive and distinct so every token has its own value. */
export const spacingScaleIssues = dimensionScaleIssues;
