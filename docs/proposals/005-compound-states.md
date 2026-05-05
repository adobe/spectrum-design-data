# Proposal 005: Compound States

**Status:** Draft\
**Affects:** 13 active tokens in `color-aliases.json`, `color-component.json`\
**Spec reference:** taxonomy.md — state field definition

## Problem

Some tokens encode two simultaneous states. The taxonomy has a single `state` field, but these tokens require expressing both a mode/selection state and an interaction state:

| Token                                       | States encoded                 |
| ------------------------------------------- | ------------------------------ |
| `neutral-background-color-selected-default` | `selected` + `default`         |
| `neutral-background-color-selected-hover`   | `selected` + `hover`           |
| `neutral-background-color-selected-down`    | `selected` + `down`            |
| `negative-border-color-focus-hover`         | `focus` + `hover`              |
| `neutral-content-color-focus-hover`         | `focus` + `hover`              |
| `stack-item-selected-background-color-*`    | `selected` + interaction state |
| `table-selected-row-background-*`           | `selected` + interaction state |

These are already partially tracked in `naming-exceptions.json` under the `compound-state` category (27 entries, including deprecated tokens).

## Proposal

Allow `state` to hold an ordered compound value using hyphenation.

### Ordering convention

The first state is the **mode state** (persistent selection or focus mode), the second is the **interaction state** (transient pointer/keyboard interaction):

```
{mode-state}-{interaction-state}
```

| Mode states | Interaction states                           |
| ----------- | -------------------------------------------- |
| `selected`  | `default`, `hover`, `down`, `keyboard-focus` |
| `focus`     | `hover`                                      |

### Examples

| Current token name                          | Proposed state value        |
| ------------------------------------------- | --------------------------- |
| `neutral-background-color-selected-default` | `state: "selected-default"` |
| `neutral-background-color-selected-hover`   | `state: "selected-hover"`   |
| `negative-border-color-focus-hover`         | `state: "focus-hover"`      |

### Validation

The states registry (`states.json`) already has `allowCustom: true` with pattern `^[a-z][a-z0-9-]*(\s\+\s[a-z][a-z0-9-]*)*$`. Compound states fit within this custom pattern.

Advisory validation should check that each segment of a compound state is a known state value.

## Impact

* 13 active tokens gain proper state representation
* No schema change needed — `state` field already accepts custom values
* Aligns with existing `allowCustom` pattern in states registry
* Small, self-contained change
