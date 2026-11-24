# @adobe/design-data-visual

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
