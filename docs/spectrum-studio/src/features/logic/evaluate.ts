// Copyright 2026 Adobe. All rights reserved.
import { roundToFactor } from "../foundations/rounding";
import type {
  Comparator,
  Condition,
  ConditionalRuleBody,
  RoundingRule,
  Rule,
} from "./model";
import { WHOLE_NUMBERS_RULE_ID } from "./model";
import { ruleAppliesTo, type RuleValueType } from "./applicability";

export function matchesComparator(
  comparator: Comparator,
  raw: number,
  threshold: number,
) {
  switch (comparator) {
    case "lt":
      return raw < threshold;
    case "lte":
      return raw <= threshold;
    case "gt":
      return raw > threshold;
    case "gte":
      return raw >= threshold;
  }
}

export function evaluateConditions<TOutcome>(
  body: ConditionalRuleBody<TOutcome>,
  raw: number,
) {
  const match = body.conditions.find((condition) =>
    matchesComparator(condition.comparator, raw, condition.threshold),
  );
  return {
    outcome: match?.outcome ?? body.defaultOutcome,
    conditionId: match?.id ?? null,
  };
}

export function roundingFactorFor(
  rule: RoundingRule,
  raw: number,
  context?: RuleValueType,
) {
  if (
    context
      ? !ruleAppliesTo(rule, context)
      : rule.applicability?.kind === "specific"
  )
    return 0;
  return evaluateConditions(rule, raw).outcome.factor;
}

export function applyRoundingRule(
  rule: RoundingRule,
  raw: number,
  context?: RuleValueType,
) {
  return roundToFactor(raw, roundingFactorFor(rule, raw, context), rule.depth);
}

export function sampleInputs(rule: RoundingRule) {
  const thresholds = rule.conditions.map((condition) => condition.threshold);
  const step = 1 / rule.depth;
  const values = [
    0,
    ...thresholds.flatMap((threshold) => [
      threshold - step,
      threshold,
      threshold + step,
    ]),
  ];
  values.push(Math.max(0, ...thresholds) * 2 || 100);
  return [...new Set(values.map((value) => Number(value.toFixed(4))))].sort(
    (first, second) => first - second,
  );
}

/** The existing fallback applies only to rounding consumers, never to generation rules. */
export function resolveRule(
  rules: readonly Rule[],
  id: string | undefined,
): RoundingRule {
  const referenced = rules.find((rule) => rule.id === id);
  if (referenced && referenced.type !== "rounding")
    throw new Error(
      `Rule "${referenced.name}" generates variants and cannot round foundation values.`,
    );
  return (
    referenced ??
    rules.find(
      (rule): rule is RoundingRule =>
        rule.id === WHOLE_NUMBERS_RULE_ID && rule.type === "rounding",
    ) ?? {
      id: WHOLE_NUMBERS_RULE_ID,
      name: "Whole numbers",
      description: "",
      locked: true,
      type: "rounding",
      depth: 1,
      defaultOutcome: { factor: 1 },
      conditions: [],
    }
  );
}

interface Bound {
  value: number;
  inclusive: boolean;
}

function widerUpper(current: Bound | null, next: Bound): Bound {
  if (
    !current ||
    next.value > current.value ||
    (next.value === current.value && next.inclusive)
  )
    return next;
  return current;
}

function widerLower(current: Bound | null, next: Bound): Bound {
  if (
    !current ||
    next.value < current.value ||
    (next.value === current.value && next.inclusive)
  )
    return next;
  return current;
}

function coversBelow(bound: Bound | null, value: number, inclusive: boolean) {
  return (
    !!bound &&
    (bound.value > value ||
      (bound.value === value && (bound.inclusive || !inclusive)))
  );
}

function coversAbove(bound: Bound | null, value: number, inclusive: boolean) {
  return (
    !!bound &&
    (bound.value < value ||
      (bound.value === value && (bound.inclusive || !inclusive)))
  );
}

export interface ConditionLint {
  /** Ids of conditions earlier rows already fully cover, so they never match. */
  unreachable: string[];
  /** False when the conditions cover every value, so the default never applies. */
  defaultReachable: boolean;
}

export function lintConditions<TOutcome>(
  conditions: readonly Condition<TOutcome>[],
): ConditionLint {
  let below: Bound | null = null;
  let above: Bound | null = null;
  const unreachable: string[] = [];
  const coversEverything = () =>
    !!below &&
    !!above &&
    (below.value > above.value ||
      (below.value === above.value && (below.inclusive || above.inclusive)));

  for (const condition of conditions) {
    const { comparator, threshold } = condition;
    const isBelow = comparator === "lt" || comparator === "lte";
    const inclusive = comparator === "lte" || comparator === "gte";
    const shadowed =
      coversEverything() ||
      (isBelow
        ? coversBelow(below, threshold, inclusive)
        : coversAbove(above, threshold, inclusive));
    if (shadowed) {
      unreachable.push(condition.id);
      continue;
    }
    if (isBelow) below = widerUpper(below, { value: threshold, inclusive });
    else above = widerLower(above, { value: threshold, inclusive });
  }
  return { unreachable, defaultReachable: !coversEverything() };
}
