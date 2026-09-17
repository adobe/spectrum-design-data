---
title: "Understanding Spectrum design tokens"
date: 2026-07-10T12:00:00Z # noon UTC avoids local-timezone date rollback in the `date` liquid filter
author: Spectrum Design Data
category: Concepts
description: >-
  A technical companion to the S2 design-tokens page, with real token names
  and values, and where the token format is headed next.
---

This is the technical companion to the [S2 "Design tokens" page](https://spectrum.adobe.com/page/design-tokens/):
same shape, but written for people who consume, author, or build tooling
around tokens rather than apply them in Figma. Every example below is a real
token you can look up on the [Tokens](/tokens/) page. None of them are
illustrative placeholders.

<!-- Illustration: hero graphic (Figma node 662-11942, "Design tokens" hero).
     Export from Figma and drop into src/assets/images/, then reference here. -->

## What a token is

A token is a name paired with a value (or a reference to another token). The
name is the structured classification of a design decision. The value is the
data: a literal, or an alias to another token.

| Token name | Value |
| --- | --- |
| `blue-900` | `rgb(59, 99, 251)` |
| `spacing-100` | `8px` |
| `container-padding-medium` | `{spacing-300}` |

An **alias** is a token whose value references another token instead of a
literal. `container-padding-medium` resolves through `{spacing-300}` to
`16px`. Each layer adds context without redefining the underlying value.

## Three tiers

**Primitive tokens** define the raw values in the design language and carry
little usage context on their own:

```
blue-900
gray-100
corner-radius-75
spacing-100
```

**Semantic tokens** are how most consumers should interact with Spectrum
tokens. They describe intent, not implementation, and always resolve back to
a primitive:

```
accent-content-color-default    → {accent-color-900} → {blue-900}
accent-background-color-default → {accent-color-900}
accent-background-color-hover
negative-content-color-default  → {negative-color-900}
positive-background-color-default → {positive-color-900}
informative-background-color-default → {informative-color-900}
positive-color-600
```

Note the naming convention: state is a suffix (`-default`, `-hover`), and the
affected surface is explicit (`-content-color-`, `-background-color-`).
There's no bare `-text-color-` form. Learning this pattern is what makes the
token set searchable.

**Component-specific tokens** are scoped to one component or implementation,
used only when no semantic decision fits:

```
tooltip-maximum-width      160px (desktop), 200px (mobile)
divider-thickness-small    1px
divider-thickness-medium
divider-thickness-large
```

## Reusable structures

Beyond color and meaning, Spectrum's layout tokens encode **where** a
decision applies, using a small vocabulary of structures that repeat across
components:

| Structure | Description | Example token |
| --- | --- | --- |
| Base | The primary functional element within a structure | `base-padding-vertical-small` (4px), `base-padding-vertical-large` (10px) |
| Accessory | A supporting element associated with another structure | `accessory-item-padding-*` |
| Group | A collection of related elements | `group-gap-small` → `{spacing-85}` |
| List | A sequence of repeated items | `list-gap-compact` |
| Container | A structure that organizes content | `container-padding-medium` → `{spacing-300}` |
| Banner | A structure used for prominent messaging | `banner-gap-horizontal` → `{spacing-400}` |

These aren't aspirational. Every prefix above already ships in the legacy
token format. Components are compositions of these structures rather than
one-off decisions per component, which is why reusing a structure token is
almost always preferable to inventing a component-specific one.

<!-- Illustration: token tiers diagram (Figma node 662-11942, tiers/rings visual). -->

## Where we're going

Everything above describes the **legacy token format** in
[`@adobe/spectrum-tokens`](/tokens/), which is what most consumers build
against today. The Spectrum Design Data project is also developing a
successor, the Design Data Specification, that keeps the same principles
(clear, systematic, learnable, semantic-first) but changes how data is
organized and resolved. A few of the bigger shifts, each documented in full
in the [Specification](/spec/):

- The format is moving to a three-layer cascade of Foundation, Platform, and
  Product, with a defined precedence and specificity model for resolving
  conflicts instead of each platform maintaining a fully separate token set.
  See [Cascade resolution](/spec/cascade/).
- Token names get a formal taxonomy, so "what does this token mean" is
  answerable by structure, not convention alone. See
  [Taxonomy](/spec/taxonomy/).
- The token format itself becomes versioned, with explicit lifecycle fields
  (`introduced`, `deprecated`, `replaced_by`) and minimum migration windows,
  replacing today's more ad hoc deprecation notices. See
  [Token format](/spec/token-format/) and [Evolution](/spec/evolution/).

None of this changes how you use tokens today. The legacy format keeps
shipping, and the migration path is deliberately incremental. But if you're
building tooling, adapters, or platform implementations against Spectrum
tokens, the Specification is the place to see where the format is headed
before it lands.

<!-- Illustration: platform adaptability diagram (Figma node 662-11942, foundational/platform visual). -->

## Further reading

- [Tokens](/tokens/): the current token reference
- [Specification](/spec/): the in-progress Design Data Specification
- [Spectrum Design Data on GitHub](https://github.com/adobe/spectrum-design-data)
