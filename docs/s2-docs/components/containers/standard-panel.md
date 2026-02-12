---
title: "Standard panel"
source_url: https://s2.spectrum.corp.adobe.com/page/standard-panel/
last_updated: 2026-02-02
category: components/containers
component_type: container
status: published
tags:

- components-containers
  related\_components:
- popover
- table
  parent\_category: containers

---

# Standard panel

## Resources

### Design

* **Figma**: S2 Web

## Anatomy

```
standard panel
- header content area
- accordion
- back button
- close button (optional)
- gripper (optional)
```

## Component options

These options are used in Spectrum's design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

| Property        | Value                                  | Default value | Description |
| --------------- | -------------------------------------- | ------------- | ----------- |
| container       | anchored / floating / dragged anchored | –             |             |
| label           | string                                 | –             |             |
| description     | string                                 | –             |             |
| value           | string                                 | –             |             |
| density         | compact / regular / spacious regular   | –             |             |
| style           | primary / secondary primary            | –             |             |
| hideGripper     | boolean                                | false         |             |
| hideCloseButton | boolean                                | false         |             |
| hideDivider     | boolean                                | false         |             |

## External links

Standard panels are containers used to group related content or tools in a consistent layout. They support a range of sizes, densities, and configurations to fit different use cases across products. Panels can be placed alongside primary content to provide supporting controls or information.

These options are used in Spectrum’s design data JSON. There may be additional or slightly different options that are available for this component in Figma and in Spectrum implementations. This is being continuously updated.

Determines whether the close button is visible in the top right corner of the panel. Set to true to hide the button when panel dismissal is not required.

Determines whether the gripper is visible at the top center of the panel. Set to true to hide the gripper when panel dragging is not required.

Specifies the visual style of the panel. Use primary for panels that require high emphasis with the primary background color, and secondary for panels that require lower emphasis.

"There are three density options for standard panel: compact, regular, and spacious. Regular is the default and recommended for layouts in creative tools, marketing, or analytics products. Use spacious for lighter-weight web experiences, such as Adobe Express. Use compact for complex professional tools where maximizing screen space is essential."

Defines the panel’s layout behavior. Use anchored when the panel is docked alongside other panels on the same surface. Use floating when the panel is undocked and positioned above the application surface. Use dragged for the panel’s appearance while it is being moved.

Controls whether the panel content is organized into sections. When set to true, the panel displays content without structural segmentation, allowing full customization based on product or experience needs. When set to false, the panel uses an embedded accordion component to divide content into smaller, structured segments, each customizable while maintaining a standardized layout for clarity and consistency.

Determines whether the panel title is visible at the top of the panel.

Determines whether the back button is visible at the top of the panel, positioned to the left of the panel title.

Determines the size of the panel title. Options are small and medium. Use medium to establish visual hierarchy. Use small for compact layouts or secondary panels.

A standard panel can sometimes be dragged and rearranged, or undocked to become a floating panel. In this case, display the gripper at the top of the panel, then click and drag to detach it.

Standard panel uses an Accordion subcomponent to manage collapsible content sections. It can be configured to allow multiple sections to expand independently or restrict expansion to a single section at a time.

A panel can scroll internally, and a group of panels can also scroll as a unit. Panels always scroll independently from the canvas or page content. The header and footer areas of a panel can remain fixed during scrolling.

When users scroll in the outer areas of a panel — such as the header, footer, or sides — the entire panel group scrolls. When scrolling within the inner content area, only the panel’s content scrolls, while the header and footer (if present) stay in place.

"Standard panel supports three widths: small, medium, and large. The small size is best for a single column of items, such as swatches or navigation elements. Medium is the default for most scenarios and works well for tools that interact with a canvas area, including filters, sliders, text boxes, or swatches. The large size is ideal for panels where users browse or search for content, such as images, assets, cards, or templates."

The panel title can act as a label for the fields in the panel, if the design is reviewed and approved by an accessibility expert.

Use a single panel density across a product to maintain visual consistency. Mixing densities within the same experience is not recommended.

The choice of density often depends on context, user preference, and device type. Compact saves space in complex professional tools, regular balances usability across a range of products, and spacious improves comfort in lighter-weight experiences.

Anchored panels are docked in fixed areas of the workspace and grouped with other panels on the same surface. They cannot move freely outside their designated location unless undocked. This layout helps maintain a consistent and organized workspace, making it easier for users to access essential tools without obstructing the canvas or working area. A common example is the layers panel docked to the right side of Photoshop.

Floating panels are undocked and can be moved freely anywhere on the screen, independent of the main workspace. This style offers flexibility, especially when working across multiple monitors or when isolating a panel improves focus. A common example is a Properties panel floating near artwork in Illustrator for quick access.

Dragging refers to manually moving a panel by clicking and dragging the gripper. This interaction allows users to reposition a panel within the workspace. A dragged panel can be docked into a new location (anchored) or left to float independently. This behavior supports workspace customization, helping users tailor panel placement to fit their workflow. For example, dragging the Tools panel from the left side of Photoshop to float next to the canvas.

## States

The panel title can act as a label for the fields in the panel, if the design is reviewed and approved by an accessibility expert.

Use a single panel density across a product to maintain visual consistency. Mixing densities within the same experience is not recommended.

## Behaviors

The panel title can act as a label for the fields in the panel, if the design is reviewed and approved by an accessibility expert.

Use a single panel density across a product to maintain visual consistency. Mixing densities within the same experience is not recommended.

## Usage guidelines

The panel title can act as a label for the fields in the panel, if the design is reviewed and approved by an accessibility expert.

Use a single panel density across a product to maintain visual consistency. Mixing densities within the same experience is not recommended.

## Design tokens

Use the [Spectrum Token Visualization Tool](https://opensource.adobe.com/spectrum-tokens/s2-visualizer/?filter=spectrum%2Clight%2Cdesktop) to review the tokens for this component.

## Changelog

| Date               | Number | Notes                                                       |
| ------------------ | ------ | ----------------------------------------------------------- |
| November 19, 2025  | 1.1.0  | New guidelines were added to this page.                     |
| September 15, 2025 | 1.0.0  | This component was added to the Spectrum 2 guidelines site. |

## Questions or feedback?

Ask questions about this component by posting in [#spectrum-design](https://adobe.enterprise.slack.com/archives/C0B4ZDHEE) on Slack. Submit any feedback or file bugs (either about this component or its documentation) through Spectrum's [feedback form](https://adobe.enterprise.slack.com/lists/T024FSURM/F08FFP5MLHJ).

## Related Components

* [Popover](/page/popover/)
* [Table](/page/table/)
