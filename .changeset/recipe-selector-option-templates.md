---
"@adobe/design-data-spec": minor
"@adobe/design-data-tui": minor
"@adobe/design-data-wasm": minor
---

Visual recipe selectors can use `{<option>}` placeholders, such as `{style}`, for any option.

**Spec:**

- `component-visuals.md`: `{<option>}` expands to each value the option declares. A candidate
  found for one value applies only when the request's option equals it.
- A brace pair whose content is not a plain identifier stays literal text. `{size}` and
  `{sizeIndex}` are unchanged.
- SPEC-061 also reports a `{name}` placeholder in a `token` or `relationship` selector that is
  not `size`, `sizeIndex` or a declared option that lists its values.
- SPEC-062, 066, 067, 069 and 071 expand option placeholders before resolving.
- The `invalid/SPEC-061` conformance fixture covers the new check.

**WASM:** `compile_recipe` and `render` expand option placeholders. A recipe that uses none
compiles to exactly the same output as before.

**CLI:** `design-data render`, `site` and `validate` use the same expansion. The native binary
is versioned by `@adobe/design-data-tui`.
