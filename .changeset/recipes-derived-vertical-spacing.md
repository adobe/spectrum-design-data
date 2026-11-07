---
"@adobe/spectrum-design-data": minor
---

Six recipes declare their vertical edge spacing as derived.

Action button, badge, button, checkbox, radio button and switch list the contexts "Spacing (top
edge to icon/control/label)" and "Spacing (top/bottom edge to label)" under the new `derived`
array, with the formula `(height - label.lineHeight) / 2`. The recipes bind no new padding, so
rendered output is unchanged. Spec sheets show these contexts with a marker and a measurement
labelled "derived from height". SPEC-087 compares each token with the formula per size and scale.
