---
"@adobe/spectrum-tokens": minor
---

Generalize the `text-align` token type schema to `alignment`. The schema's
file name (`text-align.json` → `alignment.json`), `$id`
(`…/token-types/text-align.json` → `…/token-types/alignment.json`), title,
and description now describe a generic single-axis alignment value usable
for horizontal, vertical, or text alignment. The enum
(`start | center | end`) and default (`start`) are unchanged, and the
`text-align-*` token names are unchanged. Consumers referencing the old
schema `$id` or file path must update.
