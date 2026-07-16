# @adobe/spectrum-design-data

## 0.9.0

### Minor Changes

- [#1223](https://github.com/adobe/spectrum-design-data/pull/1223) [`e77c2b3`](https://github.com/adobe/spectrum-design-data/commit/e77c2b3519e75a07815c2905ac0bd0d7bef042c2) Thanks [@GarthDB](https://github.com/GarthDB)! - Add SPEC-048 to validate nested anatomy `contains` references, and populate `contains`
  for the menu, list-view, and table composite items (closes spectrum-design-data-5us).
  - **packages/design-data-spec/rules/rules.yaml**: add SPEC-048 `anatomy-contains-resolves`
    (warning) — a `contains` entry SHOULD match a sibling anatomy part's `name`.
  - **packages/design-data-spec/schemas/{anatomy-part,component}.schema.json**: update the
    `contains` field description now that it has a validation rule.
  - **packages/design-data-spec/spec/anatomy-format.md**: document the flat-vs-`contains`
    authoring convention and the new rule.
  - **sdk/core/src/validate/rules/spec048.rs**: implement the rule; register in `mod.rs`.
  - **packages/design-data/components/menu.json**: declare `menu-item`'s child parts
    (icon, label, description, value, switch, checkbox, thumbnail, drill-in-chevron,
    link-out-icon) and populate `contains`.
  - **packages/design-data/components/list-view.json**: add an `anatomy` array with
    `list-item` and its child parts.
  - **packages/design-data/components/table.json**: populate `row`'s `contains` with the
    existing `row-checkbox` part.

- [#1232](https://github.com/adobe/spectrum-design-data/pull/1232) [`555047a`](https://github.com/adobe/spectrum-design-data/commit/555047a1c54366342a3a1fc550918b14cb3d5820) Thanks [@GarthDB](https://github.com/GarthDB)! - Decompose density-compound `property` slugs into the atomic `density` (and
  co-occurring `size`/`space-between`) fields (closes spectrum-design-data-7zs).
  - **packages/design-data/tokens/layout-component.tokens.json**,
    **layout.tokens.json**: migrate 71 tokens whose `property` baked in
    `compact`/`spacious` (e.g. `height-compact`, `spacing-spacious`) into
    `density` plus the already-registered `size`/`space-between` fields, via
    `tools/token-mapping-analyzer/src/apply.js --field density`. Data-only —
    no Rust or tooling changes required; the density field, registry, and
    `naming.rs` roundtrip already existed.
  - **packages/design-data/tokens/layout.tokens.json**: decomposing the
    `accessory`/`base`/`group`/`list`/`banner` qualifier into the `structure`
    field would have silently changed 52 published keys in
    `packages/tokens/src/layout.json` (`structure` is excluded from legacy-key
    reconstruction). Pinned `name.legacyKey` on those 52 tokens to their
    original published keys so the decomposition stays publish-invisible.

- [#1234](https://github.com/adobe/spectrum-design-data/pull/1234) [`84c3f09`](https://github.com/adobe/spectrum-design-data/commit/84c3f09d7b48744c24d45e63ecba7f07cc94e5fd) Thanks [@GarthDB](https://github.com/GarthDB)! - Decompose drop-shadow-property and context-modifier residual tokens per
  proposal 004 (closes spectrum-design-data-dsi.1).
  - **packages/design-data/registry/structures.json**: add the `drop-shadow`
    structure entry.
  - **packages/design-data/registry/variants.json**: register `ambient`,
    `dragged`, `elevated`, `pasteboard`, `elevated-key`, `dragged-key` context
    variants.
  - **packages/design-data/registry/property-terms.json**: add `x`/`y`
    property terms for drop-shadow offsets.
  - **tools/token-mapping-analyzer/src/decomposer.js**: remove `drop-shadow`
    from `COMPOUND_PROPERTIES` and drop the now-redundant `context-modifier`/
    `drop-shadow-property` `KNOWN_GAP_TERMS` entries.
  - **packages/design-data/tokens/{color-aliases,color-component,layout,
    layout-component}.tokens.json**: migrate 70 tokens into `structure`/
    `variant`/`property` fields. `structure` is excluded from legacy-key
    reconstruction in `naming.rs`, so `name.legacyKey` is pinned on every
    touched token to keep the decomposition publish-invisible.

- [#1240](https://github.com/adobe/spectrum-design-data/pull/1240) [`14d3b48`](https://github.com/adobe/spectrum-design-data/commit/14d3b48b7efd80f06f42587b05b230fa2f353a6e) Thanks [@GarthDB](https://github.com/GarthDB)! - Register `has-stepper` qualifier + `default-width` property and decompose the
  number-field stepper and field default-width tokens (closes spectrum-design-data-dsi.2.1).
  - **packages/design-data/registry/{qualifiers,property-terms}.json**: add
    `has-stepper` qualifier and `default-width` property term.
  - **packages/design-data/tokens/layout-component.tokens.json**: decompose 4
    `number-field-with-stepper-minimum-width-*` tokens to `qualifier: has-stepper`
    - `property: minimum-width`, pinning `name.legacyKey`; decompose
      `field-default-width-*` to `{component: field, property: default-width, size}`
      (roundtrips clean, no legacyKey needed).
  - **tools/token-mapping-analyzer/src/decomposer.js**: register the `with`+
    `stepper` phrase as the `has-stepper` qualifier so the published key still
    decomposes cleanly.
  - **sdk/core/src/registry_data.rs**: regenerated from the registry changes.

- [#1241](https://github.com/adobe/spectrum-design-data/pull/1241) [`519c444`](https://github.com/adobe/spectrum-design-data/commit/519c4443474e01f807f383fc482cabe30fa1a456) Thanks [@GarthDB](https://github.com/GarthDB)! - Register a `role` name-object field and `full`/`none` shape values, and decompose the
  11 corner-radius special-value tokens (closes spectrum-design-data-dsi.2.3).
  - **packages/design-data/fields/role.json**, **registry/roles.json**: new `role`
    name-object field (`container`, `control`) distinguishing an object's position in a
    nesting relationship from its `size` — the 9 `corner-radius-{small,medium}-size-*`
    tokens are two overlapping radius scales (container vs. nested control rounding),
    not one scale modulated by size.
  - **registry/shapes.json**: add `full`/`none` shape values for `corner-radius-full`
    and `corner-radius-none`.
  - **packages/design-data/tokens/layout.tokens.json**: decompose all 11 tokens to
    `{property: corner-radius, shape | role, size}`, pinning `name.legacyKey` on each.
  - **packages/design-data-spec/schemas/token.schema.json**, **spec/{taxonomy,token-format}.md**:
    document the new `role` field.
  - **tools/token-mapping-analyzer/src/decomposer.js**: add `role` to the fallback
    serialization order.
  - **sdk/core/src/registry_data.rs**: regenerated from the registry changes.

- [#1236](https://github.com/adobe/spectrum-design-data/pull/1236) [`9f5401f`](https://github.com/adobe/spectrum-design-data/commit/9f5401f1281932e7efff0bcbdbc50f69d2f3fea5) Thanks [@GarthDB](https://github.com/GarthDB)! - Register color/layout/qualifier vocab and migrate affected tokens per
  proposal 006 (closes spectrum-design-data-dsi.2.5).
  - **packages/design-data/fields/qualifier.json**, **registry/qualifiers.json**:
    new `qualifier` name-object field (`stacked`, `multiline`, `precision`,
    `collapsed`, `expanded`, `drag`, `highlight`).
  - **registry/{positions,anatomy-terms,sizes,property-terms,shapes,
    structures,color-roles,components}.json**: register `inner`/`outer`/
    `below`, `pagination`/`slash`/`square`/`well`, `xxxxl`, `minimum`/
    `minimum-padding-vertical`/`component-size-minimum-perspective`,
    `rectangle`, `drop-target`, `color-control`, and 6 semantic color roles.
  - **tools/token-mapping-analyzer/src/decomposer.js**: register two compound
    property terms; drop `inner`/`outer` from `KNOWN_GAP_TERMS`.
  - **packages/design-data-spec/schemas/token.schema.json**: list `qualifier`
    explicitly in `$defs.nameObject.properties`.
  - **packages/design-data/tokens/{color-aliases,semantic-color-palette,
    color-component,layout-component,layout,typography}.tokens.json**: migrate
    affected tokens into structured fields, pinning `name.legacyKey` on each.

- [#1239](https://github.com/adobe/spectrum-design-data/pull/1239) [`204d1ad`](https://github.com/adobe/spectrum-design-data/commit/204d1ad43300d516d75e384509c33b480342b217) Thanks [@GarthDB](https://github.com/GarthDB)! - Fix compound-property matching for line-height/component-size tokens and
  register the missing component-size vocabulary (closes
  spectrum-design-data-dsi.2.6).
  - **tools/token-mapping-analyzer/src/decomposer.js**: register
    `line-height-font-size`, `component-height`, `component-size-difference`,
    `component-size-maximum-perspective`, and `component-size-width-ratio` as
    compound properties, fixing 26 tokens previously flagged as unmatched
    vocabulary gaps.
  - **registry/property-terms.json**: register `component-size-maximum-perspective`,
    `component-size-difference`, and `component-size-width-ratio` (parity with
    the existing `component-size-minimum-perspective` entry); these calculate
    the CSS perspective transform for S2 components' pressed/"down"-state
    scale-down effect.

- [#1242](https://github.com/adobe/spectrum-design-data/pull/1242) [`46449db`](https://github.com/adobe/spectrum-design-data/commit/46449dbcbdbeffb256fb857d3f878b8b376ccb91) Thanks [@GarthDB](https://github.com/GarthDB)! - Promote `weight`/`style` to Phase D decomposition for 8 typography tokens
  whose qualifier was fused into `property` (closes spectrum-design-data-dsi.2.7).
  - **packages/design-data/fields/weight.json**, **style.json**: drop
    `excludeFromLegacyKey` (mirrors `size`).
  - **packages/design-data/tokens/typography.tokens.json**,
    **packages/token-names/names/typography.json**: strip the qualifier
    from `property` and pin `legacyKey` on the 8 affected tokens.
  - **sdk/core/src/registry_data.rs**: regenerated field catalog
    (`sdk:codegen`). `packages/tokens/src/typography.json` diff is empty.
  - **sdk/core/src/naming.rs**: update design-intent comment and tests.
  - **tools/token-mapping-analyzer/src/decomposer.js**: fix a
    field-priority ambiguity that misassigned `black`/`medium` to
    `variant`/`size` instead of `weight` once `property` is font-weight/style.

- [#1226](https://github.com/adobe/spectrum-design-data/pull/1226) [`d7976e0`](https://github.com/adobe/spectrum-design-data/commit/d7976e05dc1d70b8330ff716f35d74f6b2f8fcbb) Thanks [@GarthDB](https://github.com/GarthDB)! - Add a typography `emphasis` field and decompose overloaded typography `property`
  values into `family`/`emphasis` (closes spectrum-design-data-pur).
  - **packages/design-data/fields/emphasis.json**: new field for typography emphasis
    (`strong`, `light`, `heavy`, `emphasized`, `non-emphasized`, and compounds).
  - **packages/design-data/registry/typography-emphasis.json**: new registry backing
    the `emphasis` field.
  - **packages/design-data/fields/family.json**: `excludeFromLegacyKey` flipped to
    `false` so `family` now participates in legacy key reconstruction.
  - **packages/design-data/registry/property-terms.json**: register atomic typography
    properties (margin/margin-multiplier variants, `text-transform`).
  - **sdk/core/src/naming.rs**: serialize `family`/`emphasis` into the legacy key.
  - **tools/token-mapping-analyzer/src/decomposer.js**: match `family`/`emphasis`
    registry terms (including compound runs) instead of parking them as gaps.
  - **packages/design-data/tokens/typography.tokens.json**,
    **layout-component.tokens.json**: migrate 197 tokens to the new `family`/`emphasis`
    fields via `tools/token-mapping-analyzer/src/apply.js`.

- [#1231](https://github.com/adobe/spectrum-design-data/pull/1231) [`62e74d7`](https://github.com/adobe/spectrum-design-data/commit/62e74d7f4d59bcc3e63fbc5b7c594f65ef78b024) Thanks [@GarthDB](https://github.com/GarthDB)! - Register 4 cross-cutting anatomy sub-parts as first-class components (part of
  spectrum-design-data-46d), clearing the remaining 71 SPEC-009 warnings. No token data
  changes — these values are reused across multiple unrelated components with no single
  accurate parent, so each is registered directly rather than routed via `anatomy`.
  - **packages/design-data/registry/components.json**: add `bar-panel` (6 tokens),
    `field` (8), `in-field-button` (25), `stack-item` (32).

- [#1229](https://github.com/adobe/spectrum-design-data/pull/1229) [`b4f79db`](https://github.com/adobe/spectrum-design-data/commit/b4f79db78d8b889b46b98d0fc26d424c1d4fe5fe) Thanks [@GarthDB](https://github.com/GarthDB)! - Route tab-item, menu-item, and in-field-stepper anatomy sub-parts to their real parent
  component, clearing 123 SPEC-009 warnings (part of spectrum-design-data-uep; remaining
  71 tokens tracked separately pending a taxonomy ruling).
  - **packages/design-data/registry/anatomy-terms.json**: add `in-field-stepper`; mark
    `tab-item`/`menu-item` `usedIn: ["tokens"]`.
  - **packages/design-data/tokens/{layout,color}-component.tokens.json**: 123 tokens gain
    `component` (real parent: `tabs`, `menu`, `number-field`) + `anatomy` (sub-part) + a
    pinned `legacyKey` so the published key is unchanged.
  - **packages/tokens/src/{layout,color}-component.json**: regenerated; only the flat
    `component` attribute value changed (67 tokens), no key renames.
  - **packages/tokens/naming-exceptions.json** / **validation-snapshot.json**: track the
    49 tokens whose pinned legacy key no longer roundtrips through canonical name
    generation (category `anatomy-decomposition`).
  - **packages/tokens/test/checkComponentProps.js**: recognize anatomy sub-part prefixes
    (via the anatomy registry) as valid even when they don't match `component`.
  - **sdk/core/src/migrate.rs**: `thin_name_val` now pins `legacyKey` when a corrected
    `component` no longer reproduces the original key, fixing legacy→cascade roundtrip.

- [#1231](https://github.com/adobe/spectrum-design-data/pull/1231) [`62e74d7`](https://github.com/adobe/spectrum-design-data/commit/62e74d7f4d59bcc3e63fbc5b7c594f65ef78b024) Thanks [@GarthDB](https://github.com/GarthDB)! - Add a first-class `icon` name field (part of spectrum-design-data-p89), the Rust
  prerequisite for re-keying icon tokens off `component` to clear ~315 SPEC-009 warnings.
  No token data changes yet — `icon` is not used by any token in this change.
  - **packages/design-data/fields/icon.json**: new field, registry-backed, advisory.
  - **packages/design-data/registry/icon-terms.json**: 12 icon ids (`icon`, `ui`,
    `checkmark`, `chevron`, `dash`, `arrow`, `cross`, `add`, `link-out`, `drag-handle`,
    `asterisk`, `gripper`), with `tokenName` long-form expansions for legacy keys.
  - **sdk/core/src/naming.rs**: `extract_legacy_key` treats `icon` as an alternate,
    mutually-exclusive owner to `component` — both in the color-domain branch
    (`{icon}-{property}-{colorFamily?}-{colorRole?}-{state?}`) and a new non-color branch
    (`{icon-tokenName}-{property}-{state?}`) for layout/dimension icon tokens.

- [#1231](https://github.com/adobe/spectrum-design-data/pull/1231) [`62e74d7`](https://github.com/adobe/spectrum-design-data/commit/62e74d7f4d59bcc3e63fbc5b7c594f65ef78b024) Thanks [@GarthDB](https://github.com/GarthDB)! - Re-key icon tokens off the new `icon` name field (part of spectrum-design-data-aui),
  clearing ~315 SPEC-009 warnings. Published legacy keys are unchanged.
  - **packages/design-data/registry/icon-terms.json**: new registry, 12 icon ids (`icon`,
    `ui`, `checkmark`, `chevron`, `dash`, `arrow`, `cross`, `add`, `link-out`,
    `drag-handle`, `asterisk`, `gripper`), with `tokenName` long-form expansions.
  - **packages/design-data/tokens/icons.tokens.json**: 191 tokens re-keyed
    `component:'icon'` → `icon:'icon'`.
  - **packages/design-data/tokens/layout-component.tokens.json**: 124 tokens re-keyed
    `component:'X-icon'` → `icon:'X'` across 11 distinct values.
  - **sdk/core/src/naming.rs**: `extract_legacy_key` gains an icon (non-color) branch and
    a thin-format guard so re-keyed tokens still resolve to their original legacy key.
  - **sdk/core/src/legacy.rs**: legacy-metadata hoisting (`resolve_owner_component`) now
    falls back to the icon field so published `component` metadata is unaffected.
  - **packages/tokens/src/icons.json**, **layout-component.json**: regenerated, byte-identical
    to their pre-change state.

- [#1238](https://github.com/adobe/spectrum-design-data/pull/1238) [`8d8bf09`](https://github.com/adobe/spectrum-design-data/commit/8d8bf0904e716ed86b10f890251980f73f0215c7) Thanks [@GarthDB](https://github.com/GarthDB)! - Decompose the 16 remaining fused-property typography tokens onto proper
  `component`/`property`/`family`/`script`/`emphasis`/`size` fields (closes
  spectrum-design-data-1lf).
  - **packages/design-data/tokens/typography.tokens.json**:
    `body-cjk-size-{l,m,s,xl,xs,xxl,xxs,xxxl}`, `body-size-xxs`, `heading-cjk-font-weight`,
    `heading-cjk-size-xxxxl`, `heading-size-xxxxl` get `component`/`property`/`script`/`size`
    fields, retaining `legacyKey` to pin their published fused name.
    `heading-{sans-serif,serif}[-emphasized]-font-weight` get `component`/`property`/`family`/
    `emphasis` fields; their reconstructed names already match the fused originals, so no
    `legacyKey` pin is needed.
  - **packages/tokens/src/typography.json**: regenerated legacy output now carries a
    `component` attribute on these 16 tokens (previously absent) — an accepted, additive
    publish diff.

- [#1237](https://github.com/adobe/spectrum-design-data/pull/1237) [`02cc09f`](https://github.com/adobe/spectrum-design-data/commit/02cc09fc2a40c8b93ff759dec5573d360815c707) Thanks [@GarthDB](https://github.com/GarthDB)! - Reinstate the `script` field for CJK typography tokens and decompose all
  font-size tokens to `property:"font-size"` + `size` (closes
  spectrum-design-data-wix, amends Proposal 001, see spectrum-design-data-526).
  - **packages/design-data/fields/script.json**, **registry/scripts.json**:
    new `script` field/registry — `cjk` writing-system variant, orthogonal
    to `family` (typeface classification). 22 sibling fields renumbered
    (`serialization.position` +1) to make room.
  - **packages/design-data/registry/typography-families.json**: drop `cjk`.
  - **packages/design-data/tokens/typography.tokens.json**: rename
    `family:"cjk"` → `script:"cjk"` (~63 tokens); decompose fused
    `code-cjk-*` tokens; decompose most font-size tokens to
    `property:"font-size"` + `size` + `script`?, `legacyKey` pinned
    (~47 tokens). 12 tokens kept fused-`property` (legacy escape hatch) to
    avoid adding a `component` attribute to `@adobe/spectrum-tokens`.
    `packages/tokens/src/typography.json` diff against `main` is empty.
  - **sdk/core/src/validate/rules/spec043.rs**: accept `script` as a
    typography domain-identifying field alongside `family`.

### Patch Changes

- [#1235](https://github.com/adobe/spectrum-design-data/pull/1235) [`b97a7ef`](https://github.com/adobe/spectrum-design-data/commit/b97a7ef5a205969f83eeca421e75983b8b214a72) Thanks [@GarthDB](https://github.com/GarthDB)! - Pin `name.legacyKey` on ordering-mismatch residual tokens to keep published
  keys stable (closes spectrum-design-data-dsi.3).
  - **packages/design-data/tokens/{color-aliases,color-component,icons,layout,
    layout-component,semantic-color-palette,typography}.tokens.json**: 224
    tokens decompose cleanly but their published legacy key's field order
    (e.g. density-before-size, `key-focus` state ordering) doesn't match
    the canonical serialize order. `name.legacyKey` is pinned to each
    token's existing published key via the same escape hatch used by
    dsi.1, keeping the change publish-invisible.

- [#1225](https://github.com/adobe/spectrum-design-data/pull/1225) [`96ec195`](https://github.com/adobe/spectrum-design-data/commit/96ec1957d0e7ad064c5d25b5b876c2fd3d61c450) Thanks [@GarthDB](https://github.com/GarthDB)! - Fix decomposition of `icon.color-inverse`, `icon.color-inverse-background`, and
  `color-wheel.color-area-margin` name objects (closes spectrum-design-data-2mh). No
  behavior change for `@adobe/spectrum-tokens` consumers — the legacy flat keys are pinned
  via the new `legacyKey` escape hatch.
  - **packages/design-data/tokens/icons.tokens.json**: decompose the two inverse icon
    color tokens into `{component, property, variant: "inverse", legacyKey}`.
  - **packages/design-data/tokens/layout-component.tokens.json**: decompose
    `color-wheel.color-area-margin` into `{component: "color-wheel", property: "margin",
anatomy: "color-area"}`.
  - **sdk/core/src/naming.rs**: `NameObject` gains a `variant` field; `parse_legacy_name`
    and `generate_legacy_name` recognize context-category variant words (`inverse`,
    `static`, `over-background`) as a leading key segment. `extract_legacy_key` honors a new
    `name.legacyKey` override, checked before reconstruction.
  - **sdk/core/src/migrate.rs**: `build_flat`'s no-context path now attempts decomposition
    via `naming::roundtrips` before falling back to a thin name, matching `resolve_name`.
  - **packages/design-data-spec/schemas/token.schema.json**: document the `legacyKey`
    escape-hatch field on the name object.

- [#1228](https://github.com/adobe/spectrum-design-data/pull/1228) [`ecd5f38`](https://github.com/adobe/spectrum-design-data/commit/ecd5f38dd679730bf1f2b9b3980cd5032ac4a9f1) Thanks [@GarthDB](https://github.com/GarthDB)! - Sync `components.json` with existing component definitions and decompose a misclassified
  drop-shadow state (part of SPEC-009 triage epic, closes spectrum-design-data-dm2.3).
  - **packages/design-data/registry/components.json**: add 32 missing component ids — 20 with
    existing `components/*.json` definitions (`heading`, `tree-view`, `body`, …) and 12 without a
    dedicated file yet (`date-field`, `floating-action-button`, `card`, the card variants
    `collection-card`/`user-card`/`card-horizontal`, …).
  - **packages/design-data/tokens/color-aliases.tokens.json**: decompose the drop-shadow
    `emphasized` token from `{property: "drop-shadow", state: "emphasized"}` to
    `{property: "drop-shadow", variant: "emphasized"}` — emphasis isn't an interactive state.
    A `legacyKey` pins the published flat name so `@adobe/spectrum-tokens` consumers see no change.
  - **packages/design-data/registry/variants.json**: add `emphasized` (category `emphasis`).

## 0.8.0

### Minor Changes

- [#1216](https://github.com/adobe/spectrum-design-data/pull/1216) [`c923bd2`](https://github.com/adobe/spectrum-design-data/commit/c923bd27bba0ee484ba251d9baf6a63c5cfc68d0) Thanks [@GarthDB](https://github.com/GarthDB)! - Phase D: register `space-between` property term and paired `from`/`to` endpoint fields.
  - **packages/design-data/registry/property-terms.json**: added `space-between` term for
    {a}-to-{b} spacing tokens.
  - **packages/design-data/fields/from.json, to.json**: new paired semantic fields modeling a
    space-between token's two endpoints; excluded from legacy-key catalog serialization pending
    a dedicated `naming.rs` branch (04c.2).
  - **packages/design-data-spec/schemas/token.schema.json**: declared `from`/`to` on the
    nameObject definition.
  - **packages/design-data-spec/rules/rules.yaml**: added SPEC-047 validating `from`/`to` values
    against positions, generic anatomy terms, or the referenced component's declared anatomy.

- [#1219](https://github.com/adobe/spectrum-design-data/pull/1219) [`f9585da`](https://github.com/adobe/spectrum-design-data/commit/f9585daf01d5dab651793ce6f1d816f320623204) Thanks [@GarthDB](https://github.com/GarthDB)! - Register gap-endpoint vocabulary for space-between decomposition (closes 04c.3).
  - **packages/design-data/registry/positions.json**: Add edge-family positions
    `edge`, `start-edge`, `end-edge`, `bottom-edge`.
  - **packages/design-data/registry/anatomy-terms.json**: Add generic anatomy
    terms `content`, `visual`, `action`, `navigation`, `disclosure`,
    `content-area`, `disclosure-indicator`, `disclosure-icon`, `drag-handle`,
    `field-button`.
  - **packages/design-data/components/\*.json**: Add component-scoped `anatomy[]`
    parts for 14 components (action-bar, tree-view, tag, alert-banner,
    number-field, slider, steplist, side-navigation, breadcrumbs, field-label,
    menu, status-light, table, coach-mark).
  - **sdk/core/src/validate/rules/spec047.rs**: Retry unresolved endpoints by
    stripping a registered position affix and validating the remainder as
    anatomy, covering fused endpoints like `content-area-bottom`/`item-top`.
  - **sdk/core/src/registry_data.rs**: Regenerated via `sdk:codegen`.

- [#1221](https://github.com/adobe/spectrum-design-data/pull/1221) [`09b3970`](https://github.com/adobe/spectrum-design-data/commit/09b39705547954ba44dabe41c70c5b76a6f8b43e) Thanks [@GarthDB](https://github.com/GarthDB)! - Apply space-between gap-endpoint decomposition to layout-component tokens (closes 04c.6).
  - **packages/design-data/tokens/layout-component.tokens.json**: Decompose 115
    `{a}-to-{b}` compound property values into structured `property: "space-between"`
    plus `from`/`to` endpoint fields; legacy keys unchanged (verified by roundtrip).

- [#1222](https://github.com/adobe/spectrum-design-data/pull/1222) [`82bb4c4`](https://github.com/adobe/spectrum-design-data/commit/82bb4c46f67a0b4a1a74fb18514d53925f85a3ca) Thanks [@GarthDB](https://github.com/GarthDB)! - Migrate the final 19 space-between gap endpoints; defer SPEC-047's declared-anatomy
  check when no component catalog is loaded (closes 04c.8).
  - **sdk/core/src/validate/rules/spec047.rs**: defer (don't error) on a component-scoped
    gap endpoint when `validate-dataset` runs with no component catalog loaded, since its
    declared-anatomy-part arm can't be evaluated; mirrors SPEC-018's empty-catalog guard.
  - **packages/design-data/tokens/layout-component.tokens.json**: decompose the last 19
    `{a}-to-{b}` tokens (menu, tree-view, status-light, alert-banner, etc.) into structured
    `from`/`to` fields — all 134 eligible gap tokens are now migrated.

- [#1215](https://github.com/adobe/spectrum-design-data/pull/1215) [`212ec82`](https://github.com/adobe/spectrum-design-data/commit/212ec825e25c5ce7ae7342072522423b3ce07483) Thanks [@GarthDB](https://github.com/GarthDB)! - Phase D: decompose compound size-\* property values into structured size field for 24 tokens.
  - **packages/design-data/tokens/layout-component.tokens.json**: extracted size field from
    compound properties (e.g. `handle-size-large` → `property: size` + `size: l`);
    legacy keys unchanged.

- [#1203](https://github.com/adobe/spectrum-design-data/pull/1203) [`0297e7e`](https://github.com/adobe/spectrum-design-data/commit/0297e7ee77e102a3756302f83ab9236cd142ee58) Thanks [@GarthDB](https://github.com/GarthDB)! - Phase D: taxonomy field serializer + size decomposition pilot.
  - **sdk/core/src/naming.rs**: Generalize `extract_legacy_key` to walk the
    field catalog in `serialization.position` order, expanding registry ids to
    their `tokenName` long-forms (e.g. `size:"xl"` → `"extra-large"`). Excludes
    mode-set, color-domain, and legacy metadata annotation fields. Output is
    byte-identical for all current tokens (all gates pass).
  - **sdk/core/src/registry.rs**: Add `token_name(field, id) -> Option<&str>`
    to `RegistryData`, backed by the embedded registry JSON.
  - **sdk/scripts/generate-registry-data.js** + **registry_data.rs**: Generate
    `build_token_name_map()` alongside the existing `build_registry_map()`.
  - **packages/design-data/tokens/layout-component.tokens.json**,
    **layout.tokens.json**: 68 layout tokens decomposed — `size` extracted from
    `property` into the structured field (HIGH-confidence, all roundtrip-verified).
  - **tools/token-mapping-analyzer/test/apply.test.js**: Verify roundtrip
    invariant on already-migrated tokens.

- [#1214](https://github.com/adobe/spectrum-design-data/pull/1214) [`5e7db36`](https://github.com/adobe/spectrum-design-data/commit/5e7db3605547e680f777fc345f0005d7e3637a7e) Thanks [@GarthDB](https://github.com/GarthDB)! - Register color-handle, color-loupe components and color-area anatomy term.
  - **packages/design-data/registry/components.json**: Add `color-handle` and
    `color-loupe` entries backing existing refs in `color-component.tokens.json`.
  - **packages/design-data/registry/anatomy-terms.json**: Add `color-area`
    anatomy term for the embedded gradient surface in color-wheel and relatives.
  - **sdk/core/src/registry_data.rs**: Regenerated via `sdk:codegen` to include
    all three new entries.

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

### Patch Changes

- [#1218](https://github.com/adobe/spectrum-design-data/pull/1218) [`e38c4e1`](https://github.com/adobe/spectrum-design-data/commit/e38c4e19f97aa590991b0c1ac40c2e1b24620cde) Thanks [@GarthDB](https://github.com/GarthDB)! - naming.rs: serialize `space-between` endpoint fields in `extract_legacy_key` (04c.2).
  - **sdk/core/src/naming.rs**: added an explicit branch for `property: "space-between"`
    tokens that reconstructs the legacy `{from}-to-{to}` connective from the paired `from`/`to`
    fields, mirroring the existing color-domain branches. Falls through to the generic walk
    when either endpoint is missing.

- [#1201](https://github.com/adobe/spectrum-design-data/pull/1201) [`11c4d5a`](https://github.com/adobe/spectrum-design-data/commit/11c4d5a937064ba24f69437c59ab5ad1bfbe5f8c) Thanks [@GarthDB](https://github.com/GarthDB)! - feat(authoring): Phase C — create/edit authoring for non-token data categories.
  - **tools/design-data-agent-mcp**: adds `data_create` and `data_edit` MCP tools for
    components, fields, registry, mode-sets, and guidelines; delegate to the CLI.
  - **packages/design-data/AUTHORING.md**: documents the new `design-data data create|edit`
    CLI commands and the `data_create`/`data_edit` MCP tools.

- [#1204](https://github.com/adobe/spectrum-design-data/pull/1204) [`4218d6a`](https://github.com/adobe/spectrum-design-data/commit/4218d6a1694db70cb37f656cd0250e306e48912d) Thanks [@GarthDB](https://github.com/GarthDB)! - Replace opt-out SKIP const in naming.rs with opt-in `excludeFromLegacyKey`
  catalog flag (ye1.9).
  - **sdk/core/src/registry.rs**: Added `exclude_from_legacy_key: bool`
    to `FieldCatalogEntry`; absent in field JSON defaults to false (opt-in).
  - **sdk/scripts/generate-registry-data.js**: Emits the new field from
    `d.excludeFromLegacyKey` in each generated literal.
  - **sdk/core/src/naming.rs**: Deleted hardcoded `SKIP` const; walk now
    skips entries where `exclude_from_legacy_key` is true.
  - **packages/design-data/fields/**: Added `"excludeFromLegacyKey": true`
    to the 9 formerly-SKIPped fields (colorScheme, scale, contrast,
    colorFamily, scaleIndex, weight, family, style, structure).
  - **packages/design-data-spec/schemas/field.schema.json**: Added
    `excludeFromLegacyKey` boolean to allow the flag in field declarations.

## 0.7.1

### Patch Changes

- [#1186](https://github.com/adobe/spectrum-design-data/pull/1186) [`dcf0832`](https://github.com/adobe/spectrum-design-data/commit/dcf083214d56989817db192801638e3ec20e2306) Thanks [@mrcjhicks](https://github.com/mrcjhicks)! - Sync layout token values from Spectrum Tokens Studio (#1186).
  - **tokens/layout.tokens.json**: revert small/extra-small accessory-gap and
    base-padding-vertical to original S2 values (accessory-gap-extra-small 4→3px,
    accessory-gap-small 5→4px, base-padding-vertical-extra-small 4→3px,
    base-padding-vertical-small 5→4px).

## 0.7.0

### Minor Changes

- [#1157](https://github.com/adobe/spectrum-design-data/pull/1157) [`a23dafb`](https://github.com/adobe/spectrum-design-data/commit/a23dafb1805dac8203baba669c61085133160454) Thanks [@GarthDB](https://github.com/GarthDB)! - Add `guidelines/` — structured guideline documents for non-component S2 pages.
  - **guidelines/\*.json**: generated from `docs/s2-docs/{designing,fundamentals,developing,support}/`;
    each file validates against `guideline.schema.json` with `documentBlocks` body.
  - **guidelines/manifest.json**: catalog for MCP discovery (`slug`, `title`, `category`,
    `status`, `sourceUrl`, `file` per entry).
  - **package.json**: adds `"./guidelines/*"` export subpath and `"guidelines/"` to `files`.

- [#1157](https://github.com/adobe/spectrum-design-data/pull/1157) [`a23dafb`](https://github.com/adobe/spectrum-design-data/commit/a23dafb1805dac8203baba669c61085133160454) Thanks [@GarthDB](https://github.com/GarthDB)! - Populate documentBlocks on all 69 component JSON files from s2-docs source.
  - **packages/design-data/components/\*.json**: Add `documentBlocks` to all 69
    components — typed blocks (purpose, guideline, do-dont) from docs/s2-docs/. All
    69 have a leading `purpose` block seeded from Overview or the component description.
  - **docs/s2-docs/components/inputs/color-handle.md**: Replace stub with full
    scraped content (Overview, Behaviors, Usage guidelines, Component options).
  - **tools/s2-docs-to-document-blocks**: Generator — near-duplicate dedup via
    `normalizeForDedup()` collapses scrape artefacts differing by smart quotes or
    punctuation; seeds `purpose` blocks from component `description` when no Overview
    section is scraped; formats output with Prettier for clean diffs.

## 0.6.0

### Minor Changes

- [`e7fbcb0`](https://github.com/adobe/spectrum-design-data/commit/e7fbcb00b6afe1c1a272ed72b7ed22c08fe8e978) Thanks [@GarthDB](https://github.com/GarthDB)! - Add `guidelines/` — structured guideline documents for non-component S2 pages.
  - **guidelines/\*.json**: generated from `docs/s2-docs/{designing,fundamentals,developing,support}/`;
    each file validates against `guideline.schema.json` with `documentBlocks` body.
  - **guidelines/manifest.json**: catalog for MCP discovery (`slug`, `title`, `category`,
    `status`, `sourceUrl`, `file` per entry).
  - **package.json**: adds `"./guidelines/*"` export subpath and `"guidelines/"` to `files`.

- [`e7fbcb0`](https://github.com/adobe/spectrum-design-data/commit/e7fbcb00b6afe1c1a272ed72b7ed22c08fe8e978) Thanks [@GarthDB](https://github.com/GarthDB)! - Populate documentBlocks on all 69 component JSON files from s2-docs source.
  - **packages/design-data/components/\*.json**: Add `documentBlocks` to all 69
    components — typed blocks (purpose, guideline, do-dont) from docs/s2-docs/. All
    69 have a leading `purpose` block seeded from Overview or the component description.
  - **docs/s2-docs/components/inputs/color-handle.md**: Replace stub with full
    scraped content (Overview, Behaviors, Usage guidelines, Component options).
  - **tools/s2-docs-to-document-blocks**: Generator — near-duplicate dedup via
    `normalizeForDedup()` collapses scrape artefacts differing by smart quotes or
    punctuation; seeds `purpose` blocks from component `description` when no Overview
    section is scraped; formats output with Prettier for clean diffs.

## 0.4.0

### Minor Changes

- [#1150](https://github.com/adobe/spectrum-design-data/pull/1150) [`f84bce2`](https://github.com/adobe/spectrum-design-data/commit/f84bce215d20f1bc8b109f3f23b15bfab6b239d0) Thanks [@mrcjhicks](https://github.com/mrcjhicks)! - Mirror PR #1150 changes into the cascade source of truth.
  - **tokens/layout.tokens.json**: Convert 5 `base-padding-horizontal-*` tokens
    from flat dimension to desktop/mobile scale-sets with updated desktop values.
  - **tokens/layout.tokens.json**: Add 5 `group-gap-*-spacious` alias tokens.
  - **tokens/layout-component.tokens.json**: Add 4 `form-item-gap-*` alias tokens.
  - **tokens/layout.tokens.json**, **tokens/layout-component.tokens.json**:
    Update `replaced_by` refs to new scale-set member UUIDs.

## 0.3.0

### Minor Changes

- [#1126](https://github.com/adobe/spectrum-design-data/pull/1126) [`60a4835`](https://github.com/adobe/spectrum-design-data/commit/60a4835e245965639a4ac89b41d2884dd63a0bbb) Thanks [@GarthDB](https://github.com/GarthDB)! - Add SPEC-043 domain-identifying fields to all 72 typography token name objects
  (closes #1125).
  - **tokens/typography.tokens.json**: add `weight` (font-weight × 6, composite × 15),
    `style` (× 2), `family` (× 4), `scaleIndex` (font-size × 36), `structure` (margin
    multipliers × 5), and `scaleIndex`+`family:cjk` (line-height × 4) — zero SPEC-043
    advisory warnings for this file.
  - **registry/scale-values.json**: add `25` entry for `font-size-25` (`scaleIndex: 25`).
  - **spec/taxonomy.md**: add `structure` row to the typography field table; broaden
    NORMATIVE SHOULD clause to all five fields accepted by SPEC-043.

## 0.2.0

### Minor Changes

- [#1110](https://github.com/adobe/spectrum-design-data/pull/1110) [`073c22a`](https://github.com/adobe/spectrum-design-data/commit/073c22a75c27fbb44eb57eb6cb7311e294066d76) Thanks [@GarthDB](https://github.com/GarthDB)! - Migrate cascade token `$ref` aliases from name strings to UUIDs.
  - **packages/design-data/tokens/\*.tokens.json**: alias `$ref` now holds the
    target's UUID (rename-proof, cascade canonical). Legacy `packages/tokens/src`
    is unchanged — roundtrip-verify stays clean.
  - **sdk/core/src/graph.rs**: add `resolve_alias_key` (UUID-first + slug + legacy-
    name-index fallback); fix cycle-guard to key on resolved graph key; index
    `set_uuid` so set-targeted aliases resolve.
  - **sdk/core/src/migrate.rs**: emit UUID `$ref` via `global_name_to_uuid`;
    add `MigrateSummary.dangling_alias_refs` counter.
  - **sdk/core/src/legacy.rs**: denormalize UUID `$ref` → `{name}` via
    `global_uuid_to_name` so legacy output is byte-semantically identical.
  - **sdk/core/src/validate/rules/spec001–003,015,042**: route alias lookups
    through `resolve_alias_key` for correct UUID resolution.
  - **packages/tokens/schemas/token-types/alias.json**: accept `value: "{name}"`
    (legacy) or `$ref: "<uuid>"` (cascade) via `oneOf`.
  - **packages/design-data-spec/schemas/token.schema.json**, **spec/token-format.md**:
    document UUID as the cascade canonical `$ref`; activate the reserved direction.

- [#1113](https://github.com/adobe/spectrum-design-data/pull/1113) [`e23264e`](https://github.com/adobe/spectrum-design-data/commit/e23264e681c56077b5582bf019123b941862779a) Thanks [@GarthDB](https://github.com/GarthDB)! - Consolidate Spectrum-specific design data into a single package.
  - **`@adobe/design-data-spec`**: removed `components/`, `fields/`, and `mode-sets/` directories
    and their exports. Now a pure generalized format definition (schemas, spec, rules, conformance).
    The `./components/*.json` export is no longer published — major bump because removing a
    published export is a breaking change per semver.
  - **`@adobe/spectrum-design-data`**: added `components/` (81 component declarations), `fields/`
    (24 field catalog files), and `mode-sets/` (3 mode-set instances) alongside the existing
    `tokens/`. New exports: `./components/*`, `./fields/*`, `./mode-sets/*`.

- [#1113](https://github.com/adobe/spectrum-design-data/pull/1113) [`e23264e`](https://github.com/adobe/spectrum-design-data/commit/e23264e681c56077b5582bf019123b941862779a) Thanks [@GarthDB](https://github.com/GarthDB)! - Move Spectrum registry vocabulary into spectrum-design-data; deprecate design-system-registry.
  - **@adobe/spectrum-design-data**: gains `registry/` (27 vocabulary files) with
    subpath exports (`./registry/*.json`); now the single source of truth for all Spectrum data.
  - **@adobe/design-system-registry**: reduced to a compatibility shim. Migrate imports to
    `@adobe/spectrum-design-data` — this shim will be removed in a future major version.
  - **@adobe/design-data-spec**: gains `registry-value.json` and `platform-extension.json`
    schema exports; `manifest.schema.json` `conceptOrder` enum relaxed to open `string` type
    (no longer hardcodes Spectrum's field names — configurable per field catalog).

### Patch Changes

- [#1113](https://github.com/adobe/spectrum-design-data/pull/1113) [`e23264e`](https://github.com/adobe/spectrum-design-data/commit/e23264e681c56077b5582bf019123b941862779a) Thanks [@GarthDB](https://github.com/GarthDB)! - Fix stale `replaced_by` UUIDs and re-enable cascade token validation in CI.
  - **`packages/design-data/tokens/`**: corrected 70 deprecated tokens whose `replaced_by`
    (and co-located `$ref`) fields held legacy scale-set wrapper UUIDs that no longer exist
    in the cascade dataset. Targets are now remapped to the correct cascade-format UUIDs via
    `set_uuid` lookup + scale matching.
  - **`packages/design-data/moon.yml`**: removed `runInCI: false` from the `validate` task
    now that SPEC-010 errors are resolved.
  - **`sdk/core/src/validate/rules/spec018.rs`**: SPEC-018 now skips when no component
    catalog is loaded (empty graph), matching the intended semantics — the rule cannot
    validate component references against a catalog that was not provided.
  - **`packages/design-data-spec/conformance/invalid/SPEC-018/dataset.json`**: updated
    fixture to use a non-empty component catalog so SPEC-018 fires for the right reason
    (referenced component not in the declared catalog).

## 0.1.0

### Minor Changes

- [#1099](https://github.com/adobe/spectrum-design-data/pull/1099) [`66d9984`](https://github.com/adobe/spectrum-design-data/commit/66d9984fb6a04ae3c038d0da2dffdc1d44a293d9) Thanks [@GarthDB](https://github.com/GarthDB)! - Initial release of `@adobe/spectrum-design-data` — Spectrum design tokens in cascade format.

  New canonical source of truth for `@adobe/spectrum-tokens`: 4 166 cascade tokens
  (8 files) with structured name objects from the full token taxonomy.
  `packages/tokens/src/` is regenerated via `moon run design-data:legacy-output`.
