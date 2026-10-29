// Copyright 2026 Adobe. All rights reserved.
import { persistedAtom } from "../../state/persist";
import { RULE_DEFAULTS } from "./defaults";
import { isRuleList, RULES_SCHEMA_VERSION, type Rule } from "./model";

export { RULE_DEFAULTS };

export const rulesAtom = persistedAtom<Rule[]>({
  key: "rules/library",
  schemaVersion: RULES_SCHEMA_VERSION,
  initialize: () => structuredClone([...RULE_DEFAULTS]),
  validate: isRuleList,
});
