// Copyright 2026 Adobe. All rights reserved.
import type { ColorScale } from "./model";
import { isScaleIndex } from "../scales/swatchIndices";

export function storedCustomContrasts(scale: ColorScale) {
  return scale.customContrasts ?? scale.disabledCustomContrasts;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isCustomContrasts(
  value: unknown,
): value is NonNullable<ColorScale["customContrasts"]> {
  if (
    !isRecord(value) ||
    typeof value.baseContrastId !== "string" ||
    typeof value.namingRuleId !== "string" ||
    !Array.isArray(value.steps) ||
    value.steps.length === 0
  )
    return false;
  const ids = new Set<string>();
  return (
    value.steps.every((step) => {
      if (
        !isRecord(step) ||
        typeof step.id !== "string" ||
        !step.id ||
        ids.has(step.id) ||
        typeof step.value !== "number" ||
        (step.scaleIndex !== undefined && !isScaleIndex(step.scaleIndex)) ||
        !Number.isFinite(step.value) ||
        step.value < 1 ||
        step.value > 21 ||
        (step.oppositeValue !== undefined &&
          (typeof step.oppositeValue !== "number" ||
            !Number.isFinite(step.oppositeValue) ||
            step.oppositeValue < 1 ||
            step.oppositeValue > 21))
      )
        return false;
      ids.add(step.id);
      return true;
    }) && ids.has(value.baseContrastId)
  );
}
