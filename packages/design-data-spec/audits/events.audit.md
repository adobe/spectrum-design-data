# Events Audit — Phase 6.0 Component Contract

**Status**: Draft\
**Date**: 2026-05-12\
**Scope**: Web (SWC + RSP) + iOS (spectrum-ios Preview). Android not yet accessible.\
**Purpose**: Decide whether `events` belongs in the RFC-A v1 component-format schema.

***

## Background

This audit inventories the current event surface across Spectrum component implementations. "Events" means:

* **SWC**: Custom DOM events dispatched by components (`dispatchEvent(new CustomEvent(...))`)
* **RSP**: Callback props — functions passed as props and called on user interaction (`onPress`, `onChange`, etc.)
* **iOS**: Closure parameters in `init()` called on interaction (`action: () -> Void`) and `@Binding` parameters that serve as two-way event channels

The current `@adobe/spectrum-component-api-schemas` does **not** capture events. The `state` field captures interactive *states* (hover, focus, pressed) but not *event emissions*.

***

## Platform Inventory

### Platform 1: Spectrum Web Components (SWC)

Source: `~/Spectrum/spectrum-web-components/1st-gen/packages/`\
Coverage: 26 components emit custom events.

| Component     | Event name                      | Cancelable | Description                                  |
| ------------- | ------------------------------- | ---------- | -------------------------------------------- |
| accordion     | `sp-accordion-item-toggle`      | ✓          | accordion item toggled                       |
| action-button | `change`                        |            | selected state changed                       |
| action-button | `longpress`                     |            | synthesized long press (≥300ms or Space+Alt) |
| action-group  | `change`                        |            | selection changed                            |
| alert-banner  | `close`                         | ✓          | banner dismissed                             |
| breadcrumbs   | `change`                        |            | breadcrumb item selected                     |
| breadcrumbs   | `breadcrumb-select`             |            | individual item selected (internal)          |
| checkbox      | `change`                        |            | checked state changed                        |
| color-area    | `input`                         |            | value changing (continuous)                  |
| color-area    | `change`                        |            | value committed                              |
| color-slider  | `input`                         |            | value changing (continuous)                  |
| color-slider  | `change`                        |            | value committed                              |
| color-wheel   | `input`                         |            | value changing (continuous)                  |
| color-wheel   | `change`                        |            | value committed                              |
| dialog        | `close`                         |            | dialog closed                                |
| drop-zone     | `sp-dropzone-should-accept`     | ✓          | confirm file acceptance                      |
| drop-zone     | `sp-dropzone-dragover`          |            | files dragged over                           |
| drop-zone     | `sp-dropzone-dragleave`         |            | files dragged out                            |
| drop-zone     | `sp-dropzone-drop`              |            | files dropped                                |
| menu          | `change`                        |            | value changed                                |
| menu          | `sp-menu-submenu-opened`        |            | submenu opened                               |
| menu          | `sp-menu-submenu-closed`        |            | submenu closed                               |
| menu          | `close`                         |            | menu closed                                  |
| menu-item     | `sp-menu-item-added-or-updated` |            | item registered with parent                  |
| number-field  | `input`                         |            | value changing                               |
| number-field  | `change`                        |            | value committed                              |
| picker        | `change`                        |            | selection changed                            |
| picker        | `sp-opened`                     |            | overlay opened                               |
| picker        | `sp-closed`                     |            | overlay closed                               |
| radio         | `change`                        |            | selected                                     |
| radio-group   | `change`                        |            | selection changed                            |
| search        | `submit`                        |            | form submitted                               |
| search        | `change`                        |            | value committed                              |
| search        | `input`                         |            | value changing                               |
| slider        | `input`                         |            | value changing (continuous)                  |
| slider        | `change`                        |            | value committed                              |
| slider        | `sp-slider-handle-ready`        |            | handle registered                            |
| switch        | `change`                        |            | checked state changed                        |
| table         | `change`                        |            | selection changed                            |
| table         | `rangeChanged`                  |            | visible range changed                        |
| table         | `sorted`                        |            | sort column/order changed                    |
| tabs          | `change`                        |            | active tab changed                           |
| tabs          | `sp-tabs-scroll`                |            | tabs scrolled                                |
| tag           | `delete`                        | ✓          | tag removed                                  |
| textfield     | `input`                         |            | value changing                               |
| textfield     | `change`                        |            | value committed                              |
| toast         | `close`                         |            | toast closed/expired                         |
| tooltip       | `sp-opened`                     |            | tooltip shown                                |
| tooltip       | `sp-closed`                     |            | tooltip hidden                               |
| tray          | `close`                         |            | tray closed                                  |

#### SWC event patterns

**Prefixed events** (`sp-*`): SWC uses `sp-` prefix for component-internal coordination events and overlay lifecycle events. These are typically not for application consumption.

**Standard DOM event names**: `change`, `input`, `close`, `submit` — these align with HTML platform conventions.

**Lifecycle pair**: `sp-opened` / `sp-closed` — overlay lifecycle events on components that have popups (picker, tooltip).

