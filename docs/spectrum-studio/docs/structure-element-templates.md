# Structure element templates

Structures can contain ordered Workflow-icon, UI-icon, Text, Visual, Bar and Slot
instances. Their bindings keep the authored primitive reference or numeric value;
the shared artifact generator resolves them into contextual semantic tokens.
Generated tokens are outputs, not choices in the primitive-reference picker.
Control, drag-and-drop,
editable text content and image uploads remain outside this slice.
Reusable Structure references are a separate authoring capability described below.

In Edit mode, Add inserts before, between or after children. The pointer chooses
the nearest boundary; opening the menu freezes that location. The insertion bar
spans the Structure's full inner height, including padding, with Add vertically
centered on the bar. Vertical Structures instead use a full-width horizontal
bar with Add horizontally centered. Both remain overlays and do not affect Hug measurement.
Add temporarily hides directly over an existing child so it cannot block child
selection; keyboard focus reveals it again and an open menu keeps its location.
Every insertion button is keyboard accessible. A child selects its editing
panel. Clicking the Structure background, selecting Main structure in Layers,
or pressing Escape in the canvas returns to the layout panel. Readonly mode permits
child inspection.

Owned layouts expand within the Layers tree. Parent Properties stay visible
when selecting a layout or element. Appearance follows the selected layer;
custom layout properties remain editable alongside it. References to separate
reusable Structures keep the Open source Structure action.

Choose Layout from Add to create a named layout inside the current Structure.
Set its Layout name in Appearance, then add elements or other layouts directly
in its preview. Layouts stay out of the Structure catalog. Layers supports
visibility, ordering and deletion; Undo restores the layout and its contents.
Renaming a layout changes its local label, not its existing generated token names.

## Adding properties

The Properties Add menu offers Boolean and Variant. Each creates a row with an
editable name; no setup dialog or Registry selection is required. New variants
start with Default and Option 2. Edit their names inline and use the option menu
to add options or choose an unchanged option as the default. Choose the default
before saving differences for that option.

New variants and options have local names, without Registry assignments. They
support preview differences but do not publish variant-specific tokens. The
panel identifies these options as preview-only. Existing Registry-linked
variants retain their token naming and explicit Registry-term creation when
renamed. Local creation does not connect token naming automatically.

Parent properties can control owned layouts without moving their layout
bindings or token ownership. Visibility bindings can select a parent Boolean.
To save a parent Variant's differences on a layout, choose its nondefault option
in Properties, select the layout and edit Appearance. Selecting a custom layout
property instead edits that property's differences.

These mappings use reference-occurrence paths, so they affect the chosen
occurrence, not every use of a layout definition. They cannot cross a reference
to an independent Structure. Removing a target cleans up its mappings; Undo
restores both. Conflicting assignments are reported. An explicit None padding
choice suppresses padding without discarding the selected density.

## Bindings and preview samples

Each instance references its immutable Registry Element term and has a separate
instance UUID. Logical binding IDs derive from the instance and slot, so
insertion order, glyph changes and Bar orientation do not remint them. Size
bindings accept a primitive reference or a nonnegative pixel value. Text line
height also accepts a nonnegative unitless multiplier. Editing either input
updates the contextual semantic token without changing its identity; it does
not replace the authored binding with generated output. Primitive references
remain anchors for the existing Generator rule, which recalculates every
selected size. A numeric value is one input for the selected sizes; it does not
create a separate override for each size.

Save and reload preserve the authored assignment. Literal-derived output rows
remain available to previews without requiring a primitive token. Cached
generation carries the interpolation library and token overrides, and changes
to either invalidate its source key.

| Type          | Bindings                                                                        | Preview metadata                                                   |
| ------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Text          | Nominal Typography font size; pixel or unitless line height                     | Fixed `Text` sample                                                |
| Workflow-icon | Size or Typography icon size, applied to both dimensions                        | Public S2 glyph, initially Home                                    |
| UI-icon       | Size or Typography icon size, applied to both dimensions                        | S2 glyph subset and Spectrum UI drag handle, initially ChevronDown |
| Visual        | Independent Size width and height, with minimum and maximum constraints on each | Bundled local placeholder                                          |
| Bar           | Size length and thickness                                                       | Registry horizontal/vertical orientation                           |
| Slot          | Independent Size width and height, with minimum and maximum constraints on each | Named blank placeholder, initially `Slot`                          |

