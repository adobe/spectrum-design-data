---
title: Combo box
source_url: /web/rsp/components/combo-box
last_updated: null
status: published
tags: []
hub_path: /web/rsp/components/combo-box
swc_exists: false
---

# Combo box

## Anatomy

combo box label necessity indicator field help text (help text or error message) menu container

## Component options

errorMessage A combo box can be marked as having an error to show that a value needs to be entered or that a value is invalid, prompting the user to correct their input before moving forward. helpText A combo box can have help text below the field to give extra context or instruction about what a user should input in the field. The help text communicates a hint or helpful information, such as specific requirements for correctly filling out the field. description Items within ComboBox also allow for additional content used to better communicate options. Icons, avatars, and descriptions can be added to the children of item. If a description is added, the prop slot="description" must be used to distinguish the different &#x3C;Text> elements. See demo. isReadOnly Combo boxes have a read-only option for when content in the disabled state still needs to be shown. This allows for content to be copied, but not interacted with or changed. A combo box does not have a read-only option if no selection has been made. isDisabled A combo box in a disabled state shows that an input field exists, but is not available in that circumstance. This can be used to maintain layout continuity and communicate that it may become available later. isError A combo box can be marked as having an error to show that a value needs to be entered in order to move forward, or that a value that was entered is invalid. menuTrigger There are 3 options for how a combo box's menu can be triggered: when a user starts typing ("input"), when focus is placed on the input field ("focus"), and manually when the user clicks or taps the field button ("manual"). These are used for different degrees of the information complexity and/or user familiarity of menu options. By default, the menu is triggered when a user starts typing. This should be used when the content is readily familiar or commonplace enough to a user that they can begin populating values without seeing a list of all available options. If the content of the combo box is unfamiliar or complex, the menu should be triggered when focus is placed on the input field because a user would benefit from seeing example content before selecting a value. If the content of the combo box is highly familiar and autocomplete is sufficient to surface options, the menu can be set to trigger manually. hasAutocomplete Combo boxes can automatically complete suggested results within the input field. isRequired and necessityIndicator Combo boxes can be marked as optional or required, depending on the situation. For required combo boxes, there are two styling options: a "(required)" label or an asterisk. If you use an asterisk, be sure to include hint text to explain what the asterisk means. Optional combo boxes are either denoted with text added to the end of the label — "(optional)" — or have no indication at all. size Combo boxes come in four different sizes: small, medium, large, and extra-large. The medium size is the default and most frequently used option. Use the other sizes sparingly; they should be used to create a hierarchy of importance within the page. width The width of a combo box can be customized appropriately for its context. By default, it uses field- default-width-[small/medium/large/extra-large]. value The value shows a user's entered text or the option they've selected. label and hideLabel Combo boxes should always have an accessible name, typically provided by a visible text label. In rare cases where context is sufficient and an accessibility expert has reviewed the design, the visible label may be hidden. When no visible label is present, the input must still expose an accessible name (for example, in HTML via "aria-label" or "aria-labelledby," and on other platforms via the platform's accessible-name mechanism). labelPosition Labels can be placed either on top or on the side. Top labels are the default and are recommended because they work better with long copy, localization, and responsive layouts. Side labels are most useful when vertical space is limited.

## States

State Support status DefaultSupportedHover (text area)SupportedHover (button area)SupportedFocus hoverSupportedFocus not hoverSupportedDownSupportedKeyboard focusSupportedDisabledSupportedSelectedNot supportedDraggedNot supportedErrorSupported

## Behaviors

### Minimum width

The minimum width for a combo box is combo-box-minimum-width-multiplier (2.5× the height of the field button for standard style). This minimum width guarantees that small combo boxes are readable and easy to target on touch devices.

### Text overflow

When the field label and menu text are too long for the available horizontal space, they wrap to form another line. The field text itself truncates at the end, but the text can be shown in full in the menu.

### Help text overflow

When the help text is too long for the available horizontal space, it wraps to form another line.

### Menu height

The combo box menu can be as tall as necessary to show as many options as possible in the available space. There is no maximum height.

## Usage guidelines

### Combo box, picker, or radio buttons?

The text input functionality of the combo box is meant to make large lists easier to search. If you have fewer than 6 items, use radio buttons. If you have more than 6 items, consider whether your list of selections is complex enough to merit searching and filtering. If it's not complex enough for a combo box, you can use a picker.

### Suppressing the popover

It's okay to suppress the popover when the combo box contains entries the user is familiar with, and when autocomplete is enabled. A suppressed popover can still be opened when the field button containing the chevron is clicked.

### Immediate popover launch

Launch the popover immediately if your user is highly unfamiliar with the content in the combo box, or if the data is especially complex.

### Delayed popover launch

Launch the popover on text change if your user can get started typing without seeing a long list of options.

### Saving suggestions

When a suggestion is appended to the end of typed text, it remains the selected value when focus leaves the field. This guards against the scenario when a user sees a word completed in a field, continues to another form component, and the failure to commit changes erases the suggestion. When autocomplete is disabled, best matches get a hover style in the popover, but don't get saved as a value unless they're clicked on or "Enter" is pressed.

### Include a label

Every combo box should have a label. A combo box without a label is ambiguous and not accessible. In rare cases where a label could be absent, make sure to have the design reviewed and approved by an accessibility expert.

### Keep menu items concise

Keep menu items short and concise. Long menu items that cause text to wrap to multiple lines are discouraged. If text wrapping becomes a frequent concern, consider revising the text or use alternative UI patterns that will give your content more space.

### Truncation

