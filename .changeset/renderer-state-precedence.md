---
"@adobe/design-data-wasm": patch
---

The renderer resolves combined states per property by the state model instead of
by token key order. Among candidates whose states are all active, the one
matching more states wins, then the one with the higher interaction precedence
(hover 50, keyboard-focus 60, down 70, or what the component declares), then
the earlier one. `disabled` suppresses interaction states, and `active`,
`pressed` and `focus-visible` normalize to `down` and `keyboard-focus`. Compiled
candidates now carry a `precedence` list; older compiled data resolves ties in
source order.
