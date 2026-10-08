---
title: Tabs
category: navigation
source_url: /web/swc/components/tabs
last_updated: null
status: published
tags: []
hub_path: /web/swc/components/tabs
platform: swc
design_data_targets:
  - tabs
swc_exists: true
---

# Tabs

## Anatomy

tabs tab item (selected) tab item selection indicator

## Component options

orientation Tabs can be horizontal or vertical. By default, tabs are horizontal and should be used when horizontal space is limited. Use vertical tabs when horizontal space is more generous or when the list of sections is too long for a horizontal layout. Vertical tabs can also serve as anchor links, providing shortcuts to sections on a single page. In this case, tab items link to on-page anchors rather than opening a new tab view. items Tab items represent distinct sections of related content within a single view. We recommend using up to five tab items in a single tab component. If more are needed, consider an alternative navigation pattern to maintain clarity and usability.

## States

State Support status Default Supported Hover Supported Down Not supported Keyboard focus Supported Disabled Supported Selected Supported Dragged Not supported Error Not supported

## Behaviors

### Animation

When a user selects a tab item, the selection indicator slides along the base to the newly selected tab. The text and icon colors of both tabs fade during the transition. The tab view changes immediately upon selection.

### Tab overflow

When there are too many tabs to fit horizontally across the viewport, display the tabs component as a quiet picker. When appropriate, you can also use alternative overflow methods such as horizontal scrolling.

## Usage guidelines

### Too many tabs

When there are too many tabs to fit horizontally across the viewport, you can either allow horizontal scrolling or place all tab items in a quiet picker. Do not truncate multiple tab items just to make them fit horizontally.

### Don't use tabs for varying levels of importance

Use tabs to organize sections of equal importance. Groups of content under each tab item should not be of different natures. Don't use tabs to replace a flow; use pagination components instead.

### Nested tabs

Avoid using multiple levels of tabs. Instead, consider other organizational patterns such as side navigation, accordions or collapsible panels. Nesting tabs is acceptable only when there is a clear separation between the two tab experiences or when different orientations are used. Do not compromise hierarchy by using the same tab variations or orientations.

### Use icons consistently

Don't mix the use of icons in tabs. Navigation controls require a clear spacial relationship to one another, and mixing the use of icons can dramatically impact the visual balance and presence for each tab item. Keep in mind that if one tab item has an icon, then they all should have an icon.

### Use tooltips for icon only tabs

It can often be hard to identify the meaning of icon-only tabs. An icon-only tab should always show a tooltip displaying the label on hover.
