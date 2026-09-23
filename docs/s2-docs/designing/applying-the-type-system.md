---
title: Applying the type system
category: designing
source_url: https://preview.spectrum.adobe.com/foundations/typography/applying-the-type-system
last_updated: '2026-08-13'
status: published
tags:
  - typography
  - visual hierarchy
  - readability
  - font sizes
  - monospace numbers
  - tabular numbers
hub_path: /foundations/typography/applying-the-type-system
---

# Applying the type system

## Typography examples

The following are some general examples to show how the Spectrum 2 typography system all comes together, and how type styles can be used together to create visual hierarchy.

### Image: Card example with numbered callouts: 1) "Card title" labeled as the Title style, and 2) "Card description" labeled as the Body style, over a colorful gradient image. (source: https://preview.spectrum.adobe.com/foundations/typography/media_18dd0601a7059dd3b917ba5cc09fa50cfc5e3786e.png?width=750&format=png&optimize=medium)

### Card

In this card example, Title and Body text styles are used together to establish a clear visual hierarchy, helping users quickly identify the primary content while keeping supporting information easy to scan. Title S The card title uses the Title style to establish the primary focus of the card. It provides strong visual emphasis, making it easy for users to quickly identify and scan content across multiple cards. Body XS The supporting description uses the Body style because it provides additional context without competing with the title. Its lighter weight and smaller size reinforce the content hierarchy while maintaining readability. The body text is presented in gray-700 to further distinguish it as secondary information and keep attention on the primary title. Image: Dark "Featured project" page section for "Dreams from Oostende" with numbered callouts labeling the eyebrow text, heading, body paragraph, byline, and button group. (source: https://preview.spectrum.adobe.com/foundations/typography/media_1e2a2ea1530d45f5b5ab50e4406d52bfc78a2b4e6.png?width=750&format=png&optimize=medium)

### Page section

Spectrum's type scale creates a clear visual hierarchy that naturally guides the eye through the page. By assigning each type style a distinct role, Spectrum organizes information into predictable patterns that make content easier to scan and understand. Title M Heading XXL Body M Body S Component M, used in a button group Image: Unlabeled image (source: https://preview.spectrum.adobe.com/foundations/typography/media_1cd4d7ef6ccfd52ab7af605bc861bcdd334201f0a.png?width=750&format=png&optimize=medium)

### Mobile browsing

The same typography principles scale across screen sizes. On native mobile platforms, Spectrum preserves a clear visual hierarchy by adapting type styles to smaller layouts while maintaining consistent relationships between headings, supporting content, and actions. Heading L Title L Body XS Body S Monospace number / Body XXS

## Usage guidelines

### All-caps

All-caps styles are not recommended for usage within UI components because it does not support accessibility requirements An all-caps style can still be used sparingly and strategically in use cases where longform content is the primary experience (like a blog post or a marketing website). All-caps text brings a heavier, punctuated feel to letterforms and adds visual impact to single words or short, standalone phrases. Image: Button labeled "EXPORT VIDEO" in all-caps text, shown as a don't example. (source: https://preview.spectrum.adobe.com/foundations/typography/media_111cb65fe657204f59fbf7ba2758d84ed1330d7c2.png?width=750&format=png&optimize=medium)

### Use Spectrum font sizes

Choose from Spectrum's defined font sizes. By using unique font sizes, you risk upsetting the hierarchy and balance of typography in your product. Image: Text reading "Spectrum delivers what's needed, when it's needed." labeled with a custom value of 17 px instead of a Spectrum font size token, shown as a don't example. (source: https://preview.spectrum.adobe.com/foundations/typography/media_1280ff1daf36ac669b43bcc3e021b8a6774c4cbb6.png?width=750&format=png&optimize=medium)Image: Text reading "Spectrum delivers what's needed, when it's needed." labeled with the token font-size-200, shown as a do example. (source: https://preview.spectrum.adobe.com/foundations/typography/media_17c4dbbf625e3b2e743e6a75e591d7f5991b5cfbc.png?width=750&format=png&optimize=medium)

### Respect capitalization rules

Use sentence case for all UX content. For more on capitalization guidelines, go to Grammar and mechanics. Image: Form with a "Create audience" button, an "Email address" field, and a "Contact preference" dropdown listing "Phone call," "Email address," and "Text message" in sentence case, shown as a do example. (source: https://preview.spectrum.adobe.com/foundations/typography/media_1e8d9950994f825a7339aaac2677a0f16286e1762.png?width=750&format=png&optimize=medium)

### Use tabular numbers for numerical data

Numbers within components should be tabular with lining figures. In tables, numbers should be right aligned to make numerical data easier to read and compare. This is used, for example, in tables, time stamps, and bar loaders. This is supported by Adobe Clean (via the Monospace uppercase option in Figma, the OpenType panel in Illustrator, or the CSS font feature settings). For iOS and Android, use the Spectrum Monospace numbers type styles. Image: Table with a "Count" column showing right-aligned tabular numbers 2, 5, 10, 12, and 25, with a bolded total of 324, shown as a do example. (source: https://preview.spectrum.adobe.com/foundations/typography/media_17aab398526c4b42c420abce55611379ee1eba044.png?width=750&format=png&optimize=medium)

### Don't let paragraph widths get too thin

Paragraphs of text that are too long are difficult to follow, and paragraphs of text that are too thin are difficult to read. Ideally, blocks of text should be roughly 70 characters wide. Be sure to keep them at least between 50 and 120 characters wide. Image: Narrow column of the "Collaborative" paragraph broken into many short lines, illustrating a paragraph width that is too thin, shown as a don't example. (source: https://preview.spectrum.adobe.com/foundations/typography/media_13bb8774bddfb85d336faadbf8f1f4936f9020f4e.png?width=750&format=png&optimize=medium)

### Keep content short and to the point

Keep paragraphs concise. Some users with cognitive disabilities (and even those who don't) can have a very difficult time reading and comprehending large blocks of text. Image: Moderate-width column of the "Collaborative" paragraph with comfortably readable line lengths, shown as a do example. (source: https://preview.spectrum.adobe.com/foundations/typography/media_15433cd18805249164930961eb963e4bec4bacba9.png?width=750&format=png&optimize=medium)

### Don't fully-justify text

Do not use fully-justified blocks of text. This adds trapped white space within paragraphs, which makes it harder to read, especially for those with cognitive disabilities or dyslexia. Right alignment (left rag) is also discouraged for paragraphs of text. Image: The "Collaborative" paragraph shown fully justified with uneven word spacing on a pink background, shown as a don't example. (source: https://preview.spectrum.adobe.com/foundations/typography/media_1da6c7af0217c78e26865de32b20a08b32471b743.png?width=750&format=png&optimize=medium)
