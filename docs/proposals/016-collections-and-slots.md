<!-- Copyright 2026 Adobe. All rights reserved. -->

# Proposal 016: Collections in visual recipes, and slots later

**Status:** Part A (collections) built with the accordion in this change. Part B (slots) is a direction only; it needs the Spectrum team.\
**Affects:** `sdk/core/src/visual.rs` (`solve`), `packages/design-data-spec/schemas/component-visual.schema.json`, `spec/component-visuals.md` (Repeated roots), `packages/design-data/visuals/accordion.json`\
**Beads:** `p6ga.11.3` (accordion container, this change), `p6ga.11.4` (slots), `p6ga.20` (other collection components). Rules on `qkj5.71` (per-item open state).

## Problem

A recipe draws one root. A render of the accordion could show one item and `notVisual` listed `items` as unsupported, so no multi-item PNG was possible. Eight other components have the same shape (tabs, segmented control, breadcrumbs, steplist, menu, list view, side navigation, table rows).

## What the sources do

| Source                       | Container and item                                                                                                                                                                                                                                                                                                                                                                                                        | Direct content                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| React Spectrum S2            | `Accordion` (size, density, isQuiet, allowsMultipleExpanded, isDisabled) passes its options to each `AccordionItem` (`Disclosure`) by context. The item owns `isExpanded`, `isDisabled`. Same split for `Tabs`/`Tab`, `Breadcrumbs`/`Breadcrumb`, `SegmentedControl`/`SegmentedControlItem`, `Menu`/`MenuItem`.                                                                                                           | Children                                          |
| SWC gen 2                    | `swc-accordion` (`allow-multiple`, size, density, quiet, disabled) with a default slot for `swc-accordion-item`. The item has `open`, `disabled`, inherits `size`, and slots `label`, `actions` (untyped) and a default panel.                                                                                                                                                                                            | Untyped named slots                               |
| iOS (spectrum-ios, Sep 2025) | No accordion, tabs or list yet. `SPMenu` takes a `@ViewBuilder` content closure.                                                                                                                                                                                                                                                                                                                                          | Closures                                          |
| Figma S2 Web POC             | *Accordion* (Size, Density, Quiet) holds *Accordion item* instances (Open, State, Title, Show direct actions/action button/switch) plus a top divider. Menu, List view, Side navigation use a native SLOT whose preferred component is the item. Tabs, Segmented control, Breadcrumbs, Steplist use a count variant (2 to 5) with a private `.item`. Accordion item content, dialog body and table cell have a free SLOT. | Native SLOT, sometimes with a preferred component |

Our component data already treats an item as anatomy of the collection (`tab-item`, `menu-item`, `list-item`; bead `uep`), and an `items` array option holds the per-item fields. Components exist for parts reused across unrelated components only (`46d`).

## Part A: collections (built)

A recipe declares `repeat`:

```json
"repeat": {
  "option": "items",
  "label": "label",
  "with": { "isOpen": "isExpanded", "hasSwitch": "hasSwitch", "hasActionButton": "hasActionButton" }
}
```

* The renderer solves one request per entry. Container options reach every copy; an entry's fields (named by `with`, and `label`) override them. This is the S2 context model.
* The copies stack in a column, flush, at the widest copy's width. Node ids are `<root>-<n>` and `<root>-<n>.<part>`, the scheme nested recipes already use.
* No entries means one plain root with ids unchanged, so existing renders and goldens do not change.
* **Why in the recipe, not on the component option.** The solver sees only the compiled variant, never the component data, and the browser engine is the same code. The option already carries the item fields; the recipe says how to draw them.
* **No `accordion-item` component.** It would contradict the anatomy precedent and rename token owners, while the platforms' container/item split is already expressed by `items[]` plus anatomy.

Accordion keeps `isOpen`, `hasActionButton` and `hasSwitch` as options for a single-item render; the same names are item fields in `items[]`.

### Known gaps

* Figma draws a divider above the first item. The recipe has no container part, so it is not drawn.
* Entry fields are not checked against the option's item schema.
* Request states (hover, down) apply to every copy.
* The spec-sheet markers and the explorer's Anatomy view look up plain part names; with `items` set they see `item-1.title` and so on.
* `isMultiple` stays in `notVisual`: it changes behaviour, not the picture.

### Next

`p6ga.20`: declare `repeat` for tabs, segmented control, breadcrumbs, steplist, menu, list view and side navigation once each has a recipe.

## Part B: slots (direction)

The slot declaration (`component-format.md`) has `name`, `description`, `required`. The slot audit (`audits/slots.audit.md`, open question 3) asks for `accepts`, and the sources show three kinds:

1. **Collection slot**: repeats one item component (Part A covers the drawing).
2. **Content slot**: caller content, drawn as a placeholder when empty (accordion panel, dialog body; `qkj5.76`).
3. **Action slot**: SWC `actions`, replacing the `hasActionButton` and `hasSwitch` booleans.

This changes the component format, so it waits for the Spectrum team. Tracked in `p6ga.11.4`.
