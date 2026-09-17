---
title: Progress bar
source_url: /web/rsp/components/progress-bar
last_updated: null
status: published
tags: []
hub_path: /web/rsp/components/progress-bar
swc_exists: true
---

# Progress bar

## Anatomy

progress bar label value track fill

## Component options

isIndeterminate A progress bar can be either determinate or indeterminate. By default, progress bars are determinate. Use a determinate progress bar when progress can be calculated against a specific goal (e.g., downloading a file of a known size). Use an indeterminate progress bar when progress is happening but the time or effort to completion can't be determined (e.g., attempting to reconnect to a server). size Progress bars come in four different sizes: small, medium, large, and extra-large. The medium size is the default and most frequently used option. Use the other sizes sparingly; they should be used to create a hierarchy of importance within the page. width The width of a progress bar can be customized appropriately for its context. The default width is size-2400 (192 px on desktop and 240 px on mobile). valueLabel Progress bars can have a value label that gives detailed information about the progress (e.g. "60%" or "2 of 8"). This value label works alongside the label and should not be displayed if the label itself is not displayed. It should also not be displayed if the progress is indeterminate. Similar to the label, the value label is always placed above the track. value, min value, max value The value represents progress within the bar's range, from minimum to maximum. These defaults are 0 and 100 but can be customized. Min and max values don't apply to indeterminate progress bars. hideLabel The label of the progress bar can be hidden if the context for the progress bar is sufficient without the title — for example, when the progress bar is shown inside a table row and the item is labeled in another column. labelPosition Labels can be placed either on top or on the side. Top labels are the default and are recommended because they work better with long copy, localization, and responsive layouts. Side labels are most useful when vertical space is limited. label Progress bars should have a label that gives context about the operation being performed. Use an ellipsis at the end of the label text to communicate that the process is in progress. In rare cases where context is sufficient and an accessibility expert has reviewed the design, the label could be undefined. These progress bars should still include an aria-label in HTML (depending on the context, "aria-label" or "aria-labelledby"). staticColor When a progress bar needs to be placed on top of a colored background, use the over background variant. This progress bar uses a static white color regardless of the color theme. Make sure the background offers enough contrast for the progress bar to be legible. variant Use the over background variant when a progress bar needs to be placed on top of a colored background or visual. Over background progress bars are available in static black or white, meaning they don't change with the theme of the page. Use static black on light color or image backgrounds, and white on dark color or image backgrounds.

## States

State Support status DefaultSupportedHoverNot supportedDownNot supportedKeyboard focusNot supportedDisabledNot supportedSelectedNot supportedDraggedNot supportedErrorNot supported

## Behaviors

### Minimum and maximum width

The minimum width of a progress bar is 48 px and the maximum width of a progress bar is 768 px, for both desktop and mobile platform scale. Smaller progress bars should only be used in places where it's not necessary to have a label.

### Text overflow

When the label is too long for the available horizontal space, it wraps to form another line. The value is always shown in full and never wraps or truncates.

## Usage guidelines

### Progress bar or progress circle?

Both progress bars and circles can show either determinate or indeterminate progress. The available space should help determine whether a progress bar or circle is best. Progress bars are preferred in vertically narrow areas such as tables or cards. Use a progress circle for full-page loading or very small areas. Use a progress bar in a loader dialog.

### Labels

Use the built-in style to show a label associated with the operation. This style always includes a left-aligned label and a right-aligned percentage value above the track. The label should be in sentence case. Add an ellipsis ("...") at the end to indicate that the action is in progress — for example, "Loading data..." or "Updating settings..."

## Internationalization

### RTL

For RTL (right-to-left) languages, the layout of the progress bar is mirrored for both determinate and indeterminate options. The label is right-aligned, the value is left-aligned, and the fill progresses from right to left. Keep in mind that the placement of the percent sign differs depending on the locale.

## Accessibility

### Keyboard interactions

Key Interaction TabMoves focus onto or off of the button.Space or EnterExecutes the button action. The focus remains on the button except if the button opens or closes the current container. In this case, the focus moves to the target or back to the caller.

### Cursor guidelines

Cursor Usage PointerUse the pointer cursor for all interactive components.

### WCAG 2.2 compliance

Any criterion not mention in the below table are not applicable to this component or are resolved with underlying requirements, engineering, and styles of the entire system. 1. Perceivable Requirement Criterion Level Compliance Non-text content 1.1.1 ANon‑text elements—such as icons used in buttons—must provide a text alternative that communicates the button’s purpose. All buttons, especially icon‑only buttons, need an accessible name (for example, via a title, aria‑label, or associated text) so screen readers can announce their function.Info and relationships, Identify purpose 1.3.1, 1.3.6 A, AAAButtons should be understandable by assistive technologies like screen readers. This means using the proper semantic HTML or ARIA role of buttons should be utilized.Use of color 1.4.1 AColor is never used as the sole way to convey meaning in buttons. While negative buttons do use red to reinforce their purpose, every button also includes a clear text label that communicates the action it performs.Text contrast minimums 1.4.3 AALarge text has a contrast ratio of at least 3:1, and small text has a contrast ratio of at least 4.5:1. Incidental text such as disabled, hidden, or decorative text has no contrast requirement.Resize text 1.4.4 AAButtons should be built in such a way that they can be resized without assistive technology up to 200%.Visual presentation 1.4.8 AAAThe width of text blocks is no more than 80 characters (40 for CJK languages), and text is never justified.Non-text contrast 1.4.11 AAThe visual presentation of icons and various states have a contrast ratio of at least 3:1.Text spacing 1.4.12 AALine height of text is at least 1.5x the font size. 2. Operable Requirement Criterion Level Compliance Keyboard 2.1.1, 2.1.3 A, AAAAll functionality of the component is operable through a keyboard without specific timing for keystrokes.Keyboard traps 2.1.2 AFocus can be moved away from the component using only a keyboard.Seizures and physical reactions 2.3.1, 2.3.2, 2.3.3 A, AAA, AAAThere is no flashing content or unnecessary motion or animation in this component.Focus order 2.4.3 ANavigation sequences receive focus in an order that preserves meaning and operability.Focus visible 2.4.7 AAKeyboard states use an indicator that is visible with at least 3:1 contrast.
