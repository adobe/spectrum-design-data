---
title: Typography system
category: designing
source_url: https://preview.spectrum.adobe.com/foundations/typography/typography-system
last_updated: '2026-08-13'
status: published
tags:
  - typography
  - font weights
  - font sizes
  - Major Second type scale
  - 1.125 ratio
  - Bold
  - ExtraBold
hub_path: /foundations/typography/typography-system
---

# Typography system

## Hierarchy

Typography in Spectrum is aligned to an information hierarchy model, and it also echoes the foundational concept of attention hierarchy. Hierarchy in these type styles can be conveyed through font size, font weight, and font color. Larger-sized, heavier-weight, and darker-colored text draws more attention, and it communicates the most broad ideas (the need-to-know information). Smaller-sized, lighter-weight, and lighter-colored text draws less attention, and it communicates the most specific ideas (the nice-to-know information). Image: Type hierarchy scale showing heading sizes from XXXXL down to XS, decreasing in size and weight emphasis. (source: https://preview.spectrum.adobe.com/foundations/typography/media_1b346eb0b888c66ef857046d82540202892167a51.png?width=750&format=png&optimize=medium)

## Font weight

Spectrum offers guidance for a wide range of font weights to help establish visual hierarchy in layouts. Image: Font weight chart listing Black as limited use only; Extra Bold, Bold, Medium, and Regular as used in Spectrum 2; and Semi Light and Light as not used in Spectrum. (source: https://preview.spectrum.adobe.com/foundations/typography/media_1f11e18d4d59c18e9fbbfe09e2d0d697a70810e26.png?width=750&format=png&optimize=medium)

### Image: "Heading of a page" text sample shown in Extra Bold weight. (source: https://preview.spectrum.adobe.com/foundations/typography/media_11a4271b7e3cc0fdeb141a63d4f0c07f95d4fb969.png?width=750&format=png&optimize=medium)

### ExtraBold

Spectrum recommends ExtraBold as the heaviest font weight for most use cases. This provides more contrast against the Title type style (which uses Bold), and it's also more in line with contemporary design considerations. In limited cases, products may use the Black font weight to support product-specific branding. For example, Adobe Express uses Black for headings to align with Adobe Express brand guidelines. Black should be reserved for heading type styles and used at 18 px or larger to maintain legibility.

### Image: "Export video" button label shown in Bold weight. (source: https://preview.spectrum.adobe.com/foundations/typography/media_15d6a153d8903ccb8a7ba476abbea30eb8c84313d.png?width=750&format=png&optimize=medium)

### Bold

Select elements in the UI use a Bold font weight. Bold text is often used to accentuate the primary focus on a page or in a container, and in many uses, it's paired with regular body text to create hierarchy. It's also used to directly refer to the names of UI elements in running text. Titles, file names, user names, and button labels all use bold weight.

### Image: "Edit image" button label shown in Medium weight. (source: https://preview.spectrum.adobe.com/foundations/typography/media_1d6d9ac8d1724727a00bd84cd411614cee695643f.png?width=750&format=png&optimize=medium)

### Medium

Medium is used for specific components that need visual balance with Spectrum's icons, which use a 1.5 px stroke. Action buttons, badges, and tags are examples of components that use Medium weight labels.

### Image: "Email address abc@adobe.com" text sample shown in Regular weight. (source: https://preview.spectrum.adobe.com/foundations/typography/media_1813f8775465ebff269a3da26b42db734d922aa04.png?width=750&format=png&optimize=medium)

### Regular

Regular is the default font weight for Spectrum components and body text. It should also be used for any content that's entered by users, is editable, or longer in form (for example, text fields and text areas).

## Text formatting

Text formatting can be used to visually add clarity and adjust voice or meaning.

### Image: Example text reading "First, select the Brush tool." with "Brush" shown in bold for emphasis. (source: https://preview.spectrum.adobe.com/foundations/typography/media_12cff763718340b6cd67cd104f390ff440a7d7405.png?width=750&format=png&optimize=medium)

### Bold

Select elements in the UI use a Bold font weight. Bold text is often used to accentuate the primary focus on a page or in a container, and in many uses, it's paired with regular body text to create hierarchy. It's also used to directly refer to the names of UI elements in running text. Titles, file names, user names, and button labels all use bold weight.

### Image: Example text reading "See Privacy Policy for more details" with "Privacy Policy" shown as an underlined link. (source: https://preview.spectrum.adobe.com/foundations/typography/media_1505b5ea2af6441ac894fa60eb5f6eee4847991e2.png?width=750&format=png&optimize=medium)

### Underline

Underline is used only for text links (either hover state or default state, depending on the style of the link) and should never be used as a mechanism for adding emphasis.

### Image: Example text reading "This email contains confidential information" with "confidential information" shown in bold for strong emphasis. (source: https://preview.spectrum.adobe.com/foundations/typography/media_12cd1dfa6a6125f8f0e24100a57a7a1126924bc94.png?width=750&format=png&optimize=medium)

### Strong

Strong can be used for placing importance on part of a sentence, rendering the text as a heavier font weight. This is for semantic formatting, when it's intended to add a tone that conveys importance.

### Image: Example text reading "I love drawing with Photoshop brushes!" with "love" shown in italics for emphasis. (source: https://preview.spectrum.adobe.com/foundations/typography/media_1b9b774b1f9d1c0322ae737a4a71034f92778dfdd.png?width=750&format=png&optimize=medium)

### Emphasis

Emphasis can be used for placing emphasis on part of a sentence, rendering the text as italic (or heavier weight, in CJK languages).

## Font size

Spectrum ensures that different sizes of text can work together harmoniously, on both desktop and mobile. All font sizes follow the Major Second type scale, which has a ratio of 1.125. This means that each size is multiplied or divided by 1.125 from the previous size, starting with the base size (font-size-100), and rounded to the nearest whole number. Custom text (any non-existing typography styles) or modifications to existing type styles should use a font size from this list. When selecting font sizes to ensure readability, keep in mind that Adobe Clean does not match 1:1 with system font size definitions. It's generally a size smaller than system fonts such as SF Pro, Segoe UI, Roboto, and others. Font sizeValue font-size-25 10 px font-size-50 11 px font-size-75 12 px font-size-100 14 px font-size-200 16 px font-size-300 18 px font-size-400 20 px font-size-500 22 px font-size-600 25 px font-size-700 28 px font-size-800 32 px font-size-900 36 px font-size-1000 40 px font-size-1100 45 px font-size-1200 51 px font-size-1300 58 px font-size-1400 65 px font-size-1500 73 px

## Line height

Line height controls the vertical space between lines of text and plays an important role in readability and visual hierarchy. When line height is too tight, text becomes more difficult to scan. When it is too loose, related content can feel disconnected. Line height is implemented differently across platforms because each platform calculates and renders it differently. As a result, equivalent typography styles may use different line height values. Image: Diagram of the text "Spectrum delivers what's needed, when it's needed." with a pink highlighted line and callout labeling the line height measurement. (source: https://preview.spectrum.adobe.com/foundations/typography/media_191500241ed99ecbd2f7baa1d86ecaef92fb00d62.png?width=750&format=png&optimize=medium)

### Spectrum Web

Spectrum Web defines default line height values for each font size in the type scale. Heading, Title, Detail, and Component type styles use these values to maintain balanced spacing across a range of text sizes. The default line height gradually decreases from approximately 130% at smaller font sizes to 115% at larger sizes, then rounds to whole even pixel values. This helps maintain consistent visual spacing while avoiding half-pixel rendering within components. Body and Code type styles use a more spacious line height of 1.5× the font size to improve readability for longer passages of text. For Chinese, Japanese, and Korean (CJK) languages, Spectrum uses a 1.7× multiplier to accommodate the visual characteristics of those writing systems. Learn more about the line height calculations, interpolation, and rounding methodology in the Adobe Clean Spectrum Wiki.

### Spectrum Web

Spectrum Web defines default line height values for each font size in the type scale. Heading, Title, Detail, and Component type styles use these values to maintain balanced spacing across a range of text sizes. The default line height gradually decreases from approximately 130% at smaller font sizes to 115% at larger sizes, then rounds to whole even pixel values. This helps maintain consistent visual spacing while avoiding half-pixel rendering within components. Body and Code type styles use a more spacious line height of 1.5× the font size to improve readability for longer passages of text. For Chinese, Japanese, and Korean (CJK) languages, Spectrum uses a 1.7× multiplier to accommodate the visual characteristics of those writing systems. Line heightUsed forTokenValueCJK valueDefaultHeading, Title, Detail, Component line-height-font-size-# ~115–130% (varies by size, even values only)150%SpaciousBody, Code line-height-200 150%170%

### Spectrum iOS

Because iOS calculates line height differently from other platforms, Spectrum iOS recommends using auto or normal for the default line height. This allows the system to apply Apple's built-in text metrics and produce the intended typography.

### Spectrum Android

Spectrum Android defines line height using scale-independent pixels (sp), allowing text and vertical spacing to scale together with a user's font size and accessibility preferences. In Figma, equivalent pixel (px) values are used to match the intended visual appearance while maintaining a consistent design-to-engineering workflow across platforms.

## Type styles

Also known as text styles in Figma, Spectrum uses type styles to help maintain a consistent semantic meaning and create accessible, legible, and on-brand experiences across platforms. The type styles include Heading, Title, Body, Detail, Component, Code, and Monospace numbers. These styles come in a range of t-shirt sizes (such as Small, Medium, and Large) and encompass typography elements like font family, font size, line height, weight, and color. This ensures that all Adobe interfaces can maintain a predictable sense of information hierarchy. Keep in mind that a single product won't need all of these sizes, and especially at the same time. Spectrum's type styles are intentionally comprehensive to allow platform and product teams to selectively choose type styles that accommodate their unique needs. As a starting point, use a t-shirt size from each of the type styles. For example: pair Heading Medium with Title Medium, Body Medium, and Medium t-shirt sized components. If you'd like to override these styles, there's some flexibility for you to define your own typography and hierarchy as long as any customization follows Spectrum guidance for font size and color usage. Use what best fits your context and best supports your users. Explore platform-specific type styles in each platform's Figma library: Spectrum Web typography Spectrum iOS typography Spectrum Android typography

## Type styles

Also known as text styles in Figma, Spectrum uses type styles to help maintain a consistent semantic meaning and create accessible, legible, and on-brand experiences across platforms. The type styles include Heading, Title, Body, Detail, Component, Code, and Monospace numbers. These styles come in a range of t-shirt sizes (such as Small, Medium, and Large) and encompass typography elements like font family, font size, line height, weight, and color. This ensures that all Adobe interfaces can maintain a predictable sense of information hierarchy. Keep in mind that a single product won't need all of these sizes, and especially at the same time. Spectrum's type styles are intentionally comprehensive to allow platform and product teams to selectively choose type styles that accommodate their unique needs. As a starting point, use a t-shirt size from each of the type styles. For example: pair Heading Medium with Title Medium, Body Medium, and Medium t-shirt sized components. If you'd like to override these styles, there's some flexibility for you to define your own typography and hierarchy as long as any customization follows Spectrum guidance for font size and color usage. Use what best fits your context and best supports your users.

### Heading

Heading text represents the biggest and boldest text on a page, and it draws the most attention. Only the broadest idea, such as the main page title, should use this style.

### Spectrum Web

Image: Web heading text style scale showing Heading XXXXL down to Heading XS in decreasing sizes. (source: https://preview.spectrum.adobe.com/foundations/typography/media_12067c10839bec0388b50ac26cabcd5f866e2550f.png?width=750&format=png&optimize=medium)StyleFont sizeLine heightDefault weightLetter spacingHeading XXXXL15001500ExtraBoldNoneHeading XXXL13001300ExtraBoldNoneHeading XXL11001100ExtraBoldNoneHeading XL900900ExtraBoldNoneHeading L700700ExtraBoldNoneHeading M500500ExtraBoldNoneHeading S400400ExtraBoldNoneHeading XS300300ExtraBoldNone

### Spectrum iOS

Image: iOS heading text style scale showing Heading XL, Heading L, and Heading M in bold weight. (source: https://preview.spectrum.adobe.com/foundations/typography/media_15a03f87ea190cedc9b8264e2071454df77cc44a6.png?width=750&format=png&optimize=medium)StyleFont sizeLine heightDefault weightLetter spacingHeading XL900AutoExtraBold900Heading L700AutoExtraBold700Heading M500AutoExtraBold500

### Spectrum Android

Image: Android heading text style scale showing Heading XL, Heading L, and Heading M. (source: https://preview.spectrum.adobe.com/foundations/typography/media_184a97041a07d8ce67b5b77624c370281df268248.png?width=750&format=png&optimize=medium)StyleFont sizeLine heightDefault weightLetter spacingHeading XL900900BoldNoneHeading L700700BoldNoneHeading M500500BoldNone

### Title

While the Heading style is for the loudest, most broad message, there are still going to be other important items in an information hierarchy. The Title style is for text that's communicating other need-to-know concepts. It's often set in Bold weight, and it has a range of font sizes that can be paired with Body and Detail sizes to create visual balance. File names, cards, user names, panels, and other high-signal concepts in interfaces use the Title style.

### Spectrum Web

Image: Web title text style scale showing Title XXXL down to Title XS in decreasing sizes. (source: https://preview.spectrum.adobe.com/foundations/typography/media_17d39d3df837c18abea0e3d34678f7d2e94637108.png?width=750&format=png&optimize=medium)StyleFont sizeLine heightDefault weightLetter spacingTitle XXXL600600BoldNoneTitle XXL500500BoldNoneTitle XL400400BoldNoneTitle L300300BoldNoneTitle M200200BoldNoneTitle S100100BoldNoneTitle XS7575BoldNone

### Spectrum iOS

Image: iOS title text style scale showing Title XL, Title L, and Title M in bold weight. (source: https://preview.spectrum.adobe.com/foundations/typography/media_1b6e505c9be86bedb527396bf4fc8d03c0e01de17.png?width=750&format=png&optimize=medium)StyleFont sizeLine heightDefault weightLetter spacingTitle XL400AutoBold400Title L300AutoBold300Title M200AutoBold200

### Spectrum Android

Image: Android title text style scale showing Title XL, Title L, and Title M in regular weight. (source: https://preview.spectrum.adobe.com/foundations/typography/media_1a163f0812c65f011712c31984d072c81b8141752.png?width=750&format=png&optimize=medium)StyleFont sizeLine heightDefault weightLetter spacingTitle XL400AutoSemiBoldNoneTitle L300AutoSemiBold0.0075 emTitle M200AutoSemiBold0.015 em

### Body

Body is the type style that's primarily used for longer-form text that may extend to multiple lines. "Body text" is a frequently used term to describe the text that creates the main content on a page, which is where this style gets its name from.

### Spectrum Web

Image: Web body text style scale showing Body XXXL down to Body XXS in decreasing sizes. (source: https://preview.spectrum.adobe.com/foundations/typography/media_133057cb102a794cc993b3da0a5b487d88541b031.png?width=750&format=png&optimize=medium)StyleFont sizeLine heightDefault weightLetter spacingBody XXXL600150%RegularNoneBody XXL500150%RegularNoneBody XL400150%RegularNoneBody L300150%RegularNoneBody M200150%RegularNoneBody S100150%RegularNoneBody XS75150%RegularNoneBody XXS50150%RegularNone

### Spectrum iOS

Image: iOS body text style scale showing Body L, M, S, XS, and XXS in regular weight. (source: https://preview.spectrum.adobe.com/foundations/typography/media_1b8c885ef2ec58ae0ca096e4650210e86bc634116.png?width=750&format=png&optimize=medium)StyleFont sizeLine heightDefault weightLetter spacingBody L300AutoRegular300Body M200AutoRegular200Body S100AutoRegular100Body XS75AutoRegular75Body XXS50AutoRegular50

### Spectrum Android

Image: Android body text style scale showing Body L through Body XXS, each with a Regular and Emphasized (bold) variant. (source: https://preview.spectrum.adobe.com/foundations/typography/media_13a342114f88d58532ad36978f238bcc6343b8a6d.png?width=750&format=png&optimize=medium)StyleFont sizeLine heightDefault weightLetter spacingBody L300300Regular0.0075 emBody L Emphasized300300SemiBold0.0075 emBody M200200Regular0.015 emBody M Emphasized200200Semibold0.015 emBody S100100Regular0.0225 emBody S Emphasized100100Semibold0.0225 emBody XS7575Regular0.03 emBody XS Emphasized7575Semibold0.03 emBody XXS5050Regular0.03 emBody XXS Emphasized5050Semibold0.03 em

### Detail

"Detail text" is a broad term for any kind of text that communicates ideas that are even more specific than body text. Text using the Detail style acts as supporting context to any other information presented. Detail text often uses Medium weight when paired with iconography, to maintain visual balance with the 1.5 px stroke width of Spectrum 2 icons. It also often uses detail-color (gray-600) to appear more subdued in terms of visual hierarchy. Image: "Photo editing" course card with the duration and category text "3 hr 10 min • Learning Path" labeled as Detail M. (source: https://preview.spectrum.adobe.com/foundations/typography/media_1fe6376efdf44208f03b692a85620190002c7ab67.png?width=750&format=png&optimize=medium)

### Component

Component is the type style that is applied to text within UI components. The Component type style comes in multiple font weights to support its flexibility across components in the design system. For example, the Spectrum button uses the Component type style with bold weight. Action button uses the Component type style with medium weight, and text field uses the Component type style with regular weight. Component styles are supported on Web only. Spectrum offers component text styles in the Spectrum Web Figma library, to let you quickly apply text formatting to any text element in a design. This will help you stay connected to the system without needing to detach or override other text styles like Body or Title. For iOS and Android, use type styles that share corresponding weight and sizes from Title, Body, and Monospace number styles. Image: Component text style examples: a gray pill labeled "Component XL Bold," a gray pill labeled "Component L Medium," a text field value labeled "Component M Regular," and a blue toast message showing "Component M Regular" for the message and "Component M Bold" for its label button. (source: https://preview.spectrum.adobe.com/foundations/typography/media_114c9ac62642286319d93c86aba5097a85752c1a0.png?width=750&format=png&optimize=medium)

### Code

Code is a typography component used for text that represents code. The default font for showing code is Source Code Pro. Code styles are currently supported on Web only. Image: Example sentence "Use the isPending prop to display a pending state." with "isPending" shown in a code style labeled Code M. (source: https://preview.spectrum.adobe.com/foundations/typography/media_176c5ceadc0bec067be968fda5d7bf9c583abe136.png?width=750&format=png&optimize=medium)

### Monospace numbers

Monospace numbers are used for numeric content that benefits from consistent alignment, such as timestamps, counters, and adjustable values. Because each digit occupies the same horizontal space, they reduce visual shifting and make changing values easier to compare and scan. Monospace numbers are currently supported as type styles on iOS and Android only. Learn more about using tabular numbers. Image: Mobile app screenshot of a "Projects" screen with video duration timestamps (e.g., "4:19," "3:21," "1:12") labeled as Monospace number XXS. (source: https://preview.spectrum.adobe.com/foundations/typography/media_17e295f27bb0495cbb32b8d20f6c18f97cf4e77ed.png?width=750&format=png&optimize=medium)

### Comparing body, component, and detail

The differences between Body text, Component text, and Detail text are nuanced and often come down to applied semantic meaning. The characteristic differences in Detail text are the default weight, size, letter spacing, all-caps treatment for marketing contexts, and color usage. Detail text defaults to Medium weight, a smaller font size, and lighter shades of gray. It also uses the updated per-font-size line height, while Body text uses the spacious line height multiplier of 1.5x font-size. Note: There are known similarities between the Component and Detail styles, specifically when using these for text such as metadata and labels. There are nuanced semantic differences, but when in doubt, use the Component type style because it is more adaptable. Image: Side-by-side comparison of Body M, Component L Regular, and Detail L text styles, each annotated with weight, color token, and line-height token. (source: https://preview.spectrum.adobe.com/foundations/typography/media_168e64f23c16115138aedb46d8cc124a00b41f066.png?width=750&format=png&optimize=medium)

## Fallback fonts

Spectrum defines fallback fonts for situations where Adobe Clean Spectrum isn't available. These fonts are selected to provide a consistent experience across operating systems while maintaining similar typographic characteristics. TypefaceWeb (listed by priority)iOSAndroidAdobe Clean Spectrum VFAdobe Clean, Source Sans Pro, San Francisco, Roboto, Segoe UI, Trebuchet MS, Lucida GrandeSystem defaultsSystem defaults (may vary by device)

## Non-Latin scripts

Spectrum supports a wide range of non-Latin writing systems. On the web, Spectrum uses dedicated fonts for these scripts, such as Adobe Clean Han for Chinese (Simplified and Traditional), Japanese, and Korean (CJK). On iOS and Android, Spectrum uses the platform's system fonts for non-Latin scripts to reduce app size. Android system fonts may vary by device. Because different typefaces are used across platforms, text metrics may vary. When designing custom layouts, verify that text alignment and spacing remain consistent across localized experiences.

## Platform considerations

### Spectrum iOS

### Image: Comparison of the word "title" scaling up in size and pink color, illustrating iOS Dynamic Type. (source: https://preview.spectrum.adobe.com/foundations/typography/media_1b4fc3f9aed75707e698905a7a27d9188c29e8d4d.png?width=750&format=png&optimize=medium)

### Dynamic type

Spectrum typography on iOS supports Dynamic Type, Apple's system for scaling text based on a user's preferred reading size. When a user adjusts their text size in accessibility settings, Spectrum typography scales automatically to match. Learn more in Apple's Developer Documentation: Get started with Dynamic Type and WWDC24: Scaling fonts automatically.

### Spectrum Android

### Image: Comparison of the word "36 sp" and "72" scaling up in size on a pink gradient background, illustrating Android font scaling. (source: https://preview.spectrum.adobe.com/foundations/typography/media_10dff602704ed933744be8de9b3cd1035fb63a04c.png?width=750&format=png&optimize=medium)

### Font scaling

Spectrum typography on Android uses scale-independent pixels (sp), which automatically respond to a user's font size preferences. This allows text to scale with Android accessibility settings without additional configuration. Learn more in Android Accessibility: Text scaling and Android 14: Font scaling. Download the Spectrum Android Catalog app to explore available type sizes and see how they respond to accessibility settings. Refer to the installation guide for setup instructions.

### Image: Comparison of the word "36 sp" and "72" scaling up in size on a pink gradient background, illustrating Android font scaling. (source: https://preview.spectrum.adobe.com/foundations/typography/media_10dff602704ed933744be8de9b3cd1035fb63a04c.png?width=750&format=png&optimize=medium)

### Font scaling

Spectrum typography on Android uses scale-independent pixels (sp), which automatically respond to a user's font size preferences. This allows text to scale with Android accessibility settings without additional configuration. Learn more in Android Accessibility: Text scaling and Android 14: Font scaling.
