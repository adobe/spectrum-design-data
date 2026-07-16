# token-mapping-analyzer

## 0.0.13

### Patch Changes

- Updated dependencies [[`b4f79db`](https://github.com/adobe/spectrum-design-data/commit/b4f79db78d8b889b46b98d0fc26d424c1d4fe5fe), [`62e74d7`](https://github.com/adobe/spectrum-design-data/commit/62e74d7f4d59bcc3e63fbc5b7c594f65ef78b024), [`8d8bf09`](https://github.com/adobe/spectrum-design-data/commit/8d8bf0904e716ed86b10f890251980f73f0215c7)]:
  - @adobe/spectrum-tokens@14.15.0

## 0.0.12

### Patch Changes

- [#1213](https://github.com/adobe/spectrum-design-data/pull/1213) [`035a1f9`](https://github.com/adobe/spectrum-design-data/commit/035a1f95d909f8e443a5e51baee6e30d11eedde5) Thanks [@GarthDB](https://github.com/GarthDB)! - Decompose component color properties into colorFamily + colorRole fields (closes beads #72c).
  - **packages/design-data/fields/colorRole.json**: new `colorRole` field
    (position 16, scope color, excludeFromLegacyKey).
  - **packages/design-data/registry/color-roles.json**: new registry —
    `primary` and `background` role values.
  - **packages/design-data/tokens/icons.tokens.json**: 187 tokens atomized
    (`color-blue-primary` → `property:color` + `colorFamily:blue` + `colorRole:primary`).
  - **sdk/core/src/naming.rs**: color-domain branch extended for component color
    tokens (`{component}-{property}-{colorFamily?}-{colorRole?}-{state?}`).
  - **tools/token-mapping-analyzer/src/migrate-color-role.js**: new migration
    script for multi-field color property decomposition.
  - **tools/token-mapping-analyzer/src/decomposer.js**: `serialize()` gains
    JS-parity color-domain branches matching the Rust serializer.

- Updated dependencies [[`0297e7e`](https://github.com/adobe/spectrum-design-data/commit/0297e7ee77e102a3756302f83ab9236cd142ee58), [`b57ae32`](https://github.com/adobe/spectrum-design-data/commit/b57ae328a91c68f25bbf51fffecb6c5f3bed3e8f)]:
  - @adobe/spectrum-tokens@14.14.0

## 0.0.11

### Patch Changes

- Updated dependencies [[`dcf0832`](https://github.com/adobe/spectrum-design-data/commit/dcf083214d56989817db192801638e3ec20e2306)]:
  - @adobe/spectrum-tokens@14.13.2

## 0.0.10

### Patch Changes

- Updated dependencies [[`eac1cb3`](https://github.com/adobe/spectrum-design-data/commit/eac1cb3121eda40c929e333f1375c75895244882)]:
  - @adobe/spectrum-tokens@14.13.1

## 0.0.9

### Patch Changes

- Updated dependencies [[`2573230`](https://github.com/adobe/spectrum-design-data/commit/2573230d0ccd39214adae0fde0c4a52e997445ca)]:
  - @adobe/spectrum-tokens@14.13.0

## 0.0.8

### Patch Changes

- Updated dependencies [[`60a4835`](https://github.com/adobe/spectrum-design-data/commit/60a4835e245965639a4ac89b41d2884dd63a0bbb)]:
  - @adobe/spectrum-tokens@14.12.0

## 0.0.7

### Patch Changes

- Updated dependencies [[`e9974fb`](https://github.com/adobe/spectrum-design-data/commit/e9974fb7360e849e928b31518b073996b49ecd6b), [`ba06968`](https://github.com/adobe/spectrum-design-data/commit/ba06968226adb268600e0ed1befc9d381e7986b6)]:
  - @adobe/spectrum-tokens@14.11.0

## 0.0.6

### Patch Changes

- Updated dependencies [[`dfddf12`](https://github.com/adobe/spectrum-design-data/commit/dfddf123e92ff31eeb8a71bb6350f189ef39de13)]:
  - @adobe/spectrum-tokens@14.10.0

## 0.0.5

### Patch Changes

- Updated dependencies [[`c133c83`](https://github.com/adobe/spectrum-design-data/commit/c133c832f605e6f09b8bc5db80a6f98b46233b2c)]:
  - @adobe/spectrum-tokens@14.9.0

## 0.0.4

### Patch Changes

- Updated dependencies [[`af22092`](https://github.com/adobe/spectrum-design-data/commit/af22092744c70af7ce0c659e16cdabe31b92b111)]:
  - @adobe/spectrum-tokens@14.8.0

## 0.0.3

### Patch Changes

- Updated dependencies [[`c28702f`](https://github.com/adobe/spectrum-design-data/commit/c28702f19ad408d3dc1461bb059a1c7125f7d32f)]:
  - @adobe/spectrum-tokens@14.7.0

## 0.0.2

### Patch Changes

- Updated dependencies [[`b11942c`](https://github.com/adobe/spectrum-design-data/commit/b11942cf52ec0077cfd53d8cb70ca722dc88c2e0)]:
  - @adobe/spectrum-tokens@14.6.0
