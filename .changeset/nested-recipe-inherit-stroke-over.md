---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-spec": minor
"@adobe/design-data-wasm": minor
---

Let a nested recipe fill its host, and draw a root border over its children. Layout revision is 3.

- A `component` part can list `inherit`: `width`, `height` and `cornerRadius` of the host root. A
  width the host does not fix yet (a hugging root) is filled once the other parts are laid out.
- A root can bind `strokeOver: true`. Its border is then a `ring` node `<root>.border` drawn last,
  and the root node's own `stroke` is unset.
- Anatomy aliases are no longer valid part names. They document other implementations' names, and
  SPEC-035 warns when a part uses one. `small-divider`, `required-asterisk`, `required-text` and
  `direct-actions` are aliases of `divider`, `necessity-indicator` and `actions`.
- The accordion draws its divider with the divider recipe. Thumbnail draws its checkerboard with
  the opacity-checkerboard recipe, so its mobile tile is 5px, not 4px, and its border is drawn on
  the container over the checkerboard. Thumbnail gains an empty `image` part.
