# Slots Audit — Phase 6.0 Component Contract

**Status**: Draft\
**Date**: 2026-05-12\
**Scope**: Web (SWC + RSP) + iOS (spectrum-ios Preview). Android not yet accessible.\
**Purpose**: Decide whether `slots` belongs in the RFC-A v1 component-format schema.

***

## Background

This audit inventories the current slot surface across Spectrum component implementations. "Slots" here means named content-projection points: shadow DOM `<slot>` elements in SWC, named `ReactNode` props in RSP, and `@ViewBuilder` closure parameters in iOS SwiftUI.

The current `@adobe/spectrum-component-api-schemas` does **not** capture slots. Fields like `label` and `icon` exist as **data props** (text strings and workflow-icon refs), not as content-injection declarations. This is the gap RFC-A v1 must decide whether to close.

***

## Platform Inventory

### Platform 1: Spectrum Web Components (SWC)

Source: `~/Spectrum/spectrum-web-components/1st-gen/packages/`\
Coverage: 37 components audited, all with `@slot` JSDoc annotations and shadow DOM `<slot>` declarations.

#### Summary table (components with named slots)

| Component           | Named slots (beyond default)                                     |
| ------------------- | ---------------------------------------------------------------- |
| accordion           | — (default only)                                                 |
| action-bar          | — (default only)                                                 |
| action-button       | `icon`                                                           |
| alert-banner        | `action`                                                         |
| badge               | `icon`                                                           |
| breadcrumbs         | `icon` (action menu icon), `root`                                |
| button              | `icon`                                                           |
| checkbox            | — (default only)                                                 |
| close-button        | — (default only)                                                 |
| coachmark           | `cover-photo`, `heading`, `description`, `actions`, `step-count` |
| color-area          | `gradient`                                                       |
| color-slider        | `gradient`                                                       |
| color-wheel         | `gradient`                                                       |
| combobox            | `tooltip`                                                        |
| contextual-help     | `heading`, `link`                                                |
| dialog              | `hero`, `heading`, `footer`, `button`                            |
| drop-zone           | — (default only)                                                 |
| field-group         | `help-text`, `negative-help-text`                                |
| help-text           | `negative-help-text`                                             |
| illustrated-message | `heading`, `description`                                         |
| menu                | — (default only)                                                 |
| menu-item           | `description`, `icon`, `value`, `submenu`                        |
| number-field        | `help-text`, `negative-help-text`                                |
| picker              | `label`, `description`, `tooltip`                                |
| popover             | — (default only)                                                 |
| radio-group         | `help-text`, `negative-help-text`                                |
| search              | `help-text`, `negative-help-text`                                |
| slider              | `handle`                                                         |
| tag                 | `avatar`, `icon`                                                 |
| textfield           | `help-text`, `negative-help-text`                                |
| toast               | `action`                                                         |
| tooltip             | `icon`                                                           |
| tray                | — (default only)                                                 |

Components with **default slot only**: accordion, action-bar, checkbox, close-button, drop-zone, illustrated-message, link, menu, popover, progress-bar, progress-circle, tray

Components with **no slots**: avatar, divider, status-light

#### SWC slot naming patterns

* **`default`** — primary content injection (universal)
* **`icon`** — leading decorative icon (action-button, badge, button, menu-item, tag, tooltip)
* **`action`** — secondary interactive button (alert-banner, toast)
* **`help-text` / `negative-help-text`** — assistive text pair (field components)
* **`heading` / `description`** — structured header + body pair (contextual-help, dialog, coachmark, illustrated-message)
* **`label`** — placeholder/label text (picker)
* **`gradient`** — custom visualization (color pickers)
* **`hero`** — large media header (dialog)
* **`footer`** — supplemental content area (dialog)
* **`button`** — action buttons area (dialog)
* **`tooltip`** — floating overlay (combobox, picker)
* **`submenu`** — nested menu (menu-item)
* **`avatar`** — identity image (tag)
* **`handle`** — custom drag handle(s) (slider)
* **`root`** — pinned first item (breadcrumbs)

***

### Platform 2: React Spectrum (RSP)

Source: `~/Spectrum/react-spectrum/packages/@react-spectrum/`\
Coverage: \~30 components audited. RSP has no shadow DOM — slots map to named `ReactNode` props.

#### Key named ReactNode props (slot-equivalents)

| Prop name      | Components that use it                                                                                   | SWC slot equivalent                         |
| -------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `children`     | All components                                                                                           | `default` slot                              |
| `icon`         | button, combobox, datepicker, numberfield, searchfield, textfield, textarea                              | `icon` slot                                 |
| `label`        | combobox, datepicker, meter, numberfield, picker, progress-bar, searchfield, slider, textfield, textarea | `label` slot (picker) / data prop elsewhere |
| `description`  | combobox, datepicker, numberfield, picker, searchfield, textfield, textarea                              | varies                                      |
| `errorMessage` | combobox, datepicker, numberfield, picker, searchfield, textfield, textarea                              | `negative-help-text` slot                   |
| `badge`        | —                                                                                                        | not in SWC                                  |

#### Alignment assessment

RSP and SWC are **broadly aligned** on named content slots:

