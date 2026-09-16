---
title: Drop zone
source_url: /web/rsp/components/drop-zone
last_updated: null
status: published
tags: []
hub_path: /web/rsp/components/drop-zone
swc_exists: false
---

# Drop zone

## Anatomy

drop zone illustration title body button (optional)

## Component options

actionLabel A button is an optional element to prompt the user to take action. size Drop zones come in three different sizes: small, medium, and large. The medium size is the default and most frequently used option.

## States

State Support status DefaultSupportedHoverSupportedDownNot supportedKeyboard focusNot supportedDisabledNot supportedSelectedNot supportedDraggedNot supportedErrorNot supported

## Behaviors

### Dragging file type over drop zone area

When a user drags a file over the drop zone ( onDragOver ), the border and background styling update to reflect an active state. This visual cue helps users understand that the drop zone is ready to accept the file, reducing uncertainty.

### Dropping file type within drop zone area

When a user drops a file into the designated drop zone ( onDrop ), the zone should respond with clear visual feedback—this is typically achieved through displaying a button over the drop zone area informing the user that they may replace their content type. This feedback indicates that the user successfully dropped their file type into the zone and is permitted to replace it.

### Leaving drop zone area

When a user drags a file outside the designated drop zone ( onDragLeave ), any visual indicators—such as borders or background styling should revert to their default state.

## Usage guidelines

### Clearly communicate accepted file types

Indicate to users the accepted file types to let users know what they can upload before interacting. This can be done through helper text or placeholder content.

### Provide immediate visual feedback

When a file is dragged over or dropped into the zone, provide the user with visual feedback such as highlighting the border or changing the background, to confirm the interaction is recognized.

### Allow the user to replace file types

Visual styling that indicates a user can replace file types within a dropzone should clearly communicate interactivity and the potential for change without disrupting the overall layout. This is typically achieved through subtle but intuitive cues such as displaying a button over the drop zone area informing the user that they may replace their content type.

## Content standards

### Writing the title

Use the content pattern of "Drag and drop your {item}" for the drop zone's title. The "drag and drop" phrasing communicates why the UI is appearing in the way that it is, and guides a user for what they need to do in the interaction. Don't use punctuation at the end of the title.

### Writing the description

The drop zone's body area elaborates on the title and offers more information about how to complete the interaction. In-line links can offer other ways to accomplish the task, such as launching the user's file browser or taking them to another resource. Write the description using full sentences, and include periods at the end of each sentence.
