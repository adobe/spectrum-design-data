---
"@adobe/design-data-wasm": patch
"@adobe/spectrum-design-data": minor
---

Anatomy review of the anchored overlays and modal dialogs (A8, part 1).

- popover and tooltip: explicit `container` root; `tip` is a top-level sibling part (popover
  keeps a `default` slot on the container). tooltip loses `icon` and the `hasIcon` option.
- standard-dialog, alert-dialog, takeover-dialog: a top-level `overlay` part (colour, opacity),
  one `button-group` part in place of the primary, secondary and cancel action parts, and
  `description` as the secondary text (`body` stays only as the slot host in standard-dialog and
  takeover). takeover-dialog declares slots and drops its `slots` option. The registry terms
  `overlay-color` and `overlay-opacity` are retired.
- coach-mark: explicit root, `cover-image` (was `media`), `description` (was `body`),
  `button-group`, `menu-container`; `pagination-text` removed. contextual-help: top-level
  `popover` part with `description`; the radius record, two S2 records on deprecated
  targets and the `down` and `keyboard-focus` states are removed.
- Records move to part, attribute, between and option pins; legacy records take their S2
  alias's part and context. popover, tooltip and the three dialogs reach level 2; coach-mark
  and contextual-help reach level 1. Legacy `@adobe/spectrum-tokens` output is byte-identical.