* `icon` is consistent across both platforms
* `help-text`/`negative-help-text` in SWC ↔ `description`/`errorMessage` in RSP (semantic match, naming differs)
* `default` children ↔ `children` prop (equivalent)
* Both platforms have an `action` / secondary button pattern (SWC: `action` slot on toast/alert-banner; RSP: `onAction` callback + action button in toast)

**Naming divergence**:

* SWC uses kebab-case slot names (`help-text`, `negative-help-text`, `cover-photo`)
* RSP uses camelCase prop names (`errorMessage`, `coverPhoto` if it existed)
* The semantic intent is the same; normalization rule needed in spec

***

### Platform 3: iOS (spectrum-ios — Preview)

Source: `~/Spectrum/spectrum-ios/Sources/SpectrumComponents/`\
Coverage: \~7 components. All marked **🚧 Preview** as of Sept 2025. iOS implementation is significantly earlier-stage than web.

| Component      | **`@ViewBuilder`** params (slots)              |
| -------------- | ---------------------------------------------- |
| SPButton       | `label: () -> Label`                           |
| SPToggleButton | `label: (Bool) -> Label`                       |
| SPMenu         | `content: () -> Content`, `label: () -> Label` |
| SPPicker       | none (internal construction)                   |
| SPToast        | none (data model, not view)                    |
| SPPopUpButton  | none (uses fixed SPPopUpLabel)                 |
| Icon           | none (display-only)                            |

**iOS finding**: The iOS implementation is too early-stage and too limited in component coverage to drive normative spec decisions. Of the \~80 components in `@adobe/spectrum-component-api-schemas`, only \~5 have iOS implementations at all. The `@ViewBuilder` parameter names don't yet show a stable naming pattern.

***

## Cross-Platform Slot Taxonomy

Based on the SWC and RSP inventory, these slot categories appear stable enough to codify:

| Slot category       | SWC name             | RSP equivalent         | Semantics                        |
| ------------------- | -------------------- | ---------------------- | -------------------------------- |
| Default content     | `default`            | `children`             | Primary content projection       |
| Leading icon        | `icon`               | `icon` prop            | Decorative icon at content start |
| Field label         | `label` (picker)     | `label` prop           | Human-readable identifier        |
| Helper text         | `help-text`          | `description` prop     | Non-error guidance               |
| Error text          | `negative-help-text` | `errorMessage` prop    | Validation failure message       |
| Call-to-action      | `action`             | (action button in JSX) | Secondary interactive slot       |
| Section heading     | `heading`            | (heading in JSX)       | Structural heading               |
| Section description | `description`        | (description in JSX)   | Structural body text             |
| Media hero          | `hero`               | (image in JSX)         | Large header media               |
| Supplemental footer | `footer`             | (footer in JSX)        | Below-content area               |
| Nested overlay      | `tooltip`            | (Tooltip wrapper)      | Floating annotation              |

***

## Recommendation

**INCLUDE basic slots in RFC-A v1.**

Rationale:

1. **The slot surface is stable on web**. SWC and RSP show consistent slot semantics across 30+ components. The naming differs (kebab vs camelCase) but the concepts are the same.
2. **Slots are needed for cross-reference SPEC rules**. Phase 6.4 plans SPEC rules that validate token name-object fields (e.g. `anatomy`) against component declarations. Those rules need slots to be declared somewhere.
3. **Token binding declarations ([#845](https://github.com/adobe/spectrum-design-data/issues/845))** planned for Phase 6.7 will specify which tokens bind to which component anatomy parts — slots are a prerequisite.
4. **The schema risk is low**. A simple `slots` array with `{ name, description, required }` shape covers all observed patterns. It can be OPTIONAL in v1 with no validation implications.

**Scope for v1**: Web-derived slot vocabulary only (`default`, `icon`, `label`, `help-text`, `negative-help-text`, `action`, `heading`, `description`, `hero`, `footer`, `tooltip`). iOS deferred until iOS component coverage reaches parity.

**Evidence that would shift this recommendation**:

* If Phase 6.4 SPEC rules can be written without slot declarations → could defer
* If iOS team reports naming patterns are finalized and differ materially from SWC → must wait for reconciliation

***

## Open Questions

1. **Slot identity across platforms**: Should the spec define a canonical slot name (e.g. `icon`) and map platform-specific names to it, or require platforms to use the canonical name directly?
2. **Required vs optional slots**: Should `required: true` be allowed on slot declarations (e.g. `default` on button is effectively required)? Could feed into validator warnings.
3. **Typed slots**: SWC occasionally constrains what can go in a slot (e.g. `handle` slot accepts only `sp-slider-handle`). Should slot declarations include a `accepts` field?
4. **iOS slot names**: Once spectrum-ios exits Preview and more components are implemented, their `@ViewBuilder` param names should be added to the cross-platform table and reconciled.

***

## References

* Issue: [#827 Phase 6.0: Slots & events data audit](https://github.com/adobe/spectrum-design-data/issues/827)
* Epic: [#828 Phase 6: Component Contract](https://github.com/adobe/spectrum-design-data/issues/828)
* RFC: [Discussion #832 Component Contract in Design Data Spec](https://github.com/adobe/spectrum-design-data/discussions/832)
* Token binding declarations: [#845 Phase 6.7](https://github.com/adobe/spectrum-design-data/issues/845)
