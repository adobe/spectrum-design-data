// Copyright 2026 Adobe. All rights reserved.
import { belowStepSize } from "../scales/stepNames";
import {
  isRule,
  STANDARD_SCALE_NAMING_RULE_ID,
  type Rule,
  type ScaleNamingRule,
} from "./model";

export const STANDARD_SCALE_NAMING_RULE: ScaleNamingRule = {
  id: STANDARD_SCALE_NAMING_RULE_ID,
  name: "Standard scale naming",
  description:
    "Base 100, clean smaller indices, and increments of 100 above the base.",
  type: "scale-naming",
  locked: true,
  baseLabel: 100,
  aboveIncrement: 100,
  below: { kind: "automatic" },
};

export function scaleNamingIndices(
  rule: ScaleNamingRule,
  count: number,
  basePosition: number,
): number[] {
  if (
    !isRule(rule) ||
    !Number.isSafeInteger(count) ||
    count < 1 ||
    !Number.isSafeInteger(basePosition) ||
    basePosition < 0 ||
    basePosition >= count
  ) {
    throw new Error("Choose a valid naming rule and an existing base swatch.");
  }
  const increment =
    rule.below.kind === "fixed"
      ? rule.below.increment
      : (belowStepSize(basePosition) * rule.baseLabel) / 100;
  const indices = Array.from({ length: count }, (_, position) => {
    const offset = position - basePosition;
    return Number(
      (
        rule.baseLabel +
        offset * (offset < 0 ? increment : rule.aboveIncrement)
      ).toPrecision(15),
    );
  });
  if (
    indices.some(
      (value, position) =>
        !Number.isFinite(value) ||
        value <= 0 ||
        (position > 0 && value <= indices[position - 1]),
    )
  ) {
    throw new Error(
      "This naming rule cannot give every swatch a positive, distinct, increasing index. Reduce the below-base increment or choose another base.",
    );
  }
  return indices;
}

export function resolveScaleNamingRule(
  rules: readonly Rule[],
  id: string,
): ScaleNamingRule {
  const rule = rules.find((candidate) => candidate.id === id);
  if (!rule || rule.type !== "scale-naming")
    throw new Error(`Scale naming rule ${id} is unavailable.`);
  return rule;
}
