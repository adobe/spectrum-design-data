// Copyright 2026 Adobe. All rights reserved.
import {
  COMPARATORS,
  type Rule,
  type RuleType,
  type RoundingRule,
} from "./model";
import { COMPONENT_SIZES } from "../foundations/componentSizes";
import { SIZE_TERM_IDS } from "../taxonomy/variantVocabulary";

export interface RuleTypeDefinition {
  id: RuleType;
  label: string;
  description: string;
  isAvailable: boolean;
}

export const RULE_TYPES: readonly RuleTypeDefinition[] = [
  {
    id: "conditional",
    label: "Conditional",
    description: "Selects a token offset using taxonomy and mode conditions.",
    isAvailable: true,
  },
  {
    id: "rounding",
    label: "Rounding",
    description: "Rounds values to a factor, with conditions for value ranges.",
    isAvailable: true,
  },
  {
    id: "generator",
    label: "Generator",
    description: "Generates Size options from a default token.",
    isAvailable: true,
  },
  {
    id: "scale-naming",
    label: "Scale naming",
    description: "Names steps relative to a chosen base swatch.",
    isAvailable: true,
  },
];

export function ruleTypeLabel(type: RuleType) {
  return RULE_TYPES.find((definition) => definition.id === type)?.label ?? type;
}

export function formatFactor(factor: number) {
  return factor === 0 ? "None" : String(factor);
}

export function summarizeRoundingRule(rule: RoundingRule) {
  const conditions = rule.conditions.map((condition) => {
    const symbol =
      COMPARATORS.find((comparator) => comparator.id === condition.comparator)
        ?.symbol ?? condition.comparator;
    return `${symbol} ${condition.threshold} → ${formatFactor(condition.outcome.factor)}`;
  });
  const fallback = `${conditions.length > 0 ? "otherwise" : "always"} ${formatFactor(rule.defaultOutcome.factor)}`;
  return [...conditions, fallback].join(" · ");
}

export function summarizeRule(rule: Rule) {
  if (rule.type === "conditional")
    return `${rule.branches.length} conditional branches · Otherwise offset ${rule.otherwise.offset}`;
  if (rule.type === "rounding") return summarizeRoundingRule(rule);
  if (rule.type === "scale-naming")
    return `Base ${rule.baseLabel} · Above +${rule.aboveIncrement} · Below ${rule.below.kind === "automatic" ? "automatic" : `+${rule.below.increment}`}`;
  return (
    rule.mappings
      .map(
        (mapping) =>
          `${COMPONENT_SIZES.find((size) => SIZE_TERM_IDS[size.id] === mapping.termId)?.label ?? "Option"}: ${mapping.offset}`,
      )
      .join(" / ") +
    (rule.movement === "scale-index" ? " (scale index)" : " (available tokens)")
  );
}
