---
"@adobe/design-data-spec": minor
"@adobe/design-data-tui": minor
"@adobe/design-data-wasm": minor
---

Visual recipes can bind `paddingBlockStart` and `paddingBlockEnd`, and the renderer now draws them.

**Spec:**

- `component-visuals.md`: a root `box` with no `height` is 32 high, unless the recipe binds block
  padding. Then its height is the tallest flowed child plus the block padding, and the children
  sit between the paddings. An explicit `height` always wins.

**WASM and CLI:** `render`, `site` and the JS runtime apply block padding the same way. A recipe
that binds no block padding renders exactly as before; no foundation recipe binds it today.
The native binary is versioned by `@adobe/design-data-tui`.

Bump levels: all three are minor because the renderer gains a capability (a new normative rule
for the spec) and no output changes for existing recipes.
