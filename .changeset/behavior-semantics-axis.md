---
"@adobe/design-data-spec": minor
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": patch
---

Key behavior contract `semantics` per axis, and give Color area its accessibility attributes.

- Spec: a `semantics` entry may name an `axis` (a key of the contract's `ranges`), so one
  attribute can be exposed once per axis (`aria-valuenow` for x and for y). An entry without an
  `axis` works as before. A vector reads an axis through `expect.axisAria`
  (`{ "x": { "aria-valuenow": "40" } }`); `expect.aria` does not see an entry that names an axis.
- SPEC-118 and the runner's contract check reject an `axis` that is not a key of `ranges`, an
  `axis` on a contract with a single `range`, and the same attribute twice for one axis. A vector
  whose `axisAria` names an undeclared axis fails.
- Data: Color area exposes `aria-valuenow`, `aria-valuemin` and `aria-valuemax` per axis on the
  `color-handle` part (copies of `x-value`, `x-minValue`, `x-maxValue` and the `y` equivalents,
  absent while the option is unset). The part keeps no `role` (decision A721).
- 12 new Color area vectors: set and unset per axis, axis independence, bounds, disabled.
- The embedded dataset changes, so wasm gets a patch.
- An older CLI runs the new Color area suite without reading `axisAria` (it never checks those
  expectations), so a release that ships this needs `requires.cli` raised to the CLI that has it.
