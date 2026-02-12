---

title: "Button"
source\_url: <https://s2.spectrum.corp.adobe.com/page/button/>
last\_updated: 2026-02-01
category: components/actions
component\_type: action
status: published
tags:

* components-actions
* action
* button
* interactive
  related\_components:
* action-group
* button-group
* progress-bar
* progress-circle
  parent\_category: actions

---

# Button

## Overview

Buttons enable actions or navigation between views. They come in multiple styles to support different levels of emphasis, and are commonly used to guide progression through a flow.

## Resources

### Design

* **Figma**: S2 Web

### Implementations

| Platform                | Link                                                                                                                                            |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Spectrum CSS (archived) | [CSS: Button](https://opensource.adobe.com/spectrum-css/?path=/docs/components-button--docs)                                                    |
| Spectrum Web Components | [SWC: Button](https://opensource.adobe.com/spectrum-web-components/storybook/?path=/docs/button-accent-fill--docs\&globals=system:spectrum-two) |
| React Spectrum          | [RSP: Button](https://react-spectrum.adobe.com/s2/index.html?path=/docs/button--docs)                                                           |

## Anatomy

```
button
  - label
```

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property    | Value                                   | Default value | Description                                                             |
| ----------- | --------------------------------------- | ------------- | ----------------------------------------------------------------------- |
| label       | string                                  | –             |                                                                         |
| hideLabel   | boolean                                 | false         |                                                                         |
| icon        | –                                       | –             | Icon must be present if the label is not defined.                       |
| variant     | accent / negative / primary / secondary | accent        |                                                                         |
| staticColor | white / black                           | –             | Static color must not be set for the default version of this component. |
| style       | fill / outline                          | fill          |                                                                         |
| size        | s / m / l / xl                          | m             |                                                                         |
| justified   | boolean                                 | false         |                                                                         |
| isPending   | boolean                                 | false         |                                                                         |
| isDisabled  | boolean                                 | false         |                                                                         |
| state       | default / hover / down / keyboard focus | default       |                                                                         |

### isDisabled

A button in a disabled state shows that an action exists, but is not available in that circumstance. This state can be used to maintain layout continuity and to communicate that an action may become available later.

### isPending

Buttons can indicate that a quick progress action is taking place (e.g., saving settings on a server). In this case, the label and optional icon disappear and a progress circle appears. The progress circle always shows an indeterminate progress.

Use the pending state for a button sparingly. It should be reserved only for when the progress is supposed to be quick (taking 5 seconds or less), and when there is no better way to communicate as such.

### justified

A button can become justified. By default, it is not justified since the button size depends on the label and/or icon inside of each button. When a button is justified, it takes up the entire available container width.

### size

Buttons come in four different sizes: small, medium, large, and extra-large. The medium size is the default and most frequently used option. Use the other sizes sparingly; they should be used to create a hierarchy of importance within the page.

### style

Buttons are available in either fill or outline styles. A button in the fill style has a solid background, since it's meant to be intentionally more prominent than a button in the outline style.

An outline style button has a visible stroke and no background color, and should only be used for secondary actions.

### staticColor

When a button needs to be placed on top of a color background or a visual, use the static color option. Static color buttons are available in primary and secondary outline or fill styles, in black or white, and don't change shades or values depending upon the color theme.

Use static black on light color or image backgrounds, and static white on dark color or image backgrounds, regardless of the color theme.

Static color buttons can appear in static white or black, regardless of color theme. The static color option allows for these to be placed on top of a custom background that is not part of a Spectrum color theme while still providing optimal contrast.

### variant

The Button component includes four variants: Accent, Primary, Secondary, and Negative. Each variant represents a different level of emphasis, helping designers establish clear visual hierarchy and guide users toward appropriate actions.

* The **accent button** communicates strong emphasis and is reserved for actions that are essential to an experience. Don't use more than 3 accent buttons in the same view. These give extra prominence to important actions and are meant to establish a clear hierarchy.
* The **primary button** is for medium emphasis. Use it in place of a call to action button when the action requires less prominence, or if there are multiple primary actions of the same importance in the same view.
* The **secondary button** is for low emphasis. It's paired with other button types to surface less prominent actions, and should never be the only button in a group.
* The **negative button** is for emphasizing actions that can be destructive or have negative consequences if taken. Use it sparingly.

### label, hideLabel, and icon

Buttons should always have a label, unless they are only using an icon that is universally understood and accessible. They can have an optional icon, but it should not be used for decoration. Use an icon only when necessary and when it has a strong association with the label text.

The label can be hidden using the hideLabel option to create an icon-only button. If the label is hidden, an icon is required, and the label will appear in a tooltip.

## States

| State          | Support status |
| -------------- | -------------- |
| Default        | Supported      |
| Hover          | Supported      |
| Down           | Supported      |
| Keyboard focus | Supported      |
| Disabled       | Supported      |
| Selected       | Not supported  |
| Dragged        | Not supported  |
| Error          | Not supported  |

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

Do not use custom colors for buttons. The colors of different button variations have been designed to be consistent and accessible.

### When to use static black and static white

To ensure maximum contrast with the background, use static black for light backgrounds and images, and use static white for dark backgrounds and images. Avoid placing static components on top of busy images with a lot of variance in contrast.

### Don't use the pending state for long progress

The pending state should be reserved for indeterminate actions that are expected to take 5 seconds or less. For determinate or longer actions, use a [progress bar](/page/progress-bar/) or [progress circle](/page/progress-circle/) outside of the button.

### Use a button group to show additional actions

Instead of a single split button (now a deprecated component), use a [button group](/page/button-group/) to show any additional actions related to the most critical action.

### Display a popover when featuring subsequent options

In some instances, it's possible to have a call to action button display a popover (or tray) to feature subsequent options. These options should extend and parallel the action of the button. Do not include arbitrary or unrelated options.

## Design tokens

Use the [Spectrum Token Visualization Tool](https://opensource.adobe.com/spectrum-tokens/s2-visualizer/?filter=spectrum%2Clight%2Cdesktop) to review the tokens for this component.

## Changelog

| Date               | Number | Notes                                                       |
| ------------------ | ------ | ----------------------------------------------------------- |
| November 19, 2025  | 1.1.0  | New guidelines were added to this page.                     |
| September 15, 2025 | 1.0.0  | This component was added to the Spectrum 2 guidelines site. |

## Questions or feedback?

Ask questions about this component by posting in [#spectrum-design](https://adobe.enterprise.slack.com/archives/C0B4ZDHEE) on Slack. Submit any feedback or file bugs (either about this component or its documentation) through Spectrum's [feedback form](https://adobe.enterprise.slack.com/lists/T024FSURM/F08FFP5MLHJ).

## Related Components

* [Action group](/page/action-group/)
* [Button group](/page/button-group/)
* [Progress bar](/page/progress-bar/)
* [Progress circle](/page/progress-circle/)
