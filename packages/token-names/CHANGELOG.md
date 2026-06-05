# @adobe/token-names

## 0.2.1

### Patch Changes

- Updated dependencies [[`60a4835`](https://github.com/adobe/spectrum-design-data/commit/60a4835e245965639a4ac89b41d2884dd63a0bbb)]:
  - @adobe/spectrum-tokens@14.12.0

## 0.2.0

### Minor Changes

- [#977](https://github.com/adobe/spectrum-design-data/pull/977) [`526d2de`](https://github.com/adobe/spectrum-design-data/commit/526d2de363788c1e916a1ed6426e14600d84fd73) Thanks [@GarthDB](https://github.com/GarthDB)! - Classify line-height multiplier and CJK line-height multiplier tokens.
  - **registry/property-terms.json**: add `line-height-multiplier` term (unitless ratio,
    distinct from absolute px line-height paired with a font-size tier).
  - **sdk/validate/rules/mod.rs**: add `multiplier.json` to typography `DOMAIN_SCHEMAS`
    so the `family` field is permitted on CJK multiplier tokens (SPEC-042).
  - **sdk/validate/rules/spec043.rs**: extend typography domain-required-fields check to
    accept `scaleIndex` and `structure` alongside `family`/`weight`/`style`.
  - **token-names/names/typography.json**: sidecar entries for all 4 tokens.
  - Reduces SPEC-017 warning count by 4.

- [#977](https://github.com/adobe/spectrum-design-data/pull/977) [`526d2de`](https://github.com/adobe/spectrum-design-data/commit/526d2de363788c1e916a1ed6426e14600d84fd73) Thanks [@GarthDB](https://github.com/GarthDB)! - Classify 5 margin multiplier tokens; add margin property-terms and typography structures.
  - **registry/property-terms.json**: add `margin`, `margin-top`, `margin-bottom`.
  - **registry/structures.json**: add `body`, `detail`, `heading` typography-scale structures.
  - **token-names/names/typography.json**: sidecar entries for all 5 tokens using
    `{ structure, property }` shape.
  - Reduces SPEC-017 (`string-name-tech-debt`) warning count by 5.

## 0.1.1

### Patch Changes

- Updated dependencies [[`e9974fb`](https://github.com/adobe/spectrum-design-data/commit/e9974fb7360e849e928b31518b073996b49ecd6b), [`ba06968`](https://github.com/adobe/spectrum-design-data/commit/ba06968226adb268600e0ed1befc9d381e7986b6)]:
  - @adobe/spectrum-tokens@14.11.0

## 0.1.0

### Minor Changes

- Initial extraction of token taxonomy `name` objects from `@adobe/spectrum-tokens`
  into this private sidecar package.
