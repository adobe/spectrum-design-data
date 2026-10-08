---
title: Progress circle
category: status
source_url: /web/swc/components/progress-circle
last_updated: null
status: published
tags: []
hub_path: /web/swc/components/progress-circle
platform: swc
design_data_targets:
  - progress-circle
swc_exists: true
---

# Progress circle

## Anatomy

progress circle track fill

## Component options

isIndeterminate Progress circles can be determinate or indeterminate. Use determinate when progress can be measured against a goal, such as downloading a file. Use indeterminate when the duration or effort is unknown, like reconnecting to a server. size Progress circles come in 3 sizes: small, medium (default), or large. These are available to fit various contexts. For example, the small progress circle can be used in place of an icon or in tight spaces, while the large one can be used for full-page loading. value, min value, max value The value represents progress within the circle's range, from minimum to maximum. These defaults are 0 and 100 but can be customized. Min and max values don't apply to indeterminate progress circles. variant When a progress circle needs to be placed on top of a colored background, use the over background variant. This progress circle uses a static white color regardless of the color theme. Make sure the background offers enough contrast for the progress circle to be legible.

## States

State Support status Default Supported Hover Not supported Down Not supported Keyboard focus Not supported Disabled Not supported Selected Not supported Dragged Not supported Error Not supported

## Usage guidelines

### Use progress circles for loading views

Medium and large progress circles are optimized for large areas with no space constraints. Use them for loading content into views (e.g., web pages, panels, etc.)

### Use small progress circle when space is limited

Small progress circles are well suited when space is limited both vertically and horizontally, such as in buttons, menu items, and input fields.
