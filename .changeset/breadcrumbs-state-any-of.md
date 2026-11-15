---
"@adobe/spectrum-design-data": patch
---

Replace the `Breadcrumb item (hover, down, focus states)` context on two `breadcrumbs`
relationships (`underline-thickness`, `text-underline-gap`) with `Breadcrumb item` and a state
any-of, `scope.options.state: [{ anyOf: ["hover", "down", "keyboard-focus"] }]`. `breadcrumbs` has no
visual recipe, so nothing renders differently.