Slots reserve space without implementing a control. Set their nonempty Slot name
in the element panel; Layers and the preview use that name. Like other leaves,
Slots support visibility booleans and option differences without producing tokens.
Adding a Slot to an existing design registers its Element term in the same edit;
Cancel restores both the Structure and Registry.

The DragHandle sample uses Spectrum's UI ListGripper SVG. It is an indicator
only, not a draggable control. ChevronRight remains available for drill-in.

Unassigned fields show explicit preview samples, not numeric authoring overrides.
Structure and element Appearance panels use the same configurable controls.
Selecting a leaf shows only its supported fields, without a heading, description,
back button or delete action. Elements are removed from Layers.
Visual constraints use existing Size tokens and are preserved by Save, Cancel,
reload, and Changes reset. A minimum cannot exceed the corresponding maximum.
Typography reference IDs reuse the existing canonical identity based on metric
ownership and mathematical position. Display indices and labels may change
without reminting references. Pixel and unitless line heights have different
metric identities; unitless values remain CSS multipliers with full precision.
Current modes and token-browser value overrides flow through the shared
reference catalog, including unpublished foundations.

The shared child renderer supplies Design, inert intrinsic/Hug measurement and
Permutations. Add markers and selection outlines do not contribute layout
dimensions. An empty editable Structure has a 160 by 96 px authoring floor only
on Hug axes without minimum or maximum constraints. Explicit dimensions and
constrained Hug axes keep their authored sizes. This floor and the Add controls
never contribute to hidden intrinsic measurement.

## Rule ownership and publication

An application's existing `targets` select **layout tokens**. The additive
`previewTargets` select **element previews**. All follows newly bound properties;
Custom retains exact binding IDs. Older All applications keep All preview
intent. Older Custom applications start with no child targets.

Both paths use the shared Generator traversal, including available-token and
numeric-index movement and visible nearest-source warnings. Preview-only
applications need no generated rows or emitted Structure name. Child references
never enter semantic grouping, token arrays, aliases or primitive lineage.
Element bindings can generate contextual semantic tokens, while child previews
and Structure references do not enter layout-token rule targets. Numeric layout
bindings also generate semantic values without becoming rule targets.
Base's current layout-token contract is documented under Base defaults below.

Generator options use Registry Size-term IDs, including custom terms. Existing
five-size outputs retain their short keys; custom options retain their term UUID
as identity. A Structure's selected terms must exist in every applied Generator.
Token-type exclusions keep layout anchors and saved preview targets intact.
Typography preview eligibility uses the bound metric, not its slot label.
Only active targets overlap; exclusions never clear an authored selection.

## Persistence, dependencies and review

Structure schema **3** originally added leaves and separate preview targets.
Schema **6** adds Direction, reusable references, preview-only
indentation and explicit naming classifications. Authoring envelope **11**
independently upgrades saved and working snapshots through the existing
Color/data-vis and earlier upgrade chain. Missing children become empty;
existing IDs, saved Cancel baselines, modes and authoring edits are preserved.
There is no separate element storage key.

Source/step/metric removal is blocked while referenced. Registry type and
orientation dependencies are listed separately from token occurrences. Changes
tracks template authoring fields and order; Save/Cancel/reload, Structure/topic
revert and Reset all include the complete collection. Generated leaf tokens
contribute semantic token concepts; child references do not create aliases or
saved mode values.

Deleting an element with Custom preview targets confirms their removal.
Deletion and target cleanup are atomic; Undo restores its position, bindings,
metadata and previous targets without deleting layout-token selections.

LTAX-012 scopes this local capability separately from LTAX-008, LTAX-009 and
LTAX-011. Upstream Structure/anatomy mapping and adoption remain undecided.
Native layout-token profiles and explicitly labeled compatibility downloads
are unchanged; this feature adds no upstream anatomy export.

## Local verification and remaining limitations

### Portable contract work

