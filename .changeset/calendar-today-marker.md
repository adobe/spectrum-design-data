---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": patch
---

Draw the calendar today marker.

- A day with `isToday` draws a 4px dot at the bottom of its cell (4px above the
  edge, centered), the `current-day-indicator` anatomy part, as in Figma
  `.Day` (Current day indicator) and React Spectrum S2 (bottom 12.5%).
- The dot takes the day's content color relationship, so it is white on a
  selected or error day, gray on a disabled day and neutral otherwise.
- `isToday` leaves the recipe's `notVisual` list. The day box gains 4px block
  padding (centered children do not move) so the dot can sit at the bottom
  with the stack child `align: end`.
- The Figma-bound relationship on `current-day-indicator` (neutral hover
  content color) is not used by the recipe.
- Goldens and snapshots are regenerated. Legacy token output is unchanged.
