---
title: Rounding
category: designing
source_url: https://preview.spectrum.adobe.com/foundations/styles/object-styles/rounding
last_updated: '2026-08-14'
status: published
tags:
  - rounding
  - corner radius
  - nested corners
  - concentric corners
  - continuous corners
hub_path: /foundations/styles/object-styles/rounding
---

# Rounding

## Principles

Image: A rounded triangle icon with softened corners on a light gradient background, illustrating the principle of avoiding sharp corners. (source: https://preview.spectrum.adobe.com/foundations/styles/object-styles/media_1d778dc4142412cfd82572b0b1eb9300d2a367ab5.png?width=750&format=png&optimize=medium)Image: Four corner bracket shapes forming a square outline, with the top-right corner highlighted in green, illustrating visually balanced corner treatment. (source: https://preview.spectrum.adobe.com/foundations/styles/object-styles/media_12db6885b0a4b030d6f6bba073acd4c54d46d6124.png?width=750&format=png&optimize=medium)

### No sharp corners

Spectrum generally uses rounded corners throughout the interface. Exceptions to this rule are rare and reserved for specialized cases when precision is especially important and helps communicate meaning or improve the accuracy of a visual representation. For example, the fill of a slider or progress bar may use a sharp edge to indicate a specific value or position more precisely.

### Visually balanced corners

When rounded surfaces are nested inside one another, their corner radii should adjust in proportion to the space between them. This helps maintain visually consistent gaps and creates the appearance of concentric curves. Learn more about creating balanced nested corners below.

## Rounding system

Image: A sequence of five corner shapes numbered 1 through 5, progressing from a sharp square corner to a fully rounded circular corner, illustrating the rounding system scale. (source: https://preview.spectrum.adobe.com/foundations/styles/object-styles/media_10b83b08dd022d2bb9fef04bdb0e37671af553061.png?width=750&format=png&optimize=medium) Small Small controls such as checkbox, in-field button Medium (default) Most components, extra-small and small cards Large Medium and large cards, panels, action boxes, select boxes, toolbars Extra-large Dialogs Full Button, avatar, floating action button, search Image: Four gray rounded rectangles of increasing size, labeled with corner radius values 7 (7.111px), 8px, 9px, and 10 (10.125px), illustrating how corner radius scales with component size. (source: https://preview.spectrum.adobe.com/foundations/styles/object-styles/media_15d74d9cce885aad6e05c3c661570e9f00d0b1a28.png?width=750&format=png&optimize=medium)

### Rounding for component sizes

Corner radius values scale using a Major Second logarithmic scale, the same scale used throughout Spectrum's type system. This allows corner rounding to scale proportionally with component sizes and labels, helping components maintain a consistent visual shape across the interface. The values shown are base values, and the applied corner radius may vary by component.

### Balancing nested corners

Spectrum uses different approaches to create visually balanced nested corners, depending on the relationship between the surrounding surfaces. Some scenarios follow a mathematical relationship, while others prioritize optical balance to achieve the intended visual result.

### Image: Diagram of a rounded card with a blue focus ring, labeling outer radius, inner radius, and the gap between the component edge and the focus ring. (source: https://preview.spectrum.adobe.com/foundations/styles/object-styles/media_1580eaee52110544895d8754b90e30a99e0d27767.png?width=750&format=png&optimize=medium)

### Focus rings

Focus rings use an outer stroke separated from the component by a consistent gap. To maintain visually balanced spacing around every corner radius, Spectrum calculates the focus ring radius using the following formula: &#x3C;outer radius> - &#x3C;gap> = &#x3C;inner radius> Image: Diagram of a rounded card containing a small checkbox and heart icon, labeling the large container radius and the small nested component radius. (source: https://preview.spectrum.adobe.com/foundations/styles/object-styles/media_1238596e6de27dfab676345a245d99aca9c0a01c0.png?width=750&format=png&optimize=medium)

### Nested components

Spectrum components are designed so that smaller objects use smaller corner radii and larger objects use larger corner radii. When components are nested, this creates optically balanced corners and spacing while maintaining consistent relationships throughout the design system. Image: Diagram of a dropdown input field, labeling the medium radius of the field and the small radius of the nested chevron button. (source: https://preview.spectrum.adobe.com/foundations/styles/object-styles/media_117277faee1a1249b79388f9456db5a94d180aa4b.png?width=750&format=png&optimize=medium)

## Applying rounding

When designing custom containers and surfaces, nested corners that always match the formula precisely can often create complexity and fragmentation. Instead, aim for overall visual harmony instead of numerical precision by nesting smaller corners within larger ones and creating gaps using Spectrum’s Spacing system. Image: Photo gallery UI with a "1 selected" toolbar, annotated with corner radius tokens: extra-large and medium for image tiles, large for the selection toolbar, and spacing values of 12px and 6px. (source: https://preview.spectrum.adobe.com/foundations/styles/object-styles/media_1e549dc82517f4c8d70a43fefa55aec784e2dc85a.png?width=750&format=png&optimize=medium)

### Example

This example shows how nested corner radii can vary depending on spacing. The thumbnails use a larger gap, so the corner radii are adjusted for optical balance rather than following the formula exactly. The action bar uses a smaller gap, allowing the formula to produce a visually balanced result.

## Platform considerations

### Spectrum iOS

### Image: Two pink rounded squares labeled "Off" and "On," comparing a standard rounded corner to a smoothed squircle-style corner, used as the reduced-motion alternative to the corner smoothing animation. (source: https://preview.spectrum.adobe.com/foundations/styles/object-styles/media_1daec0c3ae55113ee136895ff6e8c32f68c1a0c74.png?width=750&format=png&optimize=medium)

### Corner smoothing

Use Apple’s continuous corner style for rounded shapes, such as rounded rectangles and capsules. Continuous corners create a smooth transition between curved and straight edges and align with the corner treatment used throughout iOS system interfaces. Learn more in Apple’s Developer Documentation: RoundedCornerStyle

### Image: Static illustration of a pink rounded square with a black outline highlighting the nested outer and inner corner curves, used as the reduced-motion alternative to the concentric corners animation. (source: https://preview.spectrum.adobe.com/foundations/styles/object-styles/media_1f932489f41beb1e5357ccf616be1e590f096f48b.png?width=750&format=png&optimize=medium)

### Concentric corners

Use Apple’s concentric rectangle APIs when working with nested shapes. Concentric corners automatically adapt to their container’s shape and spacing, helping maintain consistent curvature and visual alignment across layered interface elements. Learn more in Apple’s Developer Documentation: ConcentricRectangle.

## Tokens

### Platform availability

These tokens are currently available on web. Guidance for additional platforms will be added in a future release. StyleTokenValueSmall corner-radius-small-default 4 pxMedium corner-radius-medium-default 8 pxLarge corner-radius-large-default 10 pxExtra-large corner-radius-extra-large-default 16 pxFull no token, calculated with formula: height ÷ 2 --