`portableModel.ts` defines the local stored authoring contract. It uses Registry
name references, explicit owned-occurrence targets,
typed configuration effects, separate publication identities and companion glyph
resources. Local Booleans have no token-naming classification.

`portableConversion.ts` adapts the portable source to existing domain resolution
and generation. Conversion does not register terms, allocate identities or write
storage. `portableOperations.ts` exposes a headless
graph and a narrow configuration edit using the existing option resolver. Hidden
authored children remain in the graph; independent references use source defaults.
The default JSON and authoring envelope version 21 store the portable source.
The runtime projection keeps current UI, Changes, reset and generator operations;
it is not a second saved format. Root and nested option binding edits use
`configurationState.ts`, not view-owned JSON construction.

`pnpm test:structure-portable-contract` checks output records, identity preservation,
1,024 parent configurations, repeated occurrences, local options, leaf snapshots,
resource separation and invalid-target diagnostics. Source labels resolve from Registry values; generated token names and identities
do not change during migration.

List-item already has a Structure Registry term distinct from its current `list`
generation term. Text's name belongs to Element today, and Registry rules prohibit
registering the same word in Structure. Migration preserves Text's Element
reference without changing that Registry rule. New top-level names register or
reuse Structure terms. Owned Layout labels remain local.

Saved and working sources migrate independently in one authoring transaction;
Cancel retains its saved baseline. Glyph choices move to `examples`, while every
stored output identity moves to `publications`. Invalid data and failed writes
leave the existing record intact. Read/preview/export paths do not allocate UUIDs.
The [upstream proposal](rfcs/portable-structures.md) is separate from this local
implementation; LTAX-013 remains not assessed for upstream alignment.
Leaf overrides still represent complete snapshots. Partial leaf imports report
an error instead of acquiring unintended inherited fields.

### Existing behavior

The focused native checks cover ordered editing, reference compatibility,
source protection, lifecycle upgrades, exact deletion/Undo and unchanged token
output. They compare the complete canonical inventory, including evaluation
samples, rather than treating equal counts as evidence of unchanged output.
Fresh defaults now include one Text reference in Base. Leaf previews and
reference occurrences do not count as new tokens or saved mode values.

## Accessory defaults

Fresh designs and confirmed Reset all include Accessory with editable,
associated Accessory item and Accessory workflow item layouts. The two item
layouts appear under Accessory in its composition, not as peer Structures in
the catalog. Existing saved designs keep their authored collection.
Accessory has three mutually exclusive options: Default UI icon, Workflow icon
and Affixed. The Second item boolean starts off; Affixed always shows one icon.
Design and Permutations use the same selected option and boolean values.
These preview choices do not change saved data or add tokens.

The Accessory family generates 35 layout records, five UI-icon records and
15 workflow-icon records across the three text-scaling modes.
Text retains its existing five layout records. Affixed names include the
Registry property suffix, for example
`accessory-gap-affixed-medium-accessory-presentation`.
Scoped, unpublished Spacing sources provide the documented layout values.
Icons reference the shared UI-icon Size and Workflow icon Typography foundations,
not structure-specific copies. Radius remains unassigned.

XS through XL use UI icons of 8/10/10/12/14px and workflow icons of
14/14/14/16/20px in the default text-scaling mode. The shared sources replace
the former scoped icon scales, so the two item types no longer have equal
heights at every size: UI items are 14/16/20/26/32px; workflow items are
18/18/20/26/34px. The additional 2x-small item-padding and 2x-large gap
records extend token coverage, not the documented visual pairing.
Unsupported referenced sizes retain the existing nearest-size warning.

## Base defaults

Fresh designs and confirmed Reset all enhance the existing Base definition,
retaining its identity and reusable Text instance. Existing saved designs are
not merged with the new seed.

Icon position has Start, End and Both options for two workflow-icon layers.
One UI icon stays trailing. The horizontal-padding options are Default,
Uniform and None; vertical padding has Default and None. The two padding
properties are independent. None removes the corresponding bindings for that
preview; it does not create zero-valued token families. Text still owns the
label, description and Text gap.

