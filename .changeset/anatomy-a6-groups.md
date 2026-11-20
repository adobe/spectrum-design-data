---
"@adobe/design-data-wasm": patch
"@adobe/spectrum-design-data": minor
---

Anatomy review of the groups family (A6).

- button-group, action-group and swatch-group stay components: an explicit root `container` and
  one `default` slot (part `container`, accepts the child component, min 1). `button`,
  `action-button` and `swatch` are no longer parts.
- avatar-group (`avatars` host plus `label`), tag-group (`tags` host; `action-button` is a
  sibling part shown by `actionLabel`), checkbox-group and radio-group (`options` host; radio
  needs 2 or more) declare a slot whose part is the host. checkbox-group and radio-group get
  anatomy with no records yet.
- action-bar: `counter` merged into `item-counter`, `action-group-area` renamed `action-group`,
  `close-button` added; the 3 Border colour records are pinned to `colorScheme` light, dark and
  wireframe.
- Group spacing records become `space-between` with `between` on the repeated child. avatar-group
  `to-avatar-{size}` and `font-size-{N}` records are decomposed (size pin, part `label`);
  tag-group "text area to help text" is now "field to help text". New anatomy terms in the registry.
- Status: action-bar, avatar-group and swatch-group reach level 1; action-group, button-group,
  checkbox-group, radio-group and tag-group reach level 2. form-item is untouched.
  Legacy `@adobe/spectrum-tokens` output is byte-identical.
