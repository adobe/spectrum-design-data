---
"@adobe/design-data-spec": minor
"@adobe/design-data-tui": patch
"@adobe/design-data-wasm": patch
---

Load platform-owned visual recipes and add `componentAliases`.

**Spec:**

- `manifest.schema.json` accepts `componentAliases` (string to string).
- New error SPEC-081: an alias key must be a foundation component, its target must be declared in
  the platform's `extensions/components/`, aliases must not chain or cycle, and a key must not
  also be replaced there. New conformance fixture `invalid/SPEC-081`.

**SDK core:**

- A platform's `extensions/visuals/<component>.json` loads into `graph.visuals` with
  `layer: Platform` and replaces the foundation recipe of the same name. A bad fragment or a
  file name that differs from `component` is an error naming the file.
- `TokenGraph::canonical_component` returns the alias target under the active platform. Render,
  site and WASM do not call it yet.
