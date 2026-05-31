# Document blocks

**Spec version:** `1.0.0-draft` (see [Overview](index.md))

This document defines **document blocks**: typed prose objects attachable to tokens, components, and anatomy parts. Blocks carry design guidance — intent, usage rules, accessibility notes, do/don't pairs, and examples — alongside the structured data they describe, making that guidance machine-readable and queryable by agents.

Design guidance like "accent backgrounds are for primary CTAs only" or "don't combine `negative` with `subtle`" previously lived in scattered Markdown documents invisible to the spec's resolver, validator, and agent surface. Document blocks attach that prose directly to the entities it describes so it cascades with the tokens and components it governs.

Inspired by the [Design System Documentation Spec (DSDS)](https://designsystemdocspec.org/) document-block model.

Scoped under RFC-D / Phase 9. See [rfc-coordination.md](../docs/rfc-coordination.md).

## Document block shape

A document block is a JSON object conforming to [`document-block.schema.json`](../schemas/document-block.schema.json).

### Required fields

| Field     | Type   | Description                              |
| --------- | ------ | ---------------------------------------- |
| `type`    | string | Block type — one of the five types below |
| `content` | string | Human-readable prose for this block      |

### Optional fields

| Field    | Type   | Description                                                 |
| -------- | ------ | ----------------------------------------------------------- |
| `agents` | string | LLM-tuned rephrasing of `content` for agent consumption     |
| `do`     | string | Recommended practice — meaningful only on `do-dont` blocks  |
| `dont`   | string | Anti-pattern to avoid — meaningful only on `do-dont` blocks |

**NORMATIVE:** `type` and `content` are required on every document block. A block with an empty string for either field **MUST** fail Layer 1 schema validation.

**NORMATIVE:** `do` and `dont` are defined on all block shapes (Layer 1 does not restrict them by type), but implementations SHOULD treat them as meaningful only on `do-dont` blocks. Using them on other block types is valid but has no defined semantics.

**RECOMMENDED:** When `agents` is present, its content SHOULD differ meaningfully from `content`. An `agents` value identical to `content` provides no agent-specific value and SHOULD be omitted or refined (see SPEC-028).

## Block types

### `purpose`

Describes the intent and design role of the entity. Answers "what is this for?"

```json
{
  "type": "purpose",
  "content": "Accent background tokens represent the primary brand call-to-action surface. They establish hierarchy by drawing attention to the most important interactive element on screen.",
  "agents": "Use accent-background tokens on the highest-priority interactive element. They signal 'primary action here' to users."
}
```

### `guideline`

A usage rule or constraint. Answers "how should this be used?"

```json
{
  "type": "guideline",
  "content": "Accent backgrounds should appear on no more than one element per focal area. Multiple accent surfaces compete for attention and dilute the hierarchy signal."
}
```

### `accessibility`

Accessibility notes specific to this entity — contrast behavior, screen reader considerations, or interaction semantics.

```json
{
  "type": "accessibility",
  "content": "Accent background tokens must maintain a minimum 3:1 contrast ratio against the surface they sit on in both light and dark schemes. The high-contrast mode-set variant provides an alternative that meets 4.5:1."
}
```

### `do-dont`

A paired recommended practice and anti-pattern. The `do` and `dont` fields carry the pairing; `content` provides context or a summary heading.

**NORMATIVE:** A `do-dont` block **MUST** include at least one of `do` or `dont`. A `do-dont` block with neither field **MUST** fail Layer 1 schema validation.

```json
{
  "type": "do-dont",
  "content": "Combining semantic backgrounds",
  "do": "Use accent-background for the primary CTA and informative-background for supporting UI.",
  "dont": "Combine accent-background with negative-background in the same focal area — both are high-attention surfaces and the pairing creates visual conflict."
}
```

### `examples`

Concrete usage examples — code snippets, component references, or scenario descriptions.

```json
{
  "type": "examples",
  "content": "A primary Button uses accent-background-color-default. A disabled Button uses gray-background-color-default. A destructive Button uses negative-background-color-default."
}
```

## Attachment points

**NORMATIVE:** Document blocks MAY be attached to the following entities. When `documentBlocks` is present, it **MUST** contain at least one block — an empty array **MUST** fail Layer 1 schema validation.

### Tokens

Add a `documentBlocks` array at the top level of a token object:

```json
{
  "name": { "property": "background-color", "variant": "accent" },
  "value": "#0265DC",
  "documentBlocks": [
    {
      "type": "purpose",
      "content": "Primary call-to-action background. Use for the most important interactive element in a focal area."
    },
    {
      "type": "guideline",
      "content": "Limit to one accent background per focal area to preserve hierarchy."
    }
  ]
}
```

### Components

Add a `documentBlocks` array at the top level of a component declaration:

```json
{
  "name": "button",
  "displayName": "Button",
  "meta": { "category": "actions", "documentationUrl": "https://spectrum.adobe.com/page/button/" },
  "documentBlocks": [
    {
      "type": "purpose",
      "content": "Buttons trigger an action or event, such as submitting a form, opening a dialog, or performing a destructive operation.",
      "agents": "Use Button when the user needs to trigger a discrete action. For navigation, use a Link instead."
    }
  ]
}
```

### Anatomy parts

Add a `documentBlocks` array within an anatomy part object:

```json
{
  "name": "label",
  "required": true,
  "description": "Button text visible to the user.",
  "documentBlocks": [
    {
      "type": "guideline",
      "content": "Button labels should be action verbs (Save, Delete, Submit). Avoid noun-only labels like 'Confirmation'."
    }
  ]
}
```

## SPEC rules

| Rule ID  | Severity | Name                                 | Assert                                                                   |
| -------- | -------- | ------------------------------------ | ------------------------------------------------------------------------ |
| SPEC-028 | warning  | document-block-agents-equals-content | A block's `agents` field SHOULD differ from `content`                    |
| SPEC-029 | warning  | document-block-missing-purpose       | An entity with `documentBlocks` SHOULD have at least one `purpose` block |

Both rules are `warning` severity — they do not block validation.

## `agents` field guidance

The `agents` field exists to let documentation authors provide LLM-optimized phrasing alongside human prose. Human content may use visual formatting cues, assumed visual context, or prose conventions that agents process poorly. The `agents` field carries alternative phrasing tuned for programmatic consumption.

**RECOMMENDED:** `agents` text SHOULD:

* Omit references to visual appearance that agents cannot act on ("the blue button")
* Use explicit, unambiguous phrasing ("Use Button when triggering an action, not Link")
* Include the token or component name explicitly rather than relying on surrounding context
* Be shorter and more directive than `content` where possible

When no agent-specific rephrasing is needed, omit the `agents` field entirely. A duplicate of `content` adds size with no benefit.
