---
"@adobe/design-data-spec": minor
"@adobe/spectrum-design-data": patch
---

A nested `component` part can list `inherit: ["contentColor"]`: its icon and
text parts take the color of the host root's first icon or text child instead
of their own. The tag's clear button uses it, so the cross is drawn in the
label's color in every selected, emphasized and color scheme look (#2120).
