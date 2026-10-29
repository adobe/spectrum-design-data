# Structure element templates

Structures can contain ordered Workflow-icon, UI-icon, Text, Visual and Bar
instances. These are template content, **not token producers**. They reference
existing foundations directly. Control, drag-and-drop,
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
panel. Clicking the Structure background, pressing Escape in the canvas, or
choosing Structure settings returns to the layout panel. Readonly mode permits
child inspection.

## Bindings and preview samples

Each instance references its immutable Registry Element term and has a separate
instance UUID. Logical binding IDs derive from the instance and slot, so
insertion order, glyph changes and Bar orientation do not remint them.

| Type | Bindings | Preview metadata |
| --- | --- | --- |
| Text | Nominal Typography font size; pixel or unitless line height | Fixed `Text` sample |
| Workflow-icon | Size or Typography icon size, applied to both dimensions | Public S2 glyph, initially Home |
| UI-icon | Size or Typography icon size, applied to both dimensions | Small public S2 glyph subset, initially ChevronDown |
| Visual | Independent Size width and height | Bundled local placeholder |
| Bar | Size length and thickness | Registry horizontal/vertical orientation |

Unassigned fields show explicit preview samples, not numeric authoring overrides.
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

Both paths use the existing T-shirt traversal, including available-token and
numeric-index movement and visible nearest-source warnings. Preview-only
applications need no generated rows or emitted Structure name. Child references
never enter semantic grouping, token arrays, aliases or primitive lineage.
With layout inputs unchanged, Base retains its exact 15 semantic concepts and
15 actual unbound values, not just equivalent counts.

## Persistence, dependencies and review

Structure schema **3** originally added leaves and separate preview targets.
The current schema **4** and authoring envelope **11** add Direction and reusable
references, independently upgrading saved and working snapshots through the
existing Color/data-vis and earlier upgrade chain. Missing children become empty;
existing IDs, saved Cancel baselines, modes and authoring edits are preserved.
There is no separate element storage key.

Source/step/metric removal is blocked while referenced. Registry type and
orientation dependencies are listed separately from token occurrences. Changes
tracks template authoring fields and order; Save/Cancel/reload, Structure/topic
revert and Reset all include the complete collection. Child edits contribute
zero token-concept, alias or saved mode-value growth.

Deleting an element with Custom preview targets confirms their removal.
Deletion and target cleanup are atomic; Undo restores its position, bindings,
metadata and previous targets without deleting layout-token selections.

LTAX-012 scopes this local capability separately from LTAX-008, LTAX-009 and
LTAX-011. Upstream Structure/anatomy mapping and adoption remain undecided.
Native layout-token profiles and explicitly labeled compatibility downloads
are unchanged; this feature adds no upstream anatomy export.

## Local verification and remaining limitations

The focused native checks cover ordered editing, reference compatibility,
source protection, lifecycle upgrades, exact deletion/Undo and unchanged token
output. They compare the complete canonical inventory, including evaluation
samples, rather than treating equal counts as evidence of unchanged output.
Fresh defaults now include one Text reference in Base. Leaf previews and
reference occurrences do not count as new tokens or saved mode values.

## Reusable Structures and explicit naming

Each reference has only its own UUID, `kind: "structureReference"` and the
source's `structureId`. Ordered leaves and references share `elements`.
References are not copied definitions or new Registry Element terms.
The picker separates Elements and Structures into native menu groups.
Self-reference, indirect cycles and missing targets are rejected. A source
cannot be deleted or individually reverted while another Structure uses it.
Removal and Undo affect just the selected occurrence.

An occurrence is a single selectable module. Its interior is inert; inspection
offers source navigation and instance removal, not local settings or rules.
The source owns its bindings, padding, constraints, direction and T-shirt rules.
Nested Hug and Fill constraints use the parent content box, including fractional
CSS dimensions. Direction and changed child order invalidate an open insertion
location rather than inserting at a stale boundary.

Permutations request the parent's displayed size from each source. A source
uses its own rules, not the parent's rule a second time. Unsupported sizes use
the nearest supported size, preferring Medium on a tie, with a visible warning.
An intermediate source passes its effective size to its descendants.

The card's Name is a local label. Token naming separately chooses an existing
Element or Structure term, or explicitly creates a new Structure term.
Changing a label does not rename Registry terms, token prefixes or token IDs.
Token-producing rules require this naming choice; previews and Apply do not
silently create terms. Registry edits intentionally affect every owner of a
shared term, including existing Typography uses of the Text term.

Fresh startup and confirmed Reset all ship Text with a column layout, two
Text leaves bound to `text-size-100` and `text-size-75`, a Medium gap bound to
the existing 1 px `spacing-20`, and all five T-shirt sizes. Text owns five
`text-gap-*` concepts. Base retains its exact original 15 concepts and values.
The system total is 20; repeating or nesting references adds zero tokens.
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