The initial visual and output scope is desktop, XS through XL. No mobile mode
or additional Base sizes are introduced. Canonical mobile values and the
unequal XXS/XXL/XXXL/XXXXL family ranges remain outside this seed's coverage.

| Value in pixels            | XS  | S   | M   | L   | XL  |
| -------------------------- | --- | --- | --- | --- | --- |
| Horizontal padding         | 8   | 10  | 12  | 16  | 18  |
| Vertical padding           | 3   | 4   | 7   | 10  | 13  |
| Gap                        | 4   | 4   | 6   | 6   | 6   |
| Uniform horizontal padding | 3   | 4   | 7   | 10  | 13  |
| Workflow icon              | 14  | 14  | 16  | 20  | 22  |
| UI icon                    | 8   | 10  | 10  | 12  | 14  |

Scoped Spacing formulas and Generator mappings provide the documented values
without changing global sources. Both workflow-icon layers reference
`workflow-icon-size-100` from Typography; their size rule also applies to the
Workflow icon size metric. Accessory workflow icons use `workflow-icon-size-75`,
retaining their 14px Medium anchor. The published UI icon Size scale has values
8/10/12/14px; its Generator deliberately maps S and M to the same 10px token.

Base generates 45 semantic records: five each for horizontal padding,
vertical padding, gap, Uniform horizontal padding and the retained corner
radius, plus 15 workflow-icon records and five UI-icon records. Workflow-icon
outputs inherit the existing Default, Larger and Largest text-scaling modes.
The two equivalent workflow-icon assignments share those 15 records. The
radius is existing app data, not a canonical Base token family.
Uniform reuses the vertical-padding source. Its records use the existing
local variant naming and literal publishing contract, for example
`base-padding-horizontal-medium-horizontal-padding-horizontal-uniform`.
They match the canonical alias's resolved value but are not semantic aliases
to the vertical-padding records.

The complete default bundle now contains 117 semantic records. All 40 Text and
Accessory layout records retain their pre-Base identities, values and provenance.
Contextual icon records are additional generated outputs; their primitive
references remain the editable inputs.
Temporary option selections do not change authored inventories.
Custom Generator targets are filtered against the option's resolved bindings
and visible leaves for previews only; authored targets remain unchanged.
An already-invalid target is still reported rather than silently removed.
This seed uses the existing LTAX-017 variant and LTAX-019 Generator capabilities;
it does not establish upstream adoption or complete canonical context parity.

## List-item defaults

Fresh designs and confirmed Reset all include List-item with four owned,
editable layouts: Vertical padding, Content layout, Content start and Content
end. The layouts appear beneath List-item in its composition, not as peer
Structures in the catalog.

Content start contains a blank Selection indicator Slot, the visual-only
Spectrum DragHandle icon and the reusable Base Structure. Base uses its own
defaults and is edited only at its source, not inside List-item. Content end contains
optional Buttons, Secondary content and Switch Slots, followed by the
visual-only ChevronRight drill-in icon. Slots reserve space; they do not
implement checkbox, switch, button, drag or navigation behavior.

List-item indentation previews at levels 0, 1 and 2, multiplying the selected
indentation spacing by that level. The preview choice does not create token
variants. The generated tokens remain Medium/Large indentation at 16/24 px,
Small/Medium gaps at 2/8 px, Small/Medium horizontal padding at 6/6 px, and
Regular/Spacious vertical padding at 4/8 px. The current T-shirt generator
adds size terms to the horizontal and vertical padding names; canonical
design-data omits those size fields for these families.

List-item owns Density (Regular/Spacious), horizontal and vertical padding
(Default/None), indentation distance (Medium/Large), and switches for Drag
handle, Selection indicator, Buttons, Secondary content, Switch and Drill-in.
Initial defaults are Regular density, padding enabled, Medium indentation
distance and all optional parts visible. None vertical padding suppresses
padding at either density. Indentation distance selects the existing generated
indent meaning independently of the component-size preview.

Structure schema **7** adds optional owned-layout configuration and per-binding
generated-size selections. An unavailable selected size reports a preview error
instead of falling back to the original binding. Earlier designs upgrade without
reseeding their properties or contents. The defaults above apply to new designs and confirmed
reset flows, not automatically to saved designs.

