---
"@adobe/design-data-spec": minor
"@adobe/spectrum-design-data": minor
"@adobe/design-data-tui": minor
"@adobe/design-data-wasm": patch
---

Let a collection slot declare a `demo`, and give date-field, time-field and
segmented-text-field one.

- **spec/component-format.md, schemas/component.schema.json**: a collection slot's `demo` is the
  value of its collection option: item objects of the option's declared fields. A host passes
  it as that option, not as `slots`. This relaxes the earlier ban, so existing data stays valid.
- **SPEC-104**: validates a collection demo (every entry an object, every key a declared item
  field of the right type, the count within `min` and `max`). The conformance fixture covers it.
- **date-field, time-field, segmented-text-field**: the `segments` slot gains a demo (month, day
  and year with separators and a placeholder; hour, minute and day period; a three-part code),
  so the explorer shows real segments instead of one empty one.
- **explorer**: `demoOptions` sets a collection demo as the array option; an option the user
  sets replaces it.
- **golden renders**: a `demo` golden for each of the three components.
