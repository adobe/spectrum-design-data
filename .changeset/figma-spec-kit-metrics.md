---
"figma-spec-plugin": minor
---

`plan.mjs record --text-metrics <table>` stores a stamp of the Adobe Fonts kit table in the
registry entry (family, `test700At14px`, a short fingerprint of its advances and kerning, date, and
the platform it was measured on; never the table or the kit URL), and
`plan` adds a `note` to an item when its table differs from the registered one or is missing. The
seven registered spec files are regenerated with the kit table, so label widths follow Adobe Clean
Spectrum VF. The kit hashes reproduce only on the same platform (macOS and Linux measure the font
slightly differently), so regenerate on macOS.
