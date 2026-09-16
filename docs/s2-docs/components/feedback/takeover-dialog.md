---
title: Takeover dialog
source_url: /web/rsp/components/takeover-dialog
last_updated: null
status: published
tags: []
hub_path: /web/rsp/components/takeover-dialog
swc_exists: false
---

# Takeover dialog

## Anatomy

takeover dialog takeover dialog container header area title header content (optional) button group body area body content (optional) overlay

## Component options

slots The takeover dialog supports two slots—one in the header and one in the body—where other components can be inserted. Header slot: Appears between the title and button group. It's optional and can be used to display additional elements, such as supportive text or components. A common use is a steplist. Note that space between the title and button group may be limited. Body slot: Reserved for the main content of the dialog. It can host a range of content, from a simple paragraph to complex components like a drop zone or table, or an arrangement of elements such as a form or group of cards. When content exceeds the available space, the body area becomes scrollable. variant Takeover dialogs support two layout variants: dialog and full-screen. Dialog variant: Includes a built-in overlay and fills most of the screen, leaving a margin around the edges. Full-screen variant: Expands to fill the entire frame, so that there is no visible container or underlay when open. title All takeover dialogs must include a title. The title appears at the top of the dialog and should briefly describe the expected outcome if the user proceeds with the primary action. primaryActionLabel A takeover dialog must include at least one button. The primary action label refers to the rightmost button in the dialog footer for languages that read left to right. It should use a short, actionable phrase that clearly communicates the result of selecting the action—whether that means taking action, progressing through a workflow, or dismissing the dialog. secondaryActionLabel Takeover dialogs can include up to three buttons if a secondary outline button label is defined. If no label is defined, the button won't appear. The secondary outline button should use a short, actionable phrase that clearly communicates the result of selecting the action—typically describing the previous step or an alternative choice. cancelActionLabel By default, a takeover dialog that includes a button to cancel or go back will be labeled "Cancel."

## States

State Support status DefaultSupportedHoverNot supportedDownNot supportedKeyboard focusNot supportedDisabledNot supportedSelectedNot supportedDraggedNot supportedErrorNot supported

## Behaviors

### Title text overflow

When the title is too long for the available horizontal space, it wraps to form another line.

### Header content overflow

Takeover dialogs can optionally include additional elements in the header custom content area. When horizontal space is limited, the header custom content will be displayed underneath the title.

## Usage guidelines

### Use similar language for dialog titles and actions

Most dialog titles should communicate the primary action of the dialog. When possible, the button label should use the same language as the action mentioned in the title. For example, if the title is "Delete conversation," the primary action button label should be "Delete."
