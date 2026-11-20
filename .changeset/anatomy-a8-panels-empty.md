---
"@adobe/design-data-wasm": patch
"@adobe/spectrum-design-data": minor
---

Anatomy review of panels and empty states (A8, part 2 of 3).

- standard-panel, bar-panel, drop-zone and illustrated-message are reviewed, each with a root
  `container`. The panel grip part is `drag-handle` (was `gripper`; legacy records moved, gripper
  contexts harmonised). standard-panel option `container` is now `type`. bar-panel gets an
  `actions` slot and the alias `toolbar`.
- The secondary text part is `description` (was `body`); illustrated-message `actions` is the
  `button-group` part; drop-zone has its own parts, `button` (was `action`) and a `banner` part
  (state `drag-and-drop`, new option `isFilled`). tray is archived as Spectrum 1 only.
- Records get parts, `between` and size/script/scale pins from their `$ref` targets. New term
  `banner`; `gripper` is an alias of `drag-handle`.
- Status: standard-panel and bar-panel reach level 2; drop-zone and illustrated-message level 1.
  Legacy `@adobe/spectrum-tokens` output is byte-identical.
