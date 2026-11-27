---
"@adobe/design-data-wasm": patch
"@adobe/design-data-visual": patch
---

Draw a `ring` part that is a child of a repeated copy (a collection item or a nested repeat).

- A `ring` listed in `children` of a repeated part no longer joins the flow, where the solver
  read `color` on it (a debug assertion). Each copy draws its own ring around its box, or the
  `around` part, exactly as a ring on a plain root is drawn.
- A ring is drawn by the scene whose root lists it, and an orphan ring (listed nowhere) only by
  the recipe's own root, so a repeat no longer repeats an orphan ring around every copy.
- No component recipe changes and every existing render is byte-identical.
