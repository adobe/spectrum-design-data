---

title: "Search field"
source\_url: <https://s2.spectrum.corp.adobe.com/page/search-field/>
last\_updated: 2026-02-02
category: components/inputs
component\_type: input
status: published
tags:

* components-inputs
* input
* form
  related\_components:
* rating
* segmented-control
  parent\_category: inputs

---

# Search field

## Resources

### Design

* **Figma**: S2 Web

### Implementations

| Platform                     | Link                                                                                                                                                                                    |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spectrum CSS (archived) CSS: | [Search](https://opensource.adobe.com/spectrum-css/?path=/docs/components-search--docs)                                                                                                 |
| Spectrum Web Components SWC: | \[Search]\(<https://opensource.adobe.com/spectrum-web-components/storybook/?path=/docs/search--docs&globals=system:spectrum-two;backgrounds.grid:!false;backgrounds.value:!hex(F8F8F8)> |
| React Spectrum RSP:          | [SearchField](https://react-spectrum.adobe.com/s2/index.html?path=/docs/searchfield--docs)                                                                                              |

## Anatomy

```
search field
- field
- leading icon (search or custom)
- label / search term
- in-field button
- help text (help text)
```

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property    | Value                                                                               | Default value | Description |
| ----------- | ----------------------------------------------------------------------------------- | ------------- | ----------- |
| label       | string                                                                              | –             |             |
| hideLabel   | boolean                                                                             | false         |             |
| icon        | – – Icon must be present if the label is not                                        | defined.      |             |
| value       | string                                                                              | –             |             |
| width       | number                                                                              | –             |             |
| size        | s / m / l / xl m                                                                    | –             |             |
| helpText    | string                                                                              | –             |             |
| placeholder | string                                                                              | –             |             |
| isDisabled  | boolean                                                                             | false         |             |
| state       | default / down / hover / focus + hover / focus + not hover / keyboard focus default | –             |             |

## External links

Search fields enable finding or filtering items based on text input.

These options are used in Spectrum’s design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

A search field should include a label and a search icon. In the default state before a search term is input, the label is in regular body text style to meet contrast ratios and to show that this is a field label, not placeholder text. When no visible label is present, the input must still expose an accessible name (for example, in HTML via “aria-label” or “aria-labelledby,” and on other platforms via the platform’s accessible-name mechanism).

The value shows a user’s entered text in regular body text style.

The width of a search field can be customized appropriately for its context.

"Search fields come in four different sizes: small, medium, large, and extra-large. The medium size is the default and most frequently used option. Use the other sizes sparingly; they should be used to create a hierarchy of importance within the page."

A search field can have help text below the field to give extra context or instruction about what a user should input. The description communicates a hint or helpful information, such as a search’s scope.

Placeholder text provides hints about expected input values.

A search field in a disabled state shows that a search option exists, but is not available in that circumstance. This can be used to maintain layout continuity and communicate that it may become available later.

The minimum width for a search field is 3× the height of the field, for both standard and quiet style. This minimum width guarantees that small search fields are readable and easy to target on touch devices.

When the entered text is too long for the available horizontal space in the field, the text truncates.

When the help text is too long for the available horizontal space, it wraps to form another line.

A search field can be navigated using a keyboard. The keyboard focus state takes the field’s visual hover state and adds a blue ring to the field in focus.

The in-field button offers an option to clear any input search term.

If search results are being shown in a menu or popover, selecting this button will close the menu and clear the field. If a search term has been entered and the results have appeared, selecting this will only clear the field and not affect the list of results.

Search fields do not have an error state. Search functionality should anticipate spelling mistakes in search queries, and accommodate multiple spellings of words in search results — not treating any search term as an error.

Instead of showing an error, show a “No results” page or a section with any suggestions for how to get results to appear.

In a searching scenario, a user inputs a search term for a specific thing they’re looking for. In a filtering scenario, a user generally knows what they’re looking for, but may not have a specific thing in mind.

The search field can be used for both of these contexts. For a search experience, use the search field as-is. For a filtering experience, add a filter icon next to the search field, where a user can narrow down their search results before (or instead of) searching using a specific term. Filters can appear below the search field as tags.

Spectrum previously had a specific “search within” component that would allow a user to filter down a search field category before searching for a particular term. It was deprecated because it did not meet accessibility and localization requirements.

Any search field should include a label inside the field, in the default state. The default label text is Search, but this can be customized to be more specific for use cases like scoped search, wayfinding, or building context — acting like a prompt for a user to search more specifically.

Keep in mind that once a search term is entered the label text is no longer viewable. Use help text to show search formatting examples or give hints about what to input. It can be distracting or redundant if the search field label and its help text are both communicating the same thing, so write these thoughtfully.

The label within the search field should be in sentence case, following Spectrum’s UX writing standards for capitalization.

## States

When the entered text is too long for the available horizontal space in the field, the text truncates.

When the help text is too long for the available horizontal space, it wraps to form another line.

The in-field button offers an option to clear any input search term.

Instead of showing an error, show a “No results” page or a section with any suggestions for how to get results to appear.

The label within the search field should be in sentence case, following Spectrum’s UX writing standards for capitalization.

## Behaviors

When the entered text is too long for the available horizontal space in the field, the text truncates.

When the help text is too long for the available horizontal space, it wraps to form another line.

The in-field button offers an option to clear any input search term.

Instead of showing an error, show a “No results” page or a section with any suggestions for how to get results to appear.

The label within the search field should be in sentence case, following Spectrum’s UX writing standards for capitalization.

## Usage guidelines

Instead of showing an error, show a “No results” page or a section with any suggestions for how to get results to appear.

The label within the search field should be in sentence case, following Spectrum’s UX writing standards for capitalization.

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

* [Rating](/page/rating/)
* [Segmented control](/page/segmented-control/)