**Cancelable events** (application can `preventDefault`): `sp-accordion-item-toggle`, `alert-banner::close`, `sp-dropzone-should-accept`, `tag::delete`

***

### Platform 2: React Spectrum (RSP)

Source: `~/Spectrum/react-spectrum/packages/@react-spectrum/`\
Coverage: \~30 components, all using callback prop pattern.

| Prop name                            | Components                                                                                                      | Signature                                | Semantics                                |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ---------------------------------------- |
| `onChange`                           | checkbox, combobox, datepicker, numberfield, radio, searchfield, slider, switch, tag-group, textfield, textarea | varies by value type                     | value committed (or continuous for some) |
| `onSelectionChange`                  | actiongroup, listview, menu, picker, table, tabs                                                                | `(key: Key) => void`                     | selection changed                        |
| `onAction`                           | actionbar, actiongroup, breadcrumbs, listview, menu, table                                                      | `(key: Key) => void`                     | item activated                           |
| `onPress`                            | button, link                                                                                                    | `(e: PressEvent) => void`                | pointer/keyboard press completed         |
| `onPressStart`                       | button                                                                                                          | `(e: PressEvent) => void`                | press began                              |
| `onPressEnd`                         | button                                                                                                          | `(e: PressEvent) => void`                | press ended                              |
| `onPressChange`                      | button                                                                                                          | `(isPressed: boolean) => void`           | pressed state changed                    |
| `onOpenChange`                       | combobox, datepicker, menu, picker, tooltip                                                                     | `(isOpen: boolean) => void`              | open/close state changed                 |
| `onDismiss`                          | dialog                                                                                                          | `() => void`                             | dismiss button clicked                   |
| `onDismiss`                          | toast                                                                                                           | `() => void`                             | toast closed                             |
| `onFocus`                            | combobox, datepicker, numberfield, picker, searchfield, textfield, textarea                                     | `() => void`                             | focus gained                             |
| `onBlur`                             | combobox, datepicker, numberfield, picker, searchfield, textfield, textarea                                     | `() => void`                             | focus lost                               |
| `onClear`                            | searchfield                                                                                                     | `() => void`                             | clear button pressed                     |
| `onSubmit`                           | searchfield                                                                                                     | `(value: string) => void`                | search submitted                         |
| `onDrop`                             | dropzone                                                                                                        | `(e: DropEvent) => void`                 | files dropped                            |
| `onDropEnter`                        | dropzone                                                                                                        | `(e: DropEvent) => void`                 | drag entered                             |
| `onDropExit`                         | dropzone                                                                                                        | `(e: DropEvent) => void`                 | drag exited                              |
| `onSort`                             | table                                                                                                           | `(descriptor: SortDescriptor) => void`   | column sorted                            |
| `onResizeStart/onResize/onResizeEnd` | table                                                                                                           | `(widths: Map<Key, ColumnSize>) => void` | column resize                            |
| `onExpandedChange`                   | table                                                                                                           | `(expandedKeys: Set<Key>) => void`       | row expanded                             |
| `onLoadMore`                         | combobox, listview, picker                                                                                      | `() => void`                             | async pagination trigger                 |
| `onChangeEnd`                        | slider                                                                                                          | `(value: number) => void`                | drag completed                           |
| `onRemove`                           | tag-group                                                                                                       | `(key: Key) => void`                     | tag removed                              |
| `onOpenChange`                       | accordion                                                                                                       | `(openKeys: Set<Key>) => void`           | expanded items changed                   |
| `onKeyDown` / `onKeyUp`              | button                                                                                                          | DOM keyboard events                      | low-level keyboard                       |

#### RSP event patterns

**`on[Property]Change`**: Most common pattern. Signals the value of a named property changed. Unambiguous: `onSelectionChange`, `onOpenChange`, `onExpandedChange`.

**`onAction`**: Distinct from `onChange` — signals intentional user activation of an item (as opposed to selection state change). Used in collections (menu, list, actiongroup).

**`onPress` family**: Lower-level press lifecycle for pointer/keyboard interaction. Mostly on button/link.

**Focus events**: `onFocus` / `onBlur` on all form fields. Platform-standard.

***

### Platform 3: iOS (spectrum-ios — Preview)

Source: `~/Spectrum/spectrum-ios/Sources/SpectrumComponents/`

| Component      | Event mechanism          | Name        | Signature                        |
| -------------- | ------------------------ | ----------- | -------------------------------- |
| SPButton       | closure param            | `action`    | `@MainActor () -> Void`          |
| SPToggleButton | `@Binding`               | `isOn`      | `Binding<Bool>`                  |
| SPPicker       | `@Binding`               | `selection` | `Binding<Value>`                 |
| SPToast        | closure in action struct | `handler`   | `@Sendable @escaping () -> Void` |

**iOS finding**: iOS uses two patterns for "events":

1. **Action closures** (`action: () -> Void`) — equivalent to `onPress`
2. **`@Binding` parameters** — two-way state channels; closer to controlled `onChange` than discrete events

