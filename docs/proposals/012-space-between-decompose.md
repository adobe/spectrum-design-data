# Proposal 012: Space-Between (Gap) Endpoint Decomposition — Triage

**Status:** Triage complete (04c.4); 04c.5 closed as a no-op (no qualifiers found in gap
tokens); 04c.3 registry/component-anatomy additions landed, including a SPEC-047 enhancement
to resolve compound anatomy+position endpoints (bucket 3) by splitting on a registered
position affix. 04c.6 (apply migration) remains.\
**Affects:** 432 distinct `(component, property)` tuples / 725 `-to-` token occurrences across `packages/design-data/tokens/layout-component.tokens.json`\
**Spec reference:** SPEC-047 (`space-between-endpoint-valid`), `fields/from.json`, `fields/to.json`

## Problem

Layout tokens encode the space between two anatomy endpoints as a compound `property` value using an `{a}-to-{b}` pattern (e.g. `bottom-to-text`, `item-to-item`, `edge-to-content`). These collide under the name object's single `anatomy` slot and were the last major un-decomposed property values (epic 04c).

Bead 04c.1 (merged in [#1216](https://github.com/adobe/spectrum-design-data/issues/1216)) decided the model: a new property term `space-between`, plus paired semantic fields `from`/`to` validated by SPEC-047 against a union domain (edge position ∪ generic anatomy term ∪ the referencing component's declared anatomy part). Bead 04c.2 landed the `naming.rs` serializer branch reconstructing the legacy `{from}-to-{to}` connective.

This proposal is the 04c.4 deliverable: classify every distinct base term against that union domain so 04c.3 (registry additions) and 04c.6 (apply migration) have a concrete work list instead of re-deriving it.

## Method

A one-off script (not committed — scratchpad tooling) walked every `-to-` property value, stripped known size (`sizes.json` tokenName), density (`densities.json` id, plus the implicit `regular` default), state (`states.json` id), and layout-qualifier suffixes/prefixes, then split on the `-to-` anchor to isolate the two endpoint terms. Each endpoint was classified against:

* `position` — `packages/design-data/registry/positions.json`
* `generic-anatomy` — `packages/design-data/registry/anatomy-terms.json`
* `component-declared` — the referencing component's own `anatomy[].name` array under `packages/design-data/components/`
* `UNKNOWN` — resolves against none of the above

110 distinct base terms were found (432 tuples collapse 4:1 once size/density/state/qualifier variants are stripped). **34 resolve cleanly today; 76 need a decision before 04c.6** — most because a term is genuinely missing from a registry or component declaration, not because the model is wrong.

## Triage classification

| base term                          | component(s)                                                                     | from                       | from category   | to                     | to category     | flag                          |
| ---------------------------------- | -------------------------------------------------------------------------------- | -------------------------- | --------------- | ---------------------- | --------------- | ----------------------------- |
| `action-to-navigation`             | stack-item                                                                       | `action`                   | UNKNOWN         | `navigation`           | UNKNOWN         | ⚠️ escalate                   |
| `bottom-to-color-handle`           | color-loupe                                                                      | `bottom`                   | position        | `color-handle`         | generic-anatomy |                               |
| `bottom-to-content-area`           | action-bar, rating                                                               | `bottom`                   | position        | `content-area`         | UNKNOWN         | ⚠️ escalate                   |
| `bottom-to-handle`                 | slider                                                                           | `bottom`                   | position        | `handle`               | generic-anatomy |                               |
| `bottom-to-label`                  | tree-view                                                                        | `bottom`                   | position        | `label`                | generic-anatomy |                               |
| `bottom-to-text`                   | accordion, alert-banner, breadcrumbs, side-navigation, steplist, tab-item, toast | `bottom`                   | position        | `text`                 | generic-anatomy |                               |
| `card-edge-to-content`             | card                                                                             | `card-edge`                | UNKNOWN         | `content`              | UNKNOWN         | ⚠️ escalate                   |
| `checkbox-to-text`                 | table                                                                            | `checkbox`                 | generic-anatomy | `text`                 | generic-anatomy |                               |
| `close-button-to-counter`          | action-bar                                                                       | `close-button`             | generic-anatomy | `counter`              | generic-anatomy |                               |
| `column-header-row-bottom-to-text` | table                                                                            | `column-header-row-bottom` | UNKNOWN         | `text`                 | generic-anatomy | ⚠️ escalate                   |
| `column-header-row-top-to-text`    | table                                                                            | `column-header-row-top`    | UNKNOWN         | `text`                 | generic-anatomy | ⚠️ escalate                   |
| `content-area-bottom-to-content`   | accordion                                                                        | `content-area-bottom`      | UNKNOWN         | `content`              | UNKNOWN         | ⚠️ escalate                   |
| `content-area-edge-to-content`     | accordion                                                                        | `content-area-edge`        | UNKNOWN         | `content`              | UNKNOWN         | ⚠️ escalate                   |
| `content-area-top-to-content`      | accordion                                                                        | `content-area-top`         | UNKNOWN         | `content`              | UNKNOWN         | ⚠️ escalate                   |
| `control-to-field-label`           | slider                                                                           | `control`                  | generic-anatomy | `field-label`          | generic-anatomy |                               |
| `control-to-text-field`            | slider                                                                           | `control`                  | generic-anatomy | `text-field`           | UNKNOWN         | ⚠️ escalate                   |
| `counter-to-disclosure`            | side-navigation                                                                  | `counter`                  | generic-anatomy | `disclosure`           | UNKNOWN         | ⚠️ escalate                   |
| `description-to-footer`            | card                                                                             | `description`              | generic-anatomy | `footer`               | generic-anatomy |                               |
| `disclosure-indicator-to-text`     | accordion                                                                        | `disclosure-indicator`     | UNKNOWN         | `text`                 | generic-anatomy | ⚠️ escalate                   |
| `drag-handle-to-checkbox`          | tree-view                                                                        | `drag-handle`              | UNKNOWN         | `checkbox`             | generic-anatomy | ⚠️ escalate                   |
| `drag-handle-to-control`           | stack-item                                                                       | `drag-handle`              | UNKNOWN         | `control`              | generic-anatomy | ⚠️ escalate                   |
| `edge-to-checkbox`                 | select-box, tree-view                                                            | `edge`                     | UNKNOWN         | `checkbox`             | generic-anatomy | ⚠️ escalate                   |
| `edge-to-clear-icon`               | tag                                                                              | `edge`                     | UNKNOWN         | `clear-icon`           | UNKNOWN         | ⚠️ escalate                   |
| `edge-to-close-button`             | standard-panel                                                                   | `edge`                     | UNKNOWN         | `close-button`         | generic-anatomy | ⚠️ escalate                   |
| `edge-to-content`                  | card, card-horizontal, coach-mark, select-box, table, tag-field                  | `edge`                     | UNKNOWN         | `content`              | UNKNOWN         | ⚠️ escalate                   |
| `edge-to-content-area`             | accordion, action-bar, popover, rating                                           | `edge`                     | UNKNOWN         | `content-area`         | UNKNOWN         | ⚠️ escalate                   |
| `edge-to-control`                  | stack-item                                                                       | `edge`                     | UNKNOWN         | `control`              | generic-anatomy | ⚠️ escalate                   |
| `edge-to-disclosure-icon`          | in-field-button                                                                  | `edge`                     | UNKNOWN         | `disclosure-icon`      | UNKNOWN         | ⚠️ escalate                   |
| `edge-to-disclosure-indicator`     | accordion                                                                        | `edge`                     | UNKNOWN         | `disclosure-indicator` | UNKNOWN         | ⚠️ escalate                   |
| `edge-to-drag-handle`              | tree-view                                                                        | `edge`                     | UNKNOWN         | `drag-handle`          | UNKNOWN         | ⚠️ escalate                   |
| `edge-to-fill`                     | in-field-button, in-field-progress-circle                                        | `edge`                     | UNKNOWN         | `fill`                 | generic-anatomy | ⚠️ escalate                   |
| `edge-to-hold-icon`                | action-button                                                                    | `edge`                     | UNKNOWN         | `hold-icon`            | generic-anatomy | ⚠️ escalate                   |
| `edge-to-indicator`                | side-navigation                                                                  | `edge`                     | UNKNOWN         | `indicator`            | generic-anatomy | ⚠️ escalate                   |
| `edge-to-text`                     | accordion, side-navigation                                                       | `edge`                     | UNKNOWN         | `text`                 | generic-anatomy | ⚠️ escalate                   |
| `edge-to-visual`                   | stack-item                                                                       | `edge`                     | UNKNOWN         | `visual`               | UNKNOWN         | ⚠️ escalate                   |
| `end-edge-to-action-area`          | tree-view                                                                        | `end-edge`                 | UNKNOWN         | `action-area`          | UNKNOWN         | ⚠️ escalate                   |
| `end-edge-to-content`              | list-view                                                                        | `end-edge`                 | UNKNOWN         | `content`              | UNKNOWN         | ⚠️ escalate                   |
| `end-edge-to-disclosure-icon`      | picker                                                                           | `end-edge`                 | UNKNOWN         | `disclosure-icon`      | UNKNOWN         | ⚠️ escalate                   |
| `end-edge-to-disclousure-icon`     | picker                                                                           | `end-edge`                 | UNKNOWN         | `disclousure-icon`     | UNKNOWN         | ⚠️ escalate — typo, see below |
| `end-edge-to-text`                 | breadcrumbs                                                                      | `end-edge`                 | UNKNOWN         | `text`                 | generic-anatomy | ⚠️ escalate                   |
| `end-to-content`                   | select-box                                                                       | `end`                      | position        | `content`              | UNKNOWN         | ⚠️ escalate                   |
| `header-row-checkbox-to-top`       | table                                                                            | `header-row-checkbox`      | UNKNOWN         | `top`                  | position        | ⚠️ escalate                   |
| `header-to-description`            | card                                                                             | `header`                   | generic-anatomy | `description`          | generic-anatomy |                               |
| `header-to-item`                   | side-navigation, stack-item, tree-view                                           | `header`                   | generic-anatomy | `item`                 | generic-anatomy |                               |
| `illustration-to-label`            | select-box                                                                       | `illustration`             | generic-anatomy | `label`                | generic-anatomy |                               |
| `indicator-to-content`             | side-navigation                                                                  | `indicator`                | generic-anatomy | `content`              | UNKNOWN         | ⚠️ escalate                   |
| `indicator-to-icon`                | rating                                                                           | `indicator`                | generic-anatomy | `icon`                 | generic-anatomy |                               |
| `item-label-to-description`        | menu                                                                             | `item-label`               | UNKNOWN         | `description`          | generic-anatomy | ⚠️ escalate                   |
| `item-to-divider`                  | accordion                                                                        | `item`                     | generic-anatomy | `divider`              | generic-anatomy |                               |
| `item-to-header`                   | side-navigation, tree-view                                                       | `item`                     | generic-anatomy | `header`               | generic-anatomy |                               |
| `item-to-item`                     | side-navigation, stack-item, tree-view                                           | `item`                     | generic-anatomy | `item`                 | generic-anatomy |                               |
| `item-top-to-disclosure-icon`      | menu                                                                             | `item-top`                 | UNKNOWN         | `disclosure-icon`      | UNKNOWN         | ⚠️ escalate                   |
| `label-to-action-area`             | tree-view                                                                        | `label`                    | generic-anatomy | `action-area`          | UNKNOWN         | ⚠️ escalate                   |
| `label-to-action-group-area`       | action-bar                                                                       | `label`                    | generic-anatomy | `action-group-area`    | UNKNOWN         | ⚠️ escalate                   |
| `label-to-clear-icon`              | tag                                                                              | `label`                    | generic-anatomy | `clear-icon`           | UNKNOWN         | ⚠️ escalate                   |
| `label-to-description`             | menu-item, select-box                                                            | `label`                    | generic-anatomy | `description`          | generic-anatomy |                               |
| `menu-item-edge-to-content`        | menu                                                                             | `menu-item-edge`           | UNKNOWN         | `content`              | UNKNOWN         | ⚠️ escalate                   |
| `menu-item-top-to-icon`            | menu                                                                             | `menu-item-top`            | UNKNOWN         | `icon`                 | generic-anatomy | ⚠️ escalate                   |
| `pagination-text-to-bottom-edge`   | coach-mark                                                                       | `pagination-text`          | UNKNOWN         | `bottom-edge`          | UNKNOWN         | ⚠️ escalate                   |
| `row-bottom-to-text`               | table                                                                            | `row-bottom`               | UNKNOWN         | `text`                 | generic-anatomy | ⚠️ escalate                   |
| `row-checkbox-to-top`              | table                                                                            | `row-checkbox`             | UNKNOWN         | `top`                  | position        | ⚠️ escalate                   |
| `row-top-to-text`                  | table                                                                            | `row-top`                  | UNKNOWN         | `text`                 | generic-anatomy | ⚠️ escalate                   |
| `section-header-to-description`    | menu                                                                             | `section-header`           | generic-anatomy | `description`          | generic-anatomy |                               |
| `separator-icon-to-bottom-text`    | breadcrumbs                                                                      | `separator-icon`           | UNKNOWN         | `bottom-text`          | UNKNOWN         | ⚠️ escalate                   |
| `separator-to-bottom-text`         | breadcrumbs                                                                      | `separator`                | generic-anatomy | `bottom-text`          | UNKNOWN         | ⚠️ escalate                   |
| `start-edge-to-content`            | stack-item                                                                       | `start-edge`               | UNKNOWN         | `content`              | UNKNOWN         | ⚠️ escalate                   |
| `start-edge-to-text`               | breadcrumbs                                                                      | `start-edge`               | UNKNOWN         | `text`                 | generic-anatomy | ⚠️ escalate                   |
| `start-edge-to-truncated-menu`     | breadcrumbs                                                                      | `start-edge`               | UNKNOWN         | `truncated-menu`       | generic-anatomy | ⚠️ escalate                   |
| `start-to-content`                 | select-box                                                                       | `start`                    | position        | `content`              | UNKNOWN         | ⚠️ escalate                   |
| `start-to-edge`                    | tab-item                                                                         | `start`                    | position        | `edge`                 | UNKNOWN         | ⚠️ escalate                   |
| `step-to-track-size`               | steplist                                                                         | `step`                     | generic-anatomy | `track-size`           | UNKNOWN         | ⚠️ escalate                   |
| `text-to-asterisk`                 | field-label                                                                      | `text`                     | generic-anatomy | `asterisk`             | UNKNOWN         | ⚠️ escalate                   |
| `text-to-control`                  | stack-item                                                                       | `text`                     | generic-anatomy | `control`              | generic-anatomy |                               |
| `text-to-separator`                | breadcrumbs                                                                      | `text`                     | generic-anatomy | `separator`            | generic-anatomy |                               |
| `text-to-visual`                   | date-field, date-picker, time-field                                              | `text`                     | generic-anatomy | `visual`               | UNKNOWN         | ⚠️ escalate                   |
| `text-to-visual-100`               | status-light                                                                     | `text`                     | generic-anatomy | `visual-100`           | UNKNOWN         | ⚠️ escalate                   |
| `text-to-visual-200`               | status-light                                                                     | `text`                     | generic-anatomy | `visual-200`           | UNKNOWN         | ⚠️ escalate                   |
| `text-to-visual-300`               | status-light                                                                     | `text`                     | generic-anatomy | `visual-300`           | UNKNOWN         | ⚠️ escalate                   |
| `text-to-visual-75`                | status-light                                                                     | `text`                     | generic-anatomy | `visual-75`            | UNKNOWN         | ⚠️ escalate                   |
| `thumbnail-to-top`                 | table                                                                            | `thumbnail`                | generic-anatomy | `top`                  | position        |                               |
| `top-text-to-bottom-text`          | breadcrumbs                                                                      | `top-text`                 | UNKNOWN         | `bottom-text`          | UNKNOWN         | ⚠️ escalate                   |
| `top-to-action-button`             | tree-view                                                                        | `top`                      | position        | `action-button`        | generic-anatomy |                               |
| `top-to-alert-icon`                | alert-banner                                                                     | `top`                      | position        | `alert-icon`           | UNKNOWN         | ⚠️ escalate                   |
| `top-to-asterisk`                  | field-label                                                                      | `top`                      | position        | `asterisk`             | UNKNOWN         | ⚠️ escalate                   |
| `top-to-avatar`                    | tag                                                                              | `top`                      | position        | `avatar`               | generic-anatomy |                               |
| `top-to-checkbox`                  | select-box, tree-view                                                            | `top`                      | position        | `checkbox`             | generic-anatomy |                               |
| `top-to-close-button`              | standard-panel                                                                   | `top`                      | position        | `close-button`         | generic-anatomy |                               |
| `top-to-content`                   | select-box                                                                       | `top`                      | position        | `content`              | UNKNOWN         | ⚠️ escalate                   |
| `top-to-content-area`              | action-bar, popover, rating, tray                                                | `top`                      | position        | `content-area`         | UNKNOWN         | ⚠️ escalate                   |
| `top-to-context-area`              | tree-view                                                                        | `top`                      | position        | `context-area`         | generic-anatomy |                               |
| `top-to-control`                   | checkbox, radio-button, switch                                                   | `top`                      | position        | `control`              | generic-anatomy |                               |
| `top-to-cross-icon`                | tag                                                                              | `top`                      | position        | `cross-icon`           | UNKNOWN         | ⚠️ escalate                   |
| `top-to-disclosure-indicator`      | tree-view                                                                        | `top`                      | position        | `disclosure-indicator` | UNKNOWN         | ⚠️ escalate                   |
| `top-to-dot`                       | status-light                                                                     | `top`                      | position        | `dot`                  | generic-anatomy |                               |
| `top-to-drag-handle`               | tree-view                                                                        | `top`                      | position        | `drag-handle`          | UNKNOWN         | ⚠️ escalate                   |
| `top-to-item-counter`              | action-bar                                                                       | `top`                      | position        | `item-counter`         | UNKNOWN         | ⚠️ escalate                   |
| `top-to-label`                     | tree-view                                                                        | `top`                      | position        | `label`                | generic-anatomy |                               |
| `top-to-separator`                 | breadcrumbs                                                                      | `top`                      | position        | `separator`            | generic-anatomy |                               |
| `top-to-separator-icon`            | breadcrumbs                                                                      | `top`                      | position        | `separator-icon`       | UNKNOWN         | ⚠️ escalate                   |
| `top-to-text`                      | accordion, alert-banner, breadcrumbs, tab-item, toast                            | `top`                      | position        | `text`                 | generic-anatomy |                               |
| `top-to-thumbnail`                 | menu-item                                                                        | `top`                      | position        | `thumbnail`            | generic-anatomy |                               |
| `top-to-truncated-menu`            | breadcrumbs                                                                      | `top`                      | position        | `truncated-menu`       | generic-anatomy |                               |
| `top-to-workflow-icon`             | alert-banner, help-text, tab-item, toast                                         | `top`                      | position        | `workflow-icon`        | generic-anatomy |                               |
| `trailing-accessory-area-to-edge`  | side-navigation                                                                  | `trailing-accessory-area`  | UNKNOWN         | `edge`                 | UNKNOWN         | ⚠️ escalate                   |
| `truncated-menu-to-bottom-text`    | breadcrumbs                                                                      | `truncated-menu`           | generic-anatomy | `bottom-text`          | UNKNOWN         | ⚠️ escalate                   |
| `truncated-menu-to-separator`      | breadcrumbs                                                                      | `truncated-menu`           | generic-anatomy | `separator`            | generic-anatomy |                               |
| `truncated-menu-to-separator-icon` | breadcrumbs                                                                      | `truncated-menu`           | generic-anatomy | `separator-icon`       | UNKNOWN         | ⚠️ escalate                   |
| `visual-to-disclosure-icon`        | picker                                                                           | `visual`                   | UNKNOWN         | `disclosure-icon`      | UNKNOWN         | ⚠️ escalate                   |
| `visual-to-field-button`           | combo-box, date-picker                                                           | `visual`                   | UNKNOWN         | `field-button`         | UNKNOWN         | ⚠️ escalate                   |
| `visual-to-in-field-stepper`       | number-field                                                                     | `visual`                   | UNKNOWN         | `in-field-stepper`     | UNKNOWN         | ⚠️ escalate                   |

## Escalations

Every `UNKNOWN` above falls into one of four buckets — none silently resolved here, all deferred to 04c.3 (registry / component-anatomy additions) or 04c.6 (data fixes):

1. **Missing generic vocabulary** — reusable across many components, candidates for `anatomy-terms.json` (generic, not component-scoped): `content`, `visual`, `action`, `navigation`, `disclosure`. And for `positions.json` (edge-family): `edge`, `end-edge`, `start-edge`, `bottom-edge`. These account for the bulk of escalations (`edge-to-*`, `*-to-content`, `text-to-visual*`, `visual-to-*`, `action-to-navigation`, `counter-to-disclosure`).

2. **Component-specific multi-word parts** — per the epic's component-declared-anatomy strategy, these should be added to the *owning component's* `anatomy[]` array, not a shared registry: `content-area`, `action-area`, `action-group-area`, `drag-handle`, `disclosure-indicator`, `disclosure-icon`, `clear-icon`, `alert-icon`, `cross-icon`, `field-button`, `in-field-stepper`, `text-field`, `item-counter`, `track-size`, `trailing-accessory-area`, `separator-icon`, `asterisk`. (`visual-100/200/300/75` on `status-light` are numbered severity-dot variants of `visual` — likely a `variant`-qualified anatomy part rather than four distinct anatomy ids; flag for 04c.3 to confirm with the component owner.)

3. **Compound anatomy+position endpoints** — a single term fuses an anatomy part with a position/row-scope and won't validate as one `from`/`to` value under SPEC-047's flat union: `card-edge`, `content-area-bottom/edge/top`, `column-header-row-bottom/top`, `row-bottom/top`, `row-checkbox`, `header-row-checkbox`, `menu-item-edge/top`, `item-top`, `item-label`, `top-text`/`bottom-text` (breadcrumbs), `pagination-text`. These need an explicit decision in 04c.3/04c.6: split into `{component-context}` + a plain position/anatomy pair, or accept as an atomic declared anatomy part on the owning component. Recommend the latter (smallest change) unless a term needs to compose with unrelated positions elsewhere.

4. **Data-quality fix** — `end-edge-to-disclousure-icon` (picker) is a typo duplicate of the correctly-spelled `end-edge-to-disclosure-icon`; normalize to `disclosure-icon` during 04c.6's apply pass rather than registering the misspelling. `card-edge-to-content` (card) is a second case in the same family: `card` already uses bare `edge` elsewhere (`edge-to-content`), so `card-edge` is a redundant self-referential prefix rather than new vocabulary — normalize to `edge` during 04c.6 instead of registering `card-edge`.

No terms were flagged as padding-vs-gap semantic mismatches on inspection — the `edge-to-content`-shaped tokens are consistently used as true endpoint gaps (component edge → inner content), so `space-between` applies uniformly; no `property` exceptions to carve out.

## 04c.3 resolution (registry additions)

Bucket 1 landed in full as proposed. Bucket 2 shrank considerably: five terms used across
multiple components — `content-area`, `disclosure-indicator`, `disclosure-icon`, `drag-handle`,
`field-button` — were promoted to generic `anatomy-terms.json` rather than duplicated per
component (this also sidesteps `stack-item` and `in-field-button`, which are referenced as
`component` values in gap tokens but have no component definition file to hold a component-
scoped `anatomy[]`). The remaining component-specific parts landed on their owning components:
`action-group-area`/`item-counter` (action-bar), `action-area` (tree-view), `clear-icon`/
`cross-icon` (tag), `alert-icon` (alert-banner), `in-field-stepper` (number-field), `text-field`
(slider), `track-size` (steplist), `trailing-accessory-area` (side-navigation), `separator-icon`
(breadcrumbs), `asterisk` (field-label), `item-label`/`menu-item` (menu), `visual-75/100/200/300`
(status-light, registered as four distinct ids rather than a `variant`-qualified part — smallest
change, no schema impact), `column-header-row`/`row`/`row-checkbox`/`header-row-checkbox`
(table), `pagination-text` (coach-mark).

Bucket 3 resolved via **split**, not atomic registration: SPEC-047 now retries an unresolved
endpoint by stripping a registered position as a hyphen-bounded prefix or suffix and validating
the remainder against the anatomy union (see `endpoint_resolves` in `spec047.rs`). This means
`item-top` and `top-text`/`bottom-text` resolve with **no new registry entries at all** — `item`
and `text` were already generic anatomy, `top`/`bottom` already positions. `content-area-bottom/
edge/top`, `column-header-row-bottom/top`, and `row-bottom/top` resolve the same way once their
base parts (`content-area`, `column-header-row`, `row`) are registered above. `row-checkbox` and
`header-row-checkbox` don't fuse with a position (`checkbox` isn't one), so they're registered as
atomic parts on `table` instead, per the doc's original recommendation for that sub-case.

## Next steps

* ~~**04c.3**~~ — done; see resolution above.
* ~~**04c.5**~~ — closed as a no-op; no qualifiers found in the gap tokens.
* **04c.6** — apply migration, including the `disclousure` → `disclosure` and `card-edge` → `edge`
  data fixes.
