---

title: "Illustrated message"
source\_url: <https://s2.spectrum.corp.adobe.com/page/illustrated-message/>
last\_updated: 2026-02-02
category: components/feedback
component\_type: feedback
status: published
tags:

* components-feedback
  related\_components:
* contextual-help
* in-line-alert
  parent\_category: feedback

---

# Illustrated message

## Resources

### Design

* **Figma**: S2 Web

### Implementations

| Platform                                 | Link                                                                                                                                                                                                            |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spectrum CSS (archived) CSS: Illustrated | [message](https://opensource.adobe.com/spectrum-css/?path=/docs/components-illustrated-message--docs)                                                                                                           |
| Spectrum Web Components SWC:             | \[IllustratedMessage]\(<https://opensource.adobe.com/spectrum-web-components/storybook/?path=/docs/illustratedmessage--docs&globals=system:spectrum-two;backgrounds.grid:!false;backgrounds.value:!hex(F8F8F8)> |
| React Spectrum RSP:                      | [IllustratedMessage](https://react-spectrum.adobe.com/s2/index.html?path=/docs/illustratedmessage--docs)                                                                                                        |

## Anatomy

```
illustrated message
- illustration
- title
- description
- button group (optional)
```

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property             | Value                          | Default value | Description                                                                        |
| -------------------- | ------------------------------ | ------------- | ---------------------------------------------------------------------------------- |
| illustration         | string                         | –             | Optional illustration or icon displayed above the message.                         |
| size                 | s / m / l m                    | Size          | of the illustration.                                                               |
| orientation          | vertical / horizontal vertical | Orientation   | of the illustrated message.                                                        |
| title                | string                         | –             | Primary heading text of the message.                                               |
| description          | string                         | –             | Secondary descriptive text providing context or instructions.                      |
| primaryActionLabel   | string                         | –             | Label for the primary action button. If undefined, no primary action is shown.     |
| secondaryActionLabel | string                         | –             | Label for the secondary action button. If undefined, no secondary action is shown. |

## External links

Illustrated messages pair text with imagery to communicate a message with visual emphasis. They’re commonly used in empty states, feedback states, and error messaging.

These options are used in Spectrum’s design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

The secondary button provides a less prominent action that supports the overall message but is not the primary goal. It offers users an alternative path that’s relevant but lower priority.

The primary button serves as the main call to action. It’s the clearest, most direct path forward for the user, and it should align with the purpose of the message. In an illustrated message—where visuals and copy work together to guide attention—the primary button anchors the experience.

The description supports the illustration and buttons by delivering the core message in plain language. It helps users quickly grasp the purpose of the message and decide what to do next.

A clear title for the description section in an illustrated message

Orientation affects how users perceive and interact with content. Illustrated message layout can be horizontal or vertical.

"Illustrated messages come in three different sizes: small, medium, and large. The medium size is the default and most frequently used option."

The illustration sets the tone and draws attention. It visually reinforces the message’s purpose and helps users quickly understand the context before reading any text or taking action.

Motion is an optional feature of illustrations, but it is not a requirement. When used, they should feel natural, intentional, and aligned with the emotional and functional goals of the message.

Buttons in an illustrated message are designed to guide users toward a clear next step by translating the message’s intent into direct, actionable choices. They help users understand what will happen next and support decision-making within the context of the message.

Horizontal orientation works best when there’s ample screen space, such as on desktop or wide containers, and when the message needs to sit alongside related content. It allows for a balanced layout where the illustration and text can appear side by side, supporting quick scanning and visual clarity.

Vertical orientation is suited for constrained spaces like mobile screens or narrow containers. It supports a linear, top-to-bottom flow that guides the user through the illustration, description, and action in sequence.

The linear illustration style works well for layouts that feature a number of illustrations together (such as a collection of cards). Linear illustrations draw a lower level of attention and blend in well with the UI, so it’s appropriate to use them in a collection of elements. Gradient illustrations draw a lot of attention in multiples, so they need to be used sparingly and sparsely.

Gradient illustrations draw more attention because they’re very colorful. Using more then one in a given view will make the UI too busy and too loud. Use gradient illustrations sparingly to guide a user’s attention to engaging, high-value actions such as uploads, starting projects, or commenting.

Don’t scale or resize linear illustrations. The stroke weight and the corner radii are already set to work best in the given canvas sizes.

Motion in illustrated messages can be used optionally to enhance engagement and reinforce meaning without overwhelming the user. When applied thoughtfully, they add subtle motion to the illustration—such as a gentle bounce, fade, or loop—that draws attention and supports the tone of the message.

"These animations should be purposeful: they can signal success, soften interruptions, or guide the eye toward the primary action. However, they should never distract from the content or slow down the experience. Use them sparingly, especially in system messages or time-sensitive flows, and ensure they perform well across devices."

Errors or critical messages should only use linear illustrations. Gradient illustrations use colors that can be misunderstood as semantic colors (e.g., green for positive, red for negative). They also have an upbeat and inspirational tone, which isn’t appropriate in situations where a user may be frustrated by something that’s an inconvenience or is disruptive to them in accomplishing their work.

Use drag and drop when the user needs to complete a hands-on task—like uploading files, rearranging items, or customizing content. It’s an interaction pattern that supports direct manipulation, giving users a sense of control and immediacy. Drag and drop is ideal when the goal is action-oriented and the interface benefits from tactile engagement.

Use an illustrated message when the goal is to communicate a state, guide a decision, or prompt an action. Illustrated messages are best for moments of transition—empty states, confirmations, errors, or onboarding—where visual context and clear messaging help orient the user. They’re not interactive themselves, but they support interaction by setting expectations and offering clear next steps.

An illustrated message can be interruptive, so make it readily apparent that it’s adding value to a user’s experience or is putting the user on the right path to accomplish their goals. Don’t use an illustrated message for purely promotional purposes or for upsells of unrelated actions.

## States

Don’t scale or resize linear illustrations. The stroke weight and the corner radii are already set to work best in the given canvas sizes.

## Behaviors

Don’t scale or resize linear illustrations. The stroke weight and the corner radii are already set to work best in the given canvas sizes.

## Usage guidelines

Don’t scale or resize linear illustrations. The stroke weight and the corner radii are already set to work best in the given canvas sizes.

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

* [Contextual help](/page/contextual-help/)
* [In-line alert](/page/in-line-alert/)
