---
"@adobe/design-data-mcp": minor
---

New tool `design-data-token-usage`: which components, parts and contexts bind a
token, directly or through tokens that alias it (up to 3 hops, `via` names the
alias). It is the reverse of `design-data-component-tokens`, so an agent that
changes a value can see what else it moves. Pass a token name, uuid or conceptId.
