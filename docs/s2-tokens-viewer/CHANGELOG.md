# s2-tokens-viewer

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
