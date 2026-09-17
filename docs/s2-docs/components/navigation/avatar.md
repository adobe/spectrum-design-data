---
title: Avatar
source_url: /web/rsp/components/avatar
last_updated: null
status: published
tags: []
hub_path: /web/rsp/components/avatar
swc_exists: true
---

# Avatar

## Anatomy

avatar container user image gradient image initials guest icon

## Component options

isDisabled An avatar in a disabled state shows that an avatar exists, but is not available or a user is not active in that circumstance. This can be used to maintain layout continuity and communicate that an avatar may become available or active later. showStroke When used as an individual Avatar, showStroke is false by default. When used in Avatar group, showStroke is true by default to create separation between the stacked group of Avatar components. size Avatar sizes scale exponentially, based on the Spectrum type scale. Avatar has preset sizes to flex across all surfaces and can also be customized to fit appropriately for your context. image An avatar has multiple visual styles, depending on the user preference. These show up as branded gradient images, initials of the user's name, as well as any image that a user uploads. For users who do not have Adobe accounts, they will default to the guest avatar.

## States

State Support status DefaultSupportedHoverNot supportedDownNot supportedKeyboard focusSupportedDisabledSupportedSelectedNot supportedDraggedNot supportedErrorNot supported

## Behaviors

### Keyboard focus

An avatar can be navigated using a keyboard. The keyboard focus state adds a blue ring to the avatar in focus.

### Multiple avatars in a group

An avatar group displays a set of related avatars together. It’s typically used to represent a collection of people or entities.

## Usage guidelines

### Use gradient image avatars when a user image is undefined

Use branded generic avatars when a user has not set their avatar image. These images are designed to be abstracted from all genders, locales, and cultures.

### Use the initials avatar style for users with latin characters only

The initials avatar is designed to work with latin characters only and supports 1 or 2 characters that are programmatically identified by the first name and last name in a user's account settings. For users with non-latin characters, their default avatar should be the gradient image style.

### Use the guest avatar style for users without an Adobe account

The guest avatar style is designed for users who may be interacting with Adobe products, but are not logged in or do not have an Adobe account.
