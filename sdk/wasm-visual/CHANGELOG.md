# @adobe/design-data-visual

## 0.1.3

### Patch Changes

- [#2225](https://github.com/adobe/spectrum-design-data/pull/2225) [`523e156`](https://github.com/adobe/spectrum-design-data/commit/523e156068b9ff7bad4cc24391cc559a32993282) Thanks [@GarthDB](https://github.com/GarthDB)! - Draw a `ring` part that is a child of a repeated copy (a collection item or a nested repeat).
  - A `ring` listed in `children` of a repeated part no longer joins the flow, where the solver
    read `color` on it (a debug assertion). Recipe compilation moves it out of `children` and
    names its parent as the ring's `host`; each copy draws its own ring around its box, or the
    `around` part, exactly as a ring on a plain root is drawn.
  - A ring is drawn by the scene its `host` roots, and an orphan ring (listed nowhere) only by the
    recipe's own root, so a repeat no longer repeats an orphan ring around every copy.
  - No component recipe changes and every existing render is byte-identical.

- [#2197](https://github.com/adobe/spectrum-design-data/pull/2197) [`7161bb0`](https://github.com/adobe/spectrum-design-data/commit/7161bb00cb098860da8b68a7859f4a2d5ae1c6f2) Thanks [@GarthDB](https://github.com/GarthDB)! - Every place that shows or matches a token name now uses the legacy name the engine
  derives (`extract_legacy_key`), pinned or not (proposal 023, slice 1).
  - Wasm `TokenResult` gains `legacyName`.
  - Recipe renders, scene `token` labels, the site and spec sheets show legacy names for
    unpinned tokens (about 1,808 live token rows, 930 distinct names; pixels do not).
  - A recipe selector's `legacyKey` matches the derived legacy name, and `rank_key` no
    longer counts the `legacyKey` pin as a name field, so site `candidates[].rank`
    changes for pinned tokens and pinned and unpinned tokens can now tie.
  - MCP `design-data-query`, `token-usage` and friends return the legacy name, resolve
    mode-dependent aliases through it, and still accept the old `field=value` text.
  - Removes 164 token `legacyKey` pins that now equal the derived name. Legacy output
    (`@adobe/spectrum-tokens`) is byte-identical.

## 0.1.2

### Patch Changes

- [#2171](https://github.com/adobe/spectrum-design-data/pull/2171) [`9d8c72a`](https://github.com/adobe/spectrum-design-data/commit/9d8c72ab95cf9025e90afbe3c32fa1447927178a) Thanks [@GarthDB](https://github.com/GarthDB)! - Shrink the slim visual engine by 13.0 KB raw and 3.9 KB gzip. The default text-metrics
  table is now compiled in as a packed binary file instead of JSON text. Label widths and
  scenes are byte-identical.

## 0.1.1

### Patch Changes

- [#2128](https://github.com/adobe/spectrum-design-data/pull/2128) [`72cc6fd`](https://github.com/adobe/spectrum-design-data/commit/72cc6fdef620631b603c9ecd9537f0ae533cd2c7) Thanks [@GarthDB](https://github.com/GarthDB)! - Build the slim visual engine smaller: 527.8 KB raw and 199.4 KB gzip, down from
  570.9 KB and 210.0 KB. The solver crate is compiled for size, and the JSON and
  hash-map crates for speed. Scenes are byte-identical and take the same time.

## 0.1.0

### Minor Changes

- [#1775](https://github.com/adobe/spectrum-design-data/pull/1775) [`36b9c3d`](https://github.com/adobe/spectrum-design-data/commit/36b9c3d00a761a27cd9b50ad60da11b31a3de895) Thanks [@GarthDB](https://github.com/GarthDB)! - Publish the slim visual engine as `@adobe/design-data-visual`: the browser and Node
  WebAssembly renderer, plus precompiled variants and a component catalog, so
  prototypes can render Spectrum components to SVG without the monorepo.
