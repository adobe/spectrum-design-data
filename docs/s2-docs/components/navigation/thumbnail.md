---
title: Thumbnail
source_url: /web/rsp/components/thumbnail
last_updated: null
status: published
tags: []
hub_path: /web/rsp/components/thumbnail
swc_exists: false
---

# Thumbnail

## Anatomy

thumbnail container image

## Component options

size Thumbnail sizes scale exponentially. The opacity checkerboard responsively resizes to appropriately fit within each thumbnail size.

## States

State Support status DefaultSupportedHoverNot supportedDownNot supportedKeyboard focusNot supportedDisabledSupportedSelectedSupportedDraggedNot supportedErrorNot supported

## Behaviors

### Keyboard focus

Thumbnails can be navigated using a keyboard in certain scenarios, such as layers or layer masks. When a thumbnail is used as pure representation of an item, focus should be set on the component the thumbnail is used within.

### Image

Thumbnails feature rounded corners and may include images with transparency. A subtle inset border helps distinguish images that might otherwise blend into the product's theme colors.

### Layer

When thumbnails are used in layer management (such as Treeview, Compact or Detail Layers panels), the thumbnail is given a thick gray border.

### Selected layer

When a user selects a thumbnail in layer management, such as in Treeview, Compact or Detail Layers panels, it is highlighted with a thick blue border.

## Usage guidelines

### Using thumbnails in treeview

Tree view items can show thumbnails as an alternative to icons. Thumbnails are best used when a user needs to have a preview of the content represented by the tree view item. Icons can be used as a fallback for when an image is unavailable, but should be appropriately sized to match the thumbnail.

### Be mindful of thumbnail size and proportions

Tree views with thumbnails should use a thumbnail size that is appropriate to the size of the tree view itself. For example, an extra-large tree view would not work well with small thumbnails; those proportions may be better suited for using icons instead.

### Multiple thumbnail

In some cases, multiple thumbnails need to be displayed in-line with the tree view item (e.g., layer masks). These thumbnails should be individually selectable and inherit all other behaviors of a standard tree view item, such as drag-and-drop behavior. Don't use more than 3 thumbnails per tree view item.
