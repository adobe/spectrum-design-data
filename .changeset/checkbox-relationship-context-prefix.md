---
"@adobe/spectrum-design-data": patch
---

Remove the stray "S2 " prefix from checkbox relationship contexts.

- **relationships/checkbox.json**: three contexts lose the prefix, for example
  "S2 Control (size)" is now "Control (size)". This matches switch.
- **visuals/checkbox.json**: recipe context references updated to match.
- Rendered output is unchanged across all 1024 checked combinations.
