---
"@adobe/design-data-spec": minor
---

Component visuals: a `text` part can wrap or truncate its label, and a root can
bind `minHeight`.

A text part that is a direct child of the root binds `overflow` (`wrap` or
`truncate`, after React Spectrum's `overflowMode`). With a fixed width (a request
`width` or a root `width`) it breaks greedily after spaces and hyphens against
the width the root leaves it, measured with the text table; without one, or
without `overflow`, it hugs on one line as before. A word wider than the width
is never split: it overflows and adds a scene diagnostic. A wrapped label is one
scene text node per line. `minHeight` makes the root a minimum: a row root with
no block padding pads by `(minHeight - one line) / 2` and grows by a line height
per extra line. `component-visual.schema.json` accepts `minHeight` and
`overflow`.
