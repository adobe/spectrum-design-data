---
title: Toast
source_url: /web/rsp/components/toast
last_updated: null
status: published
tags: []
hub_path: /web/rsp/components/toast
swc_exists: false
---

# Toast

## Anatomy

toast background icon text button close button

## Component options

text Toasts must include text to communicate a message. Write the text as concisely as possible while still being clear about what has happened or is happening. variant The neutral toast is the default variant. It is gray and does not have an icon. This is used when the message is neutral in tone or when its semantics do not fit in any of the other variants. The informative toast uses the informative semantic color (blue) and has an info icon to help those with color vision deficiency discern the message tone. This should be used when the message should call extra attention compared to the neutral variant. The positive toast uses the positive semantic color (green) and has a checkmark icon to help those with color vision deficiency discern the message tone. This is used to inform about a successful action or completion of a task. The negative toast uses the negative semantic color (red) and has an alert icon to help those with color vision deficiency to discern the message tone. This is used to show an error or failure. actionLabel A toast can have up to one button. This label should be kept concise, and it should only be used when there's a direct action available that is related to the toast text. isAutoDismissible By default, a toast will dismiss when the user clicks the close button. A toast also has the option to auto-dismiss. Be sure to set a minimum of 5 seconds so that users can have time to read the toast message. If an actionable toast is set to auto-dismiss, make sure that the action is still available elsewhere in the app.

## States

State Support status DefaultSupportedHoverNot supportedDownNot supportedKeyboard focusSupportedDisabledNot supportedSelectedNot supportedDraggedNot supportedErrorNot supported

## Behaviors

### Text overflow

When the text is too long for the available horizontal space, it wraps to form another line. In actionable toasts, the button moves below the text prior to text wrapping.

### Multiple toasts

The default state can display up to three toasts at a time. To view additional toasts beyond this limit, users can click the "Show all" action button. Alternatively, they can reveal remaining toasts by interacting with a button or dismissing the component. Additionally, hovering over the upper part of the toasts triggers a subtle animation, signaling to the user that the group can be fully expanded. The expanded state displays a minimum of two toasts with a visible scroll indicator, while the maximum number adapts based on screen size. Users can either dismiss the toasts or collapse them back to the previous state. To enhance contrast, an overlay is applied beneath the group, similar to components like takeover dialogs. In the React Spectrum implementation, the action button group has a fixed light theme, as switching modes significantly reduces contrast. Please refer to more multiple toasts usage guideline below.

## Usage guidelines

### Toast or dialog?

Toasts should only be used for confirmations, simple notifications, and low-priority alerts that do not need to completely interrupt the user experience. Dialogs are ideal for when a situation requires a user's attention, either for displaying important information or prompting for a response.

### Placement

By default, a toast is placed at the bottom center for both desktop and mobile platform scales to avoid disrupting the user experience. For desktop applications, a toast should be placed 16 px away from the bottom of the viewport. If a toast isn't noticeable or disrupts the user experience, its placement can be changed to bottom end, top end, or top center.

### Don't display more than one action

Actionable toasts should only have one button.

### Don't include a redundant action

Actionable toasts should not have a button with a redundant action. For example, including a "Dismiss" button would be redundant because all toasts already have a close button.

### Multiple toasts

Toasts are designed for brief, non-intrusive, and temporary notifications. While displaying multiple toasts is available via the React Spectrum implementation, we still discourage triggering multiple toasts simultaneously when possible, as this can be very distracting to the user. Frequent interruptions interfere with usability, especially for people with visual and cognitive disabilities (see WCAG Success Criterion 2.2.4 Interruptions ). Products should allow for users to be able turn off all types of alerts. Doing this helps people who want to focus and minimize information that they may find non-essential.

## Content standards

Writing for toasts depends on the nature of the message, whether it's communicating confirmation, information, or an error. For all kinds of toasts, keep the text to fewer than 2 lines in English, since it will become longer when localized.

### Confirmation

For a confirmation message ( neutral and positive variants), use a short past participle verb phrase: (optional) noun + verb ending in -ed + (optional) prepositional phrase with more information. If you refer to an interface element directly, put its name in bold text.

### Informational

For an informational message ( informative variant ), write in a complete sentence following the formula of subject + verb phrase + optional additional information.

### Error

