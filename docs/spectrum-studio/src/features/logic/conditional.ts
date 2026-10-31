// Copyright 2026 Adobe. All rights reserved.
import type { ModeSet } from "../modes/model";
import { modeSetGroupIconId } from "../modes/controlPresentation";
import type { ModeIconId } from "../modes/iconIds";
import type { Classification, TaxonomyDocument } from "../taxonomy/model";
import { termLabel } from "../taxonomy/termPresentation";
import type {
  ConditionalRule,
  RuleCondition,
  RuleConditionGroup,
  RuleConditionNode,
} from "./model";

export interface ConditionSource {
  id: string;
  kind: "taxonomy" | "mode";
  label: string;
  modeIconId?: ModeIconId;
  values: { id: string; label: string }[];
}
export interface ConditionalContext {
  classification: Classification;
  modes: Record<string, string>;
}

export function conditionSources(
  taxonomy: TaxonomyDocument,
  modeSets: readonly ModeSet[],
): ConditionSource[] {
  return [
    ...taxonomy.categories.map(
      (category): ConditionSource => ({
        id: category.id,
        kind: "taxonomy",
        label: category.name,
        values: taxonomy.terms
          .filter((term) => term.categoryId === category.id)
          .map((term) => ({ id: term.id, label: termLabel(term.value) })),
      }),
    ),
    ...modeSets.map(
      (set): ConditionSource => ({
        id: set.id,
        kind: "mode",
        label: set.name,
        modeIconId: modeSetGroupIconId(set),
        values: set.modes.map((mode) => ({ id: mode.id, label: mode.name })),
      }),
    ),
  ];
}

export function sourceFor(
  condition: RuleCondition,
  sources: readonly ConditionSource[],
) {
  return sources.find(
    (source) =>
      source.id === condition.sourceId && source.kind === condition.source,
  );
}

export function conditionText(
  condition: RuleCondition,
  sources: readonly ConditionSource[],
) {
  const source = sourceFor(condition, sources);
  return `${source?.label ?? "Unavailable source"} ${condition.matcher === "is" ? "is" : "is not"} ${source?.values.find((value) => value.id === condition.valueId)?.label ?? "Unavailable value"}`;
}

export function conditionalIssues(
  rule: ConditionalRule,
  sources: readonly ConditionSource[],
): string[] {
  const issues: string[] = [];
  const pending: RuleConditionNode[] = [
    rule.when,
    ...rule.branches.map((branch) => branch.when),
  ];
  while (pending.length) {
    const node = pending.pop()!;
    if (node.kind === "group") {
      if (!node.children.length)
        issues.push(
          "Add a condition to each group, or remove the empty group.",
        );
      pending.push(...node.children);
    } else {
      const source = sourceFor(node, sources);
      if (!source)
        issues.push(
          "A condition source is no longer available. Choose another source.",
        );
      else if (!source.values.some((value) => value.id === node.valueId))
        issues.push(`${source.label}: choose an available value.`);
    }
  }
  if (
    ![rule.otherwise, ...rule.branches.map((branch) => branch.then)].every(
      (outcome) => Number.isSafeInteger(outcome.offset),
    )
  )
    issues.push("Enter an integer token offset for every result.");
  return [...new Set(issues)];
}

export type ConditionalEvaluation =
  | { status: "unavailable"; issues: string[] }
  | {
      status: "ready";
      matched: boolean;
      branchId: string | null;
      offset: number;
    };

export function evaluateConditionalRule(
  rule: ConditionalRule,
  context: ConditionalContext,
  sources: readonly ConditionSource[],
): ConditionalEvaluation {
  const issues = conditionalIssues(rule, sources);
  const matches = (node: RuleConditionNode): boolean => {
    if (node.kind === "group") {
      const children = node.children.map(matches);
      return (
        children.length > 0 &&
        (node.operator === "and"
          ? children.every(Boolean)
          : children.some(Boolean))
      );
    }
    const source = sourceFor(node, sources);
    const actual =
      node.source === "mode"
        ? context.modes[node.sourceId]
        : context.classification[node.sourceId];
    if (
      node.source === "mode" &&
      (!actual || !source?.values.some((value) => value.id === actual))
    ) {
      issues.push(
        `${source?.label ?? "Mode set"}: choose an available preview mode.`,
      );
      return false;
    }
    if (actual === undefined) return false;
    const values = Array.isArray(actual) ? actual : [actual];
    if (values.some((id) => !source?.values.some((value) => value.id === id))) {
      issues.push(
        `${source?.label ?? "Category"}: the context contains an unavailable value.`,
      );
      return false;
    }
    const equal = values.includes(node.valueId);
    return node.matcher === "is" ? equal : !equal;
  };
  const applicable = matches(rule.when);
  const branches = rule.branches.map((branch) => ({
    branch,
    matches: matches(branch.when),
  }));
  if (issues.length)
    return { status: "unavailable", issues: [...new Set(issues)] };
  if (!applicable)
    return { status: "ready", matched: false, branchId: null, offset: 0 };
  const branch = branches.find((candidate) => candidate.matches)?.branch;
  return {
    status: "ready",
    matched: true,
    branchId: branch?.id ?? null,
    offset: branch?.then.offset ?? rule.otherwise.offset,
  };
}

export function updateConditionTree(
  group: RuleConditionGroup,
  id: string,
  update: (node: RuleConditionNode) => RuleConditionNode | null,
): RuleConditionGroup {
  return {
    ...group,
    children: group.children.flatMap((node) => {
      const next =
        node.id === id
          ? update(node)
          : node.kind === "group"
            ? updateConditionTree(node, id, update)
            : node;
      return next ? [next] : [];
    }),
  };
}

export interface OffsetToken {
  id: string;
  sourceId: string;
  index: number;
  name: string;
  value: string;
}
export function offsetAvailableToken(
  anchorId: string,
  tokens: readonly OffsetToken[],
  offset: number,
) {
  const anchor = tokens.find((token) => token.id === anchorId);
  if (!anchor) throw new Error("Choose an available default color.");
  if (!Number.isSafeInteger(offset))
    throw new Error("Enter an integer token offset.");
  const available = tokens
    .filter((token) => token.sourceId === anchor.sourceId)
    .sort((a, b) => a.index - b.index);
  if (
    available.some((token) => !Number.isFinite(token.index)) ||
    new Set(available.map((token) => token.index)).size !== available.length ||
    new Set(available.map((token) => token.id)).size !== available.length
  )
    throw new Error(
      "The color scale has unavailable or ambiguous token positions.",
    );
  const requested =
    available.findIndex((token) => token.id === anchorId) + offset;
  if (!Number.isSafeInteger(requested))
    throw new Error(
      "The requested offset exceeds the supported integer range.",
    );
  const position = Math.max(0, Math.min(available.length - 1, requested));
  const token = available[position];
  return {
    token,
    warning:
      position === requested
        ? undefined
        : `Requested offset ${offset}; using ${token.name}, the nearest available endpoint.`,
  };
}
