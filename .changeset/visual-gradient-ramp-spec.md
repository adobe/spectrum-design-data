---
"@adobe/design-data-spec": minor
---

Add `gradient.ramp` to component visual recipes: a linear gradient whose stops the
engine computes from a color option and a channel (hue, saturation, lightness,
brightness, red, green, blue, alpha) in hsl, hsb or rgb, the way React Spectrum
draws a color slider's track (hue 7 stops, lightness 3, others 2). With `z` it is
one layer of a color area (hue, saturation, lightness or brightness layers with
the fixed channel held at its value). Add rule SPEC-115, which checks the
declaration. An unset or unreadable color draws the ramp for red with a
diagnostic, and a ramp that cannot be drawn (an rgb area) draws the plain fill.
Floating parts now draw a gradient fill.
