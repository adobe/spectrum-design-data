---
title: Button
source_url: /web/rsp/components/button
last_updated: null
status: published
tags: []
hub_path: /web/rsp/components/button
swc_exists: true
---

# Button

## Anatomy

button label

## Component options

isDisabled A button in a disabled state shows that an action exists, but is not available in that circumstance. This state can be used to maintain layout continuity and to communicate that an action may become available later. isPending Buttons can indicate that a quick progress action is taking place (e.g., saving settings on a server). In this case, the label and optional icon disappear and a progress circle appears. The progress circle always shows an indeterminate progress. Use the pending state for a button sparingly. It should be reserved only for when the progress is supposed to be quick (taking 5 seconds or less), and when there is no better way to communicate as such. justified A button can become justified. By default, it is not justified since the button size depends on the label and/or icon inside of each button. When a button is justified, it takes up the entire available container width. size Buttons come in four different sizes: small, medium, large, and extra-large. The medium size is the default and most frequently used option. Use the other sizes sparingly; they should be used to create a hierarchy of importance within the page. style Buttons are available in either fill or outline styles. A button in the fill style has a solid background, since it's meant to be intentionally more prominent than a button in the outline style. An outline style button has a visible stroke and no background color, and should only be used for secondary actions. staticColor When a button needs to be placed on top of a color background or a visual, use the static color option. Static color buttons are available in primary and secondary outline or fill styles, in black or white, and don't change shades or values depending upon the color theme. Use static black on light color or image backgrounds, and static white on dark color or image backgrounds, regardless of the color theme. Static color buttons can appear in static white or black, regardless of color theme. The static color option allows for these to be placed on top of a custom background that is not part of a Spectrum color theme while still providing optimal contrast. variant The Button component includes four variants: Accent, Primary, Secondary, and Negative. Each variant represents a different level of emphasis, helping designers establish clear visual hierarchy and guide users toward appropriate actions. The accent button communicates strong emphasis and is reserved for actions that are essential to an experience. Don't use more than 3 accent buttons in the same view. These give extra prominence to important actions and are meant to establish a clear hierarchy. The primary button is for medium emphasis. Use it in place of a call to action button when the action requires less prominence, or if there are multiple primary actions of the same importance in the same view. The secondary button is for low emphasis. It's paired with other button types to surface less prominent actions, and should never be the only button in a group. The negative button is for emphasizing actions that can be destructive or have negative consequences if taken. Use it sparingly. label, hideLabel, and icon Buttons should always have a label, unless they are only using an icon that is universally understood and accessible. They can have an optional icon, but it should not be used for decoration. Use an icon only when necessary and when it has a strong association with the label text. The label can be hidden using the hideLabel option to create an icon-only button. If the label is hidden, an icon is required, and the label will appear in a tooltip.

## States

State Support status DefaultSupportedHoverSupportedDownSupportedKeyboard focusSupportedDisabledSupportedSelectedNot supportedDraggedNot supportedErrorNot supported

## Behaviors

### Keyboard focus

A button can be navigated using a keyboard. The keyboard focus state takes the button's visual hover state and adds a blue ring to the button in focus.

### Tooltip when the label is hidden

When the button label is hidden, a tooltip is shown on hover that displays the label text and, if appropriate, a keyboard shortcut.

### Flexible width

The width of a button automatically adjusts to fit the label text. The padding on each side of the button is equal to half its height.

### Minimum width

Buttons have a minimum width of 2.25× the height of the button. This ensures that small buttons retain an identifiable shape.

### Text overflow

When the button text is too long for the horizontal space available, it wraps to form another line.

### Cursor style

Buttons use the default arrow cursor for all states, including hover and down. The only exception occurs on the web; if the button is using the href property it will display the pointer cursor instead.

### Delay before pending state

Some progress can be very quick. In order to avoid showing a progress circle for a fraction of a second, which results in an unpleasant flickering, there is a delay of 1 second before the pending state appears. During this delay, the button continues to visually respond to interactive events (e.g., hover), but additional clicks do not result in repeated submissions.

## Usage guidelines

### Use icons only when necessary

Icons can be used in buttons when additional clarity is required and the icon is highly relevant to the action. Icons should not be used for decoration.

### Don't override color

Do not use custom colors for buttons. The colors of different button variations have been designed to be consistent and accessible

### When to use static black and static white

