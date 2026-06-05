# Taxonomy

**Spec version:** `1.0.0-draft` (see [Overview](index.md))

This document defines the **token taxonomy**: a hierarchical system of concept categories that classify design tokens, the **token term vocabulary** of allowed words within each category, and the **formatting style** rules that control serialization of structured token names into platform-consumable strings.

## Motivation

"Naming convention" is too broad a term when discussing malleability across platform teams. A token name like `accent-background-color-hover` embeds multiple independent decisions:

1. **Which concepts** are represented and in what hierarchy (taxonomy).
2. **Which words** describe each concept (vocabulary).
3. **How the words are rendered** — casing, delimiters, abbreviations, concept order (formatting).

Each layer has a different malleability profile: the taxonomy is shared across all platforms; the vocabulary is shared with platform-aware compromises; the formatting is platform-malleable.

## Three layers of naming

### Layer 1: Token taxonomy

A **token taxonomy** is a hierarchical set of concept categories for classifying design ideas and use cases. It creates a clear, consistent, and predictable shared language across disciplines and teams.

The taxonomy is **NORMATIVE** and **shared** — all platforms use the same concept categories in the same hierarchy. Changing the taxonomy changes the meaning of token names across the entire ecosystem.

Taxonomies are **scoped to specific token types** for clarity. The semantic/layout taxonomy defined in this document is one such scope; additional taxonomies (e.g. for color tokens) will be defined in future spec versions.

### Layer 2: Token term vocabulary

The **token term vocabulary** is the set of specific words used to describe each conceptual option within the taxonomy. The vocabulary creates a shared language across disciplines and teams.

The vocabulary is **NORMATIVE at the foundation level** — the foundation defines canonical terms. Platforms **MAY** declare vocabulary mappings (e.g. `hover` → `highlighted` for iOS) in their [manifest](manifest.md) for platform-specific consumption.

### Layer 3: Formatting style

**Formatting style** defines rules for altering the appearance of a token's name for platform-specific consumption and usability needs. This includes concept ordering, casing, delimiters, and abbreviations.

Formatting is **platform-malleable** — each platform manifest **MAY** declare its own formatting rules. The foundation defines a default formatting style for legacy compatibility.

**NORMATIVE:** The name object defined in [Token format](token-format.md) is unordered structured data. Concept ordering is purely a serialization concern and **MUST NOT** affect cascade resolution, specificity, or validation.

## Principles

The taxonomy is designed with three guiding principles:

1. **Object-oriented** — Designers and developers think in terms of how they would construct components, rather than abstract semantic ideas.
2. **Agnostic (with compromises)** — Platform-agnostic terms are used except when platforms have specific terms for the same concept. In those cases, the most common or clear term is used.
3. **Verified** — Multiple existing components must be rebuildable using the taxonomy system, and consumers must find them reasonably understandable or learnable.

## Token-type taxonomies

Concept categories for name-object fields are declared in the design system's **field catalog** — a set of field declarations in the `fields/` directory, each conforming to [`field.schema.json`](../schemas/field.schema.json). Each declaration specifies the field name, vocabulary registry, validation severity, default serialization position, and an optional **scope** that restricts the field to a specific token type.

**NORMATIVE:** The field catalog is the authoritative source for what fields exist on the name object. Tools, validators, and serializers **SHOULD** read the catalog rather than hardcoding field knowledge.

**NORMATIVE:** A field with a non-null `scope` declaration **MUST** only appear on tokens of that type. Using a scoped field on a mismatched token type triggers rule SPEC-042 (`field-scope-violation`, warning).

### Semantic / layout token taxonomy

The following concept categories are defined in Spectrum's foundation field catalog for semantic and layout tokens (`scope: null` — universal), ordered by default serialization position. This ordering is the **default serialization order** for legacy format output; it is not a conformance requirement for stored name objects.

