---

title: "Cards"
source\_url: <https://s2.spectrum.corp.adobe.com/page/cards/>
last\_updated: 2026-02-02
category: components/containers
component\_type: container
status: published
tags:

* components-containers
  related\_components:
* menu
* divider
  parent\_category: containers

---

# Cards

## Resources

### Design

* **Figma**: S2 Web

### Implementations

| Platform                     | Link                                                                                                                       |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Spectrum CSS (archived) CSS: | [Card](https://opensource.adobe.com/spectrum-css/?path=/docs/components-card--docs)                                        |
| Spectrum Web Components SWC: | [Card](https://opensource.adobe.com/spectrum-web-components/storybook/?path=/docs/card--docs\&globals=system:spectrum-two) |
| React Spectrum RSP:          | [Card](https://react-spectrum.adobe.com/s2/index.html?path=/docs/card--docs)                                               |

## Anatomy

```
card
- container
- checkbox (optional)
- preview well
- preview (asset)
- metadata
- footer area
- title
- metadata
```

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property | Value                                                            | Default value | Description                        |
| -------- | ---------------------------------------------------------------- | ------------- | ---------------------------------- |
| variant  | asset / collection / flex / gallery / horizontal / product asset | Determines    | which card layout variant is used. |

## External links

Cards group related content and actions into flexible containers for browsing. They preview key information and reveal more detail on interaction.

These options are used in Spectrum’s design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

Card preview areas have a maximum image height aspect ratio of 3:4, and a minimum height aspect ratio of of 4:1.

If the card has a fixed height, such as in a tile grid, long titles will be truncated. Use short titles to avoid this. In layouts with variable height, like a waterfall grid, titles will wrap to fit.

Cards, by definition, should have some form of interaction such as viewing, editing, purchasing, etc. Some actions are exposed in buttons, and others simply occur by clicking the card.

If a card only has an ability to be opened or viewed in more detail, do not include a button. Clicking anywhere on the card should perform that action.

If a card has other interactive elements such as a hidden actions menu or an avatar, but no buttons, the whole card (outside of those elements) should be clickable.

If there’s only one action (that’s not opening or viewing the card), use a button to communicate that action. If there are two or more available actions, and one of those actions is to open or view the card, use a button to communicate “View” or “Open,” instead of relying on clicking on the card.

If a standard card has a footer with a button, only the button is clickable. If a card has a preview, clicking the preview will open that card. When a preview is purely decorative, it is not clickable.

"When a group of cards are loading, they follow the ghost loading convention. There are 5 phases for ghost loading:"

Cards are meant to just show a taste of the available information. Don’t overload cards with more information than necessary.

Only standard cards can have a footer, and buttons can only appear inside a footer.

Individual cards are not aligned to individual columns in the page's responsive column grid. Instead, groups of cards are aligned to the column grid in a layout region.

If the preview is a video clip or other moving item, do not automatically play the clip or motion. Save the movement for either when a user hovers on the card or when they click on a play button.

## Card types

Card preview areas have a maximum image height aspect ratio of 3:4, and a minimum height aspect ratio of of 4:1.

"When a group of cards are loading, they follow the ghost loading convention. There are 5 phases for ghost loading:"

Cards are meant to just show a taste of the available information. Don’t overload cards with more information than necessary.

Only standard cards can have a footer, and buttons can only appear inside a footer.

## Behaviors

Card preview areas have a maximum image height aspect ratio of 3:4, and a minimum height aspect ratio of of 4:1.

"When a group of cards are loading, they follow the ghost loading convention. There are 5 phases for ghost loading:"

Cards are meant to just show a taste of the available information. Don’t overload cards with more information than necessary.

Only standard cards can have a footer, and buttons can only appear inside a footer.

## Usage guidelines

Cards are meant to just show a taste of the available information. Don’t overload cards with more information than necessary.

Only standard cards can have a footer, and buttons can only appear inside a footer.

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

* [Menu](/page/menu/)
* [Divider](/page/divider/)
