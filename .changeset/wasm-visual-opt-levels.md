---
"@adobe/design-data-visual": patch
---

Build the slim visual engine smaller: 527.8 KB raw and 199.4 KB gzip, down from
570.9 KB and 210.0 KB. The solver crate is compiled for size, and the JSON and
hash-map crates for speed. Scenes are byte-identical and take the same time.
