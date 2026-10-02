<!-- Copyright 2026 Adobe. All rights reserved. -->

<!-- This file is licensed to you under the Apache License, Version 2.0. -->

# S2 implementation metadata

This utility verifies and backfills `implementations[]` using local source
checkouts of React Spectrum S2 and Spectrum Web Components gen2. It never adds
non-exact aliases automatically.

By default, it reads:

* `~/Spectrum/react-spectrum/packages/@react-spectrum/s2`
* `~/Spectrum/spectrum-web-components/gen2/packages/swc`
* `packages/design-data/components`

Run a report without changing files:

```sh
pnpm exec node tools/s2-implementation-metadata/verify.mjs
```

Review the alias candidates and unmatched component list, then write only exact
matches:

```sh
pnpm exec node tools/s2-implementation-metadata/verify.mjs --write
```

Check that existing data still matches the source checkouts:

```sh
pnpm exec node tools/s2-implementation-metadata/verify.mjs --check
```

Run the parser and JSON-editing unit tests:

```sh
pnpm exec node --test tools/s2-implementation-metadata/verify.test.mjs
```

Generate the platform-owned `extensions/implementations/` fragments for an
incubating platform manifest, or check that they are current:

```sh
pnpm exec node tools/s2-implementation-metadata/verify.mjs --emit-platform react-spectrum
pnpm exec node tools/s2-implementation-metadata/verify.mjs --emit-platform web-components --check
```

Fragments go to `platforms/<id>/extensions/implementations/` unless `--out <dir>`
is given. Emit mode deletes fragments for components that no longer match.

Override checkout or data paths with `--react-spectrum-s2`, `--spectrum-wc-gen2`,
and `--components`. Foundation defaults written by `--write` keep React Spectrum
entries on `package` and gen2 entries on `importPath`. Platform fragments for gen2
carry both `package` and `importPath`, and the SDK stamps each row with the
manifest's `platform` id when merging.

The utility reads source checkouts and is intended for local backfills. It is
not the `implementations[]` CI contract test; that follow-up must verify
installed package exports independently.
