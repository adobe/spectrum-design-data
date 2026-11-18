<!-- Copyright 2026 Adobe. All rights reserved. -->
<!-- Generated from src/data/taxonomy-crosswalk.json by `pnpm crosswalk:handoff`. Do not edit by hand. -->

# design-data handoff

Studio translates its Registry vocabulary into design-data names with the
rules in `src/data/taxonomy-crosswalk.json`. Each rule below says which
project's change retires it. When every rule is retired, Studio no longer
needs a crosswalk.

Pinned design-data revision: `2e6bc5767d35ad32418b800f98b2162733eda879`.

## design-data changes

An agent may apply these on a separate design-data branch by following the RFC's agent brief.

### XW-015: drop-field

- Studio: `renderingBehavior` field.
- design-data: has no matching field.
- Retire when: design-data adopts a rendering-behavior field, or Studio stops naming tokens with it.
- RFC: [taxonomy-crosswalk.md](taxonomy-crosswalk.md), gap LTAX-023.

### XW-016: drop-field

- Studio: `modeBehavior` field.
- design-data: has no matching field.
- Retire when: design-data adopts a mode-behavior field, or Studio stops naming tokens with it.
- RFC: [taxonomy-crosswalk.md](taxonomy-crosswalk.md), gap LTAX-023.

### XW-018: tier

- Studio: `scaleIndex` allowed on primitive and semantic tokens.
- design-data: `scaleIndex` has no tier metadata.
- Retire when: design-data field schema records allowed tiers, including Semantic for scaleIndex.
- RFC: [token-tiers-and-category-scope.md](token-tiers-and-category-scope.md), gap LTAX-021.

## Studio changes

Fixed in Studio; design-data stays as it is.

### XW-008: rename-key

- Studio: `axis` field.
- design-data: `orientation` field.
- Retire when: Studio's Orientation category key is orientation.
- RFC: [taxonomy-crosswalk.md](taxonomy-crosswalk.md), gap LTAX-023.

### XW-009: rename-term

- Studio: `fontWeight` terms `regular weight`.
- design-data: `weight` terms `regular`.
- Retire when: Studio's weight term value is regular.
- RFC: [taxonomy-crosswalk.md](taxonomy-crosswalk.md), gap LTAX-023.

### XW-010: rename-key

- Studio: `fontWeight` field.
- design-data: `weight` field.
- Retire when: Studio's font weight category key is weight.
- RFC: [taxonomy-crosswalk.md](taxonomy-crosswalk.md), gap LTAX-023.

### XW-011: rename-term

- Studio: `size` terms `extra small`, `small`, `medium`, `large`, `extra large`.
- design-data: `size` terms `xs`, `s`, `m`, `l`, `xl`.
- Retire when: Studio and design-data share one size vocabulary.
- RFC: [taxonomy-crosswalk.md](taxonomy-crosswalk.md), gap LTAX-023.

### XW-012: rename-key (colors)

- Studio: `colorName` field.
- design-data: `colorFamily` field.
- Retire when: No saved Studio data uses the legacy colorName key.
- RFC: [taxonomy-crosswalk.md](taxonomy-crosswalk.md), gap LTAX-023.

### XW-013: rename-key (colors)

- Studio: `contrastValue` field.
- design-data: `scaleIndex` field.
- Retire when: No saved Studio data uses the legacy contrastValue key.
- RFC: [taxonomy-crosswalk.md](taxonomy-crosswalk.md), gap LTAX-023.

### XW-014: value-type

- Studio: `scaleIndex` stored as text.
- design-data: `scaleIndex` is a number.
- Retire when: No Studio name stores scaleIndex as text.
- RFC: [taxonomy-crosswalk.md](taxonomy-crosswalk.md), gap LTAX-023.

## Needs a decision

Review the RFC options with design-data maintainers before anyone changes either project.

### XW-001: add-field (colors)

- Studio: no `property` field.
- design-data: requires `property: color`.
- Retire when: Studio color tokens carry a Property: Color term, or design-data no longer requires property on palette colors.
- RFC: [taxonomy-crosswalk.md](taxonomy-crosswalk.md), gap LTAX-023.

### XW-002: add-field (spacing)

- Studio: no `property` field.
- design-data: requires `property: spacing`.
- Retire when: Studio spacing tokens carry an explicit Property term.
- RFC: [taxonomy-crosswalk.md](taxonomy-crosswalk.md), gap LTAX-023.

### XW-003: add-field (size)

- Studio: no `property` field.
- design-data: requires `property: size`.
- Retire when: Studio size tokens carry an explicit Property term.
- RFC: [taxonomy-crosswalk.md](taxonomy-crosswalk.md), gap LTAX-023.

### XW-004: add-field (radius)

- Studio: no `property` field.
- design-data: requires `property: corner-radius`.
- Retire when: Studio radius tokens carry an explicit Property term.
- RFC: [taxonomy-crosswalk.md](taxonomy-crosswalk.md), gap LTAX-023.

### XW-005: add-field (elevation)

- Studio: no `property` field.
- design-data: requires `property: shadow`.
- Retire when: Studio elevation tokens carry an explicit Property term.
- RFC: [taxonomy-crosswalk.md](taxonomy-crosswalk.md), gap LTAX-023.

### XW-006: add-field (opacity)

- Studio: no `property` field.
- design-data: requires `property: opacity`.
- Retire when: Studio opacity tokens carry an explicit Property term.
- RFC: [taxonomy-crosswalk.md](taxonomy-crosswalk.md), gap LTAX-023.

### XW-007: rename-term

- Studio: `property` terms `corner radius`, `drop shadow`, `line height`, `unitless line height`.
- design-data: `property` terms `corner-radius`, `shadow`, `line-height`, `line-height-multiplier`.
- Retire when: design-data property-terms registry uses the Studio spellings, or Studio adopts the design-data ids.
- RFC: [taxonomy-crosswalk.md](taxonomy-crosswalk.md), gap LTAX-023.

### XW-017: mode-default (colors)

- Studio: explicit `contrast: regular` rows.
- design-data: omits `contrast` on default rows.
- Retire when: design-data palette tokens publish high-contrast rows.
- RFC: [taxonomy-crosswalk.md](taxonomy-crosswalk.md), gap LTAX-023.

## After a change merges

1. Update `designDataRevision` in `src/data/taxonomy-crosswalk.json`.
2. Delete the retired rule, then run `pnpm --dir docs/spectrum-studio check:focused --only taxonomy-crosswalk`.
3. Regenerate this page with `pnpm --dir docs/spectrum-studio crosswalk:handoff`.