For an error message ( negative variant), use a short phrase — it can be a complete sentence or not — to describe what's happening as succinctly as possible. Whenever possible, include an in-line action for a user to take so that they can readily address the issue explained in the message.

### Write in sentence case with no period

Like all in-product content at Adobe, toasts and their actions are written in sentence case. If the toast's message is a single sentence, do not add a period to the end; this helps keep the text quicker to read and easier to parse. Toasts should ideally only be a single sentence, but if you need to use two or more sentences to most accurately communicate the information, add a period to the end of each sentence.

### Use an instructive tone

Toasts offer quick reference or context, so a user should be able to quickly read a message that's brief and optimized for delivery. Use an instructive tone that presents the message in a concise and neutral way. Because users are likely to see several toasts in quick succession, it's not appropriate to use overly playful, encouraging, or celebratory language. Just convey the message, then get out of the way so that they can get back to the task at hand. Toasts are not appropriate for promotional messaging or upsells that show the benefit of doing or trying something.

### Use generic language

Whenever possible, use generic language in confirmation and error messages. This approach allows for better localization and it also reduces the need to write many different versions of toasts for similar use cases. It's usually unnecessary to include specific filenames, usernames, or folders because a user can get that context from elsewhere in the UI.

## Internationalization

### RTL

For RTL (right-to-left) languages, the layout of the toast is mirrored. The icon is right-aligned and the close button is left-aligned. If the toast is actionable, the button placement is also inverted and appears on the left side.

## Accessibility

### Keyboard interactions

Key Interaction TabPlaces the focus on the next interactive element, which is either a button or a close button.Shift + TabPlaces the focus on the previous interactive element, which is either a button or a close button.Space or EnterIf focus is on the close button, dismisses the toast. If focus is on the button, executes the button action.EscDismisses the toast. This is equivalent to selecting the close button.

### Cursor guidelines

Cursor Usage Default (Arrow)Use the default cursor for non-interactive areas on the toast.PointerUse the pointer cursor for interactive areas on the toast such as the close button.

### WCAG 2.2 compliance

Any criterion not mention in the below table are not applicable to this component or are resolved with underlying requirements, engineering, and styles of the entire system. 1. Perceivable Requirement Criterion Level Compliance Non-text content 1.1.1 ANon‑text elements—such as icons used in toasts—must provide a text alternative that communicates the control’s purpose. All controls, especially icon‑only controls, need an accessible name (for example, via a title, aria‑label, or associated text) so screen readers can announce their function.Info and relationships, Identify purpose 1.3.1, 1.3.6 A, AAAToasts should be understandable by assistive technologies like screen readers. This means the proper semantic HTML or ARIA role should be utilized.Use of color 1.4.1 AColor is never used as the sole way to convey meaning in toasts. Toasts use color to reinforce their meaning, but every toast also includes a clear text description that communicates purpose.Text contrast minimums 1.4.3 AALarge text has a contrast ratio of at least 3:1, and small text has a contrast ratio of at least 4.5:1. Incidental text such as disabled, hidden, or decorative text has no contrast requirement.Visual presentation 1.4.8 AAAThe width of text blocks is no more than 80 characters (40 for CJK languages), and text is never justified.Non-text contrast 1.4.11 AAThe visual presentation of icons have a contrast ratio of at least 3:1.Text spacing 1.4.12 AALine height of text is at least 1.5x the font size.Text spacing1.4.12AALine height of text is at least 1.5x the font size in wrapped tooltips. 2. Operable RequirementCriterionLevel Compliance Keyboard 2.1.1, 2.1.3 A, AAAAll functionality of the component is operable through a keyboard without specific timing for keystrokes.Keyboard traps 2.1.2 AFocus can be moved away from the component using only a keyboard.Timing adjustable 2.2.1 AToasts should not auto-dismiss. If they do, users need a way to extend, pause, or dismiss time-limited content. Hovering, clicking, or keyboard focusing on the toast should keep it from disappearing.Seizures and physical feactions 2.3.1, 2.3.2, 2.3.3 A, AAA, AAAThere is no flashing content or unnecessary motion or animation in this component.Focus order 2.4.3 ANavigation sequences receive focus in an order that preserves meaning and operability.Focus visible 2.4.7 AAKeyboard states use an indicator that is visible with at least 3:1 contrast.
