# s2-tokens-viewer

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