The List-item seed generates ten semantic records across List-item and its
Vertical padding and Content layout layers. Its icon samples use the existing
Base UI-icon size reference. The Anatomy Registry category and `item` term
support the canonical `structure=list, anatomy=item` naming; the Density
variant distinguishes regular and spacious vertical padding.

## Reusable Structures and generated naming

Each reference has only its own UUID, `kind: "structureReference"` and the
source's `structureId`. Ordered leaves and references share `elements`.
References are not copied definitions or new Registry Element terms.
The picker separates Elements and Structures into native menu groups.
Self-reference, indirect cycles and missing targets are rejected. A source
cannot be deleted or individually reverted while another Structure uses it.
Removal and Undo affect just the selected occurrence.

An independent Structure occurrence is a single selectable module. Its interior
is inert; inspection offers source navigation and instance removal, not local settings or rules.
The source owns its bindings, padding, constraints, direction and T-shirt rules.
Nested Hug and Fill constraints use the parent content box, including fractional
CSS dimensions. Direction and changed child order invalidate an open insertion
location rather than inserting at a stale boundary.

Permutations request the parent's displayed size from each source. A source
uses its own rules, not the parent's rule a second time. Unsupported sizes use
the source's attached Generator option order to find the nearest supported size,
preferring Medium on a tie, with a visible warning. Unrelated Generators in the
library do not determine the fallback order.
An intermediate source passes its effective size to its descendants.

The metadata Name controls generated token names. When a rule first generates
tokens, the app registers that name as a Structure term. Renaming a Structure
registers the new value in the existing name category and updates its
reference, while preserving additional classifications. Registry conflicts are
reported before the edit is applied; existing terms remain available to their
other owners.

Fresh startup and confirmed Reset all ship Text with a column layout, two
Text leaves bound to `text-size-100` and `text-size-75`, a Medium gap bound to
the existing 1 px `spacing-20`, and all five T-shirt sizes. Text owns five
`text-gap-*` concepts. Base's expanded contract is described above;
repeating or nesting references adds zero tokens.
Older saved designs gain compatibility fields but are not merged with Text
or the new Base occurrence.

LTAX-013 tracks this separate capability. Element-named semantic output declares
the local `leonardo-structure-naming-v2` extension and compatibility envelope
version 2. Structure-only output retains the legacy profile and envelope
version 1. Neither is upstream adoption or an anatomy-tree export.
Implementation evidence, upstream alignment and manual/RFC acceptance remain
separate.

The reusable slice is locally verified under LTAX-013. Six integrated reference
workflows pass in Chromium, Firefox and WebKit, including explicit term creation,
confirmed Reset all, live source/fallback changes, nested constraints and
version-two compatibility downloads. Eight retained generation and ten retained
leaf workflows also pass in each browser across the integrated runs. The eight
new story paths pass in all three browsers, with light/dark desktop/narrow
module states inspected. Every path checks an empty unfiltered `pageerror` list;
the new stories also check console errors. Native checks cover distinct parent
rules without rescaling descendants, graph/override rejection, protected
individual revert, atomic topic revert, migration, aliases and saved accounting.

The historic Radius materialization fingerprint and color-source inventory
fixture remain failing alongside the retired `typographyMetric` assertion.
Their historical pins and foundation data were not rewritten to make this slice
pass. These unrelated baseline limitations are not upstream alignment evidence.

Focused element browser workflows pass in Chromium, Firefox and WebKit, including
Typography range shrink and line-height deletion/replacement rejection while a
Text element references those sources. Retained Structure and T-shirt browser
workflows and 41 static Storybook checks also pass. Every browser path asserts
an empty `pageerror` list; story paths additionally check console errors.
Existing Typography glyph-picker workflows
retain native ComboBox filtering through S2 `defaultItems`.

Local implementation is verified under LTAX-012; upstream alignment remains
not assessed and architecture/RFC acceptance is still required. Control,
the full UI-icon collection and upstream anatomy export remain deferred.
The existing `test:defaults` fixture still expects the retired
`typographyMetric` taxonomy key; no retired taxonomy data was restored to make
that unrelated assertion pass.
