# Token Taxonomy, Vocabulary, and Formatting — Naming Convention Decomposition

## Summary

This RFC proposes decomposing "naming convention" into three distinct, independently malleable layers — **Token Taxonomy**, **Token Term Vocabulary**, and **Formatting Style** — and restructuring the spec's name object to align with this framework. It also proposes integrating component anatomy into the design data model and separating it from token styling surfaces, which are currently conflated in the registry.

This builds on:
- [#661 — Spectrum Design System Glossary](https://github.com/adobe/spectrum-design-data/discussions/661) (registry infrastructure)
- [#646 — Token Schema Structure and Validation System](https://github.com/adobe/spectrum-design-data/discussions/646) (analytical model)
- [#714 — Design Data Specification (umbrella)](https://github.com/adobe/spectrum-design-data/discussions/714)
- Nate Baldwin's "Naming conventions & shared taxonomy" onsite presentation (April 1, 2026)

## Motivation

"Naming conventions" is too broad a term for use when discussing malleability across platform teams. A token name like `accent-background-color-hover` embeds multiple independent decisions:

1. **Which concepts** are represented and in what hierarchy → taxonomy
2. **Which words** describe each concept → vocabulary
3. **How the words are rendered** (casing, delimiters, abbreviations, order) → formatting

Each layer has a different malleability profile:

| Layer | Shared? | Platform-malleable? |
|---|---|---|
| **Token taxonomy** | Yes — shared concept hierarchy | No — changing order/categories changes meaning |
| **Token term vocabulary** | Yes — canonical terms at foundation level | Partially — platforms can map terms (e.g. `hover` → `highlighted` for iOS) |
| **Formatting style** | Default exists for legacy compat | Yes — platforms own casing, delimiters, abbreviations |

Additionally, the current spec's name object has a single `property` field that conflates multiple concepts (component anatomy, styling surface, CSS property). This makes structured querying and validation difficult.

## Proposal

### 1. Restructured name object

The current name object fields:
```
property (REQUIRED), component, variant, state, colorScheme, scale, contrast
```

Proposed name object aligned with a semantic/layout token taxonomy:

**Semantic fields** (advisory validation against registry):

| Field | Category | Description |
|---|---|---|
| `property` | Property | Narrowed: now just the CSS/styling attribute (color, width, padding, gap) |
| `component` | Component | Component scope (button, checkbox, etc.) |
| `structure` | Structure | Reusable visual patterns across components (base, container, list, accessory) |
| `substructure` | Sub-structure | Child within a structure (e.g. "item" in "list-item") |
| `anatomy` | Anatomy | Visible named part of a component (icon, label, track, handle) |
| `object` | Object | Styling surface (background, border, edge, visual) |
| `variant` | Variant | Variant within a component |
| `state` | State | Interactive or semantic state |
| `orientation` | Orientation | Direction/order (vertical, horizontal) |
| `position` | Position | Location relative to another object (affixed) |
| `size` | Size | Relative t-shirt sizing (small, medium, large) |
| `density` | Density | Space within/around component parts (spacious, compact) |
| `shape` | Shape | Overall component shape (uniform) |

**Dimension fields** (strict validation against declared modes):

| Field | Description |
|---|---|
| `colorScheme` | light / dark / wireframe |
| `scale` | Platform density (desktop, mobile) — distinct from semantic `size` |
| `contrast` | Contrast level (regular, high) |
| Additional keys | Platform-declared dimensions |

### 2. Component anatomy vs. token objects

These are currently conflated in `anatomy-terms.json` (24 terms) but serve different purposes:

**Component anatomy** — the visible, named parts of a component as defined by designers. Appears in component specification diagrams. Should be declared per component in component schemas.

An audit of 65 S2 component docs found 133 unique anatomy terms across three tiers:
- **Primitives** (~25-30): Reusable across many components — icon, label, track, handle, fill, title, description, container
- **Composites** (~15-20): Another component used as a part — checkbox, close button, popover, avatar
- **Component-specific** (~40+): Unique to one component — loupe, gripper, tour step counter

**Token objects / styling surfaces** — where a visual property is applied on a UI element. NOT anatomy. Only 4 of 65 components list "background" as anatomy; for most, background is a styling surface, not a visible named part.

Current `anatomy-terms.json` terms like `background`, `border`, `edge`, `visual` belong in a separate `token-objects.json` registry.

### 3. Three registries

| Registry | Purpose | Validates field |
|---|---|---|
| Component Anatomy | Visible parts of components (from designer specs) | `anatomy` |
| Token Objects | Styling surfaces referenced in token names | `object` |
| Taxonomy Categories | Allowed values within each concept category | `structure`, `orientation`, `position`, `size`, `density`, `shape` |

Plus existing registries for `component`, `variant`, `state` (unchanged).

### 4. Formatting as serialization

The name object is unordered structured data. Concept ordering, casing, and delimiters are serialization concerns owned by the output formatter.

**Default serialization** (legacy format):
```
{component}-{structure}-{substructure}-{anatomy}-{object}-{property}-{orientation}-{position}-{size}-{density}-{shape}-{state}
```

**Platform manifests** can declare formatting rules:
- `conceptOrder` — ordered list of fields for serialization
- `casing` — kebab-case, camelCase, PascalCase, SCREAMING_SNAKE_CASE
- `delimiter` — character(s) separating concepts
- `abbreviations` — term → short form mappings

### 5. Platform dimension autonomy

Platform manifests should be able to:
- **Declare new dimensions** (e.g. iOS `framework: [UIKit, SwiftUI]`)
- **Restrict foundation dimension modes** (e.g. iOS `scale: [mobile]` only, excluding desktop)
- **Map vocabulary** (e.g. `hover` → `highlighted`)
- **Configure formatting** per platform

## Examples

**Legacy:** `accent-background-color-hover`
```json
{ "name": { "variant": "accent", "object": "background", "property": "color", "state": "hover" } }
```

**Semantic/layout:** `base-padding-vertical-small`
```json
{ "name": { "structure": "base", "property": "padding", "orientation": "vertical", "size": "small" } }
```

**With anatomy:** `slider-handle-width`
```json
{ "name": { "component": "slider", "anatomy": "handle", "property": "width" } }
```

**Same token, different platform formatting:**
```
accent-background-color-hover          (default, kebab-case)
ACCENT_BACKGROUND_COLOR_HOVER          (SCREAMING_SNAKE_CASE)
AccentBgColorHover                     (PascalCase + abbreviations)
accent-bgColor-hov                     (mixed case + abbreviations)
```

## Relationship to prior RFCs

| RFC | Relationship |
|---|---|
| [#661 — Glossary](https://github.com/adobe/spectrum-design-data/discussions/661) | Registry infrastructure this builds on. Phase 5 (RFC #646 reconciliation) is subsumed by this work. |
| [#646 — Token Schema](https://github.com/adobe/spectrum-design-data/discussions/646) | Analytical model that informed the original name object. This RFC evolves the name object with taxonomy alignment and anatomy integration. |
| [#714 — Spec umbrella](https://github.com/adobe/spectrum-design-data/discussions/714) | This RFC adds `taxonomy.md` to the spec document set. |
| [#715 — Distributed Architecture](https://github.com/adobe/spectrum-design-data/discussions/715) | Platform autonomy model for dimensions and formatting aligns with the distributed architecture vision. |

## Open questions

1. **Anatomy audit scope** — The 133 terms from S2 docs have significant data quality issues (compound entries, inconsistent naming). How much cleanup should block the spec work vs. be done incrementally?

2. **`property` field migration** — Making `property` REQUIRED but narrowing its semantics is a breaking change for existing cascade-format tokens. What migration path works for in-progress work?

3. **Taxonomy scoping** — The 8 categories above are for semantic/layout tokens. What other token type taxonomies need to be defined (color, typography, motion)?

4. **`structure` vs `component`** — Nate's presentation draws a clear distinction (structures are reusable visual patterns; components are specific UI elements). In practice, where does the line fall? Is a "card" a structure or a component?

5. **Validation strictness** — Should new taxonomy fields (`orientation`, `position`, `density`, `shape`) start as advisory warnings or strict errors?

6. **Platform dimension restrictions** — When iOS excludes `desktop` mode, should tokens with `scale: "desktop"` become invisible to iOS tooling, or should they resolve to the default?

## Implementation phases

1. **Component anatomy audit & schema integration** — Clean up S2 anatomy data, add anatomy to component schemas, split `anatomy-terms.json`
2. **Name object restructuring** — Update spec, schema, create `taxonomy.md`
3. **Formatting & serialization** — Document ordering as serialization, design formatting config
4. **Platform autonomy** — Structure manifest extensions for dimensions, vocabulary, formatting
5. **Registry ↔ spec validation bridge** — Per-field validation rules with tiered strictness
