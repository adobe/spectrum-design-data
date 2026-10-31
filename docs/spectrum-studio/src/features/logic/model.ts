// Copyright 2026 Adobe. All rights reserved.
import { COMPONENT_SIZES } from "../foundations/componentSizes";
import { SIZE_TERM_IDS } from "../taxonomy/variantVocabulary";
import { isRuleApplicability, type RuleApplicability } from "./applicability";

export const RULES_SCHEMA_VERSION = 3;

export type RuleType =
  | "rounding"
  | "tshirt-sizing"
  | "generator"
  | "scale-naming"
  | "conditional";
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
  applicability?: RuleApplicability;
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
  type: "tshirt-sizing" | "generator";
  movement: TshirtMovement;
  mappings: TshirtSizeMapping[];
  defaultTermId?: string;
}
export interface ScaleNamingRule extends RuleBase {
  type: "scale-naming";
  baseLabel: number;
  aboveIncrement: number;
  below: { kind: "automatic" } | { kind: "fixed"; increment: number };
}
export interface RuleCondition {
  id: string;
  kind: "condition";
  source: "taxonomy" | "mode";
  sourceId: string;
  matcher: "is" | "is-not";
  valueId: string;
}
export interface RuleConditionGroup {
  id: string;
  kind: "group";
  operator: "and" | "or";
  children: RuleConditionNode[];
}
export type RuleConditionNode = RuleCondition | RuleConditionGroup;
export interface TokenOffsetOutcome {
  offset: number;
}
export interface ConditionalBranch {
  id: string;
  when: RuleConditionGroup;
  then: TokenOffsetOutcome;
}
export interface ConditionalRule extends RuleBase {
  type: "conditional";
  when: RuleConditionGroup;
  branches: ConditionalBranch[];
  otherwise: TokenOffsetOutcome;
}
export type Rule =
  | RoundingRule
  | TshirtSizingRule
  | ScaleNamingRule
  | ConditionalRule;
export const INTERACTION_COLORS_RULE_ID = "rule-interaction-state-colors";
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
  if (
    rule.type &&
    rule.applicability !== undefined &&
    !isRuleApplicability(rule.applicability, rule.type)
  )
    return false;
  if (rule.type === "generator") {
    return (
      (rule.movement === "available-token" ||
        rule.movement === "scale-index") &&
      Object.keys(rule).every((key) =>
        [
          "id",
          "name",
          "description",
          "locked",
          "type",
          "movement",
          "mappings",
          "defaultTermId",
          "applicability",
        ].includes(key),
      ) &&
      Array.isArray(rule.mappings) &&
      rule.mappings.length > 0 &&
      new Set(rule.mappings.map((mapping) => mapping?.termId)).size ===
        rule.mappings.length &&
      rule.mappings.every(
        (mapping) =>
          mapping &&
          typeof mapping.termId === "string" &&
          !!mapping.termId.trim() &&
          Number.isSafeInteger(mapping.offset) &&
          Object.keys(mapping).every(
            (key) => key === "termId" || key === "offset",
          ),
      ) &&
      rule.mappings.some(
        (mapping) =>
          mapping.termId === rule.defaultTermId && mapping.offset === 0,
      ) &&
      rule.applicability !== undefined
    );
  }
  if (rule.type === "conditional") return isConditionalBody(rule);
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
          "applicability",
          "defaultTermId",
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

function isConditionalBody(rule: Partial<ConditionalRule>): boolean {
  if (!Array.isArray(rule.branches) || !isOffset(rule.otherwise)) return false;
  const ids = new Set<string>();
  const claim = (id: unknown) => {
    if (typeof id !== "string" || !id.trim() || ids.has(id)) return false;
    ids.add(id);
    return true;
  };
  const groups: unknown[] = [rule.when];
  for (const branch of rule.branches) {
    if (!branch || !claim(branch.id) || !isOffset(branch.then)) return false;
    groups.push(branch.when);
  }
  const pending: unknown[] = [...groups];
  if (
    groups.some(
      (group) =>
        !group ||
        typeof group !== "object" ||
        !("kind" in group) ||
        group.kind !== "group",
    )
  )
    return false;
  while (pending.length) {
    const node = pending.pop();
    if (
      !node ||
      typeof node !== "object" ||
      !("id" in node) ||
      !claim(node.id) ||
      !("kind" in node)
    )
      return false;
    if (node.kind === "group") {
      if (
        !("operator" in node) ||
        !["and", "or"].includes(String(node.operator)) ||
        !("children" in node) ||
        !Array.isArray(node.children)
      )
        return false;
      pending.push(...node.children);
    } else if (node.kind === "condition") {
      if (
        !("source" in node) ||
        !["taxonomy", "mode"].includes(String(node.source)) ||
        !("sourceId" in node) ||
        typeof node.sourceId !== "string" ||
        !node.sourceId.trim() ||
        !("valueId" in node) ||
        typeof node.valueId !== "string" ||
        !node.valueId.trim() ||
        !("matcher" in node) ||
        !["is", "is-not"].includes(String(node.matcher))
      )
        return false;
    } else return false;
  }
  return true;
}

function isOffset(value: unknown): value is TokenOffsetOutcome {
  return (
    !!value &&
    typeof value === "object" &&
    "offset" in value &&
    Number.isSafeInteger(value.offset)
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
export function createRule(type: "generator"): TshirtSizingRule;
export function createRule(type: "scale-naming"): ScaleNamingRule;
export function createRule(type: "conditional"): ConditionalRule;
export function createRule(type: RuleType): Rule;
export function createRule(type: RuleType = "rounding"): Rule {
  if (type === "conditional")
    return {
      id: `rule-custom-${crypto.randomUUID()}`,
      name: "New rule",
      description: "",
      type,
      when: createRuleGroup(),
      branches: [],
      otherwise: { offset: 0 },
      applicability: { kind: "specific", types: ["color", "opacity"] },
    };
  if (type === "scale-naming")
    return {
      id: `rule-custom-${crypto.randomUUID()}`,
      name: "New rule",
      description: "",
      type,
      baseLabel: 100,
      aboveIncrement: 100,
      below: { kind: "automatic" },
      applicability: { kind: "all" },
    };
  if (type === "tshirt-sizing" || type === "generator")
    return {
      id: `rule-custom-${crypto.randomUUID()}`,
      name: "New rule",
      description: "",
      type,
      movement: "available-token",
      mappings: createTshirtMappings("available-token"),
      ...(type === "generator" && {
        defaultTermId: SIZE_TERM_IDS.m,
        applicability: {
          kind: "specific" as const,
          types: [
            "spacing",
            "size",
            "font-size",
            "radius",
          ] as import("./applicability").RuleValueType[],
        },
      }),
    };
  return {
    id: `rule-custom-${crypto.randomUUID()}`,
    name: "New rule",
    description: "",
    type: "rounding",
    depth: 1,
    defaultOutcome: { factor: 1 },
    conditions: [],
    applicability: { kind: "all" },
  };
}

export function createRuleGroup(
  operator: "and" | "or" = "and",
): RuleConditionGroup {
  return {
    id: `group-${crypto.randomUUID()}`,
    kind: "group",
    operator,
    children: [],
  };
}

export function isRoundingRule(value: Rule): value is RoundingRule {
  return value.type === "rounding";
}
export function isTshirtRule(value: Rule): value is TshirtSizingRule {
  return value.type === "tshirt-sizing" || value.type === "generator";
}
