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

Override checkout or data paths with `--react-spectrum-s2`, `--spectrum-wc-gen2`,
and `--components`. React Spectrum entries use `package`; gen2 entries use
`importPath` because the component schema requires exactly one of `package` or
`importPath`.

The utility reads source checkouts and is intended for local backfills. It is
not the `implementations[]` CI contract test; that follow-up must verify
installed package exports independently.
