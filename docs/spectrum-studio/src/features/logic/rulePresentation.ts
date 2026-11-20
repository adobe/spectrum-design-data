// Copyright 2026 Adobe. All rights reserved.
import type { Rule, RuleType } from "./model";

export const RULE_SECTIONS = [
  { type: "rounding", label: "Rounding rules", tabLabel: "Rounding" },
  { type: "scale-naming", label: "Naming rules", tabLabel: "Naming" },
  { type: "generator", label: "Generators", tabLabel: "Generators" },
  { type: "conditional", label: "Conditional rules", tabLabel: "Conditions" },
] as const;

export function rulePresentation(type: RuleType) {
  const sectionType = type === "tshirt-sizing" ? "generator" : type;
  return RULE_SECTIONS.find((section) => section.type === sectionType)!;
}

export function groupRulesByType(rules: readonly Rule[]) {
  return RULE_SECTIONS.map((section) => ({
    ...section,
    rules: rules.filter(
      (rule) => rulePresentation(rule.type).type === section.type,
    ),
  }));
}
