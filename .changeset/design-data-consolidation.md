---
"@adobe/design-data-spec": minor
"@adobe/spectrum-design-data": minor
---

Consolidate Spectrum-specific design data into a single package.

- **`@adobe/design-data-spec`**: removed `components/`, `fields/`, and `mode-sets/` directories
  and their exports. Now a pure generalized format definition (schemas, spec, rules, conformance).
  The `./components/*.json` export is no longer published (draft package, internal consumer only).
- **`@adobe/spectrum-design-data`**: added `components/` (81 component declarations), `fields/`
  (24 field catalog files), and `mode-sets/` (3 mode-set instances) alongside the existing
  `tokens/`. New exports: `./components/*`, `./fields/*`, `./mode-sets/*`.
