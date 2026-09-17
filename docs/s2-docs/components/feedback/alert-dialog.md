---
title: Alert dialog
source_url: /web/rsp/components/alert-dialog
last_updated: null
status: published
tags: []
hub_path: /web/rsp/components/alert-dialog
swc_exists: false
---

# Alert dialog

## Anatomy

alert dialog alert dialog container title description primary action secondary action (optional) cancel action (optional) overlay

## Component options

primaryActionLabel An alert dialog must include at least one button. The primary action label refers to the rightmost button in the dialog footer for languages that read left to right. It should use a short, actionable phrase that clearly communicates the result of selecting the action—whether that means moving forward or dismissing the dialog. secondaryActionLabel Alert dialogs can include up to three buttons if a secondary outline button label is defined. If no label is defined, the button won't appear. The secondary outline button should use a short, actionable phrase that clearly communicates the result of selecting the action—typically describing the previous step or an alternative choice. description Alert dialogs should include a description when available. The description briefly communicates any additional information or context a user needs to make a decision based on the options presented. title All alert dialogs must have a title. The title appears at the top of the dialog and uses a few words to convey the outcome of what will happen if a user continues with the primary action. cancelActionLabel By default, an alert dialog that includes a button to cancel or go back will be labeled "Cancel." variant Use the appropriate variant based on the context of the message: Confirmation - This is the default variant for alert dialogs. Use a confirmation variant for asking a user to confirm a choice. This alert dialog has an accent button to highlight a strong preference for which action to take. Information - Information alert dialogs communicate important information that a user needs to acknowledge. Before using this kind of alert dialog, make sure it's the appropriate communication channel for the message instead of a toast or a more lightweight messaging option. Warning - Warning alert dialogs communicate important information related to an issue that users need to acknowledge, but that doesn't prevent them from continuing. These dialogs include an orange warning icon near the title to emphasize their importance. Destructive - Destructive alert dialogs are used when a user must confirm an action that could negatively affect their data or experience, such as deleting files or contacts. These dialogs include a red (negative) button to emphasize the destructive nature of the action. Error - Error alert dialogs communicate critical information about an issue the user must acknowledge. These dialogs include a warning icon to emphasize their importance.

## States

State Support status DefaultSupportedHoverNot supportedDownNot supportedKeyboard focusNot supportedDisabledNot supportedSelectedNot supportedDraggedNot supportedErrorNot supported

## Behaviors

### Text overflow

When the title and description text are too long for the available horizontal space, they wrap to form another line.

### Button group overflow

Alert dialogs can include up to three buttons. When horizontal space is limited, the buttons stack vertically. Buttons should be ordered by ascending importance, with the most critical action placed at the end or bottom of the stack.

## Usage guidelines

### Use alert dialogs sparingly

Alert dialogs are interruptive, so they should be reserved for important information that users must acknowledge before continuing a task or workflow. Use them only when absolutely necessary—not for low-priority notifications or excessive confirmations.

### Don’t nest alert dialogs

Alert dialogs are designed to pause the experience until a decision is made, so only one should appear at a time. Avoid opening an alert dialog from within another. If a situation seems to require a sequence of decisions, consider using a different design pattern.

## Content standards

Writing for alert dialogs starts by determining the nature of the message. Each Spectrum alert dialog variant has its own communication goal and tone that work in partnership with its visual design. Alert dialog variant Goal Tone Confirmation Asking a user to confirm an action they want to take.Instructive Information Sharing important information that a user needs to acknowledge.Helpful Warning Sharing time-sensitive information that a user needs to consider, but won’t block them from proceeding.Instructive to helpful Destructive Telling a user that if they are to proceed with an action they want to take, it may impact their data in a negative way.Instructive Error Communicating critical information about an issue that a user needs to resolve before they can move forward with a task.Supportive

### Writing the title

All alert dialogs must have a title. The title communicates the upshot of the message, such as the eventual outcome or conclusion of an action. It should be as close as possible to a complete sentence (subject + verb). Don’t use punctuation at the end of the title. Most alert dialog titles communicate the main effect of whatever a person is about to do. Titles ideally use the same or similar phrasing as the call-to-action that had led someone to the alert dialog in the first place. The title of an error alert dialog communicates the result of the error. Don’t just state that an error has occurred.

