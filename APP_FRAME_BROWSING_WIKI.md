# App frame (browsing)

**Page ID:** [`3364319`](https://github.com/adobe/spectrum-design-data/commit/3364319543) | **Version:** 16

***

.composition-banner-title { font-weight: 700;
}
.composition-banner-content>.composition-banner-desc { font-size: 1.5rem;
}]]>
Paste the embed code from Figma into the HTML macro above
**Anatomy (Side navigation)**
-----------------------------

Replace the text below with a text-based hierarchical structure for your component's anatomy (outline format)
**Anatomy (Header)**
--------------------

Replace the text below with a text-based hierarchical structure for your component's anatomy (outline format)
Down
Keyboard focus
The drag area of the panel is focusable to allow for keyboard interactions to resize the panel width, if the panel is resizable
Disabled
Selected
Dragged
The drag area of the panel can be used to resize the panel width. The drag area is smaller when a scrollbar is present. Note that the smaller drag area is **not** an accessibility violation here due to the presence of the side nav state control (hamburger icon), which is an alternate method for resizing the side nav ([SC 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)) and also enables us to meet the dragging movement requirement in WCAG 2.2 ([SC 2.5.7](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements)).
Error

### App frame side navigation

There are no states because the states are defined at the "item" level.

### App frame side navigation item

| State          | Support status | Default appearance | Additional details                                                  |   |
| -------------- | -------------- | ------------------ | ------------------------------------------------------------------- | - |
| Default        |                |                    |                                                                     |   |
| Down           |                |                    | Note: The label does not shrink in the down state.                  |   |
| Keyboard focus |                |                    |                                                                     |   |
| Disabled       |                |                    |                                                                     |   |
| Selected       |                |                    | Note: Selected state also supports hover, down, and keyboard focus. |   |
| Dragged        |                |                    |                                                                     |   |
| Error          |                |                    |                                                                     |   |

### App frame header

| State          | Support status | Default appearance | Additional details |   |
| -------------- | -------------- | ------------------ | ------------------ | - |
| Default        |                |                    |                    |   |
| Down           |                |                    |                    |   |
| Keyboard focus |                |                    |                    |   |
| Disabled       |                |                    |                    |   |
| Selected       |                |                    |                    |   |
| Dragged        |                |                    |                    |   |
| Error          |                |                    |                    |   |

### App frame side navigation state control

| State          | Support status | Default appearance | Additional details                                                                |
| -------------- | -------------- | ------------------ | --------------------------------------------------------------------------------- |
| Default        |                |                    |                                                                                   |
| Hover          |                |                    | Note: When minimizing the side nav, the default label would be "Hide menu labels" |
| Down           |                |                    |                                                                                   |
| Keyboard focus |                |                    | Note: When minimizing the side nav, the default label would be "Hide menu labels" |
| Disabled       |                |                    |                                                                                   |
| Selected       |                |                    |                                                                                   |
| Dragged        |                |                    |                                                                                   |
| Error          |                |                    |                                                                                   |

### App frame header navigation item

| State          | Support status | Default appearance | Additional details                                                  |
| -------------- | -------------- | ------------------ | ------------------------------------------------------------------- |
| Default        |                |                    |                                                                     |
| Hover          |                |                    |                                                                     |
| Down           |                |                    |                                                                     |
| Keyboard focus |                |                    |                                                                     |
| Disabled       |                |                    |                                                                     |
| Selected       |                |                    | Note: Selected state also supports hover, down, and keyboard focus. |
| Dragged        |                |                    |                                                                     |
| Error          |                |                    |                                                                     |
