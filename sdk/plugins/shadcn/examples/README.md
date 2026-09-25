<!-- Copyright 2026 Adobe. All rights reserved. -->

# Sample output (validation spike)

Not built by CI, not consumed by any code — sample artifacts for the shadcn-registry
discussion, checked in so they have a stable link to share.

* `shadcn-theme.sample.json` — real output of
  `cargo run -p design-data-cli -- export --format shadcn-theme` against the embedded
  dataset (`ShadcnThemeExporter`, this crate).
* `action-button.registry-item.sample.json` — hand-transformed from
  `packages/design-data/components/action-button.json` to prove the component-data
  mapping holds. There's no Layer 2 subcommand yet (see the crate's module docs); this
  file shows the target shape that subcommand would produce.
