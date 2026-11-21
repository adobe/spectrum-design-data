---
"@adobe/design-data-wasm": patch
"@adobe/spectrum-component-api-schemas": patch
"@adobe/spectrum-design-data": minor
---

Add the options that tell merged records apart in tabs, segmented control, steplist and side
navigation (5m92.6.2).

Tabs declare size (s, m, l, xl) and density (regular, compact). Segmented control and steplist
declare size. Side navigation declares isSelected and isDisabled.

Records pin them, read off the token a record points at or off its former context. Tabs and
steplist font sizes pin per size, tab height pins per density, segmented control items pin
hideTracker (no track or with track), and side navigation pins its selected (not disabled) and
disabled records.

Same pin set groups fall from 4 to 1 in tabs, and from 2 to 1 in steplist, side navigation and
segmented control. One tabs record that differed from its twin only by density, with the same
token, is merged.

Legacy `@adobe/spectrum-tokens` output is byte-identical.
