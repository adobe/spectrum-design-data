---
"@adobe/design-data-wasm": patch
"@adobe/spectrum-design-data": patch
---

Add the `menu-container` part to combo-box and picker (5m92.22).

- Each component's four `component-to-menu-{small,medium,large,extra-large}` records become
  one `space-between` record from `container` to `menu-container` that pins `size` to all
  four sizes (SPEC-100). It keeps the first uuid, the `$ref` (popover-gap) and the context;
  the other three uuids are dropped.
- picker reaches status level 2. combo-box keeps its S1 quiet record until the tokens release.
