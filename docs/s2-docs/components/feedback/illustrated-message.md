---
title: Illustrated message
source_url: /web/rsp/components/illustrated-message
last_updated: null
status: published
tags: []
hub_path: /web/rsp/components/illustrated-message
swc_exists: true
---

# Illustrated message

## Anatomy

illustrated message illustration title description button group (optional)

## Component options

secondaryActionLabel The secondary button provides a less prominent action that supports the overall message but is not the primary goal. It offers users an alternative path that's relevant but lower priority. primaryActionLabel The primary button serves as the main call to action. It's the clearest, most direct path forward for the user, and it should align with the purpose of the message. In an illustrated message—where visuals and copy work together to guide attention—the primary button anchors the experience. description The description supports the illustration and buttons by delivering the core message in plain language. It helps users quickly grasp the purpose of the message and decide what to do next. title A clear title for the description section in an illustrated message orientation Orientation affects how users perceive and interact with content. Illustrated message layout can be horizontal or vertical. size Illustrated messages come in three different sizes: small, medium, and large. The medium size is the default and most frequently used option. illustration The illustration sets the tone and draws attention. It visually reinforces the message's purpose and helps users quickly understand the context before reading any text or taking action.

## States

State Support status DefaultSupportedHoverNot supportedDownNot supportedKeyboard focusNot supportedDisabledNot supportedSelectedNot supportedDraggedNot supportedErrorNot supported

## Behaviors

### Motion in illustrated message

Motion is an optional feature of illustrations, but it is not a requirement. When used, they should feel natural, intentional, and aligned with the emotional and functional goals of the message.

### Buttons in illustrated message

Buttons in an illustrated message are designed to guide users toward a clear next step by translating the message's intent into direct, actionable choices. They help users understand what will happen next and support decision-making within the context of the message.

## Usage guidelines

### Horizontal vs. vertical illustrations

Horizontal orientation works best when there's ample screen space, such as on desktop or wide containers, and when the message needs to sit alongside related content. It allows for a balanced layout where the illustration and text can appear side by side, supporting quick scanning and visual clarity. Vertical orientation is suited for constrained spaces like mobile screens or narrow containers. It supports a linear, top-to-bottom flow that guides the user through the illustration, description, and action in sequence.

### Illustrations and attention hierarchy

The different styles of illustrations are connected to the Spectrum 2 concept of attention hierarchy. Linear illustrations are elements that communicate lower attention, as they blend in well with the rest of the UI. They can be used multiple times in a layout without drawing too much attention. Gradient illustrations are high attention elements that should be used sparingly and selectively. Only one illustration, element, or group of elements should have high attention on a page. Learn more about this with the Spectrum 2 attention hierarchy guidelines.

### Use linear style when showing several illustrations together

The linear illustration style works well for layouts that feature a number of illustrations together (such as a collection of cards). Linear illustrations draw a lower level of attention and blend in well with the UI, so it's appropriate to use them in a collection of elements. Gradient illustrations draw a lot of attention in multiples, so they need to be used sparingly and sparsely.

### Use gradient illustrations thoughtfully

Gradient illustrations are high attention elements in the layout. Use them strategically and thoughtfully to draw the user's attention and to provoke a delightful moment. Gradient illustrations draw more attention because they're very colorful. Using more than one in a given view will make the UI too busy and too loud. Use gradient illustrations sparingly to guide a user's attention to engaging, high-value actions such as uploads, starting projects, or commenting.

### Don't resize illustrations

Don't scale or resize linear illustrations. The stroke weight and the corner radii are already set to work best in the given canvas sizes.

### Motion in illustrated messages

Motion in illustrated messages can be used optionally to enhance engagement and reinforce meaning without overwhelming the user. When applied thoughtfully, they add subtle motion to the illustration—such as a gentle bounce, fade, or loop—that draws attention and supports the tone of the message. These animations should be purposeful: they can signal success, soften interruptions, or guide the eye toward the primary action. However, they should never distract from the content or slow down the experience. Use them sparingly, especially in system messages or time-sensitive flows, and ensure they perform well across devices.

### Use linear illustrations for errors or critical messages

Errors or critical messages should only use linear illustrations. Gradient illustrations use colors that can be misunderstood as semantic colors (e.g., green for positive, red for negative). They also have an upbeat and inspirational tone, which isn't appropriate in situations where a user may be frustrated by something that's an inconvenience or is disruptive to them in accomplishing their work.

### Offer an actionable solution when possible

Links and buttons can be included in an illustrated message's description to offer an actionable solution (e.g., when there is a need to upload files or contact product support). Compared to links, buttons add more visibility to actions, helping to direct a user to what to do next. Respect button ordering when using buttons in an illustrated message.

### Drag and drop vs. illustrated message

Use drag and drop when the user needs to complete a hands-on task—like uploading files, rearranging items, or customizing content. It's an interaction pattern that supports direct manipulation, giving users a sense of control and immediacy. Drag and drop is ideal when the goal is action-oriented and the interface benefits from tactile engagement. Use an illustrated message when the goal is to communicate a state, guide a decision, or prompt an action. Illustrated messages are best for moments of transition—empty states, confirmations, errors, or onboarding—where visual context and clear messaging help orient the user. They're not interactive themselves, but they support interaction by setting expectations and offering clear next steps.

### Don't create your own linear illustrations

It's essential to have consistency in tone and metaphors across all Adobe products. Don't create your own linear illustrations or alter existing ones. If you need a new linear illustration, make a request using Workfront.

### Show value

An illustrated message can be interruptive, so make it readily apparent that it's adding value to a user's experience or is putting the user on the right path to accomplish their goals. Don't use an illustrated message for purely promotional purposes or for upsells of unrelated actions.
