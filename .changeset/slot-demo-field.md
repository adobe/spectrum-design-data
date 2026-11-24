---
"@adobe/design-data-spec": minor
"@adobe/spectrum-design-data": minor
"@adobe/design-data-tui": minor
---

A component slot can declare `demo`, the fills a host shows it with.

- **@adobe/design-data-spec**: new optional `demo` array on a slot declaration (component schema,
  component-format.md "Slot demo"). Entries have the shape of a render request slot fill
  (`{component, options}`), so a host passes them through as `slots`. SPEC-104 checks them: the
  slot has a part and is not a collection, each entry names an accepted component, options are
  declared by it (and listed values respected), and the count is within `min` and `max`.
- **@adobe/spectrum-design-data**: `demo` on the 13 components that host slot fills
  (radio-group, checkbox-group, button-group, action-group, swatch-group, popover, accordion,
  alert-dialog, standard-dialog, coach-mark, bar-panel, stack-item, standard-panel), following
  the Figma Web POC where it shows content.
- **@adobe/design-data-tui**: SPEC-104 validates `demo`; the explorer reads it (the first-accepted
  component heuristic stays as the fallback for a slot without `demo`).
