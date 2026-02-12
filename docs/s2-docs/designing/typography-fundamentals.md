---
title: "Typography fundamentals"
source_url: https://s2.spectrum.corp.adobe.com/page/typography-fundamentals/
last_updated: 2026-02-02
category: designing
status: published
tags:

- designing
  related\_components:
- background-layers
- fonts

---

# Typography fundamentals

## Resources

### Design

* **Figma**: S2 Web

## External links

The variable font (VF) is the default typeface for Spectrum 2 web, iOS, and future desktop explorations.

"There are two major updates, compared with Adobe Clean:"

"If you need to deviate from the default typeface (Adobe Clean Spectrum VF), you can use Adobe Clean Spectrum Serif VF, Adobe Clean Han, and Source Code Pro:"

"In general:"

Spectrum ensures that different sizes of text can work together harmoniously, on both desktop and mobile. For Spectrum 2, all font sizes follow the Major Second type scale, which has a ratio of 1.125. This means that each size is multiplied or divided by 1.125 from the previous size, starting with the base size (font-size-100), and rounded to the nearest whole number. Custom text (any non-existing typography styles) or modifications to existing type styles should use a font size from this list.

When selecting font sizes to ensure readability, keep in mind that Adobe Clean does not match 1:1 with system font size definitions. It’s generally a size smaller than system fonts such as SF Pro, Segoe UI, Roboto, and others.

Updated (\*) means that these sizes didn't follow the Major Second type scale in Spectrum 1 and have now been updated to reflect the accurate values

"New (\*\*) shows Spectrum 2's new additions: font-size-25 is new to accommodate scaling to the smallest detail and body sizes. Font-size-1400 and -1500 are now available to provide consistent scaling to larger sizes. These are often needed in website design and for marketing scenarios."

Spectrum 2 offers guidance for a wider range of font weights to help establish visual hierarchy in layouts, including the specific usages of Black, ExtraBold, and Medium weights.

When used in Adobe Express products, the weight is set to Black in order to align to the Adobe Express brand guidelines. Black weight text should only be used in heading type styles, and never below 18 px font-size, to ensure the text remains legible.

Select elements in the UI use a Bold font weight. Bold text is often used to accentuate the primary focus on a page or in a container, and in many uses, it’s paired with regular body text to create hierarchy. Titles, file names, user names, and button labels all use bold weight.

In Spectrum 2, some components, like action buttons, badges, and tags, use Medium weight labels in order to maintain balance with Spectrum 2’s icons, which use a 1.5 px stroke.

Regular is the default font weight for Spectrum components and body text. It should also be used for any content that’s entered by users, is editable, or longer in form (for example, text fields and text areas).

Line height values are updated in Spectrum 2 to better accommodate the baseline shift of the new default font — Adobe Clean Spectrum VF — and to position the text as vertically centered in UI components.

To ensure that the space between lines of text appears balanced, the default line-height is adjusted from \~130% at smaller font-sizes to \~115% at larger font-sizes, and then rounded to whole even numbers to ensure that text within a component will not sit on a half-pixel.

Body and Code type styles use a more spacious line height multiplier of 1.5x the font-size (line-height-200) to ensure that longform text has more space and is legible. CJK languages use a 1.7x multiplier.

Spectrum 2 uses type styles to help maintain a consistent semantic meaning and create accessible, legible, and on-brand experiences across platforms.

"Keep in mind that a single product won’t need all of theses sizes, and especially at the same time. As a starting point, use a t-shirt size from each of the type styles (in Figma, these are known as text styles). For example: pair Heading Medium with Title Medium, Body Medium, and Medium t-shirt sized components."

If you’d like to override these styles, there’s some flexibility for you to define your own typography and hierarchy as long as any customization follows Spectrum guidance for font size and color usage. Use what best fits your context and best supports your users.

Heading text represents the biggest and boldest text on a page, and it draws the most attention. Only the broadest idea, such as the main page title, should use this style.

Body is the type style that’s primarily used for longer-form text that may extend to multiple lines. “Body text” is a frequently used term to describe the text that creates the main content on a page, which is where this style gets its name from.

“Detail text” is a broad term for any kind of text that communicates ideas that are even more specific than body text. Text using the Detail style acts as supporting context to any other information presented.

Detail text often uses Medium weight when paired with iconography, to maintain visual balance with the 1.5 px stroke width of Spectrum 2 icons. It’s also often shown in gray-600 or gray-700 to make it more subdued in terms of visual hierarchy.

The differences between Detail text, Component text, and Body text are nuanced and often come down to applied semantic meaning. The characteristic differences in Detail text are the default weight, size, letter spacing, all-caps treatment for marketing contexts, and color usage. Detail text defaults to Medium weight, a smaller font size, and lighter shades of gray. It also uses the updated per-font-size line height, while Body text uses the spacious line height multiplier of 1.5x font-size.

Component is the type style that is applied to text within UI components.

In Spectrum 1, the “component” line height meant “a line-height applied to text within UI elements.” Spectrum 2 expands on this by having text styles in the Spectrum Figma libraries, to let you quickly apply text formatting to any text element in a design. This will help you stay connected to the system without needing to detach or override other text styles like Body or Title.

The Component type style comes in multiple font weights to support its flexibility across components in the design system. For example, the Spectrum 2 button uses the Component type style with bold weight. Action button uses the Component type style with medium weight, and text field uses the Component type style with regular weight.

Code is a typography component used for text that represents code. The default font for showing code is Source Code Pro.

