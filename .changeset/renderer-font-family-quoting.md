---
"@adobe/design-data-wasm": patch
"@adobe/design-data-spec": patch
---

Renderer SVG text uses a valid CSS `font-family` list.

- The default stack quotes `'Source Sans 3'`. The unquoted name made browsers drop the
  whole list and render serif.
- A family bound by a recipe token (such as `Adobe Clean Spectrum VF`) is quoted unless it
  is a generic keyword. The Rust renderer and the JS runtime produce the same list.
- Spec R2 shows the quoted stack and requires quoting for names that are not CSS
  identifiers.
