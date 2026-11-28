---
"@adobe/design-data-spec": minor
---

Scope role-suite behavior vectors to a component. A vector in a bindings (role) suite may carry `component`; the runner runs it only against that component's contract. The accordion vectors of `bindings/web/button.item.json` are scoped to `accordion`, so they no longer fail on Action group, whose items are Action buttons.
