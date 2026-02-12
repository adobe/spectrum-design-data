---
title: "Help text"
source_url: https://s2.spectrum.corp.adobe.com/page/help-text/
last_updated: 2026-02-02
category: components/inputs
component_type: input
status: published
tags:

- components-inputs
related_components:
- field-label
- number-field
parent_category: inputs

---

# Help text

## Resources

### Design

* **Figma**: S2 Web

### Implementations

| Platform                          | Link                                                                                                                                                                                     |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spectrum CSS (archived) CSS: Help | [text](https://opensource.adobe.com/spectrum-css/?path=/docs/components-help-text--docs)                                                                                                 |
| Spectrum Web Components SWC: Help | \[Text]\(<https://opensource.adobe.com/spectrum-web-components/storybook/?path=/docs/help-text--docs&globals=system:spectrum-two;backgrounds.grid:!false;backgrounds.value:!hex(F8F8F8)> |

## Anatomy

```
help text (placed under the input)
- icon (optional) and text (description or error message)
```

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property   | Value                      | Default value | Description                                             |
| ---------- | -------------------------- | ------------- | ------------------------------------------------------- |
| text       | string                     | –             |                                                         |
| variant    | neutral / negative neutral | –             |                                                         |
| hideIcon   | boolean                    | false         | Only applicable if variant is negative.                 |
| size       | s / m / l / xl m           | –             |                                                         |
| isDisabled | boolean                    | false         | Help text cannot be both disabled and negative variant. |

## External links

Help text provides additional context for an input field, such as descriptions, instructions, or error messages. It’s commonly used in forms to clarify what’s expected or to explain validation.

These options are used in Spectrum’s design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

Help text using the neutral variant can be displayed in a disabled state. The text appears with a lighter gray that matches the style of other components in a disabled state. Help text using the negative variant cannot be displayed in a disabled state because it communicates an error, and error messages should not be visible when the component is disabled.

"Help text comes in four different sizes: small, medium, large, and extra-large. The medium size is the default and most frequently used option. Use the other sizes sparingly and pair them with components of the same size to respect the built-in hierarchy."

"Help text has two variants: neutral and negative. The neutral variant is used to convey informative messages, while the negative variant is used to convey error messages."

"The text can accommodate either a description or an error message, giving extra context and guidance. Sometimes this communicates what to input or select, and sometimes it communicates how. It includes information such as:"

Regardless of the kind of message, it should be clear and concise. Use 1-2 short, complete sentences that end with a period (never an exclamation point). When showing formatting examples, it's not necessary to end with a period.

When the text is too long for the available horizontal space, it wraps to form another line.

For the optional icon that can be displayed with the negative variant, usage depends on what kind of component the help text is accompanying. Whether to include the optional icon with the negative variant depends on the component that the help text accompanies.

Help text displays either a description (the neutral variant) or an error message (the negative variant) in the same space. When a description is present and an error is triggered, it is replaced with an error message. Once the error is resolved, the help text description reappears.

Since one gets replaced by Because one replaces the other, the language of the help text description and the error need to work together to communicate convey the same message messaging. The description text explains the requirements or adds supplementary context for how to successfully interact with a component. The error message text restates the same requirements, guiding the user to fix the issue. tells a user how to fix the error by re-stating the interaction requirements. Make sure that the help text description and error message include the same essential information so that it isn’t lost if one replaces the other.

Communicate error messages in a human-centered way by guiding a user and showing them a solution — don’t simply state what’s wrong and then leave them guessing as to how to resolve it. Ambiguous error messages can be frustrating and even shame-inducing for users. Also, keep in mind that something that a system may deem an error may not actually be perceived as an error to a user.

"For help text, usually the error is related to something that needs to be fixed for in-line validation, so a helpful tone is most appropriate. For example, if someone were to miss filling out a required field that asks for their email address, write the error text like you’re offering a hint or a tip to help guide them to understand what needs to go in the missing field: “Enter your email address.”"

## States

When the text is too long for the available horizontal space, it wraps to form another line.

## Behaviors

When the text is too long for the available horizontal space, it wraps to form another line.

## Usage guidelines

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

* [Field label](/page/field-label/)
* [Number field](/page/number-field/)
