# Accessibility adapters

**Spec version:** `1.0.0-draft` (see [Overview](index.md))

> **This chapter is informative.** It provides guidance for platform adapter repos; it does not add normative constraints to the foundation spec.

This chapter shows how the semantic accessibility vocabulary defined in [Accessibility](accessibility.md) maps to real platform APIs across web (ARIA), iOS (UIAccessibility), Android (AccessibilityNodeInfo), and voice/multimodal surfaces. Platform adapter repos use this as a translation contract when implementing accessibility support for Spectrum components. The foundation layer ships intent; adapters ship the platform binding.

Scoped under planned RFC-B. See [rfc-coordination.md](../docs/rfc-coordination.md).

## Adapter overview

A platform adapter repo declares which foundation components it supports and implements a mapping layer that translates each component's `accessibility` declaration to the platform's native accessibility API. When a field is absent from a component's `accessibility` declaration, the adapter falls back to its own defaults or omits the attribute.

Adapters are not required to implement every field — a minimal adapter might only handle `role` and `focusable`. The fields documented below describe what each foundation field means at the platform layer when the adapter chooses to implement it.

## Web / ARIA

ARIA (Accessible Rich Internet Applications) is the primary web accessibility API. Adapters set HTML `role` attributes and `aria-*` state properties on the root element or on relevant sub-elements.

### `role`

| Foundation `role` | ARIA / HTML equivalent                         |
| ----------------- | ---------------------------------------------- |
| `button`          | `<button>` or `role="button"`                  |
| `checkbox`        | `<input type="checkbox">` or `role="checkbox"` |
| `combobox`        | `role="combobox"`                              |
| `dialog`          | `role="dialog"`                                |
| `link`            | `<a href>` or `role="link"`                    |
| `listbox`         | `role="listbox"`                               |
| `menu`            | `role="menu"`                                  |
| `menuitem`        | `role="menuitem"`                              |
| `radio`           | `<input type="radio">` or `role="radio"`       |
| `slider`          | `role="slider"`                                |
| `spinbutton`      | `role="spinbutton"`                            |
| `switch`          | `role="switch"`                                |
| `tab`             | `role="tab"`                                   |
| `textbox`         | `<input type="text">` or `role="textbox"`      |
| `tooltip`         | `role="tooltip"`                               |
| `tree`            | `role="tree"`                                  |

### `intents`

| Foundation intent | Web guidance                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------- |
| `trigger`         | Ensure the element has an accessible name via `aria-label`, `aria-labelledby`, or a visible label |
| `select`          | Set `aria-selected` on child options; the container gets `role="listbox"` or `role="combobox"`    |
| `navigate`        | Use `<a href>` or `role="link"`; ensure the destination is announced                              |
| `expand`          | Set `aria-expanded="true"` / `"false"` on the trigger element                                     |
| `collapse`        | Toggle `aria-expanded` to `"false"`                                                               |
| `input`           | Associate a visible `<label>` or `aria-label`; use `aria-describedby` for hints                   |
| `choose`          | Use `aria-valuenow`, `aria-valuemin`, `aria-valuemax` for range inputs                            |
| `dismiss`         | Return focus to the trigger element on close; announce the closure if needed                      |

### `focusable`

* `true` → set `tabindex="0"` on the root element, or use a natively focusable HTML element.
* `false` → set `tabindex="-1"` for elements that receive programmatic focus; use `aria-hidden="true"` for purely decorative elements. For roving-tabindex composites (radio groups, toolbars, tree views), the adapter manages which child holds `tabindex="0"`.

### `keyboardIntents`

| Foundation intent  | Conventional key binding              |
| ------------------ | ------------------------------------- |
| `activate`         | Enter, Space                          |
| `expand`           | ArrowDown, Enter, Space               |
| `collapse`         | Escape, ArrowUp                       |
| `navigate-options` | ArrowUp, ArrowDown                    |
| `navigate-items`   | ArrowLeft, ArrowRight                 |
| `increment`        | ArrowUp, ArrowRight                   |
| `decrement`        | ArrowDown, ArrowLeft                  |
| `dismiss`          | Escape                                |
| `select-all`       | Ctrl+A (Windows/Linux), Cmd+A (macOS) |

