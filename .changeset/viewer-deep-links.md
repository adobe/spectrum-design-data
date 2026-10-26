---
"s2-tokens-viewer": minor
---

Add shareable deep links to the S2 tokens viewer (closes hwx4).

- **index.html**: `?q=` pre-fills the search and `?tab=` opens a tab,
  for example `?q=corner-radius`. The URL stays in sync as you search
  or switch tabs, and a "Copy link" button copies it.
- **css/viewer.css**: lays out the search box and copy button side by side.
