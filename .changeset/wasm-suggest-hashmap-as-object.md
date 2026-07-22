---
"@adobe/design-data-wasm": patch
---

Fix `nameObject`/`raw`/`value` serializing as a JS `Map`, rendered as `{}` by
`JSON.stringify`.

- **sdk/wasm/src/types.rs**: added `#[tsify(hashmap_as_object)]` to the
  wasm-boundary result types so nested JSON fields cross as plain objects.