### Writing the description

Alert dialog descriptions share any additional information or context that a person needs to know in order to make one of the decisions offered by the actions. Descriptions are written in complete sentences, and any error code is included in parentheses at the end of the last sentence.

### Writing the actions

Use a short phrase to succinctly describe the options for next steps. If possible, have the button label use the same language as the action mentioned in the alert dialog title (e.g., if a dialog's title is “Delete conversation,” its primary action button label would be “Delete”).

### Make button labels specific and actionable

For alert dialog buttons, make the labels as specific and actionable as possible. Even if someone were to only read the word or phrase on the button, they should be able to get a summary of the alert dialog’s entire message.

### Avoid asking questions

Questions in alert dialog titles — such as “Are you sure you want to quit?” or “Do you want to cancel?” — are redundant and undermine a user's agency in the decision they've already made by taking a previous action to get to the alert dialog. This phrasing also sets up for a yes/no set of actions, which can become confusing. Instead, reframe the message to focus on the outcome or effect.

### Pair confirmation with distinct actions

It’s OK to ask a question in an alert dialog's description to confirm if someone wants to go ahead with a choice that the system is making on their behalf. However, this should still be paired with distinct actions that show that a person has control over what happens next.

## Internationalization

### RTL

For RTL (right-to-left) languages, the layout of the alert dialog is mirrored. Texts are right-aligned and buttons are left-aligned.

## Accessibility

### Keyboard interactions

Key Interaction TabMoves focus to the next button inside the alert dialog (last becomes first). If none of the buttons are selected, the focus is set on the first button.Shift + TabMoves focus to the previous button inside the alert dialog (first becomes last). If none of the buttons are selected, the focus is set on the last button.EscDismisses the alert dialog. This is equivalent to choosing “Cancel” or an “OK” confirmation.EscDismisses the alert banner if possible. This is equivalent to selecting the close button.

### Cursor guidelines

Cursor Usage Default (Arrow)Use the default cursor for non-interactive elements and text within the alert dialog.PointerUse the pointer cursor for any interactive elements, such as buttons, inside the alert dialog.

### WCAG 2.2 compliance

Any criterion not mention in the below table are not applicable to this component or are resolved with underlying requirements, engineering, and styles of the entire system. 1. Perceivable Requirement Criterion Level Compliance Non-text content 1.1.1 ANon-text elements, such as icons used in alert dialogs, must provide a text alternative that communicates the dialog's purpose. All alert dialogs need an accessible name (for example, via a title, aria-label, or associated text) so screen readers can announce their function.Info and relationships, Identify purpose 1.3.1, 1.3.6 A, AAAAlert dialogs should be understandable by assistive technologies like screen readers. This means using the proper semantic HTML or ARIA role of alertdialog should be utilized.Use of color 1.4.1 AColor is not used as a means to convey information or distinguish elements.Contrast 1.4.3 AAThe visual presentation of text has a contrast ratio of at least 4.5:1.Visual presentation 1.4.8 AAAThe width of text blocks is no more than 80 characters (40 for CJK languages), and text is never justified.Non-text contrast 1.4.11 AAThe visual presentation of illustrations and component states have a contrast ratio of at least 3:1.Text spacing 1.4.12 AALine height of text is at least 1.5x the font size. 2. Operable Requirement Criterion Level Compliance Keyboard 2.1.1, 2.1.3 A, AAAAll functionality of the component is operable through a keyboard without specific timing for keystrokes.Keyboard traps 2.1.2 AFocus can be moved away from the component using only a keyboard.Seizures and physical reactions 2.3.1, 2.3.2, 2.3.3 A, AAA, AAAThere is no flashing content or unnecessary motion or animation in this component.Focus order 2.4.3 ANavigation sequences receive focus in an order that preserves meaning and operability.Focus visible 2.4.7 AAKeyboard states use an indicator that is visible with at least 3:1 contrast.
