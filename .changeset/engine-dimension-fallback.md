---
"@adobe/spectrum-design-data": minor
"@adobe/design-data-spec": minor
"@adobe/design-data-wasm": patch
---

Recipe engine: a `dimension` source may carry a `fallback` (opt-in, no layout revision change).

- `{"dimension": "width", "fallback": {"relationship": {...}}}` reads the numeric option when
  it is a positive number, else resolves the fallback (usually the default width relationship).
  Before, an unset `dimension` hugged the content and could not fall back.
- The combo-box and search-field recipes use it: hosts that pass the `width` option
  (`--option width=300`, WASM `opt.width`) now get that width, and no option keeps the
  relationship default (144/192/240/288). Search-field's `width` option was dead before.
  The explorer's Width (px) control sets the demo width and is unchanged.
- A renderer that does not read `fallback` treats the size as unset (hug), as before.
- Limits: `fallback` is one source (not a `when` list); spec sheets do not read it.
