<!-- Copyright 2026 Adobe. All rights reserved. -->

# Styles

Design > Styles authors reusable appearance recipes in four groups: Text,
Icon, Background and Border. Fresh designs include six Text Styles and two
Icon Styles; Background and Border start empty. A recipe generates
separate semantic property tokens; it does not generate a composite value.
Structures still own font size and icon size.

## Default Text Styles

| Style       | Font weight                      | Color    | Line-height family |
| ----------- | -------------------------------- | -------- | ------------------ |
| Body        | Regular                          | gray-800 | Body               |
| Component   | Regular; Medium and Bold options | gray-800 | Component          |
| Detail      | Medium                           | gray-600 | Heading            |
| Title       | Bold                             | gray-900 | Heading            |
| Heading     | Bold                             | gray-900 | Heading            |
| Description | Regular                          | gray-700 | Component          |

All six inherit font family. They do not own font-size anchors or size ranges.
Colors reference existing gray tokens, and line heights reference whole
Typography families. Regular, Medium and Bold use explicit 400, 500 and 700
values until a shared font-weight source exists.

The reusable Text Structure references Component on its first Text element and
Description on its second. Its font-size-100 and font-size-75 anchors and sizing
rule are unchanged. Selecting a Text Style in an element's editor stores the
recipe ID and any selected variant IDs, not copied appearance. Styled elements
use the Style's line-height family at their resolved typography step and have
no separate line-height field. None restores unstyled editing; it does not
restore a previously replaced line-height binding. Cancel or Changes reset
can restore the previous authored state.

These defaults apply to fresh designs and confirmed Reset all. Existing saved
and working designs keep their Styles and element assignments, including an
empty library.

Initial semantic names include a shared `text style` Registry term to distinguish
them from primitive line-height tokens. The default Registry permits semantic
Scale indices for these families. Component weight options use a Font weight
category with `regular weight`, `medium weight` and `bold weight` terms, avoiding
the existing Density and Size terms. These are local naming choices to review
against design-data, not evidence of exact alignment.

## Default Icon Styles

Workflow icon generates colors for all existing color families: index 800 in
Light and Wireframe, and 900 in Dark. The editor can change the selected
families, shared index and mode-specific indices. Its sample starts as Home
and uses the shared Spectrum icon picker.

**Color families** defines which colors generate tokens, not authored variants.
It uses small removable tags and an inline Add menu, following the existing
supported-value field pattern. The **Color** picker in **Properties** selects
the single Design preview; it does not change generated output. Removing the
previewed family selects the first remaining supported family for preview.
Permutations still shows all generated combinations.

UI icon has three variants: Default references gray-800, Subdued gray-500 and
Subtle gray-200. These references retain the same indices across modes; the
referenced foundation colors still adapt. Its sample starts as Chevron down.
The picker is restricted to the shared UI glyph set, including chevrons,
gripper, checkmark, close, plus (`Add`) and dash.

Both recipes reference one shared **Icon interaction colors** rule. The shipped
rule uses the existing hover/focus convention: one available color step higher
in Light and Wireframe, and one lower in Dark. This is a starting convention,
not a claim of reviewed design-data parity. The existing background rule is
unchanged. All default recipes, rules and publication IDs apply only to fresh
designs and confirmed Reset all; saved designs are not reseeded.

## Authored data and output

`features/styles/model.ts` owns recipes, property bindings, option differences
and references to shared Logic rules. Colors reference one token, an explicit
literal, or several color families at one shared **Scale index**. Its searchable
combo box allows only registered Scale index values, not custom numbers.
The adjacent **Modes** button uses the Structure breakout layout and enables
one mode set. While enabled, the shared field is disabled and each mode has a
side-labelled combo box; modes without an explicit index use the shared index.
Turning Modes off removes the overrides and restores the original shared index.
This changes which primitive is
referenced, not the foundation's adaptive color generation. Text can
reference a whole unitless line-height scale. Consumers select its index
using their text-size context.

`buildStyleArtifacts` resolves appearance through existing foundation output,
authored options, selected rule outputs and Registry naming order. Thumbnails,
Design, Permutations, Tokens, export and Component token references share that
derivation. Color choices expand color tokens, not unrelated font properties.

