---

title: "Button group"
source\_url: <https://s2.spectrum.corp.adobe.com/page/button-group/>
last\_updated: 2026-02-02
category: components/actions
component\_type: action
status: published
tags:

* components-actions
* action
* button
* interactive
  related\_components:
* button
* close-button
  parent\_category: actions

---

# Button group

## Resources

### Design

* **Figma**: S2 Web

### Implementations

| Platform                            | Link                                                                                                                                |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Spectrum CSS (archived) CSS: Button | [group](https://opensource.adobe.com/spectrum-css/?path=/docs/components-button-group--docs)                                        |
| Spectrum Web Components SWC: Button | [Group](https://opensource.adobe.com/spectrum-web-components/storybook/?path=/docs/button-group--docs\&globals=system:spectrum-two) |
| React Spectrum RSP:                 | [ButtonGroup](https://react-spectrum.adobe.com/s2/index.html?path=/docs/buttongroup--docs)                                          |

## Anatomy

```
button group
- button
- label
```

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property     | Value                            | Default value | Description |
| ------------ | -------------------------------- | ------------- | ----------- |
| orientation  | horizontal / vertical horizontal | –             |             |
| size         | s / m / l / xl m                 | –             |             |
| overflowMode | wrap / collapse wrap             | –             |             |
| isDisabled   | boolean                          | false         |             |

## External links

Button groups organize related buttons into a single group for presenting multiple, related actions.

These options are used in Spectrum’s design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

A button group in a disabled state shows that the buttons within the group exist, but are not available in that circumstance. This state can be used to maintain layout continuity and to communicate that a button group may become available later.

This option stacks button groups vertically when horizontal space is limited, placing the most important action at the bottom.

"Button groups come in four different sizes: small, medium, large, and extra-large. The medium size is the default and most frequently used option. Use the other sizes sparingly; they should be used to create a hierarchy of importance within the page."

A button group can be either horizontal or vertical in its orientation. By default, a button group is horizontal. Use vertical option when horizontal space is limited.

When horizontal space is limited, button groups stack vertically. Buttons are stacked by the importance of the action, with the most critical or primary action at the bottom.

Button groups are aligned contextually. In general, button groups are left-aligned to follow content such as a block of text. They are center-aligned in the context of an empty state. And, they should be right-aligned inside container components such as dialogs, popovers, or cards.

The order of button priority should match the alignment of surrounding text. When text is left-aligned, buttons should be arranged so that the leftmost button is the most critical. When text is right- or center- aligned, the most critical action should be the furthest right.

Not all buttons in a group require an icon, but buttons with icons should always be of a higher priority than ones without icons. If the most critical action in a group doesn’t have an icon, don’t use icons in the remaining lower-level actions.

Instead of a single split button (now a deprecated component), use a button group to show any additional actions related to the most critical action.

## States

Instead of a single split button (now a deprecated component), use a button group to show any additional actions related to the most critical action.

## Behaviors

Instead of a single split button (now a deprecated component), use a button group to show any additional actions related to the most critical action.

## Usage guidelines

Instead of a single split button (now a deprecated component), use a button group to show any additional actions related to the most critical action.

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

* [Button](/page/button/)
* [Close button](/page/close-button/)
