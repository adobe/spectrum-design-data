---
"@adobe/design-data-spec": minor
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": patch
---

The behavior runner models text inputs: a `text` pattern, the `hasValue` facet and the `clear`
and `submit` intents (decisions A664 a, A666 a, A667 c).

- A facet `values` entry may be an any-of array for one source option, and a facet may add
  `otherwise`, the value when no entry matches. `hasValue` is `false` for an unset, null or
  empty `value`, else `true`. A recipe cannot select such a facet value (SPEC-122).
- The `text` pattern answers `clear` (sets `value` to `""`, emits `change`, only while there is
  a value) and `submit` (emits `submit`, changes nothing). Both are ignored while disabled.
  `do: {}` is allowed only on a transition that emits (SPEC-119 warns otherwise). `clear` writes
  `""`, which the range runner now reads as an unset value.
- Web bindings: role `searchbox` binds Escape to `clear` and Enter to `submit`; role `textbox`
  binds no keys. SPEC-118 checks `otherwise` and any-of use.
- No component has a text contract yet (text field, text area and search field follow).
