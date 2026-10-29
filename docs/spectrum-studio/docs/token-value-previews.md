# Token value previews

Tokens list/grid and the Change log share `ValuePreview`. It displays existing
resolved values; it does not generate tokens, write storage, or create edits.
The exact value text remains beside the visual.

## Visuals

| Meaning | Preview |
|---|---|
| Color without a more specific element; background color | Filled 24px square |
| Text color | "Ag" in the supplied color |
| Border color | Transparent square with a 2px colored border |
| Border thickness | Transparent square with a gray-600 border at that thickness |
| Text size, font weight, font family | "Ag" with the corresponding property |
| Line height | "Ag" with a fuchsia-300 line box at the resolved height |
| Icon size or color | Spectrum star with the corresponding property |
| Spacing and generic size | Horizontal block at the supplied width |
| Radius | 24px square with only its top-left corner rounded |
| Complete shadow | 20px square with the complete shadow, preserving layer order |
| Individual shadow property | 20px square with that property applied to a reference shadow |

Text defaults to 16px, weight 400, normal style, and the app font stack.
`ValuePreview` and `TextValuePreview` accept optional font size, weight, style,
and family properties. `IconValuePreview` accepts an optional icon and style;
`ValuePreview` accepts an optional icon. These are display properties, not app
settings. Font-weight and font-family examples are supported without adding
new authored foundations or taxonomy terms.

The compact area is 80px by 32px. Tokens cards retain a 136px-tall area.
Oversized values keep their real dimensions and are clipped, never scaled or
capped. Zero values remain zero. Browser-native border/radius constraints can
affect the shape without changing the source value.

## Meaning and units

`sourceValuePreview` uses existing stable classification IDs and the governed
Element, Attribute and Property assignments. It does not guess from token names.
Unambiguous typed foundation/metric metadata supplies missing display context.
Compatibility aliases carry their already-resolved target's display descriptor.
Unsupported or invalid meanings retain value text and a preview-unavailable reason.

Canonical numeric lengths stay in pixels even when adjacent text uses rem/em.
Explicit rem inputs use a 16px reference; em inputs use the preview text size.
Unitless line height multiplies that text size: 1.5 at 16px renders a 24px line
box. Percentages, viewport units, unresolved expressions and conflicting units
are not guessed. Modern CSS colors are applied unchanged, including alpha;
the browser reports unsupported CSS values instead of substituting another color.

The preview-only reference shadow is `0px 2px 4px 0px` in gray-600.
Blur, spread, color and horizontal/vertical offsets replace their matching part.
Generic Offset is vertical unless an explicit horizontal orientation is present.
Full shadow tokens do not use this reference.

## Change log and lifecycle

`ChangeField.beforePreview` and `afterPreview` are transient display metadata.
Each producer attaches the raw value and meaning for that side's original
comparison context. New/removed values do not fabricate a missing side.
Generated semantic changes show resolved values, not alias-reference strings.
Names, flags, ratios, hue/chroma/lightness parameters, collections and unsupported
source objects remain text-only. Clearly dimensional foundation parameters
(such as a scale base or typography min/max text size) can receive previews.

The existing comparisons, generated/manual badges, batching, counts, mode
contexts, impact denominators, Save/Cancel/reload and revert/reset behavior remain
unchanged. Adaptive Tokens previews do not become saved Change log evidence.

Related contracts: LTAX-002 (classification), LTAX-005 (mode context), LTAX-007
(complete shadows), and LTAX-015 (final color representation) in the
[canonical gap register](../src/data/design-data-gaps.json). These visuals do not
close gaps, change pinned profiles/revisions, or imply upstream/RFC acceptance.

## Checks

`pnpm test:value-preview` covers meaning, exact styles, units, errors and
alias/source preservation. Storybook includes a shared gallery and text/icon
examples. Focused browser specifications cover computed dimensions, clipping,
theme behavior, actual Tokens/Change log integration and empty page-error lists.