The following are some general examples to show how the Spectrum 2 typography system all comes together, and how type styles can be used together to create visual hierarchy.

In this file browsing example, Heading, Title, Component, and Detail style text are used to create hierarchy throughout the page.

In this commenting example, Title, Body, Component, and Detail style text are used to create hierarchy within the comments panel.

In instances where Spectrum’s typefaces might fail to load properly, there are defined fallback fonts that have been selected based on operating system consistency and similar anatomical relationships.

## Overview

The variable font (VF) is the default typeface for Spectrum 2 web, iOS, and future desktop explorations.

"There are two major updates, compared with Adobe Clean:"

"In general:"

Updated (\*) means that these sizes didn't follow the Major Second type scale in Spectrum 1 and have now been updated to reflect the accurate values

Spectrum 2 uses type styles to help maintain a consistent semantic meaning and create accessible, legible, and on-brand experiences across platforms.

Component is the type style that is applied to text within UI components.

Code is a typography component used for text that represents code. The default font for showing code is Source Code Pro.

In this file browsing example, Heading, Title, Component, and Detail style text are used to create hierarchy throughout the page.

In this commenting example, Title, Body, Component, and Detail style text are used to create hierarchy within the comments panel.

## Typefaces

The variable font (VF) is the default typeface for Spectrum 2 web, iOS, and future desktop explorations.

"There are two major updates, compared with Adobe Clean:"

"In general:"

Updated (\*) means that these sizes didn't follow the Major Second type scale in Spectrum 1 and have now been updated to reflect the accurate values

Spectrum 2 uses type styles to help maintain a consistent semantic meaning and create accessible, legible, and on-brand experiences across platforms.

Component is the type style that is applied to text within UI components.

Code is a typography component used for text that represents code. The default font for showing code is Source Code Pro.

In this file browsing example, Heading, Title, Component, and Detail style text are used to create hierarchy throughout the page.

In this commenting example, Title, Body, Component, and Detail style text are used to create hierarchy within the comments panel.

## Hierarchy

"In general:"

Updated (\*) means that these sizes didn't follow the Major Second type scale in Spectrum 1 and have now been updated to reflect the accurate values

Spectrum 2 uses type styles to help maintain a consistent semantic meaning and create accessible, legible, and on-brand experiences across platforms.

Component is the type style that is applied to text within UI components.

Code is a typography component used for text that represents code. The default font for showing code is Source Code Pro.

In this file browsing example, Heading, Title, Component, and Detail style text are used to create hierarchy throughout the page.

In this commenting example, Title, Body, Component, and Detail style text are used to create hierarchy within the comments panel.

## Font size

Updated (\*) means that these sizes didn't follow the Major Second type scale in Spectrum 1 and have now been updated to reflect the accurate values

Spectrum 2 uses type styles to help maintain a consistent semantic meaning and create accessible, legible, and on-brand experiences across platforms.

Component is the type style that is applied to text within UI components.

Code is a typography component used for text that represents code. The default font for showing code is Source Code Pro.

In this file browsing example, Heading, Title, Component, and Detail style text are used to create hierarchy throughout the page.

In this commenting example, Title, Body, Component, and Detail style text are used to create hierarchy within the comments panel.

## Font weight

Spectrum 2 uses type styles to help maintain a consistent semantic meaning and create accessible, legible, and on-brand experiences across platforms.

Component is the type style that is applied to text within UI components.

Code is a typography component used for text that represents code. The default font for showing code is Source Code Pro.

In this file browsing example, Heading, Title, Component, and Detail style text are used to create hierarchy throughout the page.

In this commenting example, Title, Body, Component, and Detail style text are used to create hierarchy within the comments panel.

## Line height

Spectrum 2 uses type styles to help maintain a consistent semantic meaning and create accessible, legible, and on-brand experiences across platforms.

Component is the type style that is applied to text within UI components.

Code is a typography component used for text that represents code. The default font for showing code is Source Code Pro.

In this file browsing example, Heading, Title, Component, and Detail style text are used to create hierarchy throughout the page.

In this commenting example, Title, Body, Component, and Detail style text are used to create hierarchy within the comments panel.

## Type styles

Spectrum 2 uses type styles to help maintain a consistent semantic meaning and create accessible, legible, and on-brand experiences across platforms.

Component is the type style that is applied to text within UI components.

Code is a typography component used for text that represents code. The default font for showing code is Source Code Pro.

In this file browsing example, Heading, Title, Component, and Detail style text are used to create hierarchy throughout the page.

In this commenting example, Title, Body, Component, and Detail style text are used to create hierarchy within the comments panel.

## Typography examples

In this file browsing example, Heading, Title, Component, and Detail style text are used to create hierarchy throughout the page.

In this commenting example, Title, Body, Component, and Detail style text are used to create hierarchy within the comments panel.

## Fallback fonts

## Design tokens

Use the [Spectrum Token Visualization Tool](https://opensource.adobe.com/spectrum-tokens/s2-visualizer/?filter=spectrum%2Clight%2Cdesktop) to review the tokens for this component.

## Questions or feedback?

Ask questions about this component by posting in [#spectrum-design](https://adobe.enterprise.slack.com/archives/C0B4ZDHEE) on Slack. Submit any feedback or file bugs (either about this component or its documentation) through Spectrum's [feedback form](https://adobe.enterprise.slack.com/lists/T024FSURM/F08FFP5MLHJ).

## Related Components

* [Background layers](/page/background-layers/)
* [Fonts](/page/fonts/)
