---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": minor
---

Add the accordion `container-divider` part, following Figma.

- The divider that opens the list is drawn once on the accordion container, above the first item.
  Each item keeps its own end divider.
- Every non-quiet accordion render gains one 1px line at the top; the container is 1px taller.
  Quiet accordions are unchanged.
- New registry term `container-divider`. Layout revision is unchanged.
