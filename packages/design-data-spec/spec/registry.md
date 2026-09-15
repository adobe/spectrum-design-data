# Registry

**Spec version:** `1.0.0-draft` (see [Overview](index.md))

This document defines the **design system registry**: the set of named value collections that supply allowed vocabulary for token name fields and component metadata. It describes which registries exist, what each one validates, and the packaging strategy for the current release.

## What a registry is

A **registry** is a JSON file in `@adobe/spectrum-design-data` (under `registry/`) that declares an ordered list of named values. Each value has at minimum an `id` (the canonical string used in token names and component files) and a `label` (a human-readable display name). Values **MAY** carry additional fields such as `description`, `aliases`, `deprecated`, and `usedIn`.

Registries are the authoritative source of truth for vocabulary validation. A validator SHOULD flag token field values that are not present in the corresponding registry (typically as a warning, not an error — see field declarations in the field catalog).

## Packaging strategy

All registries ship within **`@adobe/spectrum-design-data`** under the `registry/` directory. The three semantically distinct registries described below are separate JSON files in that directory.

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

**File:** `packages/design-data/registry/anatomy-terms.json`\
**Validated by:** SPEC-020, SPEC-023, SPEC-024, SPEC-025, SPEC-035 (advisory — anatomy part `name` values SHOULD match the anatomy-terms registry)\
**See also:** [Taxonomy — Component anatomy vs. universal elements, attributes, and affordances](taxonomy.md#component-anatomy-vs-universal-elements-attributes-and-affordances), [Anatomy format](anatomy-format.md)

### Elements (`elements.json`)

Validates the `element` field on token name objects.

**What it contains:** Abstract, cross-component styling surfaces that describe *where* a visual property is applied. Elements are not anatomy — they are not visible named parts of a specific component; they are targets for visual properties that exist on any element regardless of its component type.

| ID              | Description                                                |
| --------------- | ---------------------------------------------------------- |
| `text`          | Text content or label                                      |
| `visual`        | Visible graphic element area (may be inset from edge)      |
| `bar`           | Linear bar-shaped element                                  |
| `control`       | Interactive control element (e.g. checkbox, radio, switch) |
| `workflow-icon` | Standard workflow icon element, distinct from UI icons     |
| `ui-icon`       | System UI icon element (chevrons, checkmarks, close icons) |

**File:** `packages/design-data/registry/elements.json`\
**Validated by:** SPEC-009 (advisory — `name.element` field values SHOULD match the elements registry)\
**See also:** [Taxonomy — Elements (generic styling surfaces)](taxonomy.md#elements-generic-styling-surfaces)

### Attributes (`attributes.json`)

Validates the `attribute` field on token name objects.

**What it contains:** Sub-qualities of a property, used together with `property` to express a compound style concept (e.g. `property: color` + `attribute: background`).

| ID           | Description                |
| ------------ | -------------------------- |
| `border`     | Border or outline          |
| `background` | Background surface or fill |
| `dash`       | Dashed-line styling        |
| `shadow`     | Drop or box shadow         |
| `corner`     | Corner rounding            |
| `overlay`    | Overlay or scrim tint      |
| `gradient`   | Gradient styling           |

**File:** `packages/design-data/registry/attributes.json`\
**Validated by:** SPEC-009 (advisory — `name.attribute` field values SHOULD match the attributes registry)\
**See also:** [Taxonomy — Attributes (property sub-qualities)](taxonomy.md#attributes-property-sub-qualities)

### Affordances (`affordances.json`)

Validates the `affordance` field on token name objects.

**What it contains:** UI affordances that visually distinguish a specific behavior, used stylistically across multiple components rather than owned by a single one.

| ID                    | Description                                                                    |
| --------------------- | ------------------------------------------------------------------------------ |
| `drop-target`         | Drag-and-drop destination affordance                                           |
| `focus-ring`          | Visible ring or indicator drawn around a focused element for accessibility     |
| `selection-indicator` | Visual marker indicating which item among several is currently selected/active |
| `drag-handle`         | A grip affordance for reordering an item via drag                              |

**File:** `packages/design-data/registry/affordances.json`\
**Validated by:** SPEC-009 (advisory — `name.affordance` field values SHOULD match the affordances registry)\
**See also:** [Taxonomy — Affordances (cross-component behavior indicators)](taxonomy.md#affordances-cross-component-behavior-indicators)

### Visibilities (`visibilities.json`)

Validates the `visibility` field on token name objects.

**What it contains:** Prominence/emphasis level of a token, independent of its color/semantic role.

| ID           | Description                                                  |
| ------------ | ------------------------------------------------------------ |
| `subtle`     | Reduced emphasis for less prominent surfaces                 |
| `subdued`    | Lower emphasis for quieter backgrounds                       |
| `emphasized` | Elevated emphasis for prominent surfaces (e.g. drop shadows) |

**File:** `packages/design-data/registry/visibilities.json`\
**Validated by:** SPEC-009 (advisory — `name.visibility` field values SHOULD match the visibilities registry)

### Component categories (`categories.json`)

Validates the `category` field on component declarations.

**What it contains:** Top-level categories for organizing components by purpose and interaction type. Used for documentation navigation and tooling filters.

**File:** `packages/design-data/registry/categories.json`\
**Validated by:** SPEC-034 (advisory — `meta.category` field values SHOULD match the categories registry)\
**See also:** [Component format](component-format.md)

## ID scoping

Registry IDs are scoped to their registry. The same ID **MAY** appear in multiple registries when the same word is a valid term in each registry's distinct validation context. For example, `actions` is a legitimate anatomy term (a group of action controls within a list item) and also a component category — these are unrelated concepts that happen to share a label.

**NORMATIVE (SPEC-033):** Cross-registry ID overlap is not an error. Validators MUST NOT flag an ID as invalid solely because it appears in another registry.

## Other registries in the package

The following registries exist in `@adobe/spectrum-design-data` (under `registry/`) but are not part of the registry boundary defined above. They validate other token name fields and component metadata fields:

| Registry             | File                        | Validates                            |
| -------------------- | --------------------------- | ------------------------------------ |
| Sizes                | `sizes.json`                | `name.size` field                    |
| Interactions         | `interactions.json`         | `name.interaction` field             |
| Interaction contexts | `interaction-contexts.json` | `name.interaction-context` field     |
| Variants             | `variants.json`             | `name.variant` field                 |
| Structures           | `structures.json`           | `name.structure` field               |
| Orientations         | `orientations.json`         | `name.orientation` field             |
| Positions            | `positions.json`            | `name.position` field                |
| Densities            | `densities.json`            | `name.density` field                 |
| Shapes               | `shapes.json`               | `name.shape` field                   |
| Scale values         | `scale-values.json`         | Numeric scale vocabulary             |
| Platforms            | `platforms.json`            | Platform identifiers in manifests    |
| Components           | `components.json`           | Component identifiers in token names |
| Navigation terms     | `navigation-terms.json`     | Navigation vocabulary                |
| Token terminology    | `token-terminology.json`    | Human-readable token concept labels  |
| Glossary             | `glossary.json`             | Design system glossary               |
