---
title: Slider
source_url: /web/rsp/components/slider
last_updated: null
status: published
tags: []
hub_path: /web/rsp/components/slider
swc_exists: false
---

# Slider

## Anatomy

slider label (optional) value (optional) track fill handle

## Component options

label Sliders should always have a label. In rare cases where context is sufficient and an accessibility expert has reviewed the design, the label could be undefined. These sliders must still include an ARIA label in HTML, using either aria-label or aria-labelledby attributes depending on context. labelPosition Labels can be placed either on top or on the side. Top labels are the default and are recommended because they work better with long text, localization, and responsive layouts. Side labels are most useful when vertical space is limited. value The value is the number selected within the slider's range, from the min value to max value. maxValue and minValue The min and max values can also be customized appropriately for whatever the slider is showing. By default, the min value starts at 0 and the max value is set to 100. isRange More information about a design scenario, to use this option in the component. step The step is the increment by which these values increase or decrease. A step value of 1 (the default) lets a user only select whole numbers within the min and max range. valueFormat Sometimes a value needs to be formatted for localization or for clearer communication such as currencies or percentages. Formatting can involve rounding, mathematical transformations, number formatting, or displaying a prefix or suffix, such as "+/-" or "px." progressionScale Sliders use a linear progression scale by default which means that value is directly correlated to the position of the handle along the track. In some cases, sliders can use a logarithmic (log) progression scale, which is helpful when users need finer control over small values. width The width of a slider can be customized appropriately for its context. hasFill The track of the slider can have a fill. By default, the fill originates from the left side of the track. fillStart If the value represents an offset, the fill start can be set to represent the point of origin. This allows the slider fill to start from inside the track. hasGradient A gradient can be added to the track of any slider to give more meaning to the range of values. Tracks with a gradient can also have a fill. A gradient track should not be used for choosing a precise color; use a color slider, color area, or color wheel instead. isEditable In situations where users should be able to precisely input a value, the value can be editable within a text field. isDisabled A disabled slider shows that an input exists but is not available in the current context. This helps maintain layout continuity and signals that the slider may become available later.

## States

State Support status DefaultSupportedHoverSupportedDownSupportedKeyboard focusSupportedDisabledSupportedSelectedNot SupportedDraggedNot supportedErrorNot supported

## Behaviors

### Keyboard focus

A slider can be navigated using a keyboard. The keyboard focus state takes the slider's visual hover state and adds a blue ring to the slider handle in focus.

### Value placement

The value follows the placement of the label: on top when the label is on top, and on the side when the label is on the side. The exception to this rule is when the value is editable in a text field, either standard or quiet style. In that case, the editable input is always placed on the side and should include an ARIA label for accessibility, using either aria-labelledby or aria-label.

### Mixed value

A slider representing multiple non-identical values appears as indeterminate, with an en dash (–) in place of the value. The handle position corresponds to the first selected value.

### Text overflow

When the label is too long for the available horizontal space, it wraps to form another line.

### Double-click to reset

After a slider has been adjusted, it can be reset to the default value by double-clicking the handle.

## Usage guidelines

### Include a label

Every slider should have a label. A slider without a label is ambiguous and not accessible. Write the label in sentence case.

### Review label-less designs

In rare cases where context is sufficient and a label could be absent, make sure to have the design reviewed and approved by an accessibility expert. These sliders must still include an ARIA label in HTML, using either aria-label or aria-labelledby depending on context.

### Allow a hot text option when needed

In addition to dragging the handle, sliders can offer other ways to change the value, known as "hot text." Users can click the value text and drag up or down, or scroll up or down while hovering over the value text.

### Show value units to help provide context

Slider values can include a unit when it adds context, such as "%" or "px." When the value is shown within a text field, the unit disappears on focus.

### Prefix positive/negative values

If the value ranges from negative to positive, prefix the value with a plus (+) or minus (-) sign. When the sign is shown within a text field, it remains visible on focus. When the sign is shown outside the text field, there should be a space between the sign and the numerical value for readability.

## Internationalization

### RTL

For RTL (right-to-left) languages, the layout of the slider is mirrored. The label is right-aligned, the value is left-aligned, and the fill progresses from right to left. Keep in mind that the placement of the percent sign differs depending on the locale.

## Accessibility

### Keyboard interactions

Key Interaction TabMoves focus onto or off of the button.Space or EnterExecutes the button action. The focus remains on the button except if the button opens or closes the current container. In this case, the focus moves to the target or back to the caller.

### Cursor guidelines

Cursor Usage PointerUse the pointer cursor for all interactive components.

### WCAG 2.2 compliance

Any criterion not mention in the below table are not applicable to this component or are resolved with underlying requirements, engineering, and styles of the entire system. 1. Perceivable Requirement Criterion Level Compliance Non-text content 1.1.1 ANon‑text elements—such as icons used in buttons—must provide a text alternative that communicates the button’s purpose. All buttons, especially icon‑only buttons, need an accessible name (for example, via a title, aria‑label, or associated text) so screen readers can announce their function.Info and relationships, Identify purpose 1.3.1, 1.3.6 A, AAAButtons should be understandable by assistive technologies like screen readers. This means using the proper semantic HTML or ARIA role of buttons should be utilized.Use of color 1.4.1 AColor is never used as the sole way to convey meaning in buttons. While negative buttons do use red to reinforce their purpose, every button also includes a clear text label that communicates the action it performs.Text contrast minimums 1.4.3 AALarge text has a contrast ratio of at least 3:1, and small text has a contrast ratio of at least 4.5:1. Incidental text such as disabled, hidden, or decorative text has no contrast requirement.Resize text 1.4.4 AAButtons should be built in such a way that they can be resized without assistive technology up to 200%.Visual presentation 1.4.8 AAAThe width of text blocks is no more than 80 characters (40 for CJK languages), and text is never justified.Non-text contrast 1.4.11 AAThe visual presentation of icons and various states have a contrast ratio of at least 3:1.Text spacing 1.4.12 AALine height of text is at least 1.5x the font size. 2. Operable Requirement Criterion Level Compliance Keyboard 2.1.1, 2.1.3 A, AAAAll functionality of the component is operable through a keyboard without specific timing for keystrokes.Keyboard traps 2.1.2 AFocus can be moved away from the component using only a keyboard.Seizures and physical reactions 2.3.1, 2.3.2, 2.3.3 A, AAA, AAAThere is no flashing content or unnecessary motion or animation in this component.Focus order 2.4.3 ANavigation sequences receive focus in an order that preserves meaning and operability.Focus visible 2.4.7 AAKeyboard states use an indicator that is visible with at least 3:1 contrast.
