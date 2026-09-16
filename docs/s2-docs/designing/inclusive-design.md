---
title: Inclusive design
category: designing
source_url: https://main--spectrum-hub--adobe.aem.live/foundations/inclusivity/inclusive-design
last_updated: '2026-09-03'
status: published
tags:
  - inclusive design
  - accessibility
  - assistive technology
  - high contrast
  - keyboard accessibility
  - internationalization
  - responsive design
  - color naming
  - co-design
  - user testing
hub_path: /foundations/inclusivity/inclusive-design
---

# Inclusive design

## Inclusive design at Adobe

Inclusive design is part of Adobe’s mission. Designers, engineers, and product builders are invested in learning how to think more broadly, seeking out more voices, and working together to make better experiences. Spectrum also builds for the widest audience possible. Our system is designed to be clearly readable, intuitive to use, and mindful of those who use assistive technology. From how components function to language and internationalization, we consider inclusion to be a top priority.

## Best practices

### Assume nothing is perfect

Provide context-sensitive help to ensure that people can be supported throughout many kinds of interactions. Prevent error conditions wherever possible, and highlight error conditions when they exist. When an error occurs, provide clear guidance about what someone can do to resolve the error by using clear and helpful messaging.

### Make room to adapt

Provide targets large enough to see and interact with. Label and describe all objects. Ensure that designs can be interacted with by mouse, keyboard, pen, fingertips, voice, accessibility API, or other methods. When designing for the web, embrace responsiveness. Accommodate web page size down to 320 px.

### Give people a choice

Allow for someone to customize their experiences within a product, and respect system-wide user preferences such as captions, large fonts, and high contrast. Ensure that every task can be completed in a logical order using only a keyboard.

### Avoid distractions

Don’t place animations near paragraphs of text. Allow users to turn off unnecessary animation.

### Be consistent

Use common components for well-defined tasks and interaction patterns, instead of new or custom-built ones. Use common shortcuts across experiences, and especially within products that accomplish similar tasks.

### Involve marginalized users

Include people with diverse ranges of ability in user testing, and co-design whenever possible. Seek feedback from historically underinvested communities.

### Make documentation a priority

Document all accessibility features and workflows (keyboard shortcuts, support for operating system features, etc.), and make it easy to find the information in your product’s help content.

## Checkpoints

### Structure

Ensure that complex components — such as lists, forms, and panels — have a logical reading order. Check that the keyboard tab order has been defined in a logical progression.

### Color

Avoid referring to objects by color (or by location) alone. Instead, refer to these by their names or by the grouping in which they belong.

### High contrast mode in Windows

Windows high contrast mode is a setting that replaces all colors in the operating system to a simplified high contrast color palette. It includes preset color theme options and allows users to create their own color themes. This is an important feature for users with low vision, contrast sensitivity, and other needs, and should be supported by all Adobe web-based and Windows applications. Spectrum component documentation will include visual references for what the component should look like in Windows high contrast mode. These examples will all be shown in the default Windows high contrast black theme.

### Animation

Avoid making parts of a screen flash more then 3 times per second, to help prevent photo-epileptic seizures. Also, don’t create content that moves or blinks for more than a couple of seconds, to help prevent people from getting distracted.

### Interactions

Avoid “clear”/”reset” actions on forms, since someone could select these by accident and erase a lot of painstaking work. Let people save forms so that they can leave and come back. Provide keywords before or inside of links.

### Text alternatives

Include a textual label for all elements. There may be a few exceptions, when the context is sufficient (e.g., document zoom level “100%”). Use the label element in HTML where possible. If not, use ARIA to set the label (depending on the context, “aria-label” or “aria-labelledby”). Make sure labels are concise and have a clear association with objects. For objects in a table or a list, make sure that they can be identified by the structure around them (e.g., using a table header). Label all images when possible, and in all cases, include a short, meaningful text alternative. Exceptions are for decorative images as outlined in Guideline 1.1 Text Alternatives in the WCAG 2.1 standards. Provide a long description for any object that requires more information for understanding or operating it (e.g., tooltips and coach marks ), so that those using assistive technology can read it in context. Learn more about creating text alternatives in Spectrum’s Inclusive UX writing guide.

### Fonts and text

Use Spectrum typography and colors to ensure proper type scale, line height, weight, and contrast for blocks of text. Use one column per page, with a width no longer than 80 characters (or 40 CJK characters) wide. Have line lengths at a maximum of 50-75 characters. Organize writing for comprehension. In layouts, left-align running text (this will be mirrored along with the UI for right-to-left languages). Fully-justified text creates text rivers, or irregular alignment of spaces that creates running gaps throughout the text; this makes it more difficult for readers with dyslexia. Avoid switching alignments in a single view. Whenever possible, provide options for people to adjust font size, color themes, and contrast, either manually, in-app, or through operating system preferences.

### Error prevention and correction

Avoid the need for error messages by designing workflows that prevent an error state from even happening in the first place. When there is an error, associate it with the field or element that needs to be corrected or addressed. Make errors visually and semantically different from other messages (e.g., including icons, colors, placement), and write error messaging in a helpful and guiding way. Use appropriate click/touch zones to leave enough space between elements. Doing this minimizes click/touch target errors. Anticipate spelling mistakes in search queries, and accommodate multiple spellings of words in search results.

### Keyboard equivalents

Use the built-in keyboard focus states that are defined in Spectrum components. Ensure that people can complete any action using a keyboard and keyboard equivalents, including on mobile (e.g., iPad Smart Keyboard). Set a tab order so that people can move back and forth within a view by using the Tab key.

## Resources

Adobe Inclusive Design Workshop Inclusive UX writing Web Content Accessibility Guidelines (WCAG) Techniques for WCAG 2.1 Accessibility at Adobe Wiki

## Resources

Inclusive UX writing Web Content Accessibility Guidelines (WCAG) Techniques for WCAG 2.1
