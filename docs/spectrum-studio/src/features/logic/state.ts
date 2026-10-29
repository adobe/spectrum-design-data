// Copyright 2026 Adobe. All rights reserved.
import { atom, type Setter } from "jotai";
import { spacingDocumentAtom } from "../spacing/state";
import { sizeDocumentAtom } from "../size/state";
import { radiusDocumentAtom } from "../radius/state";
import { typographyDocumentAtom } from "../typography/state";
import {
  consumersOf,
  reassignConsumers,
  ruleConsumers,
  type RuleConsumer,
  type RuleReferenceDocuments,
} from "./consumers";
import { RULE_DEFAULTS, rulesAtom } from "./library";
import { WHOLE_NUMBERS_RULE_ID, isRule, type Rule } from "./model";
import { structuresDocumentAtom } from "../structures/documentState";
import { colorSystemDocumentAtom } from "../color-system/state";
import { assertCustomContrastNaming } from "../color-system/contrastSteps";
import { reconcileColorSourceNames } from "../taxonomy/naming";
import { taxonomyDocumentAtom } from "../taxonomy/state";

const referenceDocumentsAtom = atom(
  (get): RuleReferenceDocuments => ({
    typography: get(typographyDocumentAtom),
    spacing: get(spacingDocumentAtom),
    size: get(sizeDocumentAtom),
    radius: get(radiusDocumentAtom),
    structures: get(structuresDocumentAtom),
    color: get(colorSystemDocumentAtom),
  }),
);

export const ruleConsumersAtom = atom((get) =>
  ruleConsumers(get(referenceDocumentsAtom)),
);

export function writeReferences(
  set: Setter,
  documents: RuleReferenceDocuments,
) {
  set(typographyDocumentAtom, documents.typography);
  set(spacingDocumentAtom, documents.spacing);
  if (documents.size) set(sizeDocumentAtom, documents.size);
  if (documents.radius) set(radiusDocumentAtom, documents.radius);
}

/** Authored rules are never locked; only shipped built-ins are. */
function authored(rule: Rule): Rule {
  const { locked, ...rest } = rule;
  void locked;
  return rest;
}

export const addRuleAtom = atom(null, (get, set, rule: Rule) => {
  if (!isRule(rule) || !rule.name.trim())
    throw new Error("Enter valid rule settings and a name.");
  if (get(rulesAtom).some((candidate) => candidate.id === rule.id)) return;
  set(rulesAtom, [...get(rulesAtom), authored(rule)]);
});

export const replaceRuleAtom = atom(null, (get, set, rule: Rule) => {
  if (!isRule(rule) || !rule.name.trim())
    throw new Error("Enter valid rule settings and a name.");
  const previous = get(rulesAtom).find((candidate) => candidate.id === rule.id);
  if (!previous) throw new Error("This rule is no longer available.");
  if (previous.locked) return;
  if (previous && previous.type !== rule.type)
    throw new Error(
      "Create a new rule rather than changing an existing rule's type.",
    );
  if (rule.type === "scale-naming") {
    const rules = get(rulesAtom).map((candidate) =>
      candidate.id === rule.id ? authored(rule) : candidate,
    );
    const color = get(colorSystemDocumentAtom);
    assertCustomContrastNaming(color, rules);
    const reconciled = reconcileColorSourceNames(
      get(taxonomyDocumentAtom),
      color,
      color,
      rules,
    );
    set(taxonomyDocumentAtom, reconciled.taxonomy);
  }
  set(
    rulesAtom,
    get(rulesAtom).map((candidate) =>
      candidate.id === rule.id && !candidate.locked
        ? authored(rule)
        : candidate,
    ),
  );
});

export interface RemovedRule {
  rule: Rule;
  index: number;
  consumers: RuleConsumer[];
}

/** Consumers fall back to the locked whole-number rule; the result restores them on undo. */
export const removeRuleAtom = atom(
  null,
  (get, set, id: string): RemovedRule | null => {
    const rules = get(rulesAtom);
    const index = rules.findIndex((rule) => rule.id === id);
    if (index === -1 || rules[index].locked) return null;
    const documents = get(referenceDocumentsAtom);
    const consumers = consumersOf(id, documents);
    if (consumers.some((consumer) => consumer.slot.foundation === "color")) {
      throw new Error(
        `"${rules[index].name}" names color steps. Choose another naming rule on these scales before deleting it.`,
      );
    }
    if (
      consumers.some((consumer) => consumer.slot.foundation === "structures")
    ) {
      throw new Error(
        `"${rules[index].name}" is used by Structure generation. Remove or change its applications before deleting the rule.`,
      );
    }
    set(
      rulesAtom,
      rules.filter((rule) => rule.id !== id),
    );
    if (consumers.length > 0)
      writeReferences(
        set,
        reassignConsumers(documents, consumers, WHOLE_NUMBERS_RULE_ID),
      );
    return { rule: rules[index], index, consumers };
  },
);

export const restoreRuleAtom = atom(null, (get, set, removed: RemovedRule) => {
  const rules = get(rulesAtom);
  if (rules.some((rule) => rule.id === removed.rule.id)) return;
  const next = [...rules];
  next.splice(Math.min(removed.index, next.length), 0, removed.rule);
  set(rulesAtom, next);
  // Only slots still on the fallback go back, so edits made since the delete win.
  const documents = get(referenceDocumentsAtom);
  const live = ruleConsumers(documents);
  const restorable = removed.consumers.filter((consumer) =>
    live.some(
      (candidate) =>
        candidate.id === consumer.id &&
        candidate.ruleId === WHOLE_NUMBERS_RULE_ID,
    ),
  );
  if (restorable.length > 0)
    writeReferences(
      set,
      reassignConsumers(documents, restorable, removed.rule.id),
    );
});

export const setRuleReferenceAtom = atom(
  null,
  (
    get,
    set,
    { consumer, ruleId }: { consumer: RuleConsumer; ruleId: string },
  ) => {
    if (consumer.slot.foundation === "structures")
      throw new Error("Edit this rule application on its Structure.");
    if (consumer.slot.foundation === "color")
      throw new Error("Choose a naming rule in the color Scale Editor.");
    if (!get(rulesAtom).some((rule) => rule.id === ruleId)) return;
    if (
      !get(rulesAtom).some(
        (rule) => rule.id === ruleId && rule.type === "rounding",
      )
    )
      throw new Error("Choose a rounding rule for a foundation.");
    writeReferences(
      set,
      reassignConsumers(get(referenceDocumentsAtom), [consumer], ruleId),
    );
  },
);

export { RULE_DEFAULTS, rulesAtom };
