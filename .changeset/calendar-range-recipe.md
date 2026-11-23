---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": patch
---

Draw range selection in the calendar recipe.

- Anatomy: `range-fill` moves from `month` to `day`, and `day` gains a
  `day-fill` part (the circle behind the number, new registry term
  `day-fill`). `label` is now drawn on the day.
- A selected day in `selectionMode` range draws the range band behind its
  number: the whole 40px day cell for a day inside the range, half a cell
  for the two ends (`isRangeStart`, `isRangeEnd`), which also draw the
  selected circle, so the band meets the circle flush and is continuous.
  The band is capped (pill ends) at the ends of a week row. A one-day
  range draws only the circle. A single selected day in `single` mode is
  unchanged.
- Relationships: error range-fill band (red subtle background) and the
  neutral day number inside a range (it is not white like the end circles).
- Day and weekday cells are 40 wide with no column gap (32 plus the 8
  weekday gap), so the band is continuous within a week row.
- Not drawn: band stroke, today marker, unavailable strike.
- Snapshots and goldens are regenerated. Legacy token output is unchanged.
