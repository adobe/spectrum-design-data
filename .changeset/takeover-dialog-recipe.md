---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": patch
---

Add a structure-only visual recipe for takeover-dialog.

- Structure only: no padding, title type or gaps (no records), so the title and
  steplist touch and a long title does not wrap. Renders look unfinished.
- Rounding and background bind by relationship for the dialog variant only. The
  full-screen variant has no records and draws no fill, so its dark render is
  near-white text on nothing.
- The title binds its color. Header row: title, header-content slot, button
  group. Body: the default slot.
- takeover-dialog gains a `header` anatomy part and a temporary `button-group`
  slot (bead 5m92.32.22). Header-content and default slots declare `accepts`
  and `demo`.
- Not drawn: overlay (its color record points at a deprecated black token),
  margin, width and height (deprecated records). No shadow, as in Figma and S2.
- Snapshots and goldens are regenerated. Legacy token output is unchanged.
