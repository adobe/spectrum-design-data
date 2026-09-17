---
title: Status light
source_url: /web/rsp/components/status-light
last_updated: null
status: published
tags: []
hub_path: /web/rsp/components/status-light
swc_exists: true
---

# Status light

## Anatomy

status light label dot

## Component options

label Status lights should always include a label. Color alone is not enough to communicate the status. Semantic variants When status lights have a semantic meaning, they use semantic colors. Use these variants for the following statuses: Informative (e.g., active, in use, live, published) Neutral (e.g., archived, deleted, paused, draft, not started, ended) Positive (e.g., approved, complete, success, new, purchased, licensed) Notice (e.g., needs approval, pending, scheduled, syncing, indexing, processing) Negative (e.g., error, alert, rejected, failed) Non-semantic variants When status lights are used to color code categories and labels that are commonly found in data visualization, they use non-semantic label colors. The ideal usage for these is when there are 8 or fewer categories or labels being color coded. size Status lights come in four different sizes: small, medium, large, and extra-large. The medium size is the default and most frequently used option. Use the other sizes sparingly; they should be used to create a hierarchy of importance within the page.

## States

State Support status DefaultSupportedHoverNot SupportedDownNot SupportedKeyboard focusNot SupportedDisabledNot SupportedSelectedNot SupportedDraggedNot supportedErrorNot supported

## Behaviors

### Text overflow

When the text is too long for the horizontal space available, it wraps to form another line.

## Usage guidelines

### Use the appropriate variation

Semantic status lights should never be used for color coding categories or labels, and vice versa.

### Status light text

A status light should always include a label with text that clearly communicates about the kind of status being shown. Do not change the text color to match the dot.

## Internationalization

### RTL

For RTL (right-to-left) languages, the layout of the status light is mirrored. The dot is placed on the right side of the text.

## Accessibility

## Cursor guidelines

Cursor Description Default (Arrow)Use the default cursor for non-interactive components like status light.

## WCAG 2.2 compliance

Any criterion not mention in the below table are not applicable to this component or are resolved with underlying requirements, engineering, and styles of the entire system. 1. Perceivable Requirement Criterion Level Compliance Info and relationships, Identify purpose 1.3.1, 1.3.6 A, AAAStatus lights should be understandable by assistive technologies like screen readers. This means using the proper semantic HTML or ARIA role should be utilized.Use of color 1.4.1 AColor is never used as the sole way to convey meaning in status lights. While color is used to reinforce their meaning, every status light also includes a clear text label that communicates the status.Text contrast minimums 1.4.3 AALarge text has a contrast ratio of at least 3:1, and small text has a contrast ratio of at least 4.5:1. Incidental text such as disabled, hidden, or decorative text has no contrast requirement.Visual presentation 1.4.8 AAAThe width of text blocks is no more than 80 characters (40 for CJK languages), and text is never justified.Non-text contrast 1.4.11 AAThe visual presentation of the status light dot has a contrast ratio of at least 3:1.Text spacing 1.4.12 AALine height of text is at least 1.5x the font size when wrapped. 2. Operable RequirementCriterionLevel Compliance Seizures and physical reactions 2.3.1, 2.3.2, 2.3.3 A, AAA, AAAThere is no flashing content or unnecessary motion or animation in this component.
