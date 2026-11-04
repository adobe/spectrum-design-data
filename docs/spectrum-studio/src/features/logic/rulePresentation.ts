// Copyright 2026 Adobe. All rights reserved.
import type { Rule, RuleType } from "./model";

export const RULE_SECTIONS = [
  { type: "rounding", label: "Rounding rules" },
  { type: "scale-naming", label: "Naming rules" },
  { type: "generator", label: "Generators" },
  { type: "conditional", label: "Conditional rules" },
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
