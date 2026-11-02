---
"@adobe/design-data-spec": minor
"@adobe/design-data-tui": minor
"@adobe/design-data-wasm": minor
---

New rule SPEC-083 warns when a visual recipe binds a prop the renderer does not read.

**Spec:**

- `rules.yaml` and `component-visuals.md`: SPEC-083 (warning) flags a part prop the renderer
  ignores for that part, such as `opacity`, `direction` or `fill` on a text part. A conformance
  fixture covers it.

**WASM and CLI:** `validate` runs SPEC-083 on foundation and platform recipes. The list of read
props is the renderer's own table (`READ_PROPS` in `visual.rs`). The solver checks every prop it
reads against that table in debug builds, through the same function the rule uses, so the two
cannot drift. Rendering is unchanged. The five foundation recipes bind root `direction`, `align`
and `justify`, which the solver never reads. They are in the recipe lint baseline and tracked as
their own issues.

Bump levels: all three are minor because validation gains a rule and no output changes.
