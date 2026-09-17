---
title: Table
source_url: /web/rsp/components/table
last_updated: null
status: published
tags: []
hub_path: /web/rsp/components/table
swc_exists: false
---

# Table

## Anatomy

table column header label sort icon column divider row cell label row divider

## Component options

size Tables come in three sizes: small, medium, and large. Size affects the overall scale, including font size and spacing. Medium is the default. Use large for high-visibility tables or when readability is critical. Use small in constrained spaces or when the table is secondary to other content. hideHeader If true, the table header is hidden. header Configuration for the table header row. density Tables come in three densities: compact, regular, and spacious. Density controls vertical spacing while keeping font sizes consistent—compact rows have tighter padding, spacious rows have more breathing room. Regular is the default for most use cases. Use compact when fitting more data in a limited viewport is critical (e.g., dashboards, data-heavy admin panels). Use spacious when scannability and visual comfort are priorities (e.g., transaction histories, settings tables with minimal data). isQuiet Use a standard table when a table is the main focus of an experience. Quiet tables are for when a table is meant to be supplementary, subtle, or lightweight. isSortable If true, table columns can be sorted. columns An array of column definitions for the table. rows An array of row data for the table.

## States

State Support status DefaultSupportedHoverSupportedDownSupportedKeyboard focusSupportedDisabledSupportedSelectedSupportedDraggedSupportedErrorNot supported

## Behaviors

### Standard vs. quiet

Use a standard table when a table is the main focus of an experience. Quiet tables are for when a table is meant to be supplementary, subtle, or lightweight.

### Column dividers

Column dividers help organize table content and aid users in parsing related data. You can apply dividers selectively to group related columns—for example, separating user information from action columns, or grouping metadata fields together. Use dividers sparingly to avoid visual clutter.

### Selection

By default, rows are not selectable. Enable selection with selectionMode=single or selectionMode=multiple. Checkbox selection (default): Checkboxes appear on the left. Clicking toggles selection. Use for bulk actions or when selection should be explicit. Highlight selection: No checkboxes—rows show a highlighted background when selected. Clicking a row selects it (use modifier keys for multi-select). Use when rows also need to support navigation or actions via onAction or href, or when a cleaner appearance is needed. Navigation: Use onAction for row actions or href for links. In highlight selection style, double-click performs actions while single-click selects, allowing both behaviors.

### Hover state

All tables have a hover state regardless of if actions or selections can be made. This aids the user in viewing content in a single row.

## Usage guidelines

### Start-align textual data

Similar to a paragraph of text, textual data should be start-aligned within a table (left-aligned in LTR languages, right-aligned in RTL languages). Never use center alignment.

### Right align numerical data

Numerical data should generally be right-aligned for ease of scanning and comparing. This alignment typically does NOT reverse in RTL languages because: Numbers are written left-to-right even in RTL languages (e.g., Arabic numerals) Right-alignment ensures decimal places and digits line up vertically for comparison Exception: Use start-alignment (left in LTR, right in RTL) when numbers are arbitrary identifiers, known as "nominal numbers," which can't be compared or combined arithmetically (e.g., ZIP codes, IP addresses, phone numbers). These behave like text. Column headers follow the alignment of their data.

### Use tabular numbers for numerical data

When users need to compare numerical values, use tabular (monospaced) and lining (not old style) numbers to make it easier. These features are supported by Adobe Clean via the OpenType panel in Illustrator or via the CSS font feature settings.

### Respect vertical alignment

All content should be centered vertically within the row to offer the right visual balance.

### Don't use zebra stripes

Tables use row dividers, hover states, and selection highlighting to help users track data. Zebra striping adds visual noise without improving usability.

### Use column dividers sparingly

Column dividers are optional decorations that can help organize table content and create groups of data. Only use these when necessary, and don't add them to every column.

### Use an en dash (–) for missing values

When there are gaps in the data, use an en dash (–) to represent null or not applicable (N/A) values.

## Internationalization

### RTL

In right‑to‑left languages, the table layout is mirrored. The columns run from right to left, and the text alignment within each column is reversed. Keep in mind that some content, such as file extensions and email addresses, does not change direction or translate.

## Accessibility

### Keyboard interactions

Key Interaction TabTabbing into an item that has a tooltip associated with it (e.g., an icon) shows the tooltip.EscHides the tooltip.

### Cursor guidelines

Cursor Description PointerIf the trigger is a button or link, or a focus-only element (like an info icon that shows a tooltip on hover), use the pointer cursor.Default (Arrow)If the trigger is an icon that is not clickable, use the default cursor.PointerIf the tooltip has a link, use the pointer cursor when interacting with the link.

### WCAG 2.2 compliance

Any criterion not mention in the below table are not applicable to this component or are resolved with underlying requirements, engineering, and styles of the entire system. 1. Perceivable Requirement Criterion Level Compliance Non-text content1.1.1ANon‑text elements—such as icons used in tooltips and icons that trigger tooltips—must provide a text alternative that communicates the control’s purpose. All controls, especially icon‑only controls, need an accessible name (for example, via a title, aria‑label, or associated text) so screen readers can announce their function.Info and relationships, Identify purpose1.3.1, 1.3.6A, AAATooltips should be understandable by assistive technologies like screen readers. This means using the proper semantic HTML or ARIA role should be utilized.Use of color1.4.1AColor is never used as the sole way to convey meaning in tooltips. Tooltips use color to reinforce their meaning, but every tooltip also includes a clear text label that communicates purpose.Text contrast minimums1.4.3AALarge text has a contrast ratio of at least 3:1, and small text has a contrast ratio of at least 4.5:1. Incidental text such as disabled, hidden, or decorative text has no contrast requirement.Resize text1.4.4AATooltips should be built in such a way that they can be resized without assistive technology up to 200%.Visual presentation1.4.8AAAThe width of text blocks is no more than 80 characters (40 for CJK languages), and text is never justified.Non-text contrast1.4.11AAThe visual presentation of icons and various states have a contrast ratio of at least 3:1.Text spacing1.4.12AALine height of text is at least 1.5x the font size in wrapped tooltips. 2. Operable RequirementCriterionLevel Compliance Keyboard 2.1.1, 2.1.3 A, AAAAll functionality of the component is operable through a keyboard without specific timing for keystrokes.Keyboard traps 2.1.2 AFocus can be moved away from the component using only a keyboard.Seizures and physical reactions 2.3.1, 2.3.2, 2.3.3 A, AAA, AAAThere is no flashing content or unnecessary motion or animation in this component.Focus order 2.4.3 ANavigation sequences receive focus in an order that preserves meaning and operability.Focus visible 2.4.7 AAKeyboard states use an indicator that is visible with at least 3:1 contrast.