**NORMATIVE:** Each category listed below corresponds to a field on the token [name object](token-format.md). Tokens **MAY** use any subset of these fields. Exception: `property` is REQUIRED on every name object — see [token-format.md](token-format.md#name-object).

| Category      | Name object field | Answers   | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------- | ----------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Structure     | `structure`       | What?     | Individual objects or object categories that have shared styling. Distinctly different from "components" in that they represent structures and visual patterns that can or do occur across many varieties of components.                                                                                                                                                                                                                                                                       |
| Sub-structure | `substructure`    | What?     | A structure within an element that should only exist within the context of its parent structure.                                                                                                                                                                                                                                                                                                                                                                                               |
| Component     | `component`       | What?     | Component scope when the token is component-scoped.                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Anatomy       | `anatomy`         | What?     | A visible, named part of a component as defined by designers.                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Object        | `object`          | Where?    | The styling surface to which a visual property is applied (e.g. background, border, edge).                                                                                                                                                                                                                                                                                                                                                                                                     |
| Property      | `property`        | Where?    | The CSS/styling attribute or design-system abstraction being defined (e.g. color, width, padding, gap). REQUIRED — see exception in preamble. Values SHOULD come from [`property-terms.json`](../../packages/design-data/registry/property-terms.json). Anatomy parts and styling surfaces do NOT belong here — they belong in `anatomy` and `object` respectively. See [token-format.md — Name-object migration policy](token-format.md#name-object-migration-policy) for migration guidance. |
| Orientation   | `orientation`     | When/Why? | The direction or order of structures and elements within a component or pattern.                                                                                                                                                                                                                                                                                                                                                                                                               |
| Position      | `position`        | When/Why? | The location of an object relative to another, with or without respect to directional order.                                                                                                                                                                                                                                                                                                                                                                                                   |
| Size          | `size`            | When/Why? | Relative terms used to create relationships and patterns of usage across multiple tokens and token types.                                                                                                                                                                                                                                                                                                                                                                                      |
| Density       | `density`         | When/Why? | Options that create more or less space within or around the parts of a component.                                                                                                                                                                                                                                                                                                                                                                                                              |
| Shape         | `shape`           | When/Why? | Relative to the overall shape of a component (e.g. "uniform" creates a 1:1 padding ratio between horizontal and vertical padding).                                                                                                                                                                                                                                                                                                                                                             |

Additional categories for variant and state are inherited from the existing name object:

| Category | Name object field | Description                                                  |
| -------- | ----------------- | ------------------------------------------------------------ |
| Variant  | `variant`         | Variant within a component (e.g. accent, negative, primary). |
| State    | `state`           | Interactive or semantic state (e.g. hover, focus, disabled). |

### Color token taxonomy

Color tokens describe palette entries and semantic color assignments. Their name objects use `scope: "color"` fields alongside the universal `property` and `state` fields.

**NORMATIVE:** Color tokens SHOULD include `colorFamily`, `scaleIndex`, or both to allow tooling to group and sort palette entries. Tokens missing both are flagged by rule SPEC-043 (`domain-required-fields`, warning).

| Category     | Name object field | Answers | Description                                                                                                                                                                      |
| ------------ | ----------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Color Family | `colorFamily`     | What?   | Hue family of the color (e.g. `blue`, `gray`, `celery`, `transparent-black`). Values come from [`color-families.json`](../../packages/design-data/registry/color-families.json). |
| Ramp Index   | `scaleIndex`      | Which?  | Numeric perceptual ramp step (e.g. `100`, `400`, `900`, `1600`). Shared with layout tokens; see [scaleIndex field declaration](../fields/scaleIndex.json). Not scope-restricted. |

**Default serialization order for color tokens:**

```
{variant}-{colorFamily}-{scaleIndex}
```

Example: `colorFamily=blue` + `scaleIndex=100` → `blue-100`.

### Typography token taxonomy

Typography tokens describe typeface attributes: family, weight, style, and numeric scale. Their name objects use `scope: "typography"` fields alongside the universal `property` field.

**NORMATIVE:** Typography tokens SHOULD include at least one of `family`, `weight`, `style`, `scaleIndex`, or `structure`. Tokens missing all five are flagged by rule SPEC-043 (`domain-required-fields`, warning). `family`, `weight`, and `style` are the primary identifiers; `scaleIndex` and `structure` satisfy the rule for scale-indexed and structural typography tokens respectively.

| Category  | Name object field | Answers | Description                                                                                                                                                                                                                                                                                       |
| --------- | ----------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Family    | `family`          | What?   | Type family of the token (e.g. `sans-serif`, `serif`, `cjk`, `code`). Values come from [`typography-families.json`](../../packages/design-data/registry/typography-families.json).                                                                                                                |
| Weight    | `weight`          | How?    | Typographic weight (e.g. `regular`, `bold`, `light`, `black`). Values come from [`typography-weights.json`](../../packages/design-data/registry/typography-weights.json).                                                                                                                         |
| Style     | `style`           | How?    | Typographic style (e.g. `italic`, `oblique`, `normal`). Include `normal` when the token explicitly declares a normal style (e.g. a reset). Values come from [`typography-styles.json`](../../packages/design-data/registry/typography-styles.json).                                               |
| Alignment | `alignment`       | How?    | Horizontal text-alignment direction (e.g. `start`, `center`, `end`). Corresponds to the CSS `text-align` axis. Values come from [`alignments.json`](../../packages/design-data/registry/alignments.json).                                                                                         |
| Scale     | `scaleIndex`      | Which?  | Numeric size scale step (e.g. `75`, `100`, `200`). Shared with other token types; not scope-restricted.                                                                                                                                                                                           |
| Structure | `structure`       | Where?  | Structural typography scale this token belongs to (e.g. `body`, `detail`, `heading`). Used for tokens that apply within a named typographic structure rather than a specific family/weight/style axis. Values come from [`structures.json`](../../packages/design-data/registry/structures.json). |

**Default serialization order for typography tokens:**

```
{family}-{weight}-{style}-{scaleIndex}
```

Example: `family=sans-serif` + `weight=bold` → `sans-serif-bold`. `family=sans-serif` + `style=italic` + `scaleIndex=100` → `sans-serif-italic-100`.

### Motion token taxonomy

Motion tokens describe timing, easing, and animation role for UI animation. Their name objects use `scope: "motion"` fields alongside the universal `property` field.

**NOTE:** No motion tokens exist in the foundation dataset at the time of this writing. This taxonomy is normative but the registry values for `motionRole` and `easing` are provisional — they will be refined when motion tokens are added to the foundation. Validators emit SPEC-043 at warning severity so provisional tokens are not blocked.

**NORMATIVE:** Motion tokens SHOULD include `motionRole` or `easing`. Tokens missing both are flagged by rule SPEC-043 (`domain-required-fields`, warning).

| Category    | Name object field | Answers | Description                                                                                                                                                                     |
| ----------- | ----------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Motion Role | `motionRole`      | What?   | Semantic role of the animation (e.g. `enter`, `exit`, `transition`, `emphasis`). Values come from [`motion-roles.json`](../../packages/design-data/registry/motion-roles.json). |
| Easing      | `easing`          | How?    | Easing curve identifier (e.g. `ease-in`, `ease-out`, `standard`). Values come from [`easing-curves.json`](../../packages/design-data/registry/easing-curves.json).              |
| Duration    | `scaleIndex`      | Which?  | Numeric duration bucket index (e.g. `100` for 100ms, `200` for 200ms). Shared with other token types; not scope-restricted.                                                     |

**Default serialization order for motion tokens:**

```
{motionRole}-{easing}-{scaleIndex}
```

Example: `motionRole=enter` + `easing=ease-out` → `enter-ease-out`. `motionRole=transition` + `scaleIndex=100` → `transition-100`.

### Alias / semantic token name objects

Alias tokens (`$schema: …/alias.json`) MAY carry name objects using the same field vocabulary
as their target domain. A color alias carrying `colorFamily` is valid when its alias chain
resolves to a color-domain schema (`color.json`, `color-set.json`).

**NORMATIVE:** SPEC-042 (`field-scope-violation`) evaluates alias tokens by following the
`alias_target` chain to the terminal non-alias schema, then checking that schema against the
field's domain. This is the **alias-target-domain** rule: the alias *inherits* its domain
from what it ultimately resolves to.

**Examples:**

```json
// icon-color-blue-primary-default  ($schema=alias.json, $ref → icon-color-blue-100 which is color-set.json)
// Valid: colorFamily allowed because target resolves to color domain.
{ "property": "icon-color", "colorFamily": "blue", "variant": "primary" }

// icon-color-primary-default  ($schema=alias.json, $ref → icon-color-blue-primary-default)
// Valid: no domain-scoped fields used — variant and state are universal.
{ "property": "icon-color", "variant": "primary" }
```

**What stays deferred:** alias tokens referencing the same target but carrying modifiers that
have no current field (e.g. `inverse`, `emphasized`, `subtle`, `subdued`) remain unclassified
until a color-modifier RFC defines those fields.

### Structure vs. component — when does the line move?

The `structure` and `component` fields both answer "What?" but apply at different scopes. A useful rule of thumb:

* Use `component` when the token belongs to a specific component's surface (e.g. `button-background-color` — the background color of the Button component).
* Use `structure` when the token belongs to a reusable visual pattern that recurs **across** components (e.g. `container-padding` — padding for any container-shaped surface, regardless of which component owns it).

**Worked example — `card`:**

* As a `structure`: when "card" describes a layout primitive used inside many components (e.g. `card-padding-medium` on a list item, a popover body, or a modal header), the token is structure-scoped.
* As a `component`: when "card" describes the dedicated Card component's own surfaces (e.g. `card-background-color` on the Card root), the token is component-scoped.

The same word can validly appear in both fields across the dataset; they are independent. Authors choose based on whether the token's *meaning* generalizes across many components (structure) or is specific to one component's identity (component).

Source: Nate Baldwin, "Naming conventions & shared taxonomy" — Design Data & Platforms onsite, April 1, 2026.

## Component anatomy vs. token objects

Two concepts that are often conflated but serve different purposes:

### Component anatomy

**Component anatomy** refers to the visible, named parts of a component as defined by designers. These are the parts called out in component specification diagrams (e.g. icon, label, track, handle, hold icon).

Component anatomy is declared per component in [component schemas](../../component-schemas/) and validated against the anatomy registry. A token referencing a component's anatomy part (e.g. `slider` + `handle`) can be validated as a legitimate combination.

Anatomy parts fall into three tiers:

| Tier               | Description                            | Examples                                                      |
| ------------------ | -------------------------------------- | ------------------------------------------------------------- |
| Primitive          | Reusable across many components        | icon, label, track, handle, fill, divider, title, description |
| Composite          | Another component used as a named part | checkbox, close button, popover, avatar                       |
| Component-specific | Unique to one component                | loupe, gripper, opacity checkerboard                          |

### Token objects (styling surfaces)

**Token objects** (or styling surfaces) describe *where* a visual property is applied on a UI element. These are NOT anatomy — they are abstract styling targets that exist on any element regardless of its component type.

| Object       | Description                                           |
| ------------ | ----------------------------------------------------- |
| `background` | Background surface or fill                            |
| `border`     | Border or outline                                     |
| `edge`       | Outer boundary of component (used in spacing tokens)  |
| `visual`     | Visible graphic element area (may be inset from edge) |
| `content`    | Main content area                                     |

Token objects are stored in a separate registry from anatomy parts. Both may appear in the same token name — e.g. a token for the background color of a slider's handle would reference anatomy `handle` and object `background`.

## Name object field categories

Name object fields fall into two categories with different validation behavior:

### Semantic fields

Semantic fields describe identity, structure, and intent. They are used for querying and organization but do **not** participate in cascade resolution or specificity calculation.

**NORMATIVE:** Semantic field values are validated against their declared vocabulary registry with the severity specified in the field declaration (typically **advisory** — warning, not error). Values not in the registry are permitted but flagged.

Semantic fields are those declared with `kind: "semantic"` in the field catalog. The authoritative list for any given design system is determined by its field catalog declarations (see `packages/design-data/fields/` for Spectrum's catalog).

### Mode-set fields

Mode-set fields represent axes of variation that drive the [cascade](cascade.md) resolution algorithm and [specificity](cascade.md#semantic-specificity) calculation.

**NORMATIVE:** Mode-set field values are validated against declared [mode set](mode-sets.md) modes with **strict** severity (error). An invalid mode value would silently fail to match any context during cascade resolution.

Mode-set fields are those declared with `kind: "mode-set"` in the field catalog, plus any additional mode set keys from the dataset's [mode set declarations](mode-sets.md). The authoritative list for any given design system is determined by its field catalog and mode-set declarations (see `packages/design-data/fields/` for Spectrum's catalog).

See [Mode Sets](mode-sets.md) for mode set declarations, modes, and defaults.

## Default serialization (legacy format)

The **default serialization** produces a kebab-case string from the name object by ordering fields according to their `serialization.position` values (ascending) as declared in the field catalog. Omitted fields are skipped.

For Spectrum's foundation catalog, this produces the following concept order:

```
{variant}-{component}-{structure}-{substructure}-{anatomy}-{object}-{property}-{orientation}-{position}-{size}-{density}-{shape}-{state}
```

All fields are independent — `variant` and `component` **MAY** both appear in the same token name (e.g. a token with `component: "button"` and `variant: "accent"` serializes as `accent-button-...`).

This ordering is preserved for backward compatibility with the current `@adobe/spectrum-tokens` package. It is a serialization convention, not a structural requirement.

**NORMATIVE:** A conforming formatter **MUST** produce deterministic output for a given name object and formatting configuration. Two name objects that differ only in field ordering **MUST** produce identical serialized strings.

## Platform formatting configuration

A platform [manifest](manifest.md) **MAY** declare formatting rules in its [`extensions.formatting`](manifest.md#extensionsformatting) section to control concept ordering, casing, delimiters, and abbreviations. The normative contract for these fields is defined in [Manifest — `extensions.formatting`](manifest.md#extensionsformatting).

When no platform formatting is declared, the default serialization above is used.

## Scalability

The taxonomy and terms are built to scale as new concepts and terms are identified:

* New concept categories **MAY** be added by creating a new field declaration file in the field catalog — no spec version change is required for the mechanism itself.
* New terms **MAY** be added to the vocabulary registry without spec version changes.
* New token type taxonomies **MAY** be added by creating scoped field declarations (non-null `scope`) and a corresponding registry section in taxonomy.md. Color, typography, and motion taxonomies are defined above.
* Platform manifests **MAY** extend the vocabulary with platform-specific terms and formatting.

## Where `name` objects live

Token taxonomy data is **decoupled** from the published `@adobe/spectrum-tokens`
package to avoid bumping the tokens version on every taxonomy change.

| Artifact          | Location                            | Description                                                                      |
| ----------------- | ----------------------------------- | -------------------------------------------------------------------------------- |
| Token source data | `packages/tokens/src/*.json`        | `$schema`, `value`, `uuid`, `sets`, … — no `name` field                          |
| Taxonomy sidecar  | `packages/token-names/names/*.json` | `{ "<slug>": { property, colorFamily, … }, … }` — one file per token source file |
| Field definitions | `packages/design-data/fields/`      | Authoritative field catalog with scope and type                                  |

The sidecar package (`@adobe/token-names`) is **private** (not published to npm).
Its delivery format for downstream consumers is TBD.

### SDK validator integration

Pass `--names-dir packages/token-names/names/` to the `design-data validate` CLI
to merge sidecar names into the token graph at ingest.  All relational rules
(SPEC-042, SPEC-043, SPEC-018…022, cascade, diff, query) continue to read
`record.raw["name"]` as if the field were inline:

```bash
cargo run --bin design-data -- validate packages/tokens/src/ \
  --names-dir packages/token-names/names/
```

Validation without `--names-dir` is a valid fail-open configuration (name-scope
rules are silent); CI always supplies the flag.

### Regenerating name data

```bash
node tools/token-corpus-migrate/src/cli.js \
  --root packages/tokens/src \
  --names-out packages/token-names/names \
  --write
```

## References

* [#806 — Token Taxonomy, Vocabulary, and Formatting](https://github.com/adobe/spectrum-design-data/discussions/806)
* [#661 — Spectrum Design System Glossary](https://github.com/adobe/spectrum-design-data/discussions/661)
* [#646 — Token Schema Structure and Validation System](https://github.com/adobe/spectrum-design-data/discussions/646)
* [Manifest — `extensions.formatting`](manifest.md#extensionsformatting) — normative contract for platform formatting rules
* Nate Baldwin, "Naming conventions & shared taxonomy" — Design Data & Platforms onsite, April 1, 2026
