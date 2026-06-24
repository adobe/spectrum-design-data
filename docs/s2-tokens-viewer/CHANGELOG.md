# s2-tokens-viewer

## 0.2.3

### Patch Changes

- Updated dependencies [[`dcf0832`](https://github.com/adobe/spectrum-design-data/commit/dcf083214d56989817db192801638e3ec20e2306)]:
  - @adobe/spectrum-tokens@14.13.2

## 0.2.2

### Patch Changes

- Updated dependencies [[`eac1cb3`](https://github.com/adobe/spectrum-design-data/commit/eac1cb3121eda40c929e333f1375c75895244882)]:
  - @adobe/spectrum-tokens@14.13.1

## 0.2.1

### Patch Changes

- Updated dependencies [[`2573230`](https://github.com/adobe/spectrum-design-data/commit/2573230d0ccd39214adae0fde0c4a52e997445ca)]:
  - @adobe/spectrum-tokens@14.13.0

## 0.2.0

### Minor Changes

- [#1145](https://github.com/adobe/spectrum-design-data/pull/1145) [`04aaa7f`](https://github.com/adobe/spectrum-design-data/commit/04aaa7fe6a1aaa3d04c2dc03cb17dd8a1b15e8bb) Thanks [@GarthDB](https://github.com/GarthDB)! - Switch s2-tokens-viewer token resolution from runtime to build-time wasm.
  - **scripts/resolve.mjs**: new build-time script; drives `Dataset.embedded()` via
    `@adobe/design-data-wasm` (node) to pre-resolve all 2,460 slugs into
    `tokens/resolved.json` (values + chains per context).
  - **moon.yml**: new `resolve` task (`sdk-wasm:build` + `prepare` deps);
    `export` now depends on `resolve` so `resolved.json` ships to `site/`.
  - **index.html**: replace inline `TokenResolver`/`TokenResolverFactory` (~190 lines)
    with `createResolvedLookup(map, type)`; all call sites unchanged.
  - **deploy-docs.yml**: add Rust toolchain + wasm-pack steps; drop stale
    `s2-tokens-viewer:export` line (correct id is `viewer`).

### Patch Changes

- [#1147](https://github.com/adobe/spectrum-design-data/pull/1147) [`cece05d`](https://github.com/adobe/spectrum-design-data/commit/cece05de03dd8b43cfeb697d045eb4302a34b26c) Thanks [@GarthDB](https://github.com/GarthDB)! - Fix set-level alias resolution in `resolve_reference` after cache reload.
  - **`sdk/core/src/graph.rs`**: add `set_uuid_index` (set_uuid → all children) populated in
    all graph builders and `rebuild_uuid_index`; add `resolve_set_in_context` and
    `resolve_alias_in_context` for context-aware chain walking through set-level UUID aliases.
  - **`sdk/core/src/cascade.rs`**: extract `resolve_reference(graph, slug, ctx)` as a
    testable core function with deterministic tie-breaking and graceful dangling-ref handling.
  - **`sdk/wasm/src/dataset.rs`**: delegate `resolveReference` to the core function;
    remove spike-status comment.
  - **`packages/design-data-spec/conformance/reference/`**: 4 new fixture-driven
    conformance cases (set-alias-light, set-alias-dark, dangling-ref, unknown-slug).
  - **`sdk/wasm/test/parity.test.js`**: 7 new parity tests (wireframe, scale, set-alias
    regression, dangling-ref degradation, stable tie-break).
  - **`docs/s2-tokens-viewer/scripts/resolve.mjs`**: remove JS fallback (now redundant);
    `wasm: 9062 | fallback: 0 | missing: 0`.

- Updated dependencies [[`cece05d`](https://github.com/adobe/spectrum-design-data/commit/cece05de03dd8b43cfeb697d045eb4302a34b26c)]:
  - @adobe/design-data-wasm@0.4.0

## 0.1.24

### Patch Changes

- Updated dependencies [[`60a4835`](https://github.com/adobe/spectrum-design-data/commit/60a4835e245965639a4ac89b41d2884dd63a0bbb)]:
  - @adobe/spectrum-tokens@14.12.0

## 0.1.23

### Patch Changes

- Updated dependencies [[`e9974fb`](https://github.com/adobe/spectrum-design-data/commit/e9974fb7360e849e928b31518b073996b49ecd6b), [`ba06968`](https://github.com/adobe/spectrum-design-data/commit/ba06968226adb268600e0ed1befc9d381e7986b6)]:
  - @adobe/spectrum-tokens@14.11.0

## 0.1.22

### Patch Changes

- Updated dependencies [[`dfddf12`](https://github.com/adobe/spectrum-design-data/commit/dfddf123e92ff31eeb8a71bb6350f189ef39de13)]:
  - @adobe/spectrum-tokens@14.10.0

## 0.1.21

### Patch Changes

- Updated dependencies [[`c133c83`](https://github.com/adobe/spectrum-design-data/commit/c133c832f605e6f09b8bc5db80a6f98b46233b2c)]:
  - @adobe/spectrum-tokens@14.9.0

## 0.1.20

### Patch Changes

- Updated dependencies [[`af22092`](https://github.com/adobe/spectrum-design-data/commit/af22092744c70af7ce0c659e16cdabe31b92b111)]:
  - @adobe/spectrum-tokens@14.8.0

## 0.1.19

### Patch Changes

- Updated dependencies [[`c28702f`](https://github.com/adobe/spectrum-design-data/commit/c28702f19ad408d3dc1461bb059a1c7125f7d32f)]:
  - @adobe/spectrum-tokens@14.7.0

## 0.1.18

### Patch Changes

- Updated dependencies [[`b11942c`](https://github.com/adobe/spectrum-design-data/commit/b11942cf52ec0077cfd53d8cb70ca722dc88c2e0)]:
  - @adobe/spectrum-tokens@14.6.0

## 0.1.17

### Patch Changes

- Updated dependencies [[`efab669`](https://github.com/adobe/spectrum-design-data/commit/efab6690442052fb94fd5d198fc56594e6be28e5)]:
  - @adobe/spectrum-tokens@14.5.0

## 0.1.16

### Patch Changes

- Updated dependencies [[`55bf38f`](https://github.com/adobe/spectrum-design-data/commit/55bf38f81bacd49f2db0a54cde91bbf311dda23f)]:
  - @adobe/spectrum-tokens@14.4.0

## 0.1.15

### Patch Changes

- Updated dependencies [[`a6d8f51`](https://github.com/adobe/spectrum-design-data/commit/a6d8f51a72409d2d8bbc509e2262aaa5f34cd0f1)]:
  - @adobe/spectrum-tokens@14.3.0

## 0.1.14

### Patch Changes

- Updated dependencies [[`80b1637`](https://github.com/adobe/spectrum-design-data/commit/80b163712ae7ac42b9892b0fd4001b1bb27ba1ac)]:
  - @adobe/spectrum-tokens@14.2.3

## 0.1.13

### Patch Changes

- Updated dependencies [[`3f05fcf`](https://github.com/adobe/spectrum-design-data/commit/3f05fcffcd8641c822a54c4cdd37ba452dab455c), [`956d61a`](https://github.com/adobe/spectrum-design-data/commit/956d61a00f154e7c488edf6916b0ce16945a814c)]:
  - @adobe/spectrum-tokens@14.2.2

## 0.1.12

### Patch Changes

- Updated dependencies [[`49ad47b`](https://github.com/adobe/spectrum-design-data/commit/49ad47bea61952f84eb86b214954136049aca376)]:
  - @adobe/spectrum-tokens@14.2.1

## 0.1.11

### Patch Changes

- Updated dependencies [[`c051815`](https://github.com/adobe/spectrum-design-data/commit/c05181505730ec911196c4b6d37d106bccd742e5)]:
  - @adobe/spectrum-tokens@14.2.0

## 0.1.10

### Patch Changes

- Updated dependencies [[`ae68c41`](https://github.com/adobe/spectrum-design-data/commit/ae68c412101b32b114d0d56893d1214f5225210a)]:
  - @adobe/spectrum-tokens@14.1.0

## 0.1.9

### Patch Changes

- Updated dependencies [[`fa28b11`](https://github.com/adobe/spectrum-design-data/commit/fa28b117c6b84776f4ebe9bb281c29e14e0d64b6)]:
  - @adobe/spectrum-tokens@14.0.0

## 0.1.8

### Patch Changes

- Updated dependencies [[`f64bee3`](https://github.com/adobe/spectrum-design-data/commit/f64bee3900c874775f2d3424516786a0d644d057)]:
  - @adobe/spectrum-tokens@13.16.0

## 0.1.7

### Patch Changes

- Updated dependencies [[`1e860c4`](https://github.com/adobe/spectrum-design-data/commit/1e860c4436c58ceca6f4500ea7e24d6d8cdd20c8)]:
  - @adobe/spectrum-tokens@13.15.1

## 0.1.6

### Patch Changes

- Updated dependencies [[`3df7197`](https://github.com/adobe/spectrum-design-data/commit/3df7197e7da23c9bb107f7dfcd935b5c62a86041)]:
  - @adobe/spectrum-tokens@13.15.0

## 0.1.5

### Patch Changes

- Updated dependencies [[`b4df84e`](https://github.com/adobe/spectrum-design-data/commit/b4df84e2f2ca246332907f9ddda94438288dd98e)]:
  - @adobe/spectrum-tokens@13.14.1

## 0.1.4

### Patch Changes

- Updated dependencies [[`336f672`](https://github.com/adobe/spectrum-design-data/commit/336f67216dfd875f0feb65c10059d9f3fe6dcaf7)]:
  - @adobe/spectrum-tokens@13.14.0

## 0.1.3

### Patch Changes

- Updated dependencies [[`1d4973e`](https://github.com/adobe/spectrum-design-data/commit/1d4973e78d814575da231c2c4080ead8a190d2fc)]:
  - @adobe/spectrum-tokens@13.13.0

## 0.1.2

### Patch Changes

- [#544](https://github.com/adobe/spectrum-design-data/pull/544) [`18dc0e1`](https://github.com/adobe/spectrum-design-data/commit/18dc0e12537e73d7290ae9b227754b5240807cf3) Thanks [@GarthDB](https://github.com/GarthDB)! - Fix moon.yml command chaining syntax for newer moon version

  Updated command chaining in moon.yml tasks to use proper shell syntax instead of && as array elements. This resolves issues with the viewer:export task failing after moon version update.

## 0.1.1

### Patch Changes

- [#533](https://github.com/adobe/spectrum-design-data/pull/533) [`27fe5e4`](https://github.com/adobe/spectrum-design-data/commit/27fe5e44fed13b7b1fddd02f614251cc47c4f8eb) Thanks [@GarthDB](https://github.com/GarthDB)! - Improve S2 tokens viewer self-containment and deployment

  **Enhancements:**
  - Add workspace dependency on `@adobe/spectrum-tokens` package
  - Add prepare script to automatically copy token files locally
  - Update file paths to use relative paths instead of absolute paths
  - Make viewer fully self-contained with local token files

  **Technical Changes:**
  - Updated `package.json` to include workspace dependency and prepare script
  - Modified `index.html` to load token files from relative paths (`packages/tokens/src/`)
  - Added local copies of all Spectrum 2 token JSON files for standalone operation

  These changes make the S2 tokens viewer easier to deploy and more portable, eliminating dependencies on external file paths while maintaining full functionality.
