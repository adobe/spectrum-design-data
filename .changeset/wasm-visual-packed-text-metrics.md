---
"@adobe/design-data-visual": patch
---

Shrink the slim visual engine by 13.0 KB raw and 3.9 KB gzip. The default text-metrics
table is now compiled in as a packed binary file instead of JSON text. Label widths and
scenes are byte-identical.
