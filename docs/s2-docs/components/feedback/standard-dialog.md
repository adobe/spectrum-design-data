---
title: Standard dialog
source_url: /web/rsp/components/standard-dialog
last_updated: null
status: published
tags: []
hub_path: /web/rsp/components/standard-dialog
swc_exists: false
---

# Standard dialog

## Anatomy

standard dialog standard dialog container cover image (optional) close button (optional) header area title body area description (optional) footer area footer content (optional) button group overlay

## Component options

cancelActionLabel By default, an alert dialog that includes a button to cancel or go back will be labeled "Cancel." secondaryActionLabel Standard dialogs can include up to three buttons if a secondary outline button label is defined. If no label is defined, the button won't appear. The secondary outline button should use a short, actionable phrase that clearly communicates the result of selecting the action—typically describing the previous step or an alternative choice. primaryActionLabel The primary action label refers to the rightmost button in the dialog footer for languages that read left to right. It should use a short, actionable phrase that clearly communicates the result of selecting the action—whether that means moving forward or dismissing the dialog. A dismissible dialog, which includes a close button, should not have buttons in the footer. footerContent The footer content area is optional and can be used to display additional elements such as supportive text or components. Common uses including adding a checkbox, link, or another button. hideCloseButton The presence of a close button determines whether a dialog is dismissible. Dialogs with a close button display it in the top-right corner. These dialogs can be dismissed by clicking the close button or the background overlay. Dialogs without a close button require one or more buttons in the footer to close the dialog or complete a task. The background overlay is not clickable. In both cases, pressing the Escape key should close the dialog and return the page to its previous state. This action should behave the same as clicking a close or cancel button. size Standard dialogs are available in three widths: Small: Best for a single component or a few lines of text. Medium: Ideal for several components or a short paragraph. This is the default size. Large: Designed for larger content such as drop zones, images, tables, or hero image layouts. Dialogs automatically scale down to 90% of the screen width on smaller viewports. Height is flexible and adjusts to fit the content. hideImage Standard dialogs can include a full-bleed cover image at the top. Dialogs with a cover image should not be dismissible and rely on buttons in the footer area to close the dialog. description Standard dialogs can include an optional description. Use the description to briefly provide additional context or information that helps users make an informed decision based on the available actions. title All standard dialogs must include a title. The title appears at the top of the dialog and should briefly describe the expected outcome if the user proceeds with the primary action. If a cover image is shown, the title will appear below it.

## States

State Support status DefaultSupportedHoverNot supportedDownNot supportedKeyboard focusNot supportedDisabledNot supportedSelectedNot supportedDraggedNot supportedErrorNot supported

## Behaviors

### Placement

Standard dialogs appear in the center of the screen.

### Text overflow

When the title and description text are too long for the available horizontal space, they wrap to form another line.

### Button group overflow

Standard dialogs can include up to three buttons. When horizontal space is limited, the buttons stack vertically. Buttons should be ordered by ascending importance, with the most critical action placed at the end or bottom of the stack.

## Usage guidelines

### Dismissible or not?

Whether a dialog is dismissible is controlled by the hideCloseButton prop. A dialog with a close button can be dismissed by clicking the button or the background overlay. Avoid using a dismissible dialog when the user needs to confirm an action or make a decision. Instead, use a dismissible dialog for information that is optional or nice to know—content that can be quickly dismissed without requiring user action.

### Don't include buttons when dismissible

A dismissible dialog should not include buttons in the footer. Instead, the dialog is dismissed by clicking the close button or the background overlay.

### Use similar language for dialog titles and actions

Most dialog titles should communicate the primary action of the dialog. When possible, the button label should use the same language as the action mentioned in the title. For example, if the title is "Delete conversation," the primary action button label should be "Delete."
