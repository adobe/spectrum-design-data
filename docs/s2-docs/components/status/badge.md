---
title: Badge
source_url: /web/rsp/components/badge
last_updated: null
status: published
tags: []
hub_path: /web/rsp/components/badge
swc_exists: true
---

# Badge

## Anatomy

badge icon label

## Component options

size Badges come in four different sizes: small, medium, large, and extra-large. The small size is the default and most frequently used option. Use the other sizes sparingly to create a hierarchy of importance on a page. fixed Badges can be placed as floating in a container, or they can be fixed to any edge of a container. They lose their default corner rounding on the fixed edge. style A Badge's style determines its visual emphasis. Badges come in three different styles: bold, subtle, and outline. Bold: Provides the highest contrast and draws immediate attention for statuses that matter most. Subtle: Uses a light color tint for low visual emphasis, making it suitable for dense layouts like tables or lists. Outline: Uses a thin stroke with minimal fill for the lowest emphasis, ensuring legibility on complex or colored backgrounds. Semantic variants When badges have a semantic meaning, they use semantic colors. Use these variants for the following statuses: Accent: (e.g., new, beta, prototype, draft) Informative (e.g., active, in use, live, published) Neutral (e.g., archived, deleted, paused, not started, ended) Positive (e.g., approved, complete, success, purchased, licensed) Notice: (e.g., expiring soon, limited, deprecated ) Negative (e.g., error, alert, rejected, failed) Non-semantic variants When badges are for color-coded categories, they use non-semantic colors. Non-semantic variants are ideally used for when there are 8 categories or less. icon A badge can have an optional icon. If no label is used, a badge becomes icon-only and it must include an icon. An icon-only badge is best for very small spaces, and it should always include a tooltip on hover to provide more context for the icon's meaning. label Badges should always have a label for accessibility and clear comprehension. When the label is not defined, a badge becomes icon-only.

## States

State Support status DefaultSupportedHoverNot supportedDownNot supportedKeyboard focusNot supportedDisabledNot supportedSelectedNot supportedDraggedNot supportedErrorNot supported

## Behaviors

### Non‑interactive by default

Badges are display elements, not actions. They should not behave like buttons or links. If an action is required, use a more appropriate component (e.g., Button, Action button).

### Text overflow

When a badge's label is too long for the available horizontal space, it wraps to form another line.

## Usage guidelines

### Avoid using a blue badge

Blue badges are easily confused with Spectrum's blue accent buttons. Only use blue badges when absolutely necessary.

### Only use a yellow badge for discounts

The yellow badge is reserved to communicate "best deal" or "discount" situations only. Do not use the yellow badge for other situations.

### Don't display multiple badges

Badges are meant to offer quick context about what category, status, or meaning an item is associated with. If your design requires multiple badges, consider using regular text metadata and reserve a single badge for only the most important status, category, or meaning instead.

### Avoid using icon-only badges

It's best to use a text label on a badge whenever possible because communicating with an icon alone may be unclear or subjective. Reserve icon-only badges for responsive cases, such as for cards in a panel that don't have space for a full badge. In related contexts, pair the icon with a label to help teach a user what the icon means. Icon-only badges should always include a tooltip on hover to show their associated label.

### Badge placement

Badge placement varies widely depending on the use case. In cards, place the badge on the left side of the footer, if possible. If there is no footer or if that space is filled, affix the badge to the right edge of the preview. If there is no preview, affix the badge to the top right corner of the card.

## Internationalization

### RTL

For RTL (right-to-left) languages, the layout of the badge is mirrored. The icon (if present) is right-aligned with text on the right.

## Accessibility

### Cursor guidelines

Cursor Usage Default (Arrow)Use the default cursor for non-interactive components like the badge.

### WCAG 2.2 compliance

Any criterion not mention in the below table are not applicable to this component or are resolved with underlying requirements, engineering, and styles of the entire system. 1. Perceivable Requirement Criterion Level Compliance Non-text content 1.1.1 ANon‑text elements—such as icons used in badges—must provide a text alternative that communicates the badge’s purpose. All controls, especially icon‑only controls, need an accessible name (for example, via a title, aria‑label, or associated text) so screen readers can announce their function.Info and relationships, Identify purpose 1.3.1, 1.3.6 A, AAABadges should be understandable by assistive technologies like screen readers. This means using the proper semantic HTML or ARIA role should be utilized.Use of color 1.4.1 AColor is never used as the sole way to convey meaning in buttons. Badges use color to reinforce their meaning, but every badge also includes a clear text label that communicates purpose.Text contrast minimums 1.4.3 AALarge text has a contrast ratio of at least 3:1, and small text has a contrast ratio of at least 4.5:1. Incidental text such as disabled, hidden, or decorative text has no contrast requirement.Non-text contrast 1.4.11 AAThe visual presentation of icons have a contrast ratio of at least 3:1.Text spacing 1.4.12 AALine height of text is at least 1.5x the font size when wrapped. 2. Operable Requirement Criterion Level Compliance Seizures and physical feactions 2.3.1, 2.3.2, 2.3.3 A, AAA, AAAThere is no flashing content or unnecessary motion or animation in this component.
