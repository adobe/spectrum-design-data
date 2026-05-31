# site

## 0.2.1

### Patch Changes

- [#1004](https://github.com/adobe/spectrum-design-data/pull/1004) [`c0e262f`](https://github.com/adobe/spectrum-design-data/commit/c0e262f917a1fef0ad15dbc7d6fecdd00772958b) Thanks [@GarthDB](https://github.com/GarthDB)! - Fix broken heading anchors on published spec pages.
  - **docs/site/eleventy.config.js**: add `markdown-it-anchor` with a GitHub slugger; spec headings
    now emit `id` attributes so fragment links like `#token-bindings` resolve.
  - **docs/site/package.json**: add `markdown-it-anchor` and `github-slugger`.

## 0.1.2

### Patch Changes

- Updated dependencies [[`fa28b11`](https://github.com/adobe/spectrum-design-data/commit/fa28b117c6b84776f4ebe9bb281c29e14e0d64b6)]:
  - @adobe/spectrum-component-api-schemas@6.0.0

## 0.1.1

### Patch Changes

- [#630](https://github.com/adobe/spectrum-design-data/pull/630) [`04cf6eb`](https://github.com/adobe/spectrum-design-data/commit/04cf6eb95ece7f3320e0e2babd6a51db8edfc950) Thanks [@GarthDB](https://github.com/GarthDB)! - Update docs/site to use workspace version of @adobe/spectrum-component-api-schemas package.
  The site now imports schemas directly from the package instead of using hardcoded file paths,
  ensuring automatic updates with each published release. Added schema version display on all
  site pages.

- [#633](https://github.com/adobe/spectrum-design-data/pull/633) [`662285a`](https://github.com/adobe/spectrum-design-data/commit/662285a71ba0ccb821862fd4b7aead709bf02e5c) Thanks [@GarthDB](https://github.com/GarthDB)! - fix: update GitHub Pages site asset paths to spectrum-design-data

  Updated Next.js configuration to load assets from the correct
  /spectrum-design-data/ path instead of the old /spectrum-tokens/ path.
  This fixes font loading and other asset issues on the deployed site.

## 0.1.0

### Minor Changes

- [`413ef5a`](https://github.com/adobe/spectrum-design-data/commit/413ef5adad9083b7e133cc867e0436a879004ec8) Thanks [@GarthDB](https://github.com/GarthDB)! - Added `private` metadata to global tokens.
