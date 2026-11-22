---
"@adobe/spectrum-design-data": minor
"@adobe/spectrum-tokens": patch
---

Fix the status light label wrap and dot size.

- The label now wraps like the switch, checkbox and radio button (#2047).
- The dot binds the `ui-icon` size tokens on both scales (#2046). Small is 8px
  desktop and 10px mobile again.
- The Extra-large dot is 16px desktop and 18px mobile (`ui-icon-2x-large`), up
  from 14px and 16px (#1798).
- The deprecated `status-light-dot-size-small` now points to
  `ui-icon-extra-small` (`renamed` in `@adobe/spectrum-tokens`).
