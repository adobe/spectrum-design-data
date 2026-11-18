---
"@adobe/design-data-spec": minor
"@adobe/design-data-wasm": minor
"@adobe/design-data-mcp": minor
"@adobe/design-data-agent-mcp": minor
"@adobe/design-data-skill": patch
---

Tokens now report semantic specificity, so people and agents can pick among tokens.

* **Specificity:** derived from the name, never stored: tier rank, then the count of purpose fields.
  It orders tokens; it does not say one fits a use.
* **Neighbors:** same-property tokens that add or drop purpose fields, each `drop-in` (same value
  in every mode) or `consider`. CLI `design-data refinements`, WASM `Dataset.refinements`, MCP
  `design-data-refinements` and agent MCP `token_refinements`.
* **Results:** WASM `TokenResult` has `purposeFields` and `purposeCount`; MCP query shows
  `purposeFields`; CLI `query` and `resolve` print `Purpose`; MCP query takes `sort: "specificity"`.
* **Query:** `object`, `anatomy` and `colorRole` are filter keys.
* **Component tokens:** MCP `design-data-component-tokens` (WASM `componentRelationships`) returns
  what a component uses for each part and state, with values, in one call.
* **Primer and docs:** `semanticSpecificity` in the primer; taxonomy, query and agent-surface
  chapters and the skill (with a custom-component recipe).
