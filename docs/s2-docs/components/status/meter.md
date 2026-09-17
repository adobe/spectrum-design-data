---
title: Meter
source_url: /web/rsp/components/meter
last_updated: null
status: published
tags: []
hub_path: /web/rsp/components/meter
swc_exists: true
---

# Meter

## Anatomy

meter label value track fill

## Component options

helpText A meter can include help text below it to explain what the value means and how to reach the target. This text may include units, value ranges, thresholds like targets or warnings, and actions that affect the meter. value The value represents a user-driven quantity or achievement, such as tutorials completed or storage used. Unlike a progress bar, it reflects user actions, not system activity. size Meters come in four different sizes: small, medium, large, and extra-large. By default, meters use medium size. Use the small size when there are multiple meters shown at the same time in a more confined space, such as in tables or cards. width The width of a meter can be customized appropriately for its context. The minimum width is meter-minimum-width. The maximum width is meter-maximum-width. valueLabel Meters can include a value label to show details like "60%" or "2 of 8." It should only appear if the main label is shown and is always placed above the track. label and hideLabel Meters should always have a label placed above the track. In rare cases where context is sufficient and an accessibility expert has reviewed the design, the label could be undefined. These meters without a visible label should still include an aria-label in HTML (depending on the context, "aria-label" or "aria-labelledby"). variant Meter has four variants: informative, positive, notice, and negative. By default, the meter has a blue fill to show the value. This can be used to represent a neutral or non-semantic value, such as the number of tutorials completed. The positive variant has a green fill to show the value. This can be used to represent a positive semantic value, such as when there's a lot of space remaining. The notice variant has an orange fill to show the value. This can be used to warn users about a situation that may need to be addressed soon, such as when space remaining is becoming limited. The negative variant has a red fill to show the value. This can be used to warn users about a critical situation that needs their urgent attention, such as when space remaining is very limited.

## States

State Support status DefaultSupportedHoverNot supportedDownNot supportedKeyboard focusNot supportedDisabledNot supportedSelectedNot supportedDraggedNot supportedErrorNot supported

## Behaviors

### Text overflow

When the label is too long for the available horizontal space, it wraps to form another line. The value is always shown in full and never wraps or truncates.

## Usage guidelines

### Progress bar vs. meter

A progress bar fills automatically as the system loads either determinately or indeterminately. A user's actions do not affect the progress bar; it just indicates how long they must wait for the process to finish. A meter indicates how much the user has completed or how far they are in a continuum.

### Labels

Use the built-in style for showing a label associated with the meter. By default, the label is start-aligned and an optional value is end-aligned above the track. (In left-to-right languages, this means the label appears on the left and the value on the right; in right-to-left languages, this flips.) The label should be written in sentence case. When meters appear in a table, you may use the column header as the label. In this case, set labelPosition="side" or use hideLabel if the column header fully describes what each meter represents.

### Representing semantic values

Meter variants can be used to represent semantic values by switching variants as the value changes, from positive, to notice, and then to negative. This kind of variant switching should be handled appropriately within the context of your product so that you're setting accurate expectations for your users about the semantic meaning.

## Internationalization

### RTL

For RTL (right-to-left) languages, the layout of the meter is mirrored. The label is right-aligned, the value is left-aligned, and the fill progresses from right to left. Beware that the placement of the percent sign differs depending on the locale.

## Accessibility

### Keyboard interactions

Key Interaction TabMoves focus onto or off of the button.Space or EnterExecutes the button action. The focus remains on the button except if the button opens or closes the current container. In this case, the focus moves to the target or back to the caller.

### Cursor guidelines

Cursor Usage PointerUse the pointer cursor for all interactive components.

### WCAG 2.2 compliance

Any criterion not mention in the below table are not applicable to this component or are resolved with underlying requirements, engineering, and styles of the entire system. 1. Perceivable Requirement Criterion Level Compliance Non-text content 1.1.1 ANon‑text elements—such as icons used in buttons—must provide a text alternative that communicates the button’s purpose. All buttons, especially icon‑only buttons, need an accessible name (for example, via a title, aria‑label, or associated text) so screen readers can announce their function.Info and relationships, Identify purpose 1.3.1, 1.3.6 A, AAAButtons should be understandable by assistive technologies like screen readers. This means using the proper semantic HTML or ARIA role of buttons should be utilized.Use of color 1.4.1 AColor is never used as the sole way to convey meaning in buttons. While negative buttons do use red to reinforce their purpose, every button also includes a clear text label that communicates the action it performs.Text contrast minimums 1.4.3 AALarge text has a contrast ratio of at least 3:1, and small text has a contrast ratio of at least 4.5:1. Incidental text such as disabled, hidden, or decorative text has no contrast requirement.Resize text 1.4.4 AAButtons should be built in such a way that they can be resized without assistive technology up to 200%.Visual presentation 1.4.8 AAAThe width of text blocks is no more than 80 characters (40 for CJK languages), and text is never justified.Non-text contrast 1.4.11 AAThe visual presentation of icons and various states have a contrast ratio of at least 3:1.Text spacing 1.4.12 AALine height of text is at least 1.5x the font size. 2. Operable Requirement Criterion Level Compliance Keyboard 2.1.1, 2.1.3 A, AAAAll functionality of the component is operable through a keyboard without specific timing for keystrokes.Keyboard traps 2.1.2 AFocus can be moved away from the component using only a keyboard.Seizures and physical reactions 2.3.1, 2.3.2, 2.3.3 A, AAA, AAAThere is no flashing content or unnecessary motion or animation in this component.Focus order 2.4.3 ANavigation sequences receive focus in an order that preserves meaning and operability.Focus visible 2.4.7 AAKeyboard states use an indicator that is visible with at least 3:1 contrast.
