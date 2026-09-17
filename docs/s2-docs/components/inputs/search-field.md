---
title: Search field
source_url: /web/rsp/components/search-field
last_updated: null
status: published
tags: []
hub_path: /web/rsp/components/search-field
swc_exists: false
---

# Search field

## Anatomy

search field field leading icon (search or custom) label / search term in-field button help text (help text)

## Component options

label, hideLabel, and icon A search field should include a label and a search icon. In the default state before a search term is input, the label is in regular body text style to meet contrast ratios and to show that this is a field label, not placeholder text. When no visible label is present, the input must still expose an accessible name (for example, in HTML via "aria-label" or "aria-labelledby," and on other platforms via the platform's accessible-name mechanism). value The value shows a user's entered text in regular body text style. width The width of a search field can be customized appropriately for its context. size Search fields come in four different sizes: small, medium, large, and extra-large. The medium size is the default and most frequently used option. Use the other sizes sparingly; they should be used to create a hierarchy of importance within the page. helpText A search field can have help text below the field to give extra context or instruction about what a user should input. The description communicates a hint or helpful information, such as a search's scope. placeholder Placeholder text provides hints about expected input values. isDisabled A search field in a disabled state shows that a search option exists, but is not available in that circumstance. This can be used to maintain layout continuity and communicate that it may become available later.

## States

State Support status DefaultSupportedHoverSupportedDownNot supportedFocus + hoverSupportedFocus + not hoverSupportedKeyboard focusSupportedDisabledSupportedSelectedNot supportedDraggedNot supportedErrorSupported

## Behaviors

### Minimum width

The minimum width for a search field is 3× the height of the field, for both standard and quiet style. This minimum width guarantees that small search fields are readable and easy to target on touch devices.

### Text overflow

When the entered text is too long for the available horizontal space in the field, the text truncates.

### Help text overflow

When the help text is too long for the available horizontal space, it wraps to form another line.

### Keyboard focus

A search field can be navigated using a keyboard. The keyboard focus state takes the field's visual hover state and adds a blue ring to the field in focus.

### In-field button

The in-field button offers an option to clear any input search term. If search results are being shown in a menu or popover, selecting this button will close the menu and clear the field. If a search term has been entered and the results have appeared, selecting this will only clear the field and not affect the list of results.

## Usage guidelines

### Show a "No results" state instead of an error

Search fields do not have an error state. Search functionality should anticipate spelling mistakes in search queries, and accommodate multiple spellings of words in search results — not treating any search term as an error. Instead of showing an error, show a "No results" page or a section with any suggestions for how to get results to appear.

### Searching versus filtering

In a searching scenario, a user inputs a search term for a specific thing they're looking for. In a filtering scenario, a user generally knows what they're looking for, but may not have a specific thing in mind. The search field can be used for both of these contexts. For a search experience, use the search field as-is. For a filtering experience, add a filter icon next to the search field, where a user can narrow down their search results before (or instead of) searching using a specific term. Filters can appear below the search field as tags.

### Searching within a category

Create a scoped search by pairing a search field with a picker component. Add a picker (either quiet or standard style) where a user can select a topic or category that they would like to search within. It's helpful to also update the search field label to communicate what the user is searching within. Spectrum previously had a specific "search within" component that would allow a user to filter down a search field category before searching for a particular term. It was deprecated because it did not meet accessibility and localization requirements.

### Include a label

Any search field should include a label inside the field, in the default state. The default label text is Search, but this can be customized to be more specific for use cases like scoped search, wayfinding, or building context — acting like a prompt for a user to search more specifically. Keep in mind that once a search term is entered the label text is no longer viewable. Use help text to show search formatting examples or give hints about what to input. It can be distracting or redundant if the search field label and its help text are both communicating the same thing, so write these thoughtfully.

### Follow capitalization rules

The label within the search field should be in sentence case, following Spectrum's UX writing standards for capitalization.

## Internationalization

### RTL

In right‑to‑left languages, the search‑field layout is mirrored. The icon and label are right‑aligned, and the in‑field button is left‑aligned. Keep in mind that some content, such as email addresses, does not change direction or translate. The magnifying‑glass icon itself is not mirrored. The handle stays on the right side because it represents holding the object, and most people worldwide are right‑handed.

## Accessibility

### Keyboard interactions

Key Interaction TabMoves focus onto or off of the button.Space or EnterExecutes the button action. The focus remains on the button except if the button opens or closes the current container. In this case, the focus moves to the target or back to the caller.

### Cursor guidelines

Cursor Usage PointerUse the pointer cursor for all interactive components.

### WCAG 2.2 compliance

Any criterion not mention in the below table are not applicable to this component or are resolved with underlying requirements, engineering, and styles of the entire system. 1. Perceivable Requirement Criterion Level Compliance Non-text content 1.1.1 ANon‑text elements—such as icons used in buttons—must provide a text alternative that communicates the button’s purpose. All buttons, especially icon‑only buttons, need an accessible name (for example, via a title, aria‑label, or associated text) so screen readers can announce their function.Info and relationships, Identify purpose 1.3.1, 1.3.6 A, AAAButtons should be understandable by assistive technologies like screen readers. This means using the proper semantic HTML or ARIA role of buttons should be utilized.Use of color 1.4.1 AColor is never used as the sole way to convey meaning in buttons. While negative buttons do use red to reinforce their purpose, every button also includes a clear text label that communicates the action it performs.Text contrast minimums 1.4.3 AALarge text has a contrast ratio of at least 3:1, and small text has a contrast ratio of at least 4.5:1. Incidental text such as disabled, hidden, or decorative text has no contrast requirement.Resize text 1.4.4 AAButtons should be built in such a way that they can be resized without assistive technology up to 200%.Visual presentation 1.4.8 AAAThe width of text blocks is no more than 80 characters (40 for CJK languages), and text is never justified.Non-text contrast 1.4.11 AAThe visual presentation of icons and various states have a contrast ratio of at least 3:1.Text spacing 1.4.12 AALine height of text is at least 1.5x the font size. 2. Operable Requirement Criterion Level Compliance Keyboard 2.1.1, 2.1.3 A, AAAAll functionality of the component is operable through a keyboard without specific timing for keystrokes.Keyboard traps 2.1.2 AFocus can be moved away from the component using only a keyboard.Seizures and physical reactions 2.3.1, 2.3.2, 2.3.3 A, AAA, AAAThere is no flashing content or unnecessary motion or animation in this component.Focus order 2.4.3 ANavigation sequences receive focus in an order that preserves meaning and operability.Focus visible 2.4.7 AAKeyboard states use an indicator that is visible with at least 3:1 contrast.
