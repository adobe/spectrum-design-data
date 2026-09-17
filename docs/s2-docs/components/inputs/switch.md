---
title: Switch
source_url: /web/rsp/components/switch
last_updated: null
status: published
tags: []
hub_path: /web/rsp/components/switch
swc_exists: false
---

# Switch

## Anatomy

switch track handle label

## Component options

label Switch should always have a label for accessibility and clear comprehension. When the label is not defined, a switch becomes standalone. Standalone switches should only be used when their connection to other components is clear and they give sufficient context — for example, in application panels. Switch without a visible label should still include an aria-label in HTML (depending on the context, aria-label or aria-labelledby ). isSelected Switches can either be selected or not selected. They cannot be in an indeterminate state (unlike checkboxes). When a switch represents multiple values that are not identical, the switch should appear as not selected. size Switch come in four different sizes: small, medium, large, and extra-large. The medium size is the default and most frequently used option. Use the other sizes sparingly; they should be used to create a hierarchy of importance within the page. isEmphasized By default, switches are not emphasized (gray). This version is optimal for when the switch is not the core part of an interface, such as in application panels, where all visual components are monochrome in order to direct focus to the content. The emphasized (blue) version provides a visual prominence that is optimal for forms, settings, lists or grids of assets, and other situations where a switch needs to be noticed. isDisabled A switch in a disabled state shows that an action exists, but is not available in that circumstance. This state can be used to maintain layout continuity and to communicate that an action may become available later. isReadOnly Switches have a read-only option for when they're in the disabled state but still need their labels to be shown. This allows for content to be copied, but not interacted with or changed.

## States

State Support status DefaultSupportedHoverSupportedDownSupportedKeyboard focusSupportedDisabledSupportedSelectedSupportedDraggedNot supportedErrorNot supported

## Behaviors

### Keyboard focus

A switch can be navigated using a keyboard. The keyboard focus state takes the switch's visual hover state and adds a blue ring to the switch in focus.

### Text overflow

When the label is too long for the horizontal space available, it wraps to form another line.

## Usage guidelines

### When to use an emphasized switch?

Emphasized switches are optimal for forms, settings, and other scenarios where the switches need to be noticed. Not emphasized switches are optimal for application panels where all the visual components are monochrome in order to direct focus to the canvas.

### When to use a standalone switch?

Standalone switches should be used in situations where the context is clear without an associated text label. For example, a switch located at the top of a panel next to the panel's title makes it clear that the switch will enable/disable the panel options.

### Switch, checkbox or radio button?

Switches are best for communicating activation (e.g., turning a setting on or off). Checkboxes are best for communicating selection (e.g., selecting multiple items from a list). Radio buttons are best when only one option can be selected at a time from a set (e.g., choosing one preference or mode).

### Representing mixed values

When a switch represents multiple values that are not identical, the switch should appear as not selected. Any subsequent click or tap should select the switch, and update all values to be selected. Another click or tap after that should deselect the switch, and update all values to be not selected.

### No partial state

Switches can only be on or off. Indeterminate switches don't exist in accessibility APIs, so it's not possible to make an indeterminate switch accessible. If you need to show a partial state, use a checkbox instead of a switch. When a parent switch represents a group of switches, it should be turned off unless all of the switches are on (turning the parent switch on turns all of the switches on).

## Content standards

A label for a switch describes a setting that is either on or off — two mutually exclusive states. Use a short description (1-3 words) of the setting. Try to include all necessary information in the label, but it's OK to add clarifying text after to supplement if needed. Keep in mind that when a user takes an action on a switch, that action will often affect other content in an experience. Think systematically to ensure that all labels are paralleling each other in their writing.

### Consider if the label should use a verb or a noun

A switch shows a state of persistence for something — a noun or a proper noun — as either being "on" or "off." A verb isn't usually needed to communicate the thing being turned on or off, but there can be instances where phrasing the label as a verb can aid in clarity. Just try to keep switches consistently using either verbs or nouns if you have more than one of them in a single view.

### Avoid using verb phrases related to a state of activity

Avoid using verb phrases related to activity states in a switch label, such as "turn on" or "turn off." A switch is naturally either in a state of being on or off — active or inactive — so repeating in the label that something is "on" or "off" is redundant and clutters an interface.

### Use a neutral tone

Because switches are used for controls and utility, their labels are written in a neutral, utilitarian way. There's no need for overly celebratory language.

### Use "you" or "your" if needed to refer to the user directly

Describe switches objectively by using only the names of features or settings, or what those features and settings will do. In the case where it's necessary to refer to a user directly, do so sparingly and use the second person "you/your." We aim to be conversational and talk to the user — not as them.

### Use sentence case

Following Adobe's UX writing style, labels for switches are written in sentence case unless they contain words that are branded terms.

## Internationalization

### RTL

For RTL (right-to-left) languages, the layout of the switch is mirrored. The track is placed on the right side of the text and the handle is positioned to the left when the switch is turned on.

## Accessibility

### Keyboard interactions

Key Interaction TabMoves focus to the next item or group of items.Shift + TabMoves focus to the previous item or group of items.Space or EnterToggles the switch between on and off.

### Cursor guidelines

Cursor Description PointerUse the pointer cursor for interactive elements in all states.

### WCAG 2.2 compliance

Any criterion not mention in the below table are not applicable to this component or are resolved with underlying requirements, engineering, and styles of the entire system. 1. Perceivable Requirement Criterion Level Compliance Info and relationships, Identify purpose 1.3.1, 1.3.6 A, AAASwitches should be understandable by assistive technologies like screen readers. This means the proper semantic HTML or ARIA role should be utilized.Use of color 1.4.1 ASwitches never rely on color alone to convey meaning. The active state uses blue to reinforce “on,” and the handle shifts position to clearly show whether the switch is on or off.Text contrast minimums 1.4.3 AALarge text has a contrast ratio of at least 3:1, and small text has a contrast ratio of at least 4.5:1. Incidental text such as disabled, hidden, or decorative text has no contrast requirement.Resize text 1.4.4 AASwitches should be built in such a way that they can be resized without assistive technology up to 200%.Non-text contrast 1.4.11 AAThe visual presentation of icons and various states have a contrast ratio of at least 3:1.Text spacing 1.4.12 AALine height of text is at least 1.5x the font size when the label is wrapped. 2. Operable RequirementCriterionLevel Compliance Keyboard 2.1.1, 2.1.3 A, AAAAll functionality of the component is operable through a keyboard without specific timing for keystrokes.Keyboard traps 2.1.2 AFocus can be moved away from the component using only a keyboard.Seizures and physical reactions 2.3.1, 2.3.2, 2.3.3 A, AAA, AAAThere is no flashing content or unnecessary motion or animation in this component.Focus order 2.4.3 ANavigation sequences receive focus in an order that preserves meaning and operability.Focus visible 2.4.7 AAKeyboard states use an indicator that is visible with at least 3:1 contrast.