To ensure maximum contrast with the background, use static black for light backgrounds and images, and use static white for dark backgrounds and images. Avoid placing static components on top of busy images with a lot of variance in contrast.

### Don't use the pending state for long progress

The pending state should be reserved for indeterminate actions that are expected to take 5 seconds or less. For determinate or longer actions, use a progress bar or progress circle outside of the button.

### Use a button group to show additional actions

Instead of a single split button (now a deprecated component), use a button group to show any additional actions related to the most critical action.

### Display a popover when featuring subsequent options

In some instances, it's possible to have a call to action button display a popover (or tray) to feature subsequent options. These options should extend and parallel the action of the button. Do not include arbitrary or unrelated options.

## Content standards

### Be concise

Button text should be concise: 1 or 2 words, no longer than 4 words, with fewer than 20 characters including spaces. Don't use punctuation marks such as periods or exclamation points.

### Write labels as verbs

A button represents an action, so its label needs to reflect the action that a user is taking — which is a verb. Labels written as nouns or adjectives tend to be unclear and disorienting.

### Clearly state the action

Make sure that a button's label clearly states the outcome of the action. Use the same word or phrase as found elsewhere in the experience. For example, when designing a form for people to sign up for a trial offer, use "Sign up" as the call to action for completing the form. Phrases like "Start trial" skip the sign up step. Words like "Submit" or "Enter," while technically correct, focus on the action of finishing filling out the form itself, rather than what the user is actually doing by filling it out (signing up for something).

### Use sentence case

Button text should always be in sentence case. Never use capitalization to emphasize a specific button.

### Be aware of tone

Emoji and exclamation points aren't appropriate for the functional, utilitarian nature of buttons. Keep the label to just text, with no punctuation or extra decoration.

## Internationalization

### RTL

For RTL (right-to-left) languages, the layout of the button is mirrored. The icon is placed on the right side of the text.

## Accessibility

### Keyboard interactions

Key Interaction TabMoves focus onto or off of the button.Space or EnterExecutes the button action. The focus remains on the button except if the button opens or closes the current container. In this case, the focus moves to the target or back to the caller.

### Cursor guidelines

Cursor Usage PointerUse the pointer cursor for all interactive components.

### WCAG 2.2 compliance

Any criterion not mention in the below table are not applicable to this component or are resolved with underlying requirements, engineering, and styles of the entire system. 1. Perceivable Requirement Criterion Level Compliance Non-text content 1.1.1 ANon‑text elements—such as icons used in buttons—must provide a text alternative that communicates the button’s purpose. All buttons, especially icon‑only buttons, need an accessible name (for example, via a title, aria‑label, or associated text) so screen readers can announce their function.Info and relationships, Identify purpose 1.3.1, 1.3.6 A, AAAButtons should be understandable by assistive technologies like screen readers. This means using the proper semantic HTML or ARIA role of buttons should be utilized.Use of color 1.4.1 AColor is never used as the sole way to convey meaning in buttons. While negative buttons do use red to reinforce their purpose, every button also includes a clear text label that communicates the action it performs.Text contrast minimums 1.4.3 AALarge text has a contrast ratio of at least 3:1, and small text has a contrast ratio of at least 4.5:1. Incidental text such as disabled, hidden, or decorative text has no contrast requirement.Resize text 1.4.4 AAButtons should be built in such a way that they can be resized without assistive technology up to 200%.Visual presentation 1.4.8 AAAThe width of text blocks is no more than 80 characters (40 for CJK languages), and text is never justified.Non-text contrast 1.4.11 AAThe visual presentation of icons and various states have a contrast ratio of at least 3:1.Text spacing 1.4.12 AALine height of text is at least 1.5x the font size. 2. Operable Requirement Criterion Level Compliance Keyboard 2.1.1, 2.1.3 A, AAAAll functionality of the component is operable through a keyboard without specific timing for keystrokes.Keyboard traps 2.1.2 AFocus can be moved away from the component using only a keyboard.Seizures and physical reactions 2.3.1, 2.3.2, 2.3.3 A, AAA, AAAThere is no flashing content or unnecessary motion or animation in this component.Focus order 2.4.3 ANavigation sequences receive focus in an order that preserves meaning and operability.Focus visible 2.4.7 AAKeyboard states use an indicator that is visible with at least 3:1 contrast.
