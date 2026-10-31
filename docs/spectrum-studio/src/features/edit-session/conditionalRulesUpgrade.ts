// Copyright 2026 Adobe. All rights reserved.
import { designSystemDefaults } from "../../data/defaults";
import { INTERACTION_COLORS_RULE_ID } from "../logic/model";
import type { EditSessionSnapshot } from "./state";

/** Called only when upgrading pre-conditional records, never when restoring current saves. */
export function upgradeConditionalRulesSnapshot(
  snapshot: EditSessionSnapshot,
): EditSessionSnapshot {
  const rules =
    snapshot.rules ?? structuredClone(designSystemDefaults.system.rules);
  if (rules.some((rule) => rule.id === INTERACTION_COLORS_RULE_ID))
    return snapshot.rules ? snapshot : { ...snapshot, rules };
  const example = designSystemDefaults.system.rules.find(
    (rule) => rule.id === INTERACTION_COLORS_RULE_ID,
  );
  if (!example || example.type !== "conditional")
    throw new Error("The shipped interaction-state example is unavailable.");
  return { ...snapshot, rules: [...rules, structuredClone(example)] };
}
