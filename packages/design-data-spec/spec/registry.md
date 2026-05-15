# Registry

**Spec version:** `1.0.0-draft` (see [Overview](index.md))

This document defines the **design system registry**: the set of named value collections that supply allowed vocabulary for token name fields and component metadata. It describes which registries exist, what each one validates, and the packaging strategy for the current release.

## What a registry is

A **registry** is a JSON file in `@adobe/design-system-registry` that declares an ordered list of named values. Each value has at minimum an `id` (the canonical string used in token names and component files) and a `label` (a human-readable display name). Values **MAY** carry additional fields such as `description`, `aliases`, `deprecated`, and `usedIn`.

Registries are the authoritative source of truth for vocabulary validation. A validator SHOULD flag token field values that are not present in the corresponding registry (typically as a warning, not an error — see field declarations in the field catalog).

## Packaging strategy

All registries ship as a **single package**: `@adobe/design-system-registry`. The three semantically distinct registries described below are separate JSON files within that package. Independent sub-package splits are explicitly deferred.

**Rationale:** No external consumers currently require independent semver versioning of individual registries. A single package is cheaper to maintain, simpler to consume, and avoids the proliferation of tiny packages with coordinated versioning overhead. If independent versioning needs emerge in a future release, the split can be done with a standard deprecation window per [Evolution](evolution.md).

## Registries

### Component anatomy (`anatomy-terms.json`)

Validates the `anatomy` field on token name objects and the `id` field on anatomy part declarations in component schemas.

**What it contains:** Visible, named parts of components as defined in component specification diagrams — the elements called out when designers annotate a component. Examples: `label`, `icon`, `track`, `handle`, `thumbnail`, `drag-icon`.

Anatomy terms fall into three tiers:

| Tier               | Description                            | Examples                                               |
| ------------------ | -------------------------------------- | ------------------------------------------------------ |
| Primitive          | Reusable across many components        | `icon`, `label`, `track`, `handle`, `divider`, `title` |
| Composite          | Another component used as a named part | `checkbox`, `close-button`, `popover`, `avatar`        |
| Component-specific | Unique to one component                | `loupe`, `gripper`, `hold-icon`                        |

**File:** `packages/design-system-registry/registry/anatomy-terms.json`\
**Validated by:** SPEC-020, SPEC-023, SPEC-024, SPEC-025\
**See also:** [Taxonomy — Component anatomy vs. token objects](taxonomy.md#component-anatomy-vs-token-objects), [Anatomy format](anatomy-format.md)

### Token objects (`token-objects.json`)

Validates the `object` field on token name objects.

**What it contains:** Abstract styling surfaces that describe *where* a visual property is applied. Token objects are not anatomy — they are not visible named parts of a component; they are targets for visual properties that exist on any element regardless of its type.

| ID           | Description                                           |
| ------------ | ----------------------------------------------------- |
| `background` | Background surface or fill                            |
| `border`     | Border or outline                                     |
| `edge`       | Outer boundary (used in spacing tokens)               |
| `visual`     | Visible graphic element area (may be inset from edge) |
| `content`    | Main content area                                     |

**File:** `packages/design-system-registry/registry/token-objects.json`\
**Validated by:** SPEC-009 (advisory — `name.object` field values SHOULD match the token-objects registry)\
**See also:** [Taxonomy — Token objects (styling surfaces)](taxonomy.md#token-objects-styling-surfaces)

### Component categories (`categories.json`)

Validates the `category` field on component declarations.

**What it contains:** Top-level categories for organizing components by purpose and interaction type. Used for documentation navigation and tooling filters.

**File:** `packages/design-system-registry/registry/categories.json`\
**Validated by:** SPEC-034 (advisory — `meta.category` field values SHOULD match the categories registry)\
**See also:** [Component format](component-format.md)

## ID scoping

Registry IDs are scoped to their registry. The same ID **MAY** appear in multiple registries when the same word is a valid term in each registry's distinct validation context. For example, `actions` is a legitimate anatomy term (a group of action controls within a list item) and also a component category — these are unrelated concepts that happen to share a label.

**NORMATIVE (SPEC-033):** Cross-registry ID overlap is not an error. Validators MUST NOT flag an ID as invalid solely because it appears in another registry.

## Other registries in the package

The following registries exist in `@adobe/design-system-registry` but are not part of the three-registry boundary defined above. They validate other token name fields and component metadata fields:

| Registry          | File                     | Validates                            |
| ----------------- | ------------------------ | ------------------------------------ |
| Sizes             | `sizes.json`             | `name.size` field                    |
| States            | `states.json`            | `name.state` field                   |
| Variants          | `variants.json`          | `name.variant` field                 |
| Structures        | `structures.json`        | `name.structure` field               |
| Substructures     | `substructures.json`     | `name.substructure` field            |
| Orientations      | `orientations.json`      | `name.orientation` field             |
| Positions         | `positions.json`         | `name.position` field                |
| Densities         | `densities.json`         | `name.density` field                 |
| Shapes            | `shapes.json`            | `name.shape` field                   |
| Scale values      | `scale-values.json`      | Numeric scale vocabulary             |
| Platforms         | `platforms.json`         | Platform identifiers in manifests    |
| Components        | `components.json`        | Component identifiers in token names |
| Navigation terms  | `navigation-terms.json`  | Navigation vocabulary                |
| Token terminology | `token-terminology.json` | Human-readable token concept labels  |
| Glossary          | `glossary.json`          | Design system glossary               |
