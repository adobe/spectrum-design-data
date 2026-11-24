---
"@adobe/design-data-spec": minor
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": minor
---

Add the shared `toggle` behavior pattern (proposal 022) that Switch and
Checkbox extend, and a read-only Checkbox.

* Data: `behaviors/patterns/toggle.json` holds the `checked`, `disabled` and
  `readOnly` facets and the `activate` transition. Switch extends it as is;
  Checkbox overrides `checked` (adds indeterminate) and `activate` (also
  clears `isIndeterminate`).
* Checkbox gains an `isReadOnly` option: it keeps focus, ignores activation
  and exposes `aria-readonly`. The component data and spec sheet option list
  gain the option; no distinct read-only visual. Scenes list it in
  `optionDefaults`; every other render is unchanged.
* Activating a checkbox with `isSelected` and `isIndeterminate` both true
  unchecks it, as a native input does.
* Validation: SPEC-118 to SPEC-120 follow `extends` for facets, patterns may
  toggle options, SPEC-124 warns when a binding targets an intent the role
  does not handle. The spec page maps DOM keys to key names.
* The Checkbox group keyboard guideline says Space, not "Space or Enter".
