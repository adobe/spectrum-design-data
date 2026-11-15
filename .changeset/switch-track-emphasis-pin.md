---
"@adobe/spectrum-design-data": patch
---

Pin `isEmphasized: false` on the four `switch` `background-color / Track` records for a selected
switch, and add one record for selected + disabled + not emphasized that uses the disabled token.
The records came from `Control (selected, non emphasized)`, and the emphasized fill lives under a
different key (`content-color / Control`), so an emphasized request could resolve to the
non-emphasized token. Selected + disabled still applies to both emphasis values. Render output is
unchanged.