Choose a width for your combo boxes that is likely to accommodate the majority of selections available within it. When a combo box is in focus and the typed input exceeds the width of the field, push the leftmost text out of sight while allowing text to continue to be entered towards the chevron. When a combo box is deselected, truncate the selected entry with ellipsis before it collides with the chevron button.

### Follow capitalization rules

Field labels, placeholder text, and menu items should be in sentence case.

### Marking required vs. optional combo boxes in forms

When labeling combo boxes in a form, only mark the minority type—either required or optional—to reduce visual clutter: If most combo boxes are optional, mark only the required ones (e.g., add an asterisk or "(required)"). If most combo boxes are required, mark only the optional ones (e.g., append "(optional)" to their labels). Important: Never use an asterisk to indicate an optional combo box.

### Use help text to show hints, formatting, and requirements

The description in the help text is flexible and encompasses a range of guidance. Sometimes this guidance is about what to input, and sometime it's about how to input. This includes information such as: An overall description of the input field Hints for what kind of information needs to be input Specific formatting examples or requirements The help text's message should not simply restate the same information in the label in order to prompt someone to interact with it. Don't add help text if it isn't actually relevant or meaningful to a user in order to try to maintain layout continuity with other inputs that require help text.

### Don't use placeholder text

Putting instructions for how to complete an input, requirements, or any other essential information into placeholder text is not accessible. Once a value is entered, placeholder text is no longer viewable; if someone is using an automatic form filler, they will never get the information in the placeholder text. Instead of placeholder text, use the help text description to convey requirements or to show any formatting examples that would help user comprehension. If there's placeholder text and help text at the same time, it becomes redundant and distracting, especially if they're communicating the same thing.

### Switch help text with error text

The help text area also displays an error message. When a combo box already includes help text and an error is triggered, the help text is replaced with error text. Once the error is resolved, the help text description reappears below the field. Since one gets replaced by the other, the language of the help text and error text need to work together to convey the same messaging. Help text explains the requirement or adds supplementary context for how to successfully complete the input. Error text tells a user how to fix the error by re-stating the input requirements or describing the necessary interaction. Make sure that the help text and the error text include the same essential information so that it isn't lost if one replaces the other like minimum requirements.

### Write error text that shows a solution

Write error messaging in a human-centered way by guiding a user and showing them a solution — don't simply state what's wrong and then leave them guessing as to how to resolve it. Ambiguous error messages can be frustrating and even shame-inducing for users. Also, keep in mind that something that a system may deem an error may not actually be perceived as an error to a user. Error text should be written in 1-2 short, complete sentences and in a clear and straightforward way. End sentences with a period, and never with an exclamation point. For combo boxes, the nature of the error is often related to something that needs to be fixed for in-line validation, so a helpful tone is most appropriate. For example, if someone were to miss filling out a combo box that asks for them to choose a topic, write the error text like you're offering a hint or a tip to help guide them to understand what needs to go in the missing field: "Choose at least one topic."

## Internationalization

### RTL

For RTL (right-to-left) languages, the layout of a combo box is mirrored. The label is right-aligned and various decorations (e.g., character count, validation icon, error icon) are left-aligned. Make sure to consider that some types of content (e.g., email addresses) are not translated.

## Accessibility

### Keyboard interactions

Key Interaction TypingInitiates autocomplete or popover (unless suppressed).Down ArrowIf the popover is unsuppressed and not already open, the down arrow opens the popover menu.Up or Down ArrowsMove through selection of options in popover or autocomplete.EscIf the popover is open, close the popover.EnterAccept highlighted suggestion.TabCommit current value and move focus.Alt + Down Arrow (optional)Open popup without moving focus.Alt + Up Arrow (optional)Close popup and return to input.

### Cursor guidelines

Cursor Description TextUse text cursor over editable fields in all states.PointerAny interactive control that is part of the field (e.g., clear/reveal/help icon) uses the pointer cursor.

### WCAG 2.2 compliance

Any criterion not mention in the below table are not applicable to this component or are resolved with underlying requirements, engineering, and styles of the entire system. 1. Perceivable Requirement Criterion Level Compliance Non-text content 1.1.1 ANon-text elements, such as icons paired with a combo box (validation icons, clear-input icons), must provide a text alternative. All combo boxes need an accessible name (via a visible label, title, aria-label, or associated text) so screen readers can announce their purpose.Info and relationships, Identify purpose 1.3.1, 1.3.6 A, AAACombo boxes should be understandable by assistive technologies. The label, help text, error message, and required state must be programmatically associated with the field using semantic HTML or ARIA.Contrast 1.4.3 AAThe visual presentation of text has a contrast ratio of at least 4.5:1.Resize text 1.4.4 AACombo boxes can be resized up to 200% without loss of content or functionality and without assistive technology.Visual presentation 1.4.8 AAAThe width of text blocks is no more than 80 characters (40 for CJK languages), and text is never justified.Non-text contrast 1.4.11 AAThe visual presentation of illustrations, icons, and component states have a contrast ratio of at least 3:1. Not applicable for empty fields.Text spacing 1.4.12 AALine height of text is at least 1.5x the font size. 2. Operable RequirementCriterionLevel Compliance Keyboard 2.1.1, 2.1.3 A, AAAAll functionality of the component is operable through a keyboard without specific timing for keystrokes.Keyboard traps 2.1.2 AFocus can be moved away from the component using only a keyboard.Seizures and physical reactions 2.3.1, 2.3.2, 2.3.3 A, AAA, AAAThere is no flashing content or unnecessary motion or animation in this component.Focus order 2.4.3 ANavigation sequences receive focus in an order that preserves meaning and operability.Focus visible 2.4.7 AAKeyboard states use an indicator that is visible with at least 3:1 contrast.
