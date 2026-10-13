---
title: Status light
category: status
source_url: /web/swc/components/status-light
last_updated: null
status: published
tags: []
hub_path: /web/swc/components/status-light
platform: swc
design_data_targets:
  - status-light
swc_exists: true
---

# Status light

## Anatomy

status light label dot

## Component options

label Status lights should always include a label. Color alone is not enough to communicate the status. Semantic variants When status lights have a semantic meaning, they use semantic colors. Use these variants for the following statuses: Informative (e.g., active, in use, live, published) Neutral (e.g., archived, deleted, paused, draft, not started, ended) Positive (e.g., approved, complete, success, new, purchased, licensed) Notice (e.g., needs approval, pending, scheduled, syncing, indexing, processing) Negative (e.g., error, alert, rejected, failed) Non-semantic variants When status lights are used to color code categories and labels that are commonly found in data visualization, they use non-semantic label colors. The ideal usage for these is when there are 8 or fewer categories or labels being color coded. size Status lights come in four different sizes: small, medium, large, and extra-large. The medium size is the default and most frequently used option. Use the other sizes sparingly; they should be used to create a hierarchy of importance within the page.

## States

State Support status Default Supported Hover Not Supported Down Not Supported Keyboard focus Not Supported Disabled Not Supported Selected Not Supported Dragged Not supported Error Not supported

## Behaviors

### Text overflow

When the text is too long for the horizontal space available, it wraps to form another line.

## Usage guidelines

### Use the appropriate variation

Semantic status lights should never be used for color coding categories or labels, and vice versa.

### Status light text

A status light should always include a label with text that clearly communicates about the kind of status being shown. Do not change the text color to match the dot.
