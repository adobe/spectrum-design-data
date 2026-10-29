// Copyright 2026 Adobe. All rights reserved.
import { atom } from "jotai";
import { spacingDocumentAtom } from "../spacing/state";
import { sizeDocumentAtom } from "../size/state";
import { radiusDocumentAtom } from "../radius/state";
import type { RadiusDocument } from "../radius/model";
import type { SizeDocument } from "../size/model";
import type { SpacingDocument } from "../spacing/model";
import { typographyDocumentAtom } from "../typography/state";
import type { TypographyDocument } from "../typography/model";
import { reassignConsumers, ruleConsumers } from "./consumers";
import { RULE_DEFAULTS, rulesAtom } from "./library";
import { WHOLE_NUMBERS_RULE_ID, type Rule } from "./model";

export interface RuleState {
  rules: Rule[];
  typography: TypographyDocument;
  spacing: SpacingDocument;
  size?: SizeDocument;
  radius?: RadiusDocument;
}

export interface NormalizedRuleState extends RuleState {
  corrections: string[];
}

function withoutPending<T extends { pendingRules?: Rule[] }>(document: T): T {
  const { pendingRules, ...rest } = document;
  void pendingRules;
  return rest as T;
}

/**
 * Keeps rule references resolvable for any rules and consumers: built-in rules exist,
 * migrated rules join the library, and missing references fall back to whole numbers.
 */
export function normalizeRuleState({
  rules,
  typography,
  spacing,
  size,
  radius,
}: RuleState): NormalizedRuleState {
  const corrections: string[] = [];
  let library = [...rules];
  for (const builtIn of RULE_DEFAULTS.filter((rule) => rule.locked)) {
    const index = library.findIndex((rule) => rule.id === builtIn.id);
    if (index === -1) {
      library = [...library, structuredClone(builtIn)];
      corrections.push(`Restored built-in rule ${builtIn.name}`);
    } else if (JSON.stringify(library[index]) !== JSON.stringify(builtIn)) {
      library[index] = structuredClone(builtIn);
      corrections.push(`Reset built-in rule ${builtIn.name}`);
    }
  }
  for (const pending of [
    ...(spacing.pendingRules ?? []),
    ...(size?.pendingRules ?? []),
    ...(radius?.pendingRules ?? []),
  ]) {
    if (!library.some((rule) => rule.id === pending.id)) {
      library.push(pending);
      corrections.push(`Added migrated rule ${pending.name}`);
    }
  }
  let documents = {
    typography,
    spacing: spacing.pendingRules ? withoutPending(spacing) : spacing,
    ...(size && { size: size.pendingRules ? withoutPending(size) : size }),
    ...(radius && {
      radius: radius.pendingRules ? withoutPending(radius) : radius,
    }),
  };
  if (
    documents.typography !== typography ||
    documents.spacing !== spacing ||
    documents.size !== size ||
    documents.radius !== radius
  )
    corrections.push("Cleared migrated rule staging");
  const missing = ruleConsumers(documents).filter(
    (consumer) =>
      consumer.slot.foundation !== "structures" &&
      !library.some(
        (rule) => rule.id === consumer.ruleId && rule.type === "rounding",
      ),
  );
  if (missing.length > 0) {
    documents = reassignConsumers(documents, missing, WHOLE_NUMBERS_RULE_ID);
    corrections.push(
      ...missing.map(
        (consumer) => `${consumer.label}: missing rule, using Whole numbers`,
      ),
    );
  }
  return { rules: library, ...documents, corrections };
}

/** Writes back only when something was corrected, so it is safe to run after every change. */
export const normalizeRuleStateAtom = atom(null, (get, set) => {
  const normalized = normalizeRuleState({
    rules: get(rulesAtom),
    typography: get(typographyDocumentAtom),
    spacing: get(spacingDocumentAtom),
    size: get(sizeDocumentAtom),
    radius: get(radiusDocumentAtom),
  });
  if (normalized.corrections.length === 0) return normalized.corrections;
  set(rulesAtom, normalized.rules);
  set(typographyDocumentAtom, normalized.typography);
  set(spacingDocumentAtom, normalized.spacing);
  if (normalized.size) set(sizeDocumentAtom, normalized.size);
  if (normalized.radius) set(radiusDocumentAtom, normalized.radius);
  if (import.meta.env?.DEV)
    console.warn("Rule references corrected:", normalized.corrections);
  return normalized.corrections;
});