The iOS `@Binding` pattern has no direct web equivalent. It's a SwiftUI idiom for two-way state binding that merges the "current value" and "onChange" into one parameter. This is a semantic model difference, not just a naming difference.

***

## Cross-Platform Event Taxonomy

Despite different surface APIs, the same **semantic categories** appear across platforms:

| Category                    | SWC                       | RSP                              | iOS        | Notes                       |
| --------------------------- | ------------------------- | -------------------------------- | ---------- | --------------------------- |
| Value committed             | `change`                  | `onChange`                       | `@Binding` | Discrete value change       |
| Value changing (continuous) | `input`                   | `onChange` (slider)              | —          | During drag/typing          |
| Selection changed           | `change`                  | `onSelectionChange` / `onAction` | `@Binding` | Collection item selected    |
| Open/close lifecycle        | `sp-opened` / `sp-closed` | `onOpenChange`                   | —          | Overlay visibility          |
| Press/activate              | (DOM click)               | `onPress`                        | `action:`  | Pointer/keyboard activation |
| Dismiss/close               | `close`                   | `onDismiss`                      | —          | Modal dismissal             |
| Form submit                 | `submit`                  | `onSubmit`                       | —          | Form action                 |
| Focus in/out                | (DOM focus/blur)          | `onFocus` / `onBlur`             | —          | Focus management            |
| Item deleted/removed        | `delete` (cancelable)     | `onRemove`                       | —          | Removal gesture             |
| Drag lifecycle              | `sp-dropzone-*`           | `onDrop/Enter/Exit`              | —          | Drop zone interaction       |

**Semantic alignment is good**. The underlying concepts are the same; the naming convention and delivery mechanism differ by platform.

***

## Recommendation

**DEFER events from RFC-A v1.**

Rationale:

1. **The naming model is not cross-platform stable**. SWC uses DOM event strings (`change`, `sp-opened`), RSP uses camelCase callback props (`onChange`, `onOpenChange`), and iOS uses closure params with different names (`action`, `@Binding`). A normative spec would need to define canonical event names and map all three — that mapping work hasn't been done.

2. **RSP conflates two distinct semantics in one prop name**. `onChange` on checkbox means "checked changed"; `onChange` on slider means "continuous drag value"; `onSelectionChange` on picker means "committed selection". A normative event schema needs to distinguish continuous vs. committed, selection vs. activation. This taxonomy work is a prerequisite.

3. **SWC uses `sp-` prefixed internal coordination events** (`sp-menu-item-added-or-updated`, `sp-slider-handle-ready`) that are implementation details, not component contracts. The audit scope should distinguish public vs. internal events, and that line isn't drawn today.

4. **Events don't block Phase 6.4 SPEC rules**. The cross-reference validation planned for Phase 6.4 checks token name-object fields (`component`, `variant`, `state`, `anatomy`) against component declarations. It doesn't need event declarations to function.

5. **iOS `@Binding` is a different model** than discrete events. Forcing a mapping now, before iOS component coverage is broader, would either over-constrain iOS or produce a spec section that doesn't match the iOS implementation.

**Recommended path for events**:

* Define a platform-neutral event taxonomy (value-change, activate, open/close, dismiss, form-submit, focus, remove) in a follow-up spec amendment after Phase 6.1-6.5 lands
* Map SWC event names, RSP prop names, and iOS mechanisms to that taxonomy in the RFC-A follow-up
* Don't block Phase 6.1+ on events

**Evidence that would shift this recommendation**:

* If the team defines an explicit canonical event name convention before Phase 6.1 starts → could include in v1
* If a SPEC rule requires event declarations (not currently planned for 6.4) → must include in v1
* If iOS reaches parity on >10 components before v1 → reconsider iOS mapping

***

## Open Questions

1. **Internal vs. public events**: SWC emits coordination events like `sp-menu-item-added-or-updated` that consumers shouldn't listen to. Should the spec define a `public: false` flag on event declarations, or should internal events simply not be declared?
2. **Continuous vs. committed semantics**: Should event declarations distinguish "fires on every value change during interaction" (RSP slider `onChange`) vs. "fires when interaction completes" (RSP slider `onChangeEnd` / SWC `change`)? This matters for tooling that generates bindings.
3. **Cancelable events**: SWC has cancelable events (tag `delete`, alert-banner `close`, dropzone `should-accept`). Should cancelability be a first-class field in event declarations?
4. **iOS `@Binding` as event surface**: When iOS component coverage expands, the spec needs a way to declare that a component has a two-way binding param (not just a one-shot callback). This may need a distinct schema field vs. one-way events.

***

## References

* Issue: [#827 Phase 6.0: Slots & events data audit](https://github.com/adobe/spectrum-design-data/issues/827)
* Epic: [#828 Phase 6: Component Contract](https://github.com/adobe/spectrum-design-data/issues/828)
* RFC: [Discussion #832 Component Contract in Design Data Spec](https://github.com/adobe/spectrum-design-data/discussions/832)
* Slots audit: [`audits/slots.audit.md`](./slots.audit.md)
