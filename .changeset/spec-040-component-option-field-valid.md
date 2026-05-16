---
"@adobe/design-data-spec": minor
---

**SPEC-040 `component-option-field-valid` (Warning, Layer 2)**: token name-object keys
that match a declared `options.<key>` with a `values[]` list are now cross-validated
against that list. This generalises SPEC-019 (which covers `variant` at Error severity)
to all remaining option-enum fields — `style`, `size`, `staticColor`, and any future
component option with a declared `values` array.

The rule is advisory (Warning) so datasets can absorb the new check incrementally.
Tokens using option values not yet declared in `components/*.json` will emit warnings
rather than errors. Promotion to Error is deferred until the option catalog stabilises.

**Migration:** if your component declares `options.style.values` and your tokens
reference `name.style`, ensure the style values in use appear in the declared `values`
list. The warning message identifies the token, field, and undeclared value.
