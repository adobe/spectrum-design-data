<!-- Copyright 2026 Adobe. All rights reserved. -->

# shadcn registry output

The checked-in files are generated from the embedded Spectrum dataset and serve as
golden examples for the exporter tests.

* `shadcn-theme.sample.json` — output of
  `cargo run -p design-data-cli -- export --format shadcn-theme` against the embedded
  dataset (`ShadcnThemeExporter`, this crate); the checked-in snapshot contains 1,189
  CSS variables for each color scheme.
* `action-button.registry-item.sample.json` — output of
  `cargo run -p design-data-cli -- shadcn registry --component action-button --output DIR`
  from `packages/design-data/components/action-button.json`.

Component items contain SDD metadata only; no component source files are synthesized.
The `spectrum-theme` dependency is generated separately by `export --format shadcn-theme`
and must be published with the component catalog.
