# Proposal 006: Vocabulary Gaps

**Status:** Draft\
**Affects:** \~70 active tokens across multiple source files\
**Spec reference:** design-system-registry vocabulary files

## Problem

After Phases 1-2 registry expansions and Proposals 001-005, approximately 70 tokens still have unmatched segments that need vocabulary additions. These are small, independent additions to existing registries.

## Proposed additions

### Positions registry (`positions.json`)

| Value   | Tokens | Example                                            |
| ------- | ------ | -------------------------------------------------- |
| `inner` | 5      | `color-handle-inner-border-color`                  |
| `outer` | 6      | `color-handle-outer-border-color`                  |
| `below` | 4      | `user-card-minimum-height-title-below-extra-large` |

### Anatomy terms registry (`anatomy-terms.json`)

| Value        | Tokens | Example                                               |
| ------------ | ------ | ----------------------------------------------------- |
| `popover`    | 6      | `double-calendar-popover-minimum-height`              |
| `hero`       | 5      | `collection-card-minimum-height-hero-extra-large`     |
| `pagination` | 1      | `coach-mark-pagination-body-font-size`                |
| `stepper`    | 4      | `number-field-with-stepper-minimum-width-extra-large` |

### Compound properties

These multi-segment property names should be added to the decomposer's compound property list:

| Property      | Tokens | Example                                                                    |
| ------------- | ------ | -------------------------------------------------------------------------- |
| `line-height` | 18     | `line-height-font-size-100` (already listed but matching fails when split) |

### Size/shape special values

For corner-radius tokens that use non-standard size qualifiers:

| Value  | Field | Tokens | Example              |
| ------ | ----- | ------ | -------------------- |
| `full` | shape | 1      | `corner-radius-full` |
| `none` | shape | 1      | `corner-radius-none` |

### Component registry (`components.json`)

| Value     | Tokens | Example                   |
| --------- | ------ | ------------------------- |
| `heading` | 5      | `heading-cjk-font-weight` |

Note: `heading` may be better classified as a typography component (like `body`, `code`, `detail`, `title`) rather than a UI component. This aligns with Proposal 001's typography taxonomy.

### Property vocabulary

| Value        | Tokens | Example                           |
| ------------ | ------ | --------------------------------- |
| `multiplier` | 7      | `button-minimum-width-multiplier` |

`multiplier` appears as a property modifier on minimum-width tokens. It could be treated as a compound property (`minimum-width-multiplier`) or as a standalone property.

## Impact

* \~70 tokens gain proper vocabulary matches
* All additions are to existing registries — no schema changes
* Each addition is independent and can be implemented incrementally
