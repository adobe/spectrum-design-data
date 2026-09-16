---
title: Accordion
source_url: /web/rsp/components/accordion
last_updated: null
status: published
tags: []
hub_path: /web/rsp/components/accordion
swc_exists: true
---

# Accordion

## Anatomy

accordion accordion items small divider

## Component options

isMultiple By default, only one accordion item can be expanded at a time. Use the isMultiple option to allow multiple items to be expanded simultaneously. items Accordions can contain any number of items. Each item can be expanded or collapsed by interacting with any part of the item. density Accordions come in three densities: compact, regular, and spacious. Each of the different densities have the same font size, but have tighter or looser vertical spacing between the rows. isDisabled Individual accordion items can be disabled using the isDisabled option. Disabled items cannot be expanded or collapsed. isQuiet By default, accordions have dividers between sections. This style works best when lots of content is inside each section. Alternatively, you can have no dividers between sections. This style works best when a clear layout (vertical stack, table, grid) makes it easy see and understand. Too many quiet components in a small space can be hard to differentiate. size Accordions come in four different sizes: small, medium, large, and extra-large. The medium size is the default and recommended option. Use the other sizes sparingly; they should be used to create a hierarchy of importance within the page. Each of the different sizes have varying font sizes, and tighter or looser vertical spacing between the rows.

## States

State Support status DefaultSupportedHoverSupportedDownSupportedKeyboard focusSupportedDisabledSupportedSelectedNot supportedDraggedNot supportedErrorNot supported

## Behaviors

### Single vs. multiple expansion

By default, only one accordion item may be expanded at a time. However, the component can be configured to allow multiple items to remain open simultaneously.

### Title wrapping

Accordion titles wrap automatically if they exceed the available width.

### Optional actions

An optional action button or switch can be placed on the trailing edge of an accordion item to support contextual interactions.

## Usage guidelines

### Progressive disclosure

Accordions are effective for organizing large amounts of related content within a limited space. They help users stay focused by revealing information only when it's needed, making them ideal for scenarios where not all content needs to be visible at once.

### Avoid accordion overuse

Avoid using accordions when users are likely to read all the content in one go, as they can introduce unnecessary clicks and hinder the user experience. For complex or deeply nested information structures, consider alternative components such as tree views or tabs to maintain clarity and ease of navigation
