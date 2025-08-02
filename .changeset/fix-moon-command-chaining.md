---
"s2-tokens-viewer": patch
---

Fix moon.yml command chaining syntax for newer moon version

Updated command chaining in moon.yml tasks to use proper shell syntax instead of && as array elements. This resolves issues with the viewer:export task failing after moon version update.
