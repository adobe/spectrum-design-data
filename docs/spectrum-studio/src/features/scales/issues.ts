// Copyright 2026 Adobe. All rights reserved.
import {
  dimensionScaleIssues,
  type GeneratedDimensionValue,
  type DimensionScaleIssue,
} from "./foundation";

export type DimensionValuePolicy = "positive" | "non-negative";
export function dimensionIssues(
  values: readonly GeneratedDimensionValue[],
  policy: DimensionValuePolicy = "positive",
) {
  const issues: DimensionScaleIssue[] =
    policy === "positive"
      ? dimensionScaleIssues(values)
      : [
          ...(values.length === 0 ||
          values.some(
            (value) =>
              !Number.isFinite(value.raw) || !Number.isFinite(value.value),
          )
            ? ["invalid" as const]
            : []),
          ...(values.some((value) => value.raw < 0 || value.value < 0)
            ? ["non-positive" as const]
            : []),
          ...(dimensionScaleIssues(values).includes("duplicate")
            ? ["duplicate" as const]
            : []),
        ];
  const variant =
    issues.includes("invalid") ||
    (policy === "non-negative" && issues.includes("non-positive"))
      ? "negative"
      : issues.every((issue) => issue === "duplicate")
        ? "informative"
        : "notice";
  return { issues, variant } as const;
}
