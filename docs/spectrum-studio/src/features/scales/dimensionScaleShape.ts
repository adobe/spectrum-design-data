// Copyright 2026 Adobe. All rights reserved.
import { isFoundationPublishingMetadata } from "../foundations/types";
import { isBindingRecord } from "./interpolation";
import type { DimensionScale } from "./foundation";

// Keep this file free of default-data imports: dataset validation loads it while the defaults are still being built.

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNumberRecord(value: unknown): value is Record<string, number> {
  return (
    !!value &&
    typeof value === "object" &&
    Object.values(value).every(isFiniteNumber)
  );
}

export function isDimensionScale(value: unknown): value is DimensionScale {
  if (!value || typeof value !== "object") return false;
  const scale = value as Partial<DimensionScale>;
  return (
    typeof scale.id === "string" &&
    isFoundationPublishingMetadata(scale) &&
    typeof scale.name === "string" &&
    typeof scale.scaleTypeId === "string" &&
    (scale.componentSizeScaling === undefined ||
      typeof scale.componentSizeScaling === "boolean") &&
    (scale.base === undefined || isFiniteNumber(scale.base)) &&
    isFiniteNumber(scale.below) &&
    isFiniteNumber(scale.above) &&
    (scale.startStep === undefined || Number.isSafeInteger(scale.startStep)) &&
    isNumberRecord(scale.parameters) &&
    (scale.bindings === undefined || isBindingRecord(scale.bindings)) &&
    typeof scale.roundingRuleId === "string"
  );
}
