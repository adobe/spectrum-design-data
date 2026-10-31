// Copyright 2026 Adobe. All rights reserved.
import type { PrimitiveReference } from "../tokens/primitiveReferences";

export const RULE_VALUE_TYPES = [
  { id: "color", label: "Color", icon: "color" },
  { id: "opacity", label: "Opacity", icon: "opacity" },
  { id: "spacing", label: "Spacing", icon: "spacing" },
  { id: "size", label: "Sizing", icon: "size" },
  { id: "font-size", label: "Font size", icon: "typography" },
  { id: "line-height", label: "Line height", icon: "typography" },
  {
    id: "line-height-multiplier",
    label: "Line height multiplier",
    icon: "typography",
  },
  { id: "workflow-icon-size", label: "Workflow icon size", icon: "typography" },
  { id: "radius", label: "Radius", icon: "radius" },
  { id: "elevation", label: "Elevation", icon: "elevation" },
] as const;
export type RuleValueType = (typeof RULE_VALUE_TYPES)[number]["id"];
export type RuleApplicability =
  | { kind: "all" }
  | { kind: "specific"; types: RuleValueType[] };
type Operation =
  | "generator"
  | "tshirt-sizing"
  | "rounding"
  | "conditional"
  | "scale-naming";
export interface ApplicableRule {
  type: Operation;
  applicability?: RuleApplicability;
}

export function compatibleRuleTypes(type: Operation): RuleValueType[] {
  return RULE_VALUE_TYPES.filter(({ id }) =>
    type === "scale-naming"
      ? id === "color"
      : type === "conditional"
        ? id === "color" || id === "opacity"
        : type === "rounding"
          ? id !== "color" && id !== "elevation"
          : id !== "color" && id !== "opacity",
  ).map(({ id }) => id);
}

export function isRuleApplicability(
  value: unknown,
  type: Operation,
): value is RuleApplicability {
  if (!value || typeof value !== "object" || !("kind" in value)) return false;
  if (value.kind === "all") return Object.keys(value).length === 1;
  return (
    value.kind === "specific" &&
    "types" in value &&
    Array.isArray(value.types) &&
    value.types.length > 0 &&
    new Set(value.types).size === value.types.length &&
    value.types.every((id) => compatibleRuleTypes(type).includes(id)) &&
    Object.keys(value).every((key) => key === "kind" || key === "types")
  );
}

export function ruleAppliesTo(
  rule: ApplicableRule,
  type: RuleValueType,
): boolean {
  return (
    compatibleRuleTypes(rule.type).includes(type) &&
    (!rule.applicability ||
      rule.applicability.kind === "all" ||
      rule.applicability.types.includes(type))
  );
}

export function referenceValueType(
  reference: Pick<PrimitiveReference, "family" | "metricId" | "unit">,
): RuleValueType | undefined {
  if (reference.family !== "typography") return reference.family;
  if (reference.metricId === "font-size") return "font-size";
  if (reference.metricId === "workflow-icon-size") return "workflow-icon-size";
  if (reference.metricId?.endsWith("-unitlessLineHeight"))
    return "line-height-multiplier";
  if (reference.metricId?.endsWith("-lineHeight")) return "line-height";
  return undefined;
}

export function ruleAppliesToReference(
  rule: ApplicableRule,
  reference: Pick<PrimitiveReference, "family" | "metricId" | "unit">,
) {
  const type = referenceValueType(reference);
  return type !== undefined && ruleAppliesTo(rule, type);
}
