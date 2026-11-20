---
"@adobe/design-data-wasm": patch
"@adobe/spectrum-design-data": minor
---

Review the anatomy of the messages and status components (A5).

- status-light, in-line-alert, alert-banner, toast and coach-indicator are reviewed (level 1;
  coach-indicator reaches level 2). Each gets the explicit root part `container`.
- status-light: the `visual-75`..`visual-300` pseudo parts go (the `size` option carries the dot
  size); the dot is the part `dot` (registry alias `light`).
- in-line-alert: text parts are `title` and `description`; `link` and `button` are separate
  parts. The `style` option names the container fill (Figma "Border fill" is `outline`). The 27
  combined "X and Icon" colour records are split into a container record and an icon record that
  share one `$ref`.
- alert-banner and toast: parts `icon` (registry alias `alert-icon`), `text`, `button` and
  `close-button`; the 21 Background colour records are pinned to a `variant`.
- Gaps and edge paddings become `between` records (axis endpoints like `start-edge`).
- coach-indicator: `collapsed` and `expanded` are states of the pulse (new registry states), not a
  qualifier.
- floating-action-button is archive-only (Spectrum 1 only); its legacy-keyed records stay live.

Legacy `@adobe/spectrum-tokens` output is byte-identical. Deprecated records are untouched.