Key bindings shown are conventional. Web adapters should follow the ARIA Authoring Practices Guide patterns for the component's `role`.

### `wcag`

The `wcag` array is developer guidance at the web layer, not an automated attribute. Web adapter implementations should:

* Include listed criteria in component documentation.
* Add automated accessibility tests (e.g., axe-core) that target listed criteria.
* Flag in PR checklists when changes may affect listed criteria.

### State fields

* `announce` → set `aria-live="polite"` (or `"assertive"` for urgent transitions) on a live region element and inject the `announce` text on state entry.
* `communicates` → map to the corresponding `aria-*` state attribute (e.g., `"expanded"` → `aria-expanded="true"`). See the `communicates` vocabulary table in [Accessibility](accessibility.md#communicates).
* `blocksInteraction` → set `aria-disabled="true"` and `tabindex="-1"` on the root element; suppress pointer and keyboard events.

## iOS / UIAccessibility

iOS exposes accessibility semantics through `UIAccessibility` protocol properties on `UIView` (UIKit) and through accessibility modifiers in SwiftUI.

### `role`

| Foundation `role` | UIAccessibilityTraits / SwiftUI                                |
| ----------------- | -------------------------------------------------------------- |
| `button`          | `.button`                                                      |
| `checkbox`        | `.button` with toggled state, or SwiftUI `Toggle`              |
| `combobox`        | `.button` (picker-like behavior)                               |
| `dialog`          | Presented as modal sheet; VoiceOver reads the accessible label |
| `link`            | `.link`                                                        |
| `listbox`         | Container view; children use `.button` or `.selected`          |
| `menu`            | `.button` on trigger; menu items as `.button`                  |
| `menuitem`        | `.button`                                                      |
| `radio`           | `.button` with `.selected` when active                         |
| `slider`          | `.adjustable`                                                  |
| `spinbutton`      | `.adjustable`                                                  |
| `switch`          | `.button` with `.selected` / SwiftUI `Toggle`                  |
| `tab`             | `.button` with `.selected`                                     |
| `textbox`         | `.keyboard` traits; `UITextField` or `UITextView`              |
| `tooltip`         | `.staticText` on an overlay element                            |
| `tree`            | Hierarchical cells with `accessibilityContainerType`           |

### `intents`

* `trigger` → provide `accessibilityLabel` describing the action the user will invoke.
* `select` → set `accessibilityTraits` to include `.selected` when the item is in a selected state.
* `expand` / `collapse` → update `accessibilityHint` or `accessibilityValue` to describe the current expanded/collapsed state.
* `choose` → implement `accessibilityIncrement()` / `accessibilityDecrement()` with the `.adjustable` trait.
* `dismiss` → handle `accessibilityPerformEscape()` to close the view and return focus.

### `focusable`

* `true` → `isAccessibilityElement = true`.
* `false` → `isAccessibilityElement = false`. For composite views that manage focus internally (e.g., a radio group), set `accessibilityContainerType` and manage the focused child programmatically.

### `keyboardIntents`

Relevant for external keyboard support (iPad with Magic Keyboard, Bluetooth keyboard):

* `activate` → register a `UIKeyCommand` for Return and Space.
* `navigate-options` / `navigate-items` → register `UIKeyCommand` entries for arrow keys.
* `dismiss` → register a `UIKeyCommand` for Escape.

### `wcag`

Include WCAG criteria in component documentation and Accessibility Inspector audits. The `wcag` array has no automatic mapping at the iOS layer.

### State fields

* `announce` → call `UIAccessibility.post(notification: .announcement, argument: announceText)` on state entry. In SwiftUI, use `AccessibilityNotification.Announcement`.
* `communicates` → set the corresponding trait or value (e.g., `"expanded"` → set `accessibilityValue = "expanded"` / `"collapsed"`; `"disabled"` → add `.notEnabled`; `"busy"` → add `.causesPageTurn` or a custom announcement).
* `blocksInteraction` → add `.notEnabled` trait; set `isAccessibilityElement = false` on interactive children.

## Android / AccessibilityNodeInfo

Android exposes accessibility semantics via `AccessibilityNodeInfo` populated through `ViewCompat.setAccessibilityDelegate()` or Jetpack Compose `Modifier.semantics {}`.

### `role`

| Foundation `role` | Android mapping                                             |
| ----------------- | ----------------------------------------------------------- |
| `button`          | `Button` widget or `setRoleDescription("button")`           |
| `checkbox`        | `CheckBox` widget or `setCheckable(true)`                   |
| `combobox`        | `Spinner` widget or `setRoleDescription("combobox")`        |
| `dialog`          | Dialog window; `setDismissable(true)`                       |
| `link`            | `setRoleDescription("link")`; add `ACTION_CLICK`            |
| `listbox`         | `RecyclerView` with `setCollectionInfo`                     |
| `menu`            | `setRoleDescription("menu")` on the container               |
| `menuitem`        | `setRoleDescription("menu item")`                           |
| `radio`           | `RadioButton` widget or `setCheckable(true)` + `setChecked` |
| `slider`          | `SeekBar` widget or `RangeSemantics` in Compose             |
| `spinbutton`      | `setRoleDescription("spin button")`                         |
| `switch`          | `Switch` widget or `setRoleDescription("switch")`           |
| `tab`             | `TabLayout` tab item; `setSelected(true)` when active       |
| `textbox`         | `EditText` widget or `TextField` in Compose                 |
| `tooltip`         | `setTooltipText(text)`                                      |
| `tree`            | `setCollectionInfo` with hierarchical structure             |

### `intents`

* `trigger` → set `setContentDescription()` describing the action.
* `select` → call `setSelected(true)` on selection.
* `expand` / `collapse` → call `setExpandable(true)` and `setExpanded(true/false)`.
* `choose` → add `ACTION_SCROLL_FORWARD` / `ACTION_SCROLL_BACKWARD` actions.
* `dismiss` → call `setDismissable(true)`; handle `ACTION_DISMISS`.

### `focusable`

* `true` → `setFocusable(true)` and `setImportantForAccessibility(IMPORTANT_FOR_ACCESSIBILITY_YES)`.
* `false` → `setImportantForAccessibility(IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS)` for decorative views. For composite views, manage focus via `performAccessibilityAction(ACTION_ACCESSIBILITY_FOCUS, ...)`.

### `keyboardIntents`

Relevant for physical keyboard input (Chromebook, external keyboard):

* `activate` → handle `KeyEvent.KEYCODE_ENTER` / `KEYCODE_SPACE`.
* `navigate-options` / `navigate-items` → handle arrow key `KeyEvent`s.
* `dismiss` → handle `KeyEvent.KEYCODE_ESCAPE` or `KEYCODE_BACK`.

### `wcag`

Include criteria in component documentation and Accessibility Scanner audits. No automatic mapping.

### State fields

* `announce` → call `ViewCompat.announceForAccessibility(view, announceText)` or send `AccessibilityEvent.TYPE_ANNOUNCEMENT`. In Compose, use `LocalAccessibilityManager.current?.announce(...)`.
* `communicates` → set the corresponding node property (e.g., `"expanded"` → call `setExpandable(true)` then `setExpanded(true)`; `"checked"` → `setChecked(true)`; `"disabled"` → `setEnabled(false)`).
* `blocksInteraction` → call `setEnabled(false)` on the root view. Use `IMPORTANT_FOR_ACCESSIBILITY_YES` to keep the element discoverable by AT as disabled; use `IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS` to hide the element and its subtree from AT entirely.

## Voice and multimodal

> **Informative sketch.** The following mapping is exploratory. Platform-specific voice adapter specs are deferred.

For voice interfaces (Alexa, Google Assistant, Siri Shortcuts) and future multimodal surfaces, the foundation vocabulary maps conceptually as follows:

| Foundation field  | Voice / multimodal mapping                                            |
| ----------------- | --------------------------------------------------------------------- |
| `role`            | Utterance type in a voice schema (e.g., `button` → invocable command) |
| `intents`         | Action category exposed in a voice intent catalog                     |
| `announce`        | Spoken response on state transition                                   |
| `communicates`    | State value spoken when the user queries component status             |
| `focusable`       | Not applicable for purely voice surfaces                              |
| `keyboardIntents` | Not applicable for purely voice surfaces                              |

### `wcag`

WCAG 2.x success criteria apply at the web layer. For voice and multimodal surfaces, WCAG is not directly applicable; accessibility requirements for these surfaces are deferred to platform-specific adapter specs.
