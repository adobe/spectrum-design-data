// Copyright 2026 Adobe. All rights reserved.
import {
  LINE_HEIGHT_ROUNDING_RULE_ID,
  NO_ROUNDING_RULE_ID,
  SPACING_ROUNDING_RULE_ID,
  TEXT_SIZE_ROUNDING_RULE_ID,
  WHOLE_NUMBERS_RULE_ID,
  type RoundingRule,
  type Rule,
} from "./model";

/** Converts inline rounding settings from before Rules existed into rule references. */
export interface LegacyRuleReference {
  ruleId: string;
  /** Present when the legacy values differ from every shipped rule. */
  pendingRule?: Rule;
}

/** Legacy typography factors snapped to none, whole, or even. */
function snapFactor(value: number) {
  if (value <= 0) return 0;
  return value < 1.5 ? 1 : 2;
}

function migratedRule(
  id: string,
  name: string,
  rule: Pick<RoundingRule, "defaultOutcome" | "conditions">,
): RoundingRule {
  return {
    id,
    name,
    description: "Created from settings saved before Rules existed.",
    type: "rounding",
    depth: 1,
    ...rule,
  };
}

export function legacyTextRounding(
  textRounding: number,
  threshold: number,
  belowThreshold: number,
): LegacyRuleReference {
  const above = snapFactor(textRounding);
  const below = snapFactor(belowThreshold);
  if (above === 2 && below === 1 && threshold === 12)
    return { ruleId: TEXT_SIZE_ROUNDING_RULE_ID };
  const id = "rule-migrated-text-size-rounding";
  return {
    ruleId: id,
    pendingRule: migratedRule(id, "Text size rounding (migrated)", {
      defaultOutcome: { factor: above },
      conditions:
        above === below
          ? []
          : [
              {
                id: "condition-migrated-text-size",
                comparator: "lt",
                threshold,
                outcome: { factor: below },
              },
            ],
    }),
  };
}

export function legacyLineHeightRounding(value: number): string {
  const factor = snapFactor(value);
  return factor === 0
    ? NO_ROUNDING_RULE_ID
    : factor === 1
      ? WHOLE_NUMBERS_RULE_ID
      : LINE_HEIGHT_ROUNDING_RULE_ID;
}

export interface LegacyRoundingStep {
  below: number | null;
  factor: number;
}

const DEFAULT_SPACING_STEPS: readonly LegacyRoundingStep[] = [
  { below: 2, factor: 1 },
  { below: 10, factor: 2 },
  { below: 28, factor: 4 },
  { below: 56, factor: 8 },
  { below: 96, factor: 16 },
  { below: 256, factor: 24 },
  { below: null, factor: 32 },
];

/** Each `below` step becomes a "less than" condition; a null step becomes the default. */
export function legacySpacingRounding(
  scaleId: string,
  scaleName: string,
  steps: readonly LegacyRoundingStep[],
): LegacyRuleReference {
  if (JSON.stringify(steps) === JSON.stringify(DEFAULT_SPACING_STEPS))
    return { ruleId: SPACING_ROUNDING_RULE_ID };
  const catchAll = steps.findIndex((step) => step.below === null);
  const ordered = catchAll === -1 ? steps : steps.slice(0, catchAll);
  const id = `rule-migrated-spacing-${scaleId}`;
  return {
    ruleId: id,
    pendingRule: migratedRule(id, `${scaleName} spacing rounding (migrated)`, {
      defaultOutcome: {
        factor:
          catchAll === -1
            ? (steps[steps.length - 1]?.factor ?? 1)
            : steps[catchAll].factor,
      },
      conditions: ordered.flatMap((step, index) =>
        step.below === null
          ? []
          : [
              {
                id: `condition-migrated-${scaleId}-${index}`,
                comparator: "lt" as const,
                threshold: step.below,
                outcome: { factor: step.factor },
              },
            ],
      ),
    }),
  };
}
