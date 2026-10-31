# Anatomy format

**Spec version:** `1.0.0-draft` (see [Overview](index.md))

This document defines the normative **anatomy part declaration** object: the named visual sub-parts of a component that appear as values of the `anatomy` field in token name objects. Anatomy declarations complete the machine-readable contract introduced by the component declaration (see [Component format — Anatomy stub](component-format.md#anatomy-stub)) and enable cross-reference validation between tokens and component surfaces.

Scoped under [RFC-A — Component Contract in Design Data Spec](https://github.com/adobe/spectrum-design-data/discussions/832). See also [Component format](component-format.md).

## Anatomy part object

An anatomy part is a **JSON object** that appears as an element of a component declaration's `anatomy` array. Each anatomy part object **MUST** validate against the standalone schema [`anatomy-part.schema.json`](../schemas/anatomy-part.schema.json) (canonical `$id`: `https://opensource.adobe.com/spectrum-design-data/schemas/v0/anatomy-part.schema.json`).

**NORMATIVE:** `anatomy` **MUST** be a JSON array within the component declaration. Each element **MUST** be an anatomy part object.

### Fields

| Field         | Type             | Required | Description                                                                                                              |
| ------------- | ---------------- | -------- | ------------------------------------------------------------------------------------------------------------------------ |
| `name`        | string           | REQUIRED | Kebab-case identifier. **MUST** match the pattern `^[a-z][a-z0-9-]*$`.                                                   |
| `description` | string           | OPTIONAL | Plain-text description of the part's visual role and boundaries.                                                         |
| `required`    | boolean          | OPTIONAL | Whether this part is always rendered regardless of configuration. Default: `false`.                                      |
| `presentIn`   | array of strings | OPTIONAL | Declared component states in which the part is present. Absent means any state — see [`presentIn`](#presentin).          |
| `contains`    | array of strings | OPTIONAL | Informative list of child anatomy part names nested within this part (e.g. a `field` contains `["label", "help-text"]`). |
| `lifecycle`   | object           | OPTIONAL | Version lifecycle metadata for this anatomy part — see [lifecycle](#lifecycle).                                          |

**NORMATIVE:** No properties beyond those listed above are permitted in an anatomy part object. Additional fields **MUST** cause a Layer 1 schema error.

### `name`

**NORMATIVE:** `name` **MUST** match the pattern `^[a-z][a-z0-9-]*$` — lower-case kebab-case, non-empty.

**NORMATIVE:** `name` **MUST** be unique within the `anatomy` array of a single component declaration (rule SPEC-024). Duplicate `name` values on the same component are a validation error.

**NORMATIVE:** Token name-object `anatomy` field values referencing a component **MUST** match the `name` of a declared anatomy part on that component (rule SPEC-020). An undeclared `anatomy` value is a validation error.

### `description`

**OPTIONAL.** A plain-text description of the anatomy part's visual role (e.g. `"Background fill track behind the progress indicator."`).

**RECOMMENDED:** Custom anatomy part names (those outside the [canonical anatomy vocabulary](#canonical-anatomy-vocabulary)) **SHOULD** include a `description` to document intent (rule SPEC-023 fires a warning for undocumented custom names).

### `required`

**OPTIONAL.** A boolean indicating whether the anatomy part is always present in the component's rendered output, regardless of its configuration options. Defaults to `false`.

When `required` is `true`, the anatomy part is unconditionally rendered (e.g. a `label` that cannot be hidden). When `false` or omitted, the part may or may not appear depending on component props.

### `contains`

**OPTIONAL.** A list of child anatomy part `name` values that are visually or structurally nested within this part.

**RECOMMENDED:** When a part logically encloses other declared anatomy parts, authors **SHOULD** use `contains` to make the nesting explicit, rather than declaring the children only as flat, unrelated parts.

Each string in `contains` **MUST** match the pattern `^[a-z][a-z0-9-]*$`. References to anatomy part names not declared on the same component are permitted (they may refer to sub-component anatomy in layered designs), but a reference that cannot be resolved against the same component's declared parts triggers an advisory warning (rule SPEC-048, `anatomy-contains-resolves`) — it is not an error.

**Authoring convention — flat vs. nested:** declare a part as a flat leaf when it has no meaningful internal sub-structure of its own (e.g. `label`, `icon`). Declare a part with `contains` when it is a composite that visually groups other declared parts (e.g. a `menu-item` row containing an `icon` and a `label`, or a `list-item` row containing a `checkbox`, `thumbnail`, and `label`). Prefer the canonical vocabulary (below) for children where the semantics match, falling back to a documented custom name (SPEC-023) otherwise.

### `lifecycle`

**OPTIONAL.** A version lifecycle object tracking the history of this anatomy part. Uses the same shape as the component-level `lifecycle` block (see [Component format — Lifecycle](component-format.md#lifecycle)).

| Field               | Type   | Description                                                                                    |
| ------------------- | ------ | ---------------------------------------------------------------------------------------------- |
| `deprecated`        | string | Spec version when this anatomy part was deprecated. A truthy string signals deprecation.       |
| `deprecatedComment` | string | Human-readable explanation of the deprecation and migration path (e.g. `"Renamed to thumb."`). |
| `replacedBy`        | string | `name` of the replacement anatomy part.                                                        |

**ADVISORY:** When an anatomy part carries a `lifecycle.deprecated` value, non-deprecated tokens that reference this anatomy part via `name.anatomy` **SHOULD** be updated to remove or replace the reference. Rule SPEC-037 fires an advisory warning for such references to prompt migration.

```json
"anatomy": [
  {
    "name": "field",
    "description": "Input field wrapper enclosing the label and help text.",
    "contains": ["label", "help-text"]
  },
  { "name": "label",     "description": "Primary text label.", "required": true },
  { "name": "help-text", "description": "Guidance text below the field." }
]
```

## What is an anatomy part

Anatomy describes a component in terms a designer on any platform would recognize. It is not a description of how one renderer builds the component.

**NORMATIVE:** A part **MUST** be both:

1. **Visible**: it draws something (a fill, border, mark, glyph or text) in at least one state or configuration the component declares.
2. **Styled on its own**: at least one visual property belongs to it alone, whether a token, a relationship context, or a fixed design decision. A visible piece with nothing of its own to style belongs to its parent.

A token is not required. A part with only fixed decisions (a corner triangle, say) still counts.

### State-only parts

A part that appears only in some interaction states (the focus indicator) belongs in the default anatomy, because it is part of the component's design. Mark it with `presentIn`. A part driven by an option instead (a checkmark while selected, a progress circle while pending) is simply optional; the visual recipe says when it shows with `visibleWhen.options`.

#### `presentIn`

**OPTIONAL.** A list of declared component state names in which the part is present. The part is drawn when **any** listed state is active, and not otherwise. Absent means the part can appear in any state. Each entry **SHOULD** match a `states[].name` declared on the same component (rule SPEC-074), and for a part that also appears in a visual recipe, the recipe's `visibleWhen.states` **SHOULD** agree (rule SPEC-075). Conditions on options stay in the visual recipe; `presentIn` is only for state names.

`presentIn` says whether a part is present, not how it is styled. A color, border or size that changes with a state (a hover fill, a down scale) is not presence: it belongs in the relationships and the recipe, and **MUST NOT** be recorded on the part.

**NORMATIVE:** A part with `presentIn` **MUST NOT** also be `required: true`, because a required part is present in every state. Layer 1 rejects the combination.

State names follow the state registry. Use `focus` for the focus state.

### Naming

**NORMATIVE:** Part names **MUST** be general and platform-neutral:

* Use a registry term (`anatomy-terms.json`) when one fits. Otherwise use a new name with a `description` (SPEC-023, SPEC-035).
* Use a singular noun in kebab-case.
* Name the part for its role, not its shape or construction: `focus-indicator`, not `ring` or `outline`.
* Do not use platform words (`wrapper`, `slot`, `host`, `root`, `view`, `pseudo`).
* Do not repeat the component name (`label`, not `button-label`).

### Nesting

**NORMATIVE:** `contains` **MUST** describe visual enclosure: the parent visibly bounds its children, or its own styling (background, padding, border) frames them. It **MUST NOT** record DOM or layout nesting. A part has at most one parent. A state-only part may be contained by the part it surrounds.

### Required and optional

**NORMATIVE:** `required: true` means the part is drawn in every configuration and every declared state. A part that an option can remove (an icon, a label hidden in an icon-only layout) is optional.

### What is not anatomy

The following **MUST NOT** be declared as parts:

* Platform wrappers and hosts.
* Layout helpers: gaps, spacers, alignment boxes, stacks.
* Hit areas and accessibility-only elements: hidden inputs, live regions, hidden text.
* Elements that exist only so one renderer works: clip layers, pseudo-elements, a second element used to fake a border.
* A grouping that has no style of its own, such as a `control` that only wraps a `box` and a `checkmark`.

Another component shown inside this one (for example the progress circle in a button) is a part only when the host component styles it as its own role.

### Review checklist

Anatomy is hand-written and has to be reviewed against this chapter before recipes depend on it. For each part:

1. Is it visible in at least one declared state or option?
2. Does it have a style of its own?
3. Would someone on web, iOS, Android and in Figma recognize it without explanation?
4. Is it free of anything that exists only to make one renderer work?
5. Does its name follow the naming rules, using a registry term when one fits?
6. Is `required` correct for every configuration and every state?
7. Does `presentIn` list every state the part is present in, and only those? (Required for state-only parts.) Is any state-dependent styling kept off the part?
8. Does each `contains` entry describe visual enclosure?

For the component:

9. Does every token `name.anatomy` and every relationship context part resolve to a declared part, with no orphan parts?
10. Is every visible piece with its own style declared? Check against the guidelines and states, not one platform's code.

### `anatomyReview`

The component declaration carries the review result next to `anatomy`:

```json
"anatomyReview": { "status": "reviewed", "reviewedIn": "1.0.0-draft", "notes": "Dropped control; focus-indicator now state-only." }
```

`status` is `draft` or `reviewed`. A component with anatomy and no `anatomyReview` is `draft`. A recipe **SHOULD** only depend on `reviewed` anatomy. Rule SPEC-073 reports, at info level, the components that have relationships but no anatomy and those whose anatomy is still `draft`.

## Canonical anatomy vocabulary

The following anatomy part names are defined by the cross-platform design audit and **SHOULD** be used in preference to custom names when their semantics match. Using canonical names enables cross-component tooling, documentation generation, and token audits.

| Name                  | Semantics                                                                |
| --------------------- | ------------------------------------------------------------------------ |
| `body`                | Primary content area of a component (e.g. card body, dialog body).       |
| `checkmark`           | Selection indicator used in checkbox or radio components.                |
| `disclosure-triangle` | Expand/collapse indicator for accordion, tree, or disclosure components. |
| `field`               | Input field wrapper (encloses label, input surface, and help text).      |
| `handle`              | Drag handle for resizable or sortable components.                        |
| `header`              | Top section of a panel, card, or dialog.                                 |
| `icon`                | Decorative or semantic icon placed within a component.                   |
| `label`               | Primary text label identifying the component or its value.               |
| `picker`              | Dropdown trigger area (the visible affordance, not the overlay).         |
| `progress-bar`        | Visual progress fill track indicating completion level.                  |
| `swatch`              | Color or pattern preview area.                                           |
| `thumbnail`           | Image preview area within a component.                                   |
| `track`               | Background rail for slider or progress bar components.                   |
| `value`               | Numeric or text display value shown within a component.                  |

Custom part names are permitted. When a custom name is used, the anatomy part object **SHOULD** include a `description` field explaining its visual role (rule SPEC-023).

The table above is informative; the authoritative vocabulary is `@adobe/spectrum-design-data/registry/anatomy-terms.json` (140 entries). SPEC-035 fires advisory warnings when a declared anatomy part `name` is not in that registry, pointing authors at the canonical list. Custom names remain valid — SPEC-035 is advisory, not an error.

## Cross-reference with token name objects

Token name objects use an `anatomy` field to scope a token to a specific visible part of a component. The `anatomy` field value must correspond to a part declared in the component's `anatomy` array.

**NORMATIVE:** A token name-object `anatomy` field value **MUST** match the `name` of a declared anatomy part on the component identified by the token's `component` field (rule SPEC-020). An `anatomy` value that does not match any declared part name is a validation error.

See [Token format — Name object](token-format.md#name-object) for the full name object field catalog.

**NORMATIVE:** The `anatomy` field in a token name object **MUST NOT** be present unless the token's `component` field is also present (rule SPEC-025). Anatomy is always scoped to a component.

```json
{
  "name": {
    "component": "slider",
    "anatomy": "handle",
    "property": "background-color",
    "state": "hover"
  },
  "value": "#0265dc"
}
```

## SPEC rules

The following rules in the Layer 2 rule catalog (`rules/rules.yaml`) apply to anatomy part declarations. SPEC-020 was introduced in Phase 6.1 (component-format); SPEC-023, SPEC-024, and SPEC-025 are introduced by this chapter.

| Rule ID  | Name                                | Severity | Assert                                                                                                                                                                                                                       |
| -------- | ----------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SPEC-020 | `component-anatomy-valid`           | error    | Token `anatomy` field value **MUST** match the `name` of a declared anatomy part on the referenced component.                                                                                                                |
| SPEC-023 | `anatomy-custom-part-documented`    | warning  | Anatomy part declarations with a `name` outside the canonical anatomy vocabulary **SHOULD** include a `description` field documenting the part's purpose.                                                                    |
| SPEC-024 | `anatomy-part-name-unique`          | error    | Anatomy part `name` values **MUST** be unique within a single component's `anatomy` array.                                                                                                                                   |
| SPEC-025 | `anatomy-requires-component`        | error    | A token name object **MUST NOT** include an `anatomy` field unless a `component` field is also present.                                                                                                                      |
| SPEC-035 | `anatomy-part-name-registry-sync`   | warning  | A component anatomy part's `name` **SHOULD** appear in the canonical anatomy-terms registry (`anatomy-terms.json`).                                                                                                          |
| SPEC-037 | `sub-entity-deprecation-cascade`    | warning  | A non-deprecated token **SHOULD NOT** reference a deprecated anatomy part via `name.anatomy`. Advisory warning prompts migration.                                                                                            |
| SPEC-048 | `anatomy-contains-resolves`         | warning  | An anatomy part's `contains` entries **SHOULD** match the `name` of another part declared on the same component. Advisory warning for unresolved entries.                                                                    |
| SPEC-073 | `component-anatomy-reviewed`        | info     | A component with relationships **SHOULD** declare anatomy, and its anatomy **SHOULD** be `reviewed` (see [`anatomyReview`](#anatomyreview)). One report for the whole dataset.                                               |
| SPEC-074 | `anatomy-present-in-declared`       | warning  | Every `presentIn` entry **SHOULD** match a state declared on the component, after state-name normalization (`focus`, `key-focus` and `keyboard-focus` are one state).                                                        |
| SPEC-075 | `visual-present-in-matches-anatomy` | warning  | A recipe part's `visibleWhen.states` **SHOULD** agree with the `presentIn` of the anatomy part of the same name. Info when either lists more than one state, since `visibleWhen.states` means all and `presentIn` means any. |

## Full example

A complete `anatomy` array for a slider component, demonstrating canonical names, a custom name, and `contains` usage:

```json
"anatomy": [
  {
    "name": "track",
    "description": "Background rail spanning the slider's full range.",
    "required": true
  },
  {
    "name": "progress-bar",
    "description": "Filled portion of the track indicating the current value.",
    "required": true
  },
  {
    "name": "handle",
    "description": "Draggable thumb positioned at the current value.",
    "required": true
  },
  {
    "name": "label",
    "description": "Text label identifying the slider.",
    "required": false
  },
  {
    "name": "value",
    "description": "Numeric display of the current slider value.",
    "required": false
  },
  {
    "name": "tick-marks",
    "description": "Discrete step indicators along the track. Present only when step markers are enabled.",
    "required": false
  },
  {
    "name": "range-group",
    "description": "Wrapper grouping the track and both handles for a range slider variant.",
    "required": false,
    "contains": ["track", "progress-bar", "handle"]
  }
]
```

In this example, `tick-marks` and `range-group` are custom names outside the canonical vocabulary. Both include a `description` to satisfy rule SPEC-023. The `range-group` part uses `contains` to declare that it encloses `track`, `progress-bar`, and `handle`.
