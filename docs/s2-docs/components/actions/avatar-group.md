---
title: Avatar group
source_url: /web/rsp/components/avatar-group
last_updated: null
status: published
tags: []
hub_path: /web/rsp/components/avatar-group
swc_exists: false
---

# Avatar group

## Anatomy

avatar group avatar label

## Component options

size Avatar sizes scale exponentially, based on the Spectrum type scale. Avatar has preset sizes to flex across all surfaces and can also be customized to fit appropriately for your context. label An Avatar group can have an optional text label that clearly describes the group or number of users that it represents.

## States

State Support status DefaultSupportedHoverNot supportedDownNot supportedKeyboard focusNot supportedDisabledSupportedSelectedNot supportedDraggedNot supportedErrorNot supported

## Behaviors

### Keyboard focus

Individual avatars inside Avatar group can be navigated using a keyboard. The keyboard focus state adds a focus ring around the avatar.

## Usage guidelines

### Adjusting stroke color to match neutral backgrounds

Each individual avatar has a stroke applied to better show distinction between individual users in the group. By default, the outline color is a neutral gray, but the stroke color should be adjusted manually to match the background where the avatar group is placed.

### Do not adjust stroke color on a colored background

When using a colored background the avatar stroke color should remain set as default for both light and dark themes.
