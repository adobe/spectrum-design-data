---
"@adobe/design-data-spec": minor
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": patch
---

Add the press-only behavior contract for Drop zone and exempt Color control as a sub-part.

- Drop zone extends `press`: `isDisabled`, one `container` part with focus `tab-stop` and press
  `activate`, no `role` (decision A667 c). It has no drag-and-drop intents and no drop-target
  facet. With no role no web key suite runs, so it is covered by intent.
- Color control gets a `sub-part` exemption (decision A665 a): it holds the shared `track` part
  under Color slider, Color area and Color wheel, which carry the behavior.
- Scroll zoom bar is not covered here (deprecated, decision A733 a).
- Spec sheets and renders are byte-identical. The embedded registry changes, so wasm gets a patch.
