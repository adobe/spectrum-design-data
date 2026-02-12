---
title: "Combo box"
source_url: https://s2.spectrum.corp.adobe.com/page/combo-box/
last_updated: 2026-02-02
category: components/inputs
component_type: input
status: published
tags:

- components-inputs
  related\_components:
- color-wheel
- date-picker
  parent\_category: inputs

---

# Combo box

## Resources

### Design

* **Figma**: S2 Web

### Implementations

| Platform                     | Link                                                                                                                               |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Spectrum CSS (archived) CSS: | [Combobox](https://opensource.adobe.com/spectrum-css/?path=/docs/components-combobox--docs)                                        |
| Spectrum Web Components SWC: | [Combobox](https://opensource.adobe.com/spectrum-web-components/storybook/?path=/docs/combobox--docs\&globals=system:spectrum-two) |
| React Spectrum RSP:          | [ComboBox](https://react-spectrum.adobe.com/s2/index.html?path=/docs/combobox--docs)                                               |

## Anatomy

```
combo box
- label
- necessity indicator
- field
- help text (help text or error message)
- menu container
```

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property           | Value                                                                                                          | Default value | Description |
| ------------------ | -------------------------------------------------------------------------------------------------------------- | ------------- | ----------- |
| label              | string                                                                                                         | –             |             |
| labelPosition      | top / side / in line top                                                                                       | –             |             |
| value              | string                                                                                                         | –             |             |
| width              | number                                                                                                         | –             |             |
| size               | s / m / l / xl m                                                                                               | –             |             |
| isRequired         | boolean                                                                                                        | false         |             |
| necessityIndicator | text / icon icon                                                                                               | –             |             |
| hasAutocomplete    | boolean                                                                                                        | false         |             |
| menuTrigger        | input / focus / manual input                                                                                   | –             |             |
| isError            | boolean                                                                                                        | false         |             |
| isDisabled         | boolean                                                                                                        | false         |             |
| isReadOnly         | boolean                                                                                                        | false         |             |
| description        | string                                                                                                         | –             |             |
| errorMessage       | string                                                                                                         | –             |             |
| state              | default / hover (text area) / hover (button area) / focus + hover / focus + not hover / keyboard focus default | –             |             |

## External links

Combo boxes combine a text field with a picker menu. They support filtering longer lists by narrowing options based on typed input. Use when both freeform entry and guided selection are needed.

These options are used in Spectrum’s design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

A combo box can be marked as having an error to show that a value needs to be entered or that a value is invalid, prompting the user to correct their input before moving forward.

A combo box can have help text below the field to give extra context or instruction about what a user should input in the field. The help text communicates a hint or helpful information, such as specific requirements for correctly filling out the field.

Combo boxes have a read-only option for when content in the disabled state still needs to be shown. This allows for content to be copied, but not interacted with or changed. A combo box does not have a read-only option if no selection has been made.

A combo box in a disabled state shows that an input field exists, but is not available in that circumstance. This can be used to maintain layout continuity and communicate that it may become available later.

A combo box can be marked as having an error to show that a value needs to be entered in order to move forward, or that a value that was entered is invalid.

"There are 3 options for how a combo box’s menu can be triggered: when a user starts typing (“input”), when focus is placed on the input field (“focus”), and manually when the user clicks or taps the field button (“manual”). These are used for different degrees of the information complexity and/or user familiarity of menu options."

By default, the menu is triggered when a user starts typing. This should be used when the content is readily familiar or commonplace enough to a user that they can begin populating values without seeing a list of all available options.

If the content of the combo box is unfamiliar or complex, the menu should be triggered when focus is placed on the input field because a user would benefit from seeing example content before selecting a value.

If the content of the combo box is highly familiar and autocomplete is sufficient to surface options, the menu can be set to trigger manually.

Combo boxes can automatically complete suggested results within the input field.

"Combo boxes can be marked as optional or required, depending on the situation. For required combo boxes, there are two styling options: a “(required)” label or an asterisk. If you use an asterisk, be sure to include hint text to explain what the asterisk means. Optional combo boxes are either denoted with text added to the end of the label — “(optional)” — or have no indication at all."

"Combo boxes come in four different sizes: small, medium, large, and extra-large. The medium size is the default and most frequently used option. Use the other sizes sparingly; they should be used to create a hierarchy of importance within the page."

The value shows a user’s entered text or the option they’ve selected.

Combo boxes should always have an accessible name, typically provided by a visible text label. In rare cases where context is sufficient and an accessibility expert has reviewed the design, the visible label may be hidden. When no visible label is present, the input must still expose an accessible name (for example, in HTML via “aria-label” or “aria-labelledby,” and on other platforms via the platform’s accessible-name mechanism).

Labels can be placed either on top or on the side. Top labels are the default and are recommended because they work better with long copy, localization, and responsive layouts. Side labels are most useful when vertical space is limited.

When the field label and menu text are too long for the available horizontal space, they wrap to form another line. The field text itself truncates at the end, but the text can be shown in full in the menu.

When the help text is too long for the available horizontal space, it wraps to form another line.

The combo box menu can be as tall as necessary to show as many options as possible in the available space. There is no maximum height.

The text input functionality of the combo box is meant to make large lists easier to search. If you have fewer than 6 items, use radio buttons. If you have more than 6 items, consider whether your list of selections is complex enough to merit searching and filtering. If it's not complex enough for a combo box, you can use a picker.

It’s okay to suppress the popover when the combo box contains entries the user is familiar with, and when autocomplete is enabled. A suppressed popover can still be opened when the field button containing the chevron is clicked.

Launch the popover immediately if your user is highly unfamiliar with the content in the combo box, or if the data is especially complex.

Launch the popover on text change if your user can get started typing without seeing a long list of options.

When a suggestion is appended to the end of typed text, it remains the selected value when focus leaves the field. This guards against the scenario when a user sees a word completed in a field, continues to another form component, and the failure to commit changes erases the suggestion.

When autocomplete is disabled, best matches get a hover style in the popover, but don’t get saved as a value unless they’re clicked on or "Enter" is pressed.

Every combo box should have a label. A combo box without a label is ambiguous and not accessible. In rare cases where a label could be absent, make sure to have the design reviewed and approved by an accessibility expert.

Keep menu items short and concise. Long menu items that cause text to wrap to multiple lines are discouraged. If text wrapping becomes a frequent concern, consider revising the text or use alternative UI patterns that will give your content more space.

Choose a width for your combo boxes that is likely to accommodate the majority of selections available within it. When a combo box is in focus and the typed input exceeds the width of the field, push the leftmost text out of sight while allowing text to continue to be entered towards the chevron. When a combo box is deselected, truncate the selected entry with ellipsis before it collides with the chevron button.

Field labels, placeholder text, and menu items should be in sentence case.

"When labeling combo boxes in a form, only mark the minority type—either required or optional—to reduce visual clutter:"

"Important: Never use an asterisk to indicate an optional combo box."

The help text’s message should not simply restate the same information in the label in order to prompt someone to interact with it. Don’t add help text if it isn’t actually relevant or meaningful to a user in order to try to maintain layout continuity with other inputs that require help text.

Putting instructions for how to complete an input, requirements, or any other essential information into placeholder text is not accessible. Once a value is entered, placeholder text is no longer viewable; if someone is using an automatic form filler, they will never get the information in the placeholder text.

Instead of placeholder text, use the help text description to convey requirements or to show any formatting examples that would help user comprehension. If there's placeholder text and help text at the same time, it becomes redundant and distracting, especially if they're communicating the same thing.

The help text area also displays an error message. When a combo box already includes help text and an error is triggered, the help text is replaced with error text. Once the error is resolved, the help text description reappears below the field.

Since one gets replaced by the other, the language of the help text and error text need to work together to convey the same messaging. Help text explains the requirement or adds supplementary context for how to successfully complete the input. Error text tells a user how to fix the error by re-stating the input requirements or describing the necessary interaction. Make sure that the help text and the error text include the same essential information so that it isn’t lost if one replaces the other like minimum requirements.

Write error messaging in a human-centered way by guiding a user and showing them a solution — don’t simply state what’s wrong and then leave them guessing as to how to resolve it. Ambiguous error messages can be frustrating and even shame-inducing for users. Also, keep in mind that something that a system may deem an error may not actually be perceived as an error to a user.

"Error text should be written in 1-2 short, complete sentences and in a clear and straightforward way. End sentences with a period, and never with an exclamation point. For combo boxes, the nature of the error is often related to something that needs to be fixed for in-line validation, so a helpful tone is most appropriate. For example, if someone were to miss filling out a combo box that asks for them to choose a topic, write the error text like you’re offering a hint or a tip to help guide them to understand what needs to go in the missing field: “Choose at least one topic.”"

## States

When the help text is too long for the available horizontal space, it wraps to form another line.

The combo box menu can be as tall as necessary to show as many options as possible in the available space. There is no maximum height.

Launch the popover immediately if your user is highly unfamiliar with the content in the combo box, or if the data is especially complex.

Launch the popover on text change if your user can get started typing without seeing a long list of options.

Field labels, placeholder text, and menu items should be in sentence case.

"When labeling combo boxes in a form, only mark the minority type—either required or optional—to reduce visual clutter:"

"Important: Never use an asterisk to indicate an optional combo box."

## Behaviors

When the help text is too long for the available horizontal space, it wraps to form another line.

The combo box menu can be as tall as necessary to show as many options as possible in the available space. There is no maximum height.

Launch the popover immediately if your user is highly unfamiliar with the content in the combo box, or if the data is especially complex.

Launch the popover on text change if your user can get started typing without seeing a long list of options.

Field labels, placeholder text, and menu items should be in sentence case.

"When labeling combo boxes in a form, only mark the minority type—either required or optional—to reduce visual clutter:"

"Important: Never use an asterisk to indicate an optional combo box."

## Usage guidelines

Launch the popover immediately if your user is highly unfamiliar with the content in the combo box, or if the data is especially complex.

Launch the popover on text change if your user can get started typing without seeing a long list of options.

Field labels, placeholder text, and menu items should be in sentence case.

"When labeling combo boxes in a form, only mark the minority type—either required or optional—to reduce visual clutter:"

"Important: Never use an asterisk to indicate an optional combo box."

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

* [Color wheel](/page/color-wheel/)
* [Date picker](/page/date-picker/)
