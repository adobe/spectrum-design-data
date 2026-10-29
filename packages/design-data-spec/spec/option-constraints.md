<!-- Copyright 2026 Adobe. All rights reserved. -->

# Option constraints

## Problem

A component's `options` block lists the values each option accepts ([Component format](component-format.md#options)). It cannot say which *combinations* are valid. Today that knowledge lives in prose (for example Button's `icon` description: "Required when `isLabelHidden` is true") or in implementation code. Visual rendering exposed three cases for Button:

* `style: outline` is only designed for `primary` and `secondary`. Accent and negative outline have no spec.
* `staticColor` only restyles `primary` and `secondary`. Accent and negative render as usual.
* `icon` is required when `isLabelHidden` is true.

Without a machine-readable form, recipes drift (an accent `fill` rule leaks onto outline buttons), matrices render undefined states, and validators cannot flag either.

## Design

An optional `constraints` array on the component object, next to `options`.

```json
"constraints": [
  {
    "when": { "style": "outline" },
    "require": { "variant": ["primary", "secondary"] },
    "severity": "error",
    "description": "Outline style is only defined for primary and secondary.",
    "source": "react-spectrum S2 Button.tsx"
  },
  {
    "when": { "staticColor": ["white", "black"] },
    "require": { "variant": ["primary", "secondary"] },
    "severity": "advisory",
    "description": "Static color only changes primary and secondary."
  },
  {
    "when": { "isLabelHidden": true },
    "require": { "icon": { "present": true } },
    "severity": "error"
  }
]
```

### Constraint object

| Field         | Type   | Required | Description                                                                                                                                                        |
| ------------- | ------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `when`        | object | REQUIRED | Option conditions that select the combinations the rule applies to. Keys are option names; a value is a literal, or an array meaning any of. Conditions are ANDed. |
| `require`     | object | REQUIRED | What those combinations must satisfy. Keys are option names; a value is an array of permitted values, or `{ "present": true }` for presence.                       |
| `severity`    | string | REQUIRED | `error` (combination is invalid or undefined) or `advisory` (valid, but no distinct design).                                                                       |
| `description` | string | OPTIONAL | Plain-text rationale.                                                                                                                                              |
| `source`      | string | OPTIONAL | Where the rule comes from (design file, implementation, spec page).                                                                                                |

`when` uses the same option-matching form as visual-recipe `when` and relationship `scope.options`. A constraint is an "if this, then that" rule. Boolean composition (any/not across options) is out of scope and is answered together with the `visibleWhen` question in [Component visuals](component-visuals.md#open-questions).

### Semantics

**NORMATIVE:** A combination of option values that matches a constraint's `when` and violates its `require` is *excluded* at that constraint's severity.

* `error`: Tools **MUST NOT** present the combination as a supported state (matrices skip it). Validators **MUST** report recipes, relationships, or tokens that target only excluded combinations.
* `advisory`: Tools **SHOULD** still render the combination. Validators **SHOULD** warn only when a rule targets it as if it had distinct design.

Constraints are additive. They never change which values an option declares; they only restrict combinations.

## Rules

Not yet added to `rules/rules.yaml`.

| Rule     | Layer | Severity | Check                                                                                                                  |
| -------- | ----- | -------- | ---------------------------------------------------------------------------------------------------------------------- |
| SPEC-064 | 2     | error    | Every option name and value used in a constraint's `when` or `require` is declared in the component's `options`.       |
| SPEC-065 | 2     | warning  | A visual recipe rule or relationship `scope.options` that matches only combinations excluded by an `error` constraint. |

Layer 1 (`component.schema.json`) checks the `constraints` shape only. It cannot check that names exist.

## Consumers

* **Visual matrix and renderer:** skip combinations excluded by an `error` constraint; render `advisory` ones.
* **Hub and docs:** show excluded combinations as unavailable in option pickers.
* **Platform extensions:** no override in v1. If a platform allows a combination another forbids, add a per-platform override later, following the extension layering.

## Decisions

* **Name:** `constraints`. Slot constraints, if needed later, can use a separate field.
* **Severity:** `error` and `advisory` both ship in v1. "Valid but undesigned" combinations (Button accent with a static color) are common and need to be distinguishable from invalid ones.
* **Composition:** "if this, then that" only. Boolean composition (any/not across options) is deferred and decided together with `visibleWhen` in [Component visuals](component-visuals.md#open-questions).
* **Overrides:** an option that makes another irrelevant (checkbox `isIndeterminate` over `isSelected`) is an `advisory` constraint that requires the overridden option to hold its default. There is no separate "overrides" kind.
* **Scope:** foundation component files only. Platform extensions do not declare constraints in v1.
* **Accessible names:** not option constraints. They belong to [Accessibility](accessibility.md).
