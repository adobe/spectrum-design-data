// Copyright 2026 Adobe. All rights reserved.
import { SIZE_TERM_IDS } from "../taxonomy/variantVocabulary";

/** Upgrade before structural validation; saved and working records are independent. */
export function upgradeGeneratorRulesSnapshot(value: unknown): unknown {
  if (
    !value ||
    typeof value !== "object" ||
    !("rules" in value) ||
    !Array.isArray(value.rules)
  )
    return value;
  return {
    ...value,
    rules: value.rules.map((rule: unknown) => {
      if (!rule || typeof rule !== "object" || !("type" in rule)) return rule;
      return {
        ...rule,
        ...(!("applicability" in rule) && {
          applicability:
            rule.type === "conditional"
              ? { kind: "specific", types: ["color", "opacity"] }
              : { kind: "all" },
        }),
        ...(rule.type === "tshirt-sizing" && {
          type: "generator",
          defaultTermId: SIZE_TERM_IDS.m,
        }),
      };
    }),
  };
}
