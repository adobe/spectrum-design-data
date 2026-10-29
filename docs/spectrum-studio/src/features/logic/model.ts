// Copyright 2026 Adobe. All rights reserved.
import { COMPONENT_SIZES } from "../foundations/componentSizes";
import { SIZE_TERM_IDS } from "../taxonomy/variantVocabulary";

export const RULES_SCHEMA_VERSION = 2;

export type RuleType = "rounding" | "tshirt-sizing" | "scale-naming";
export type Comparator = "lt" | "lte" | "gt" | "gte";

export const COMPARATORS: readonly {
  id: Comparator;
  label: string;
  symbol: string;
}[] = [
  { id: "lt", label: "Less than", symbol: "<" },
  { id: "lte", label: "Less than or equal to", symbol: "≤" },
  { id: "gt", label: "Greater than", symbol: ">" },
  { id: "gte", label: "Greater than or equal to", symbol: "≥" },
];

/** Values are multiplied by depth before rounding to the factor, then divided back. */
export const ROUNDING_DEPTHS = [1, 10, 100, 1000] as const;
export type RoundingDepth = (typeof ROUNDING_DEPTHS)[number];

export interface Condition<TOutcome> {
  id: string;
  comparator: Comparator;
  threshold: number;
  outcome: TOutcome;
}

/** Conditions are checked in order against the raw value; the first match wins, else the default applies. */
export interface ConditionalRuleBody<TOutcome> {
  defaultOutcome: TOutcome;
  conditions: Condition<TOutcome>[];
}

/** A factor of 0 leaves the value unrounded. */
export interface RoundingOutcome {
  factor: number;
}

interface RuleBase {
  id: string;
  name: string;
  description: string;
  /** Built-in rules other data falls back to; they cannot be edited or deleted. */
  locked?: boolean;
}

export interface RoundingRule
  extends RuleBase, ConditionalRuleBody<RoundingOutcome> {
  type: "rounding";
  depth: RoundingDepth;
}

export type TshirtMovement = "available-token" | "scale-index";
export interface TshirtSizeMapping {
  /** Registry size-term UUID, not a display label. */
  termId: string;
  offset: number;
}
export interface TshirtSizingRule extends RuleBase {
  type: "tshirt-sizing";
  movement: TshirtMovement;
  mappings: TshirtSizeMapping[];
}
export interface ScaleNamingRule extends RuleBase {
  type: "scale-naming";
  baseLabel: number;
  aboveIncrement: number;
  below: { kind: "automatic" } | { kind: "fixed"; increment: number };
}
export type Rule = RoundingRule | TshirtSizingRule | ScaleNamingRule;
export const STANDARD_SCALE_NAMING_RULE_ID = "rule-standard-scale-naming";

export const WHOLE_NUMBERS_RULE_ID = "rule-whole-numbers";
export const NO_ROUNDING_RULE_ID = "rule-no-rounding";
export const TEXT_SIZE_ROUNDING_RULE_ID = "rule-text-size-rounding";
export const LINE_HEIGHT_ROUNDING_RULE_ID = "rule-line-height-rounding";
export const SPACING_ROUNDING_RULE_ID = "rule-spacing-rounding";

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isRoundingOutcome(value: unknown): value is RoundingOutcome {
  return (
    !!value &&
    typeof value === "object" &&
    isFiniteNumber((value as RoundingOutcome).factor) &&
    (value as RoundingOutcome).factor >= 0
  );
}

function isCondition(value: unknown): value is Condition<RoundingOutcome> {
  if (!value || typeof value !== "object") return false;
  const condition = value as Partial<Condition<RoundingOutcome>>;
  return (
    typeof condition.id === "string" &&
    COMPARATORS.some((comparator) => comparator.id === condition.comparator) &&
    isFiniteNumber(condition.threshold) &&
    isRoundingOutcome(condition.outcome)
  );
}

