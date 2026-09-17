---
title: In-line alert
source_url: /web/rsp/components/in-line-alert
last_updated: null
status: published
tags: []
hub_path: /web/rsp/components/in-line-alert
swc_exists: false
---

# In-line alert

## Anatomy

in-line alert background title (optional) icon body area

## Component options

actionLabel An in-line alert can have up to one button. This label should be kept concise, and it should only be used when there's a direct action available that is related to the in-line alert text. heading Heading is optional for in-line alerts. href An in-line alert can have up to one link. style The outline style is the default for in-line alerts. variant There are five semantic variants: The neutral variant is the default for in-line alerts. It is gray and does not have an icon. This is used for when the message is neutral in tone or when its semantics do not fit any of the other variants. The informative variant uses the informative semantic color (blue) and has an "information" icon to help those with color vision deficiency discern the message tone. This should be used when the message needs to call extra attention, as compared to the neutral variant. The positive variant uses the positive semantic color (green) and has a "checkmark" icon to help those with color vision deficiency discern the message tone. This should be used to inform someone of a successful function or result of an action they took. The notice variant uses the notice semantic color (orange) and has a diamond "alert" icon to help those with color vision deficiency to discern the message tone. This can be used to warn about a situation that may need to be addressed soon. The negative variant uses the negative semantic color (red) and has a triangle "alert" icon to help those with color vision deficiency to discern the message tone. This can be used to show an error or a failure, or to convey something that needs to be immediately acknowledged or addressed.

## States

State Support status DefaultSupportedHoverNot supportedDownNot supportedKeyboard focusNot supportedDisabledNot supportedSelectedNot supportedDraggedNot supportedErrorNot supported

## Behaviors

### Text overflow

When the title of an in-line alert is too long for the available horizontal space, it wraps to form another line. The optional icon in the top-right corner stays aligned to the top.

## Internationalization

### RTL

For RTL (right-to-left) languages, the layout of the in-line alert is mirrored. The icon and dismiss button are both left-aligned.
