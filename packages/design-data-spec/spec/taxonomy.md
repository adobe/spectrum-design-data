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

## Semantic / layout token taxonomy

The following concept categories are defined for semantic and layout tokens, ordered from broad to specific. This ordering is the **default serialization order** for legacy format output; it is not a conformance requirement for stored name objects.

**NORMATIVE:** Each category listed below corresponds to an OPTIONAL field on the token [name object](token-format.md). Tokens **MAY** use any subset of these fields.

| Category | Name object field | Answers | Description |
| --- | --- | --- | --- |
| Structure | `structure` | What? | Individual objects or object categories that have shared styling. Distinctly different from "components" in that they represent structures and visual patterns that can or do occur across many varieties of components. |
| Sub-structure | `substructure` | What? | A structure within an element that should only exist within the context of its parent structure. |
| Component | `component` | What? | Component scope when the token is component-scoped. |
| Anatomy | `anatomy` | What? | A visible, named part of a component as defined by designers. |
| Object | `object` | Where? | The styling surface to which a visual property is applied (e.g. background, border, edge). |
| Property | `property` | Where? | The stylistic attribute being defined (e.g. color, width, padding, gap). |
| Orientation | `orientation` | When/Why? | The direction or order of structures and elements within a component or pattern. |
| Position | `position` | When/Why? | The location of an object relative to another, with or without respect to directional order. |
| Size | `size` | When/Why? | Relative terms used to create relationships and patterns of usage across multiple tokens and token types. |
| Density | `density` | When/Why? | Options that create more or less space within or around the parts of a component. |
| Shape | `shape` | When/Why? | Relative to the overall shape of a component (e.g. "uniform" creates a 1:1 padding ratio between horizontal and vertical padding). |

Additional categories for variant and state are inherited from the existing name object:

| Category | Name object field | Description |
| --- | --- | --- |
| Variant | `variant` | Variant within a component (e.g. accent, negative, primary). |
| State | `state` | Interactive or semantic state (e.g. hover, focus, disabled). |

**NOTE:** The categories above are filtered for semantic and layout token taxonomies. Additional categories do and will exist for other token types (e.g. color, typography). The taxonomy is built to scale as new concepts and terms are identified.

## Component anatomy vs. token objects

Two concepts that are often conflated but serve different purposes:

### Component anatomy

**Component anatomy** refers to the visible, named parts of a component as defined by designers. These are the parts called out in component specification diagrams (e.g. icon, label, track, handle, hold icon).

Component anatomy is declared per component in [component schemas](../../component-schemas/) and validated against the anatomy registry. A token referencing a component's anatomy part (e.g. `slider` + `handle`) can be validated as a legitimate combination.

Anatomy parts fall into three tiers:

| Tier | Description | Examples |
| --- | --- | --- |
| Primitive | Reusable across many components | icon, label, track, handle, fill, divider, title, description |
| Composite | Another component used as a named part | checkbox, close button, popover, avatar |
| Component-specific | Unique to one component | loupe, gripper, opacity checkerboard |

### Token objects (styling surfaces)

**Token objects** (or styling surfaces) describe *where* a visual property is applied on a UI element. These are NOT anatomy — they are abstract styling targets that exist on any element regardless of its component type.

| Object | Description |
| --- | --- |
| `background` | Background surface or fill |
| `border` | Border or outline |
| `edge` | Outer boundary of component (used in spacing tokens) |
| `visual` | Visible graphic element area (may be inset from edge) |
| `content` | Main content area |

Token objects are stored in a separate registry from anatomy parts. Both may appear in the same token name — e.g. a token for the background color of a slider's handle would reference anatomy `handle` and object `background`.

## Name object field categories

Name object fields fall into two categories with different validation behavior:

### Semantic fields

Semantic fields describe identity, structure, and intent. They are used for querying and organization but do **not** participate in cascade resolution or specificity calculation.

**NORMATIVE:** Semantic field values are validated against the design system registry with **advisory** severity (warning, not error). Values not in the registry are permitted but flagged.

Fields: `structure`, `substructure`, `component`, `anatomy`, `object`, `property`, `variant`, `state`, `orientation`, `position`, `size`, `density`, `shape`.

### Dimension fields

Dimension fields represent axes of variation that drive the [cascade](cascade.md) resolution algorithm and [specificity](cascade.md#semantic-specificity) calculation.

**NORMATIVE:** Dimension field values are validated against declared [dimension](dimensions.md) modes with **strict** severity (error). An invalid mode value would silently fail to match any context during cascade resolution.

Fields: `colorScheme`, `scale`, `contrast`, and any additional dimension keys declared in the dataset's dimension catalog.

See [Dimensions](dimensions.md) for dimension declarations, modes, and defaults.

## Default serialization (legacy format)

The **default serialization** produces a kebab-case string from the name object using the following concept order:

```
{component}-{structure}-{substructure}-{anatomy}-{object}-{property}-{orientation}-{position}-{size}-{density}-{shape}-{state}
```

Omitted fields are skipped. Variant, when present, replaces component at the start of the string.

This ordering is preserved for backward compatibility with the current `@adobe/spectrum-tokens` package. It is a serialization convention, not a structural requirement.

**NORMATIVE:** A conforming formatter **MUST** produce deterministic output for a given name object and formatting configuration. Two name objects that differ only in field ordering **MUST** produce identical serialized strings.

## Platform formatting configuration

A platform [manifest](manifest.md) **MAY** declare formatting rules in its `extensions.formatting` section:

| Option | Type | Description |
| --- | --- | --- |
| `conceptOrder` | array of strings | Ordered list of name object fields for serialization. |
| `casing` | string | One of: `kebab-case`, `camelCase`, `PascalCase`, `SCREAMING_SNAKE_CASE`. |
| `delimiter` | string | Character(s) separating concepts (e.g. `-`, `_`, `.`, `/`). |
| `abbreviations` | object | Map of full term → abbreviated form (e.g. `{ "background": "bg" }`). |

When no platform formatting is declared, the default serialization above is used.

## Scalability

The taxonomy and terms are built to scale as new concepts and terms are identified:

- New concept categories **MAY** be added to the taxonomy in minor spec versions.
- New terms **MAY** be added to the vocabulary registry without spec version changes.
- New token type taxonomies (beyond semantic/layout) **MAY** be defined in future spec versions.
- Platform manifests **MAY** extend the vocabulary with platform-specific terms and formatting.

## References

* [#661 — Spectrum Design System Glossary](https://github.com/adobe/spectrum-design-data/discussions/661)
* [#646 — Token Schema Structure and Validation System](https://github.com/adobe/spectrum-design-data/discussions/646)
* Nate Baldwin, "Naming conventions & shared taxonomy" — Design Data & Platforms onsite, April 1, 2026
