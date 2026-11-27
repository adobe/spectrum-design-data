---
"@adobe/design-data-spec": minor
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": patch
---

Behavior contracts for text field, text area and search field, built on the text runner
(decisions A664 a, A666 a).

- Each contract extends `text` (`isDisabled`, `value`, `hasValue`, `clear`, `submit`) and has a
  `field` part with focus `tab-stop`. Text field and text area are `textbox` and bind no key.
  Search field is `searchbox`: Escape clears, Enter submits. Its `in-field-button` has focus `none`.
- `aria-invalid` and `aria-required` (text field, text area) are copied from `isError` and
  `isRequired`, absent while `false`. `aria-label` is copied from `label`, absent unless
  `hideLabel` is set. No `describedby` or `labelledby`, no `isReadOnly` (later changes).
- The search field component's `accessibility.role` changes from `textbox` to `searchbox`, so its
  spec sheet role row changes. Text field and text area list the `clear` and `submit` intents in
  their keyboard intents.
- Known: the spec sheet Keyboard table lists `clear` and `submit` rows with empty keys for text
  field and text area, and no Escape or Enter row for search field (a later Rust change may fix).
- Conformance: a suite per component and the web key suites `searchbox` and `textbox`.
