---
"@adobe/design-data-spec": minor
"@adobe/spectrum-design-data": major
"@adobe/design-data-wasm": minor
"@adobe/design-data": minor
"@adobe/design-data-mcp": minor
---

Anatomy parts can be another component; recipes read that link. Part of the 7.0.0 bundle.

- **anatomy-format.md**: new "What is a part" rule replaces "What is not anatomy"; new `component`
  field on a part, checked by SPEC-106.
- **component-format.md**: new `subcomponent: boolean`; hosts are derived ("Used in"), not stored.
- **component-visuals.md and schemas**: BREAKING. A recipe `kind: component` part drops its
  `component` and reads the host's anatomy part of the same key (SPEC-089 reports a missing link).
- **@adobe/spectrum-design-data**: BREAKING data shape. `component` on 95 anatomy parts in 46
  components, removed from 21 recipe parts in 12 recipes, 5 components marked `subcomponent`.
- **@adobe/design-data-wasm**: the engine reads the nested component from anatomy; spec sheets
  and the site list gain `subcomponent` and `usedIn`. CLI is 0.62.2.
- **@adobe/design-data, @adobe/design-data-mcp**: component search results gain `subcomponent`
  and `usedIn`.
- Dataset `requires.cli` is raised to 0.62.2: older CLIs cannot read a part `component`.
