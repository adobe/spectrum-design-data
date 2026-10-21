---
description: packages/tokens is generated legacy output; read canonical data from packages/design-data
globs: tools/**, sdk/**, packages/**, docs/**
---

<!-- Copyright 2026 Adobe. All rights reserved. -->

# Legacy tokens policy

* `packages/tokens` (`@adobe/spectrum-tokens`) is a generated legacy output kept for existing npm consumers. `packages/design-data` is the source of truth.
* New tooling, SDK code, and docs must not import `@adobe/spectrum-tokens` or read `packages/tokens/{src,schemas,naming-exceptions.json,manifest.json}`. Load the cascade data (`packages/design-data`) instead; for the legacy set shape, project it with `design-data migrate legacy-output` or `design_data_core::legacy`.
* Token-type schemas live in `packages/design-data-spec/schemas/` and `naming-exceptions.json` in `packages/design-data/`. The copies in `packages/tokens` and `docs/site/public/schemas` are generated: run `node packages/design-data-spec/scripts/sync-token-schemas.mjs` (drift check: `moon run design-data-spec:check`).
* `moon run root:check-legacy-consumers` fails on new references. Intentional uses (legacy-output, diff and release tooling, parity tests, old-tag fallbacks) go in `scripts/legacy-consumers.allowlist.json` with a reason; temporary entries cite their bead id.