export function isRule(value: unknown): value is Rule {
  if (!value || typeof value !== "object") return false;
  const rule = value as Partial<Rule>;
  const common =
    typeof rule.id === "string" &&
    !!rule.id.trim() &&
    typeof rule.name === "string" &&
    typeof rule.description === "string" &&
    (rule.locked === undefined || typeof rule.locked === "boolean");
  if (!common) return false;
  if (rule.type === "scale-naming") {
    return (
      Number.isFinite(rule.baseLabel) &&
      rule.baseLabel! > 0 &&
      Number.isFinite(rule.aboveIncrement) &&
      rule.aboveIncrement! > 0 &&
      !!rule.below &&
      (rule.below.kind === "automatic" ||
        (rule.below.kind === "fixed" &&
          Number.isFinite(rule.below.increment) &&
          rule.below.increment > 0))
    );
  }
  if (rule.type === "tshirt-sizing") {
    return (
      (rule.movement === "available-token" ||
        rule.movement === "scale-index") &&
      Array.isArray(rule.mappings) &&
      rule.mappings.length === COMPONENT_SIZES.length &&
      Object.keys(rule).every((key) =>
        [
          "id",
          "name",
          "description",
          "locked",
          "type",
          "movement",
          "mappings",
        ].includes(key),
      ) &&
      COMPONENT_SIZES.every((size) => {
        const mappings = rule.mappings!.filter(
          (mapping) => mapping && mapping.termId === SIZE_TERM_IDS[size.id],
        );
        return (
          mappings.length === 1 &&
          Number.isSafeInteger(mappings[0].offset) &&
          (size.id !== "m" || mappings[0].offset === 0) &&
          Object.keys(mappings[0]).every(
            (key) => key === "termId" || key === "offset",
          )
        );
      })
    );
  }
  return (
    rule.type === "rounding" &&
    (ROUNDING_DEPTHS as readonly number[]).includes(rule.depth as number) &&
    isRoundingOutcome(rule.defaultOutcome) &&
    Array.isArray(rule.conditions) &&
    rule.conditions.every(isCondition)
  );
}

export function isRuleList(value: unknown): value is Rule[] {
  return (
    Array.isArray(value) &&
    value.every(isRule) &&
    new Set(value.map((rule) => rule.id)).size === value.length
  );
}

export function createCondition(
  threshold = 0,
  factor = 1,
): Condition<RoundingOutcome> {
  return {
    id: `condition-${crypto.randomUUID()}`,
    comparator: "lt",
    threshold,
    outcome: { factor },
  };
}

export function createTshirtMappings(
  movement: TshirtMovement,
): TshirtSizeMapping[] {
  return COMPONENT_SIZES.map((size) => ({
    termId: SIZE_TERM_IDS[size.id],
    offset: size.index * (movement === "scale-index" ? 100 : 1),
  }));
}

export function createRule(type?: "rounding"): RoundingRule;
export function createRule(type: "tshirt-sizing"): TshirtSizingRule;
export function createRule(type: "scale-naming"): ScaleNamingRule;
export function createRule(type: RuleType): Rule;
export function createRule(type: RuleType = "rounding"): Rule {
  if (type === "scale-naming")
    return {
      id: `rule-custom-${crypto.randomUUID()}`,
      name: "New rule",
      description: "",
      type,
      baseLabel: 100,
      aboveIncrement: 100,
      below: { kind: "automatic" },
    };
  if (type === "tshirt-sizing")
    return {
      id: `rule-custom-${crypto.randomUUID()}`,
      name: "New rule",
      description: "",
      type,
      movement: "available-token",
      mappings: createTshirtMappings("available-token"),
    };
  return {
    id: `rule-custom-${crypto.randomUUID()}`,
    name: "New rule",
    description: "",
    type: "rounding",
    depth: 1,
    defaultOutcome: { factor: 1 },
    conditions: [],
  };
}

export function isRoundingRule(value: Rule): value is RoundingRule {
  return value.type === "rounding";
}
export function isTshirtRule(value: Rule): value is TshirtSizingRule {
  return value.type === "tshirt-sizing";
}