Rule-output selections are separate from authored options. A conditional rule
declares supported outputs in Logic; a recipe selects those outputs by ID.
The rule's existing conditions still determine whether each output applies.
An offset traverses available color steps. Missing indices and out-of-range
offsets remain visible issues, not substitutions.

New variant names reference Registry categories, and option names reference their
terms. Creating a variant asks for its name and a named default option; more
options can be added afterward. Existing entries are reused. Missing entries
require confirmation, then the recipe and Registry update together. A term
owned by another category cannot be silently moved or duplicated.

Older imported options without Registry references still preview, but their
nondefault differences do not publish until their naming is registered.
Per-option differences inherit the recipe's base appearance; **Use base
appearance** removes those differences. Changes uses the same authored-address
and reset rules as other domains. Resetting a newly added recipe removes it.

## Identity and editing

Styles and Structures use the same metadata, properties and editor panels.
Properties appear as compact name-and-value rows, with a header plus menu,
inline naming and an option actions menu. Registry-backed names keep their
existing references and use the shared naming workflow; the panels do not
expose separate term pickers. Structure-only layers and Boolean visibility
controls are not shown for Styles.

Recipes own UUID publications for generated concepts and mode rows. Save,
Cancel, reload and Delete/Undo preserve those identities. Adding a mode prepares
new row identities at the authoring persistence boundary, never during rendering.
Publication metadata is excluded from authored Changes.

Membership-preserving edits reuse publication objects and their existing UUIDs.
Reconciliation copies only records that need new output membership or mode rows;
it retains inactive identities. Editing an option records its stable option and
field path, rather than replacing the entire options collection in Changes.

Design previews evaluate the current mode through the same foundation and Style
builders as full output. Text consumers also retain the authored default mode for
fallback. The library reuses unchanged recipe results instead of regenerating
every recipe for one appearance edit. These scoped results do not replace the
all-mode output used for validation and publication.

Tokens / Values changes only field display. Typing an explicit value creates a
literal; choosing a token preserves its reference. Preview selections and sample
geometry do not change output. Sample icon resources are stored separately from
semantic bindings.

Style and Structure library rows use the same preview-list component and spacing.
Style names remain visible in the library. Canvas captions identify variant
options only; Styles without variants have no caption.

For Text Styles, **Sample text** appears above **Show as**. It updates the library,
Design and Permutations previews together. The sample is shared across Text Styles
for the current session, starts as `Ag`, and is not saved or exported.

For Icon Styles, **Sample icon** occupies the same position. Sample selections
are temporary per Style, stay available outside Edit mode, and update the
library, Design and Permutations together without changing saved data or tokens.

Background previews add a neutral inset outline below 3:1 contrast against their
actual surface. The outline is not exported. Border previews have transparent
fill and use the resolved border color and width.

## Boundaries

Text Structure elements and Component token references can consume Styles.
Deleting a referenced Style or a selected weight option is rejected until its
Structure references are removed. "Used in" currently reports Component
assignments, not Structure element references. The Structure + Styles composition interface in
Components and the Styles Preview view are not included.

The recipe document, Styles Registry scope and conditional-rule output inventory
are Studio-local contracts, tracked in **LTAX-022**. They have not been accepted
into design-data-spec. Generated token rows use the existing structured-name,
literal/reference and mode contracts. Alignment differences remain diagnostics.

Run `pnpm test:styles` for generation, catalog, reset and persistence checks.
Run `pnpm test:text-styles` for the six defaults, all-mode line heights and weights,
Structure appearance propagation, portable option removal and atomic resets.
Run `pnpm test:design-panels` for shared-panel and inline-editing checks.
Run `pnpm test:style-previews` for shared list layout, variant captions and
preview-only sample text.
Run `pnpm test:icon-styles` for Icon defaults, mode/state generation, shared
previews, identity preservation and authoring lifecycle checks.
Run `pnpm exec tsx tests/variant-registry-names.ts` for Registry registration,
reuse, identity and naming checks shared by Structures and Styles.
The normal Studio check inventory also discovers these tests.
