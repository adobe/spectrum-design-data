# Foundation authoring and generated-token storage contract

## Changes comparison baseline

Changes compares working design data, including unsaved edits, with shipped
defaults. Temporary adaptive previews, selected modes, appearance, and navigation
are excluded. Its authored registry also tracks foundation-mode attachments
stored beside the working/saved snapshots. System impact counts authored data;
generated primitive/semantic output is measured separately in Token impact.
Additions/removals use stable union identities and actual scoped value contexts.
Missing output remains unavailable without hiding known source differences.

Save, Cancel, reload, and saved/reference accounting retain their existing
meanings. Scoped reset plans are validated before applying through the existing
restore owner; generated reset choices do not add semantic override support or
change the storage envelope. See [Changes comparison contract](archive/changelog-plan.md).

## Opacity and shadow references

Authoring envelope version 15 stores the opacity foundation in both working and
saved snapshots. Each level has a persistent concept UUID and separate mode-row
UUIDs. New mode contexts allocate rows during an authoring change, not during
preview or export. Equal Light and Dark values remain two explicit mode values.
New/reset systems contain 17 levels, from 2% through 100%, producing 17 concepts
and 34 Color scheme values. Compensation starts at 0%.

Shadows reference an opacity concept or use an explicit manual alpha. New/reset
shadows reference the 20% level, initially opacity-800. Older records preserve
their shadow values in every existing mode. The upgrade reuses a level only
when its complete mode-value pattern matches, otherwise adding a level with
visible mode overrides. Working and saved sources share identity allocation
without losing their different values. Removed modes are not recreated.
The old shadow-opacity mode patches are removed after conversion.

Opacity participates in Changes, scoped resets, Impact, token browsing, native
JSON, CSS and local cascade output. CSS uses normalized unitless values such as
`--opacity-100: 0.02`. Complete-shadow artifacts remain literal shadow values;
they do not introduce a nested opacity-reference format.
The opacity artifact is explicitly local: the current modern reference has no
opacity value-type schema, and numeric scale indices retain LTAX-003's known
contract difference. Local output does not establish upstream conformance.

## Automatic persistence and validation

Automatic persistence observes a coherent set of raw working/saved source
references, editing state and foundation-mode attachments. After 200 ms without
a newer request, a browser worker prepares aliases, validates both snapshots
through the existing stored-snapshot validator and prunes attachments through
their existing owner. It returns the same authoring envelope to the existing
byte-comparing storage writer; preparation does not create separate storage keys.

A replaced request is cancelled, and its result cannot write after a newer edit,
Save, Cancel or reset. Explicit persistence flushing and page close still capture,
validate and write the latest state synchronously, including when an automatic
worker is already running. Disposal cancels pending work. Validation and storage
failures remain explicit persistence issues; invalid stored records retain the
existing protection against replacement without an authorized reset.

Foundation/Registry writes validate their exact combined proposal once within a
synchronous, store-scoped batch. Unexpected writes, different object references
and changes to registered guards invalidate that authorization. Public validation
outside the batch is unchanged. This does not bypass dependency checks or make
mutable documents permanently trusted.

Complete Registry draft validation reuses projections for the accepted and
proposed taxonomy only within that synchronous validation call. Registry evidence
lists and complete Typography CSS generation use the same scoped reuse. No
validation, emitted context or text-zoom block is omitted. Each subsequent call
revalidates mutable inputs, and failed calls discard their projection context.
Draft acceptance, dependency errors, complete CSS bytes and publishing remain
unchanged.

Registry term typing keeps required/finite-number and Registry-only integrity
checks local and runs the same
complete referenced-taxonomy validator in a replaceable, data-only worker after
100 ms without newer input. The field is never disabled while checks run. A quiet
progress indicator has no visible loading caption. Only results matching the
accepted source object, term, field and exact draft text can supply field errors;
source changes invalidate older results immediately. Replacement, cancellation,
Escape, leaving an editing popover and editor disposal cancel pending work.
Worker failures are explicit and retryable without discarding the draft.
Accepting a term still runs the complete synchronous validator and the existing
write/dependency guards against the current source, even if its background check
is pending or has already passed. Draft checks do not write authored data, count
as saved edits, or change token-concept/mode-value denominators.
The accepted write runs before S2 closes an editing cell. Rejected proposals
preserve the open editor, draft text and inline error; Cancel and Escape cancel
checks without applying that draft.

Successful term acceptance schedules its React updates as a transition. The
authoritative validation and write still execute synchronously, in order; new-row
insertion and local draft removal share that transition to avoid duplicate row
identities. The existing terms region reports pending work and uses its quiet,
delayed progress indicator until rendering settles. Native cell focus restoration
is preserved. A proposal from an editor whose Registry document has since changed
is explicitly rejected rather than overwriting a newer accepted edit.
The classification review may finish in the same transition, so it need not emit
a separate pending state when the whole coherent view is already ready. This is
render scheduling under LTAX-011/014/016, not worker-authorized acceptance, a
queued authoring write, or a new saved-data domain or impact denominator.

Registry's complete classification review also reuses taxonomy projections only
within one synchronous assessment. Definitions, usage occurrences, profile
metadata, issue ordering and review counts are unchanged, including LTAX-011's
provisional status. Mutable inputs and failed assessments are rechecked on the
next call; no review or alignment acceptance is cached across calls.

The Registry review's rendered tables can follow accepted authoring fields in a
deferred render. Category/term controls and their current validation stay outside
that boundary; the assessment itself is still computed canonically. Existing
Disclosure contents stay mounted, including their native find-in-page behavior.
The old review is busy and inert until its complete successor is ready, because
its source-registration buttons must not apply a proposal from an older document.
It uses the existing quiet delayed S2 progress treatment without a visible
loading caption. Table content, ordering, counts and the 32 px section spacing
are unchanged. This does not defer or weaken authoritative acceptance.

Tokens uses the same synchronous projection scope around its complete
classification assessment, avoiding repeated vocabulary validation for each
usage when adaptive previews update. The full assessment, review messages,
classification badges, aliases and provisional LTAX-011 disposition remain
canonical. The scope ends after that assessment, including failure; it does not
persist preview values, change acceptance guards or reuse an earlier review.
Native checks compare complete token assessments at multiple text sizes.
Browser coverage preserves exact values and warnings in list and grid views,
reset-to-mode behavior and unchanged authoring data through reload.

The Tokens collection defers one coherent presentation snapshot before filtering,
preview preparation, taxonomy-tree construction and S2 collection rendering.
Values, classifications, review messages, query, type, presentation and editing
policy advance together. Search, type/view choices, adaptive header controls and
ordered selected IDs remain immediate. The existing quiet S2 boundary marks old
rows busy and inert until the matching presentation is ready; there is no new
visible loading caption or persisted preview. Values can advance during continued
input even while the whole-current snapshot remains pending.

Bulk actions read current tokens, selection and callbacks, not the deferred
presentation. A display refresh alone does not disable the originating bulk
button or delay the canonical dialog. Captured mode/IDs and the authoritative
writer still determine whether a change is valid. If inert rows prevent native
dialog focus restoration, collection readiness recovers only a still-connected
collection target with matching token identity, and only when focus has fallen
to the document body. A newer header/search/dialog focus choice is not replaced.
This uses the owned DOM lifecycle, not a timer, focus polling, forced remount or
private Spectrum mutation. Browser checks cover keyboard and pointer bulk
origins, row-dialog Save/Cancel, an explicit newer search focus choice, exact
native-writer working snapshots, unchanged saved baselines and rejected-input
storage conservation.

Local category-dialog drafts retain unchanged editor and review elements by their
actual source dependencies. Reference lists, review lookup maps and proposals
refresh when those inputs change, rather than rebuilding unrelated collections
for each dialog keystroke. Editors retain their local term state; review panels
remain mounted with their existing `hidden="until-found"` behavior. This does not
defer validation, cache an accepted write, hide review details or change counts.
The prioritized dialog regression covers draft isolation, cancellation, focus
restoration and retained hidden review content.

A transient, store-scoped dependency proof can avoid rebuilding the complete
Component token catalog for shared contrast-number edits. A worker establishes
it only after full canonical reference and collision validation. It is eligible
only for references whose values do not depend on those numbers. Complete source
identity, ordering, non-contrast values and component definitions remain covered;
changed or ineligible inputs use full validation. The proof is not persisted and
does not authorize other guards to skip their checks.

Initial proof preparation does not save untouched defaults. Numeric contrast
changes and editing-state changes may let that preparation finish, but only its
matching proof can be reused: its obsolete authoring record is never written.
The latest record is prepared separately. Other source, attachment or saved
baseline changes cancel it. Save, Cancel, reset, explicit flush, page close and
disposal retain their existing durable-state and cancellation guarantees.

The same worker can publish one transient color partition for subsequent complete
Component reference checks. Its signature covers the entire input supplied to
the canonical color inventory: the Color document, ordered mode sets and default
modes, token overrides, browser edits, taxonomy and rules. It is reused only when
those finite JSON inputs still match exactly. Formula, Typography and other
foundation edits still rebuild their own output. The complete catalog merge,
UUID/value/output-availability collision checks, Component document validation,
reference existence, property/value types and required mode contexts still run
synchronously for each accepted edit. No reference-only shortcut is used.

The worker constructs both dependency proofs from one complete catalog pass.
Color reuse does not require eligibility for the separate contrast-number proof.
Returned color values and contexts are detached copies. Blocked color output
retains its typed failure and cannot enter this partition; non-JSON inputs,
changed inputs and combined signatures/results above 5 MB use canonical
generation instead. Each store retains at most one partition, cleared on
disposal. Neither proof is persisted, included in Changes or counted as a token
concept, mode value, manual override or saved edit. Matching evidence from an
older request never authorizes writing its obsolete authoring record.

The complete live reference catalog on the Components page also reads this same
store-owned partition. It does not introduce a second cache or reduce candidate
choices. Other foundation rows, required contexts and collision checks still
come from the current canonical catalog. Late publication and disposal of the
partition are live dependencies; they must not change an open field's text,
caret, focus or unapplied assignment. Missing or mismatching evidence retains
normal generation. Native parity and real-browser delayed-worker checks cover
both ready and fallback paths.

The same preparation can retain ready primitive-scale outputs inside this one
store-owned proof. A changed Color input still invalidates the complete color
partition and rebuilds the full inventory. Only an exact match of all resolved
scale-generation arguments can reuse an individual output: the complete scale,
ordered contrasts, background coordinates, generation settings, output policy
and ordered rules. Palette-linked stops are resolved before this comparison.
Palette values, Data vis dependencies, mode contexts, browser edits, overrides,
classification and complete-catalog collision/reference checks still use their
canonical owners; there is no unused-palette or reference-only shortcut.

Per-object input signatures are shared only within one synchronous read-only
inventory and discarded on return or failure. Mutable inputs are inspected again
on the next invocation; escaped callbacks cannot retain that scope. Prepared
outputs are detached, contain no typed failures, and are capped at 128 entries
and 1 MB including UTF-8 array framing, within the existing 5 MB proof bound.
Non-JSON, signed-zero, sparse, accessor/custom-prototype or oversized inputs use
normal generation instead. This changes neither field commit timing nor
Save/Cancel, reload, persistence, baseline or token-count semantics.

`tests/component-color-witness.ts` covers complete catalog parity, dependent
foundation rebuilding, in-place mutation, detached results, worker transport,
bounded payloads, typed failures, collision/reference protection and isolated
accepted writes. The existing persistence proof lifecycle covers publication,
cancellation, durability and disposal. This is execution reuse within
**LTAX-014**, not a profile, schema, denominator, alignment or RFC-state change.
`tests/component-scale-color-witness.ts` additionally covers every generation
argument, exact transported outputs, mutation and scope cleanup, caller-owned
results, typed failures, unsupported-input fallback and both payload bounds.

Registry acceptance reads this existing transient proof only inside its write
transaction. Its complete synchronous validator still checks the proposed
Registry, all source classifications, naming collisions, foundation governance,
Structures and Component references. Changed taxonomy invalidates the whole
color partition; only exact scale-generation arguments may reuse prepared
results. Draft-source identity, validator identity and worker inputs do not
subscribe to proof publication. Missing evidence uses normal generation, and
worker validation never authorizes acceptance. The Registry validation-work
checks compare valid/invalid outcomes, rejected writes, missing references,
complete accepted snapshots and proof-ready versus proof-absent paths.
This is execution reuse under LTAX-011/LTAX-014, not changed Registry policy,
classification evidence, persisted data or denominator accounting.

Worker imports must remain data-only. Structure glyph and category-icon
validation use generated public icon names, not the UI's lazy icon loaders.
Bundling those loaders into a production worker includes DOM-dependent Spectrum
styles, which cannot execute there. The generator checks both catalogs against
the same installed public icons. Production browser coverage must assert
successful worker results and the absence of unexpected worker errors as well
as uncaught page errors; application error handling can otherwise hide a failed
background pipeline from the page-error list.

Working/shipped Changes, the saved cancellation baseline, generated/manual
classification and token-concept/mode-value accounting are unchanged. This is
execution scheduling within the existing LTAX-002, LTAX-005 and LTAX-014 ownership
boundaries, not schema or alignment acceptance.

## Active Typography previews

Typography keeps its sample text, display choices, icon selection and line-height
controls outside the derived-preview boundary. The preview defers a coherent
bundle of raw/resolved source, formulas, rules, Registry, local display choices,
icon and surface appearance before running the existing canonical generation and
complete CSS builder. Deferring an already evaluated generation selector would
not provide this separation.

The existing ramp retains its identity and layout. An unchanged preview can skip
an urgent header render; its values, units, line-height selection, text zoom and
icon settle together. Pending state is immediate, with the existing delayed S2
overlay and no additional visible loading caption. Existing icon loading and
failure recovery remain independent. This is React scheduling, not off-thread
generation or a new persisted preview.

All thirteen text-zoom CSS blocks, complete exports, publishing rules, saved
baselines and Changes counts retain their existing owners. Component size remains
in Typography pending EPIC-2.5. The prioritized browser checks cover local-only
sample edits, pending/ready transitions, latest accepted values, units, selected
line height and byte-exact complete CSS.

## Registry collection layout

The version-pinned `react-stately@3.50.0` package patch publishes content size
after a lazy layout resolves its visible range. Previously, newly measured rows
could enlarge that range without updating the virtualizer's copied size. The
result was a stale scroll extent, empty visible areas and an unreachable logical
list end. All three distributed runtime formats receive the same correction.
Published sizes remain detached snapshots; unchanged dimensions retain identity,
and existing scroll anchoring remains responsible for position.

Registry draft reveal follows native row-group size changes only until S2 mounts
the new-term input. It then disconnects and reveals that input in its scroll
ancestors, leaving the input's existing autofocus in charge. Cancellation,
category changes and disposal disconnect observation
and cancel queued work. There is no polling, fixed waiting period, remount,
private runtime access, expanded render window or new loading presentation.
Term order, draft validation and authored data remain unchanged.

`pnpm test:virtualizer` covers lazy growth, shrinkage, width changes, stable
identity, snapshot isolation and edge anchoring in ESM and CommonJS. The
prioritized browser suite covers unfiltered numeric draft focus and trusted
forward/reverse scrolling to actual logical endpoints. Keep the manifest, lockfile
and patch together until an upstream version passes these cases without the
correction; remove the pin only after checking the other virtualized consumers.
This is UI dependency maintenance, not a schema, Changes baseline or gap-status
change.

Tokens endpoint checks derive the expanded presentation tree from the current
authoring snapshot using the same canonical browser-token and taxonomy helpers
as the UI. Native wheel scrolling must expose its actual first and last row IDs;
scrollbar position alone is not evidence of logical reachability. The checks
also require nonempty visible coverage, trusted input targeting the table,
unchanged authoring storage and worker disposal on desktop and narrow layouts.

## Canceled-transition lifecycle

The version-pinned `react-aria@3.52.1` package patch keeps an element's
`transitioncancel` listener until all its tracked properties finish. A one-shot
listener could be consumed by the first canceled property or a bubbling child
cancellation, leaving the remaining properties and a discarded screen in the
library's global transition map. The existing final-property handler already
removes the listener and map entry; the patch preserves that cleanup in all
three distributed runtime formats.

This correction does not disable animations, add lifecycle polling, or import
private library APIs into application code. `pnpm test:transition-lifecycle`
tests the installed formats, multiple canceled properties, child cancellation,
mixed completion events, callbacks and listener cleanup. The prioritized browser
suite covers native focus/menu workflows, actual worker disposal, unchanged
authoring storage and bounded post-GC DOM growth across repeated navigation.
These local checks do not establish zero heap growth or long-session acceptance.

Keep the manifest, lockfile and patch together. Remove the pin only after an
upstream release passes the native regression without the patch and the affected
browser focus, menu, navigation and resource checks still pass. This is UI
dependency maintenance, not an authoring, schema, baseline or gap-status change.

## Shared color authoring and output

Authoring envelope **13** introduces Color schema **5**. Platforms and Color's
System settings edit the same `settings.colorOutput` object:
`authoringGamut`, `outputFormat`, and `mapOutputsToSrgb`. This is one system-wide
setting, not a platform record, mode, token concept, or second preferences store.
Edit, Save, Cancel, source reverts, reload, and confirmed Reset all use the existing
authoring lifecycle. This introduction leaves Components at schema 1 and
Structures at schema 4; the subsequent Components ordering upgrade is below.

Historical working and saved snapshots upgrade independently. Legacy sRGB becomes
sRGB/Hex; Display P3 becomes Display P3/RGB; legacy OKLCh becomes sRGB/OKLCh.
All three disable output mapping. Existing UUIDs, source geometry, authored
deletions, references, Registry data, and independent saved edits are retained.
Current malformed tuples are rejected, not replaced with defaults.

Newly opened color pickers follow the saved authoring gamut; wide-gamut defaults
start in OKLCh polar editing. Local picker choices are temporary. A changed shared
default applies on reopening, not halfway through an active edit. Mapping outputs
to sRGB does not rewrite authored colors or frozen/manual source strings.
Changing notation alone retains the native-gamut ramp and palette algorithms.
Appearance-preserving ramp/palette mapping is used when wide-gamut authoring is
explicitly mapped to sRGB, not merely because the saved configuration has upgraded.
Final precision corrections remain subject to the serialized contrast requirement.

Generated values use one gamut/format policy, including alpha. Final serialized
contrast is checked against the formatted background. Impossible generated
relationships and under-target manual UI colors produce explicit unavailable
output, not a recolored manual source or a successful lower-contrast export.
Source identity, saved recipes, existing aliases, and existing Component bindings
remain recoverable. New Component assignments and exports still require ready,
type-compatible output. Changes reports unavailable counts/impact rather than
zero; its recovery action removes only the affected token's manual color values,
preserving other token metadata. Unavailable output does not create or remove
token concepts or required mode-value contexts.

See **LTAX-015** for local implementation evidence and the separate, unaccepted
upstream representation boundary.

## Component data

Authoring envelope **12** adds `components`, with native document schema **1**.
Versions one through eleven upgrade working and saved snapshots independently.
Earlier designs receive an empty component collection, never the new demonstration
components. Fresh startup and confirmed Reset all install the checked-in Action
Button and Menu examples. Structure schema **4**, existing migrations, token
identities, generated values, caches and alias policies remain unchanged.

Component definitions, ordered parts/options/states and property assignments have
stable native UUIDs. Canonical declarations remain closed objects under the pinned
Spectrum schema; application identities live alongside them. Assignments reference
Registry Property UUIDs and own either a typed literal or one actual emitted token
UUID. Selecting a contextual target includes its required context conditions.
Unavailable targets, conflicting contexts and incompatible typed values fail
explicitly. Remap component dependencies before removing their tokens or Property
terms. Typing and blur do not accept literals; use the explicit value action,
Apply changes, and then global Save. Local cancellation discards the form; global
Cancel restores the saved document. Changes supports component and topic reverts.

Authoring envelope **14** advances the native Components document to schema **2**.
Each record adds `optionOrder`, an exact, unique list of its existing option UUIDs.
The editor uses this list for display order without changing canonical option
descriptors. Historical working and saved snapshots derive their ordering
independently from their own declaration objects. Earlier empty systems stay
empty. UUIDs, stored machine names, document URIs, token references and caches are
not regenerated. Canonical declaration and CTR projections omit this native
ordering metadata.

Definitions are immediately editable in global Edit mode. Their machine name is
a read-only preview derived from Display name using the shared lower-kebab-case
formatter. Explicit Apply changes updates both names atomically and rejects
collisions; opening a legacy record does not rewrite its independently stored
machine name. Local Cancel restores the applied fields. Unapplied definition
changes survive tab switches, require confirmation before changing components,
and are invalidated when the affected canonical component is restored.

Parts, Options, States and property assignments use native S2 tables, with Add
and Edit dialogs. Public S2 drag and drop reorders these collections and the
selected state conditions inside a property dialog. Cancel and Escape discard
dialog drafts. Read-only mode has no authoring or reorder controls.

The shared Changes registry counts `optionOrder` as one authored array field,
with a validated field-level reset that preserves unrelated edits. This adds no
component or relationship records, token concepts, required mode values or manual
token overrides. Temporary forms remain outside both working and saved
accounting. Confirmed Reset all also invalidates local component drafts when the
canonical document already equals shipped defaults.

Component records and relationships have separate Analysis/Impact accounting.
Their literals are not manual token overrides; references do not create additional
token concepts or mode values. Unaccepted forms do not enter authoring snapshots.
The exact-emitted-target picker covers dimensions, colors, shadows and Structure
semantics. Typography and compatibility-alias targets are not offered in this
MVP. No live renderer, boolean option-to-state engine, import/export UI or generic
cascade is introduced. See **LTAX-014** and the component/CTR profile boundary in
the target contract.

Component references are checked before source edits are applied. A combined
source/Registry change is checked as one candidate, so rejected publishing or
range changes cannot leave a rename behind. Protected color removal also keeps
authored token metadata intact. Formula fallback updates consumers before
removing the old formula. Registry usage includes component Property references
as authoring dependencies, without adding generated token occurrences.

Accepting a literal keeps it distinct from matching token values, including
after keyboard focus moves away. Typing and unaccepted forms do not write
canonical data; applying the form writes the working snapshot, and application
Save updates the saved snapshot.

## Foundation list order and creation focus

New UI Color, Data vis, Spacing, Size, Radius, and typography line-height items
are inserted first in their existing authoring collections. Existing items keep
their relative order and stable identities. Save/reload retains that order;
Cancel restores the saved order, and delete/Undo restores the recorded index.
Editing an existing categorical recipe replaces it without moving it.
The Data vis panel retains its type groups, displaying new scales first within
their respective group.

Creation selects the new Color/Data vis scale and opens its editor; other new
cards focus their name field, expanding their section when necessary. The focus
request and open popover are temporary UI state, not authoring fields or schema
changes, and do not replay on reload or Undo. Shadow additions receive the same
name focus but remain appended, preserving elevation's existing stacking order.
This preserves the existing identity and lifecycle boundaries tracked by
LTAX-002 and LTAX-005; list placement and temporary focus do not change token
counts, mode-value ownership, or alignment status.

## Custom color contrast steps and naming

Authoring envelope version 7 adds the standard Scale naming rule to historical
working and saved snapshots independently. Version-6 data is preserved rather
than rerun through the taxonomy upgrade. The migration does not install custom
lists, recreate removed mode sets or replace existing rules, aliases or edits.
At that release, these optional additions retained Color schema version 2 and
Modes version 7. The data vis extension below explicitly advances both.

`ColorScale.customContrasts` owns an ordered, nonempty `steps` list, a
`baseContrastId` and a `namingRuleId`. Absence means the shared contrast list.
Labels are derived, not stored. Step identities are scoped by scale; copied
shared IDs preserve existing token identities, and added steps receive new IDs.
Sparse `color.scaleContrasts[scaleId][stepId]` mode patches contain main ratios
only and belong to the Overall contrast owner. Stored missing rule/base/step
references fail explicitly. A confirmed disable discards this configuration;
scoped deletion/Undo and ordinary Save/Cancel/reload retain lifecycle semantics.

Only changed custom-scale step inventories affect color concept counts.
Base/rule changes rename existing concepts; mode patches change scoped generated
values, not concept counts or manual-token classification. Hidden scales omit
published color and custom ratio rows. Unused modes, working previews,
compatibility aliases and Cartesian evaluation samples do not become canonical
saved concepts. The existing saved-output and coverage owners remain authoritative;
declared custom naming-rule references are included in color recipe metadata.

Save retains direct compatibility aliases only where old names remain
unambiguous. For custom-step renumbering, old names reused by another canonical
swatch are omitted with an explicit notice, including existing aliases that
would become ambiguous. Unrelated rename collisions still block Save.
See [authoring and adaptation](contrast-polarity-compensation.md#optional-custom-steps-per-scale).
LTAX-002 tracks naming/storage, LTAX-005 tracks mode ownership, and LTAX-003's
upstream numeric/string disagreement remains blocked. Local checks do not
establish upstream or manual architecture acceptance.

## Data vis color recipes

The data vis refinement introduced authoring envelope version **9**, with Color
**4** and Modes **9**, under the unchanged `leonardo:authoring:v1` key.
Version 8 introduced the empty
`dataVisScales` collection and sparse patches with Color 3/Modes 8. Version 9
adds native primitive references and reversible Static colors. Version-8
recipes remain Adaptive unless the user explicitly changes them. Older working
and saved snapshots upgrade independently. Existing scales, custom steps, Gray's
base/ratios, authored deletions, rules, overrides and aliases are preserved;
restored systems are not merged with new defaults or demonstration changes.
Malformed current data fails explicitly and remains available for recovery.
The later Structure element extension advances the complete envelope to version
**10**, and the reusable Structure extension advances it to **11**, composing
these upgrades without changing the Color/mode contracts.

Sequential/diverging definitions serialize stable control-point IDs, positions,
sources and optional owned main/opposite contrast recipes. They do not store
compiled functions or sample lists. Categorical definitions serialize stable
member IDs, ordered UI-swatch links and selection preferences. Candidate pools,
suggestions, workers, CVD views, examples and temporary adaptive choices remain
outside the authoring record.

Continuous `primitive-token` sources use stable published native color IDs.
The catalog resolves Palette, UI-scale and categorical outputs in dependency
order without importing the complete token-browser state. Historical
`ui-swatch` points remain valid; exact-token mode patches may use `tokenId`
without rewriting the shared source. Shared exact-source conversions preserve
effective old scale/contrast mode links as native references. Mixed exact
source fields are rejected.

Sequential functions use piecewise, shorter-hue OKLCh interpolation. Diverging
functions retain OKLab. This generation correction changes sequential interior
colors, not authored stops, native identities, mode patches or member counts;
app views and the standalone adapter use the same implementation.

Optional `staticColors` activates captured stop/member values. Its absence is
Adaptive. A captured entry owns `id`, concrete `value`, optional continuous
`position`, optional captured `tokenId` provenance and optional `overrideValue`.
Capture preserves alpha and authored gamut strings. Static continuous stop IDs
and positions are independent of retained Adaptive points; categorical IDs
match retained members. Capture and restoration commit atomically. Undo checks
scale-owned recipe, patch and value fingerprints rather than overwriting later
unrelated changes.

Adaptive points/members and mode patches remain in their existing owners.
Mode-specific member values remain in `browserTokenEdits` but are dormant while
Static. They are serialized for restoration, not active assignments or a second
published inventory. Static Tokens edits write `overrideValue` into the Color
foundation as one shared, visibly manual value with its captured baseline;
reset/revert preserves dormant mode edits.

`color.dataVisSources[scaleId][pointId]` belongs to the existing `color.scales`
owner; `color.dataVisContrasts[scaleId][pointId]` belongs to Overall contrast.
Default modes cannot carry these patches. Main ratios can vary; source family,
point structure/order and opposite targets remain shared. Native storage,
editing and source-closed export reject unavailable or improperly owned links.
Reference replacement is required before removing or unpublishing a source.

Categorical members use one stable tuple-derived native primitive each, with
Number ordinals and existing Registry, Browser, reference and alias owners.
Only saved finite members and their required scoped values affect canonical
counts. Continuous definitions and previews create zero concepts. Upstream
manual colors do not make their derived members directly manual.
Static members have one shared active mode-value row, without Adaptive
dependencies. Existing scoped aliases can resolve that shared row for valid
current modes, without duplicating canonical values or rewriting alias records.
Mode/member removal cleans scoped records; Undo refuses missing/conflicting
destinations rather than overwriting later edits. Save/Cancel/reset retain the
existing complete-graph semantics.

The exported version-two/Color-four source packet is not this complete
authoring envelope: it intentionally closes over the required color
geometry/modes/edits and omits
surfaces and unrelated foundations. Native links include required Palette,
UI-scale and categorical dependencies. Unmodified version-one/Color-three
packets migrate explicitly; new features masquerading as version one fail.
The separate JavaScript adapter does not change the existing UI CSS library.
See [Data vis color scales](color-system-data-vis.md) and the separately scoped
LTAX-010 record for behavior, checks, notices and remaining alignment limits.

## Structure element templates

Authoring envelope **10** and Structure schema **3** add an ordered collection
of preview-only child instances and separately owned rule preview targets.
Saved and working snapshots upgrade independently through the existing data vis
and historical upgrade owners. Missing children become empty; current saved
designs are not merged with new defaults.

Child bindings retain canonical foundation references and type/quantity
metadata, not resolved CSS, sample values or generated aliases. Their authoring
changes and dependency guards share the Structure lifecycle. Preview mappings
use the existing T-shirt traversal but create zero token concepts, aliases,
saved mode values or evaluation samples. The complete native layout bundle
remains unchanged when only template content changes.

See [Structure element templates](structure-element-templates.md) and LTAX-012
for editing, deletion/Undo, quantity compatibility and remaining alignment
limits. This extension does not change the data vis Color/mode contracts,
product preset defaults, upstream classification adoption or native publication
profiles.

## Reusable Structure composition

Authoring envelope **11** and Structure schema **4** introduce required Direction
and ordered reference occurrences alongside the existing leaves. Each reference
stores only `id`, `kind: "structureReference"` and `structureId`. Source bindings,
generation applications, supported sizes and token naming remain on the source
definition. Resolved trees and per-instance layout measurements are temporary
UI state, never additional persisted values.

Direction uses the existing Orientation terms, not Position terms. Older sources
receive Horizontal while retaining their existing IDs and bindings. Historical
Structure, T-shirt and leaf upgrade stages retain their own schema versions
1, 2 and 3; the final composition stage emits schema 4. Working and saved data
upgrade independently. Restoring authored data does not install the new shipped
Text definition or Base reference.

Local labels and Registry token-name references are independent. Source naming
may reference an existing Element or Structure term; choosing or creating a
term is explicit. Shared Registry renames propagate to all owners, while local
label changes and reference occurrences add no token concepts or saved mode
values. Graph validation protects source removal, cycles and missing references;
Save/Cancel, Undo, complete-topic revert and confirmed Reset retain the same
atomic authoring owner.

Element-named output uses an explicitly declared local generation extension and
version-two compatibility envelope. The native source catalog emits once per
definition, never once per occurrence. Legacy Structure-only output retains
version-one compatibility. LTAX-013 records the scope and unresolved upstream
Structure/anatomy mapping; this is not upstream schema or RFC acceptance.

## Layered Elevation

Elevation uses one scale containing zero to eight ordered shadow layers. Each
layer has an immutable UUID, editable label, fixed Power or Linear formula,
base blur, scale value and opacity. Power is geometric progression; Linear adds
an increment. Vertical offset is raw blur multiplied by shared Depth / 100.
Horizontal offset and spread are zero. No intermediate rounding is applied.
Color syntax uses Color.js formatting at up to twelve significant digits;
semantic opacity values remain numeric and lengths are not rounded for CSS.
Invalid or descending output is rejected as a whole, not clamped or partially
published. Constant layers are valid; identical complete levels are informative.

The shared color is opaque; each layer owns its alpha through opacity. Depth,
color and UUID-keyed opacity patches can have one mode owner each. Owned values
are edited only in mode popovers; counts, formula inputs and layer order remain
shared. New layers inherit their own 20% base opacity without inventing Dark
patches. Deletion removes that layer's patches; Undo restores its identity,
position, configuration and still-owned patches.

Shipped Elevation has one Power layer, base 4 px, ratio 2, Depth 100%, no smaller
values and two larger values. Its three complete shadows have blur/offset
4, 8 and 16 px, with black at 20% in Light and an explicit 50% Dark override.
The Color scheme set owns all three capabilities. Concept identities combine
the foundation UUID and mathematical index, never display step or layer count.
There are three concepts and six owner-scoped Light/Dark mode-values. Unrelated
axes, added layers and temporary chart/preview choices do not multiply them.

Elevation introduced authoring record version 3 under the existing storage key. Recognized version
1 records first receive Radius; version 1/2 records then receive Elevation,
Registry dependencies and fixed formulas. Working and saved snapshots upgrade
independently, without merging spacing examples or overwriting existing edits.
Absent Color scheme sets or shipped Dark modes are not recreated. Reads are
pure; both snapshots and attachments validate before writing. The
current coherent contract below also requires Structures and variant intent. Missing current data
fails explicitly and remains preserved.

Elements renders complete composed shadows on neutral sample surfaces using
`light-dark(#ffffff, #5b5b5b)`. The Elements surface sets its local color scheme
from the resolved preview background's light/dark classification, using the same
foreground selection as other foundations. Samples are white on light preview
backgrounds and dark gray on dark preview backgrounds, independently of app
appearance, including adaptive previews and the authored default without color
modes. The surrounding preview background remains data-driven. Show values hides
labels only. Analyze uses one metric-selectable comparison chart,
temporary UUID-keyed layer visibility and relevant named-mode comparisons,
holding other selections fixed. Code and Tokens publish complete shadow values,
not blur/offset fragments or per-layer tokens. Hiding from publishing leaves
editing and previews available. Empty layers produce no tokens. Complete-shadow
manual value editing is unsupported; token metadata remains editable.

Typed shadow lists are authoritative in native Analysis. CSS strings adapt
them for token display; saved impact compares complete outputs. Elevation is
not a dimension scope and does not use the dimension artifact profile.
LTAX-002 covers registered naming, LTAX-005 mode ownership, and LTAX-007 tracks
composite-shadow evidence separately from RFC, manual and upstream acceptance.

### Draft shadow-token adapter

`buildShadowArtifacts` in `src/features/design-data/shadowArtifacts.ts` is a
programmatic, app-owned adapter, not a new editor, storage format or publication
integration. The caller supplies an Elevation document, Registry, formula
library, mode sets and explicit `sourceKind` (`shipped`, `saved` or `working`).
The adapter reads no store, browser storage or temporary preview values.
Working output must not be represented as a saved baseline.

The adapter uses the existing generator and mode resolver. It emits one complete
literal token per mathematical elevation level and owning-mode combination,
including equal-valued modes, with a 256-combination limit. Names use property
`shadow`, the original display step as string `scaleIndex`, and only the relevant
declared mode qualifiers. Registered source names and steps are checked rather
than guessed. Invalid ownership, defaults, identities, references or name-field
collisions fail explicitly; no subset is returned as a successful result.

Each token's UUID comes from its native concept identity and scoped mode-set/mode
IDs, using the existing deterministic UUID helper. Labels, order, values,
display steps and the reference revision are not identity inputs. The returned
`lineage` retains concept/foundation/layer IDs, mathematical index, display step,
resolved source name, mode selection and numeric opacity separately from token
records. The wrapper includes target-profile metadata and relevant mode
declarations, but is not a native cascade file or a complete dataset.

Shadow values are ordered, nonempty arrays of five string fields: `x`, `y`,
`blur`, `spread`, `color`. Geometry becomes exact generated px literals, including
zero and fractional values. Generated color already contains alpha: copy its
literal unchanged, without applying opacity again, color-space conversion or
8-bit alpha quantization. Keep equal and transparent layers in their original
order. Layer IDs, duplicate opacity and `inset: false` are internal, not published
layer fields; the mapping is explicitly outset-only. True inset, layer/scalar
references and empty-valued shadow tokens are unsupported. Existing zero-layer
and hidden foundations still yield no token rows, not an invented transparent
shadow or an explicit no-shadow value.

The four unmodified schemas and Apache-2.0 license in
`src/data/design-data-shadow-profile/` are pinned to
`838a6835b746f9d77b2697374408901f334d854e`. `provenance.json` records source paths,
versions and byte hashes. Separate Draft 2020-12 validators check both the token
envelope and shadow value, plus focused literal length/color validity. The
generic envelope alone does not enforce the shadow value type. The narrower
standalone color schema is not used to reject valid modern shadow color strings.

This slice does not change primitive browser values, CSS, native Analysis,
saved/shipped baselines, change logs, revert behavior or publication accounting:
three shipped concepts and six Light/Dark values remain unchanged. It does not
expand the dimension-only artifact profile. LTAX-007 records local checks
separately from manual alignment and RFC acceptance; LTAX-003 retains the
numeric/string scale-index disagreement. See the
[target contract](design-data-target-contract.md#pinned-draft-shadow-profile)
for SDK and schema limitations.

## Purpose and approval boundary

### Design Structures

The approved EPIC-4.1/4.3 architecture slice introduced native `system.structures`
and snapshot `structures`, initially version-one documents with an empty
collection. Named structures have a version-four `conceptId` UUID and governed
property bindings. Each binding has a stable deterministic UUID, a Registry
category-ID to term-ID classification, and exactly one of `$ref` or typed
`value`. Literal values are only Hug/Fill sizing presets or Position-term
references; Values display does not introduce custom literal editing.

Property, Position, Constraint and Axis terms classify size, bounds, alignment,
gap, padding sides, corners and a complete elevation. Role lookup uses shipped
IDs, not mutable display labels. Optional unassigned properties are absent.
Names are nonblank; Registry references and foundation families validate as a
coherent graph. Registry renaming retains identity.
Registry Uses counts include each authored binding's classifications and its
alignment term reference. Those source references are not published token rows;
the same graph validates edits before accepting Registry changes.

Size, Spacing, Radius and Elevation references include unpublished output and
reuse the existing generators, mode resolution, Registry names and supported
token edits. Their app-owned UUID namespace is
`authoring-primitive:v1:<family>:<sourceId>:<mathematicalIndex>`, using `tokenUuid`.
Binding identity uses `structure-slot:v1`, the concept UUID and sorted immutable
classification pairs. Published/native output IDs remain unchanged; display
steps can relabel without changing an authored reference. These UUIDs do not
claim equality with upstream token identities.

The native Structure slice introduced authoring envelope version **4**, under the unchanged
`leonardo:authoring:v1` key. Known versions 1/2 receive existing Radius/Elevation
upgrades first; versions 1/2/3 then receive only Structures and its required
Registry vocabulary. Working and saved snapshots upgrade independently.
Conflicting identities or invalid current data are preserved with explicit
errors, not silently remapped or defaulted. Save advances the Cancel baseline
only after writing; Cancel/Reset restore the complete validated graph. The
version-five variant extension is described below.

Referenced source/step removal is rejected at shared foundation writes and
destructive reverts. Whole-graph restoration validates its target before
temporarily bypassing intermediate guards. Hidden publication is not deletion.
Undo restores concept, binding IDs and list position without stealing a later
selection.

Design has independent Concepts/Elements/Structures sections and
Design/Permutations/Preview views, starting on Structures and Design. Only
Structures is implemented; Preview retains the existing sample app. The
centered white/fuchsia sample resolves authored settings, including complete
shadows, while its non-modal settings Panel stays at the top-right. The
Tokens/Values view, searches, split expansion, selections, intrinsic/container
measurements and two sample children remain temporary.

Cross-Structure selection acknowledges the selected row before replacing the
main preview and settings. One deferred input snapshot keeps the selected
Structure, references, rules, taxonomy, generation context and element selection
together. The previous content is busy and inert through the existing quiet
loading boundary until the new snapshot is displayed. Same-Structure edits,
element selection and clearing the Structure selection remain immediate.
Authoring callbacks recheck the current Structure identity before writing;
deferred display data cannot authorize an edit to a previously selected Structure.
The existing composition and intrinsic/container measurement owners remain
unchanged. Browser checks cover ordered rapid keyboard selection, native focus,
popup dismissal, exact live bindings and applied styles, viewport resizing,
unchanged saved data and Cancel restoration. This is presentation scheduling
under LTAX-008/LTAX-013, not a new persisted field, generation path, schema,
baseline, token denominator or alignment acceptance.

Token ComboBoxes use native S2 menus and input behavior. Selected references
display as token tags at rest; search text is temporary and Hug/Fill remain plain
text. Focus preserves the displayed input rather than replacing it with the saved
token name. In Tokens display, search therefore starts empty, and newly expanded
individual fields show all eligible choices on first opening. Preset/value text
does not change merely on focus; focus and dismissal do not change the binding.
Tags truncate without losing their full accessible name. Fields keep room
for the native input while editing. When a selected token tag is displayed, the
empty input is visually collapsed but remains mounted, focusable and accessible;
focus immediately restores the native search input. The tag stays in S2's public
prefix slot, not inside the HTML input. Presets, Values display, Mixed and missing
references retain their normal text inputs.

Editor TokenComboBoxes measure the longest eligible name or description by
default, including unpublished/error descriptions and native row spacing. Menus
are at least as wide as the field, bounded to the viewport minus 24 px. Passing
`menuWidth={300}` overrides automatic content sizing with a pixel width, subject
to those same field/viewport bounds. DividableComboBox forwards this option to
its shared and individual fields. Both paths use the public S2 `menuWidth` prop.
The full automatic-sizing probe mounts only while its native menu is open.
Opening measures the current complete choices before paint; closing removes
the probe and its observer. Explicit-width menus do not mount that probe.
Closed fields therefore do not add hidden choice rows to unrelated preview
layout. This demand-driven DOM preparation does not cache or reduce choices,
change reference identities, authorize writes or alter persisted data.
Native placement, sections, filtering and
keyboard behavior remain in Spectrum. Optional Clear actions move below fields
at 160 px or narrower, while wider fields retain the adjacent action. This
responsive layout does not change the two-column property grids or saved bindings.

Minimum/maximum choices are filtered and rechecked against current preview
values and measured Hug/Fill sizes. Equality is allowed. Later source or
preview changes can create conflicts; those bindings remain intact with visible
diagnostics rather than substituted geometry. This is not a guarantee across
all future named modes or adaptive values.

Changes records structure/slot differences against shipped data, separately
from the last-saved Cancel baseline. A count-only Structure authoring overview
and `authoring/structures` Analysis records do not add published semantic tokens,
primitive overrides, foundation parameters or token-concept/mode-value
denominators. LTAX-008 tracks this local implementation; mapping to upstream
Structure/anatomy, reference policy and RFC acceptance remain open. These native
bindings do not themselves implement semantic publishing, rules, permutations
or composition. The separately approved variant extension below adds only its
bounded semantic-generation path.

### T-shirt generation and Structure variants

The approved EPIC-5.1/5.3 and EPIC-4.2/4.3/4.4 slice extends the native Rule
union to schema version two and Structures to schema version two. The slice introduced
authoring envelope version **5**, still under `leonardo:authoring:v1`.
Recognized versions one through four upgrade working and saved snapshots
independently, preserving edits and UUIDs. Existing Structures gain Medium as
their only enabled size and no applications; this creates no semantic output.
Missing or invalid current source is preserved for explicit repair. The separately
user-directed canonical-taxonomy extension layers envelope version six on this
migration, retaining Rule/Structures version two and the cache lifecycle.

A reusable `tshirt-sizing` rule stores an explicit available-token or numeric
scale-index movement method and all five stable size-term offsets. Medium is
fixed at zero. The Structure stores its governed name reference, shared enabled
size-term IDs and applications containing rule IDs plus All/custom binding
intent. No offsets or enabled-size selections are copied into applications.
Rounding consumers remain rounding-only, with their existing fallback.

Shipped defaults include **Base** and an editable **T-shirt sizing** rule using
available-token offsets `-2, -1, 0, +1, +2`. Base enables XS through XL, uses Hug
width/height without constraints, and aligns left/top. Its Gap references
`spacing-base-gap-100`, left/right padding references
`spacing-base-horizontal-100`, and all four corners reference `radius-100` by
their native UUIDs. Top/bottom padding and elevation remain unassigned.
An All application generates 15 semantic concepts and 15 actual unbound
context values: five Gap, five horizontal-padding and five uniform-radius
outputs. Hidden spacing sources remain live literals; published radius remains
emitted-row aliases.

Fresh state, shipped comparison baselines and Reset all read the same canonical
Structure defaults. Base is not counted as a user edit. Individual Structure
reverts restore its shipped definition, including after deletion; topic reverts
restore the shipped list. Its shipped generation rule does not block reverting
Logic, while applications referencing unshipped rules retain their dependency
guard. Existing saved authoring data is not merged with new defaults, and older
snapshots without Structures still upgrade to an empty list. Reset all adopts
the new defaults but replaces existing authoring edits.

All follows newly token-backed properties. Custom retains stable native binding
IDs, including visible repair intent after a field becomes unassigned. Overlaps,
invalid sources and emitted-name collisions block coherent generation. Apply
stages the name-term UUID and validates Registry, Structures and output before
committing together; Cancel does not register a term or change source. Remove/
Undo restores application and Structure identities. Referenced generation rules
and terms cannot be removed through destructive source/revert operations.

`buildTshirtArtifacts` in `features/design-data/tshirtArtifacts.ts` reads an
explicit source snapshot and reuses existing foundation generation and mode
owners. Published targets yield row-UUID aliases with required primitive rows
included. Hidden targets yield exact generated px or complete-shadow literals
without hidden primitive rows. Nearest valid targets retain configured offsets
and show requested/actual warnings; invalid anchors, values and mappings do not
produce partial successful output.

Grouping compares source reference, movement and all five mappings, including
disabled sizes. Padding supports four matching sides or complete opposite pairs;
corners group only when all four selected corners qualify. Native slot
classifications remain unchanged. Separate semantic classifications use governed
Structure, Property, Size and optional orientation/physical-position terms.
Renames, equivalent rule replacement and visibility changes preserve concept
identity while topology stays unchanged.

Design edits Medium anchors. Permutations, Tokens, details and bundle export
consume the same generated assignments. App semantic display follows the
Registry's canonical order/inclusion; the bundle and dialog's explicitly labeled
serialization preview retain the separate pinned formatter. Temporary adaptive values and preview
measurements never enter authoring or emitted contexts. Only required source
binding/explicit-assignment contexts emit; equal assignments remain distinct.
Generation errors stay visible instead of displaying an old bundle as current.
Direct semantic overrides are deferred; both Tokens UI and mutation APIs direct
edits to foundations, Structure settings/applications and reusable rules.

Save validates the entire generated output before writing or advancing its
baseline. Cancel regenerates from last Save; Reset all uses shipped defaults.
Generated Changes show additions/removals, retargets, names, values and alias/
literal transitions with source-directed reverts. Saved semantic impact counts
each concept once and only its required context rows. Working additions/removals
are separately disclosed. Generated hidden literals are not manual overrides.
Missing reference evidence and broad canonical materialization stay unassessable.

The rebuildable cache is a separate version-one record at
`leonardo:artifacts:tshirt:v1`, with source/result SHA-256 hashes and full output.
Source freshness includes the pinned profile, Registry, Structures, foundation
recipes, libraries, modes and browser edits. Reconstruction is authoritative;
malformed, unsupported or same-source mismatched cache data is diagnosed and
rebuilt. Sequence invalidation prevents older hashing from replacing newer work.
The result budget is 5 MB; quota/hash/read/write failures are visible artifact
errors, not successful authoring writes. Temporary previews are excluded.

The explicitly labeled generated bundle uses
`spectrum-design-data-tshirt-subset-v1` at
`eba428d462bfb5a3288835cb6cf0dcb1c4dc93af`, separately from native taxonomy,
proposed dimension artifacts and the older shadow profile. LTAX-009 owns this
scope, with upstream/manual/RFC limits in the
[target contract](design-data-target-contract.md#pinned-t-shirt-generation-subset)
and confirmed decisions/checks in the [feature plan](archive/tshirt-size-generation-plan.md).
No product-default field, general option-group engine, component anatomy mapping
or direct semantic override editor is introduced.

### Application navigation

The application sidebar uses React Spectrum S2 `SideNav`, `SideNavItem`,
`SideNavItemContent` and `SideNavItemLink`. Spectrum owns item appearance,
current-page indication, focus and keyboard behavior. Links use a local
`RouterProvider` to update the existing page state; navigation does not change
the browser URL or reload the document.

The application retains its collapse/expand toggle, 200 px expanded and 56 px
collapsed columns, layout transition and label-hiding animation. Collapsed links
retain their accessible names. Sidebar-only layout and label styles do not
replace Spectrum's item styling.

A sidebar-scoped CSS override removes unused `slot="chevron"` buttons from
layout on leaf rows (rows without `aria-expanded`). S2 normally leaves these
invisible buttons reserving width beside the content grid. Removing them releases
that space for labels and badges. Rows with children retain their disclosure
buttons, and other SideNav instances are unaffected.

Navigation items may include `status` (custom badge text) and `statusVariant`
(any variant from S2 `BadgeProps`). For example, add `status: "New"` and
`statusVariant: "informative"` to an item in `navItems`. A missing variant uses
Spectrum's neutral default; a missing or empty status renders no badge.
Badges use size S, appear after the label, and hide when the sidebar is collapsed.
Long statuses truncate within the item without changing the configured text.
These fields are application navigation metadata, not saved design-system data.

### Elements preview backgrounds

ViewSwitcher Elements previews share a rounded surface using the authored color
system's resolved background for the selected mode and any temporary adaptive
preview. Without a color-mode owner, the authored default background is used.
Preview controls stay outside this surface. Colors retains its Surface picker
and uses the same appearance for its selected surface. Labels and spacing bars
follow the actual preview background rather than the application's appearance.
These display choices do not alter generated values or saved authoring records.

### Current Registry identity and editing contract

Registry categories and terms use random version-four UUIDs. Shipped UUIDs and
their foundation name references are checked into `design-system.defaults.json`;
loading the application does not regenerate them. New entries receive a UUID
once, and changing a name, description, order or inclusion does not change it.
Term ownership and the category's internal field mapping are immutable.

The internal field mapping is not reference identity or an editable label.
Existing mappings such as `property`, `colorName` and `scaleIndex` retain their
serialization meaning. Custom categories use `taxonomy` followed by their UUID
without hyphens, providing a stable, distinct flat-output field independent of
the displayed category name.

Registry edits belong to the same central owner and change log as foundation
names. Accepted working changes and the last saved baseline persist together in
`leonardo:authoring:v1`. Refresh restores both and resumes an active edit session.
Save replaces the baseline; Cancel restores it and leaves Edit mode. Reset all
restores shipped defaults and makes them the new baseline. No ID migration or
restoration of pre-UUID prototype data is introduced.

Fresh startup uses shipped defaults with empty token-edit maps and an empty
change log; no demonstration edits are applied by the application. Test and
Storybook fixtures are isolated from application startup. An older system that
appears instead of new defaults comes from browser-saved authoring data, not a
hardcoded change list. Confirming **Reset all** replaces that entire working and
saved system with current defaults, including removal of any genuine UI edits.

Shipped color scales link Orange's lightest stop to Illustrator orange, Celery's
lightest to Dimension green, Cyan's middle to Photoshop blue, Indigo's lightest
to After effects indigo, Fuchsia's lightest to Xd fuchsia, and Magenta's lighter
of two stops to InDesign magenta. Existing `paletteColorId` references make these
stops follow palette edits; literal mode overrides keep their existing precedence.
Stored stop channels initially match their palette colors. Fresh systems and
confirmed Reset all receive these links without merging them into existing
working/saved designs. The links introduce no new stops, token identities, or
concept/mode-value denominators. Celery, Indigo, Fuchsia, and Magenta change
generated colors relative to the previous shipped baseline; Orange and Cyan
already matched their palette values. Lifecycle evidence belongs to LTAX-005
(`tests/color-scale-defaults.ts` and `tests/palette.ts`); its pinned reference, blockers,
manual criteria, alignment disposition, and RFC status are unchanged. This
defaults correction is not upstream acceptance or a reason to repin historical
output evidence.

This user-approved lifecycle supersedes the earlier memory-only decision. All
existing native authoring domains use the same coherent record. App appearance
and mode selections are separate preferences; adaptive previews and unaccepted
drafts remain transient. Storage failures are explicit, and invalid stored records
are preserved until a confirmed reset. Derived tokens and artifacts are rebuilt
from source, not restored as independently writable cached output.

### Ordered taxonomy and compatibility aliases

The approved INIT-3/EPIC-7.1 slice uses one author-editable category order and
one term per group. New groups are optional and broadly scoped. Property
participates in names and hierarchy, but only families such as Typography, Size
and Radius require it. Explicit source classifications select output segments;
source display labels are not parsed. The Global labels remain shared source
references but are omitted from default Spacing/Size/Radius output names.
See the [approved crosswalk and vocabulary](archive/token-taxonomy-order-plan.md).

Text ownership remains global, whole-value, trimmed and case-insensitive.
The only numeric reuse exception is between Scale index and Number, with distinct
category-owned UUIDs. Scale index accepts finite negative/fractional coordinates;
Number accepts positive safe integers. A textual numeric value still conflicts.
Existing internal field mappings remain fixed, including `constraint` and `axis`
despite their Property constraint and Orientation display labels.

Authoring envelope v6 wraps the recognized v1-v5 Radius/Elevation/Structures/
variant upgrades. Working and saved snapshots upgrade independently without
writing until the coherent graph validates. Shipped mappings migrate explicitly;
custom references, settings and authored order remain intact. Unsupported
multi-term assignments and conflicting vocabulary require review rather than
silent truncation or remapping. Migration initializes an empty alias collection;
it does not synthesize historical compatibility.

Future Save compares previous saved canonical names by stable source coordinates
and owning contexts. Only changed existing names create aliases. An alias has its
own UUID, captured full name and a direct canonical `$ref`; never an alias chain.
New tokens, intermediate edits and previews create no aliases. Own-name reuse
removes the redundant alias context. Global name collisions block Save without
advancing the baseline. Removed or unpublished targets prune alias contexts from
the captured working record; Cancel restores the saved graph.

Tokens list/grid show resolved aliases separately, disallow selection/bulk/value
editing and allow deletion only in Edit mode. Deletions participate in Changes,
item revert and Save/Cancel/reload; unchanged Save does not recreate them.
The local taxonomy packet exports reference-only aliases to exact emitted
canonical row UUIDs. Semantic rows also reference emitted primitives, while
hidden-source semantics remain literals. Analysis and Changes report compatibility
records separately; they never inflate canonical concept/mode-value denominators.

Canonical palette/scale/surface CSS variables share Registry formatting while
existing dynamic utilities and internal controls retain their relationships.
Dimension output uses the local v3 profile below. Pinned T-shirt/shadow serializers
remain explicit draft adapters, not alternate app naming authorities or accepted
upstream profiles. No browser authoring cache or source label becomes token identity.

An enabled mode-specific variable has one foundation authoring location: its
owning mode set's edit popovers, including the default mode's shared-base editor.
The normal foundation panel does not duplicate that variable's editor or
read-only field. This applies to Color background scale, background lightness,
Overall contrast, color-stop values, and Typography text size. Unclaimed
variables retain their normal editor. Color-scale naming, publishing, and
stop additions or removals remain shared structural controls. Preview adaptive
controls remain temporary adjustments, not another authoring location.

Color-scale selection uses the shared `ColorScalePicker`, built on
`EditablePicker`, with a compact gamut-aware gradient and registered scale name.
Foundation controls, mode value editors, adaptive previews, surface tints and
contextual preview selectors use the same component. Scale IDs remain the
selected values; names and gradients are derived from the caller's document.
Authoring controls retain global read-only behavior. Temporary preview selectors
remain interactive outside Edit mode and do not save authoring changes.

Typography Elements' sample icon and Show choices are temporary view state,
including in read-only mode, and reset on reload. Show only hides numeric labels;
their layout space remains reserved and generated text/icon dimensions do not
change. Icon samples use the existing generated icon size, with one selected
Spectrum glyph reused across rows. The full installed public icon catalog uses
lazy imports, with actual icons loaded as menu items become visible; regenerate
it with `pnpm exec tsx scripts/spectrum-icon-catalog.ts`
after upgrading S2 and verify it with `pnpm test:typography-preview`.
Typography Analysis uses the same generated icon sizes in its existing chart
and value table, independently of Elements' sample glyph or label visibility.
Its chart cards wrap according to the actual grid width, with a 550 px minimum
where space permits and one fluid column in narrower containers.
The Sample line height authoring setting retains its existing Save/Cancel lifecycle.

Typography Analyze compares font sizes, one selected line-height definition and
icon sizes through shared By size setting and By token controls. It evaluates
named Text size modes or integer zoom samples using the existing generation
path. The authored shared/default Text size is the protected baseline, which
need not be neutral zoom zero. The cross-section view protects the base-token
line and marks that default setting. Named modes with equal values remain
distinct identities.
Charts adapt their plotting width without scaling their presentation: labels
stay at 12 px, chart titles at 14 px, and series strokes at 2 px.
Shared comparison chart cards use two columns when the ViewSwitcher or
equivalent containing view is at least 1000 px wide, and one column below that
container breakpoint. Standalone comparisons use their own container width.
There is no maximum chart width; a single-metric formula still fills its row.
Plots fit the chart columns, reducing tick density at smaller widths rather
than shrinking text. Only very narrow plots need local scrolling.
By token starts with every token selected wherever the shared comparison view
is used. Explicit visibility choices remain temporary and are retained when
switching chart views.

Chart source, view, visible lines, line-height choice and Show values are local
display state that reset on reload. They never change active foundation modes,
adaptive previews, authoring records, changelogs or coverage denominators.
Synthetic zoom samples are not additional authored modes or saved token values.
Named modes can coexist with adaptive adjustment through the existing owning
mode set. Type scale formula previews reuse the same comparison controls and
adaptive calculations with draft formula values, neutral component size and
their temporary range/rounding; they do not inherit foundation clamps.

Spacing and Size use the same inline scale card: registered name and deletion,
a 32 px preview, formula, expanded quiet Formula variables, rounding, then
Hide from publishing. Formula variables shows the base, ratio and offset where
defined, other authored parameters, and the smaller/larger counts. Ratio uses
a number field without presets. Locked and read-only inputs remain visible.
Local overrides retain Revert; editing a bound number updates its neutral
point without dropping other connections. Adaptive setup is hidden in these
cards, not removed from source or generation. Formula changes retain the
existing reset of formula-specific overrides and bindings. Undo restores the
same scale and registered reference. Invalid name drafts clear on Cancel.

Fresh systems and confirmed Reset all include two unpublished spacing examples:
Base horizontal spacing (base 10, Type scale, two smaller/two larger values)
and Base gap (base 6, the same inherited ratio and range). The first uses
Small spacing rounding: raw values below 5 use factor 1; values at or above 5
use factor 2. The second uses Whole numbers. Their five rounded values are
`8, 8, 10, 12, 12` and `5, 5, 6, 7, 8`, respectively, with distinct steps and
checked-in UUID-backed names. Repeated values do not merge identities.
Existing working/saved records are not merged with these defaults.

Both foundations' Elements and Analyze views show every authored scale,
including unpublished ones. Elements keeps actual pixel lengths and local
keyboard scrolling, with two columns at a containing view width of 1000 px
or more and one below. Analyze uses the same chart sizing and breakpoint as
Typography. Each adaptive scale owns its By scale/By token, connected-variable,
comparison-source and line selections. Static scales have no adaptive controls.
Named modes are preferred when an owning set exists; otherwise the UI explicitly
offers sampled adaptive settings. Only the selected variable is varied; other
variables retain the current resolved context. The authored default setting
and base token are protected. Values disclosure is initially closed.

These chart choices and samples are temporary, not authored modes or values.
They do not change working/saved records, active previews, changelogs or
concept/mode-value denominators. Unpublished dimension scales remain excluded
from dimension Tokens and artifacts; this does not change Typography's separate
publishing-only visibility policy. The new defaults increase source/Registry
inventories, not published dimension-token counts. Local checks link to
LTAX-002 and LTAX-005 without accepting reference-policy or RFC decisions.

Corner radius reuses these controls and charts, but its card preview is one
56 x 56 px square showing the generated base radius. Elements displays all
values as vertically separated 56 x 56 px squares; only the top-right corner
is rounded. Radii above 56 px retain their token value while browser corner
overlap rules limit the drawing. Zero is valid; negative raw or rounded values
and nonfinite results are errors. Duplicate-only issues remain informative.
Spacing, Size and Typography retain their existing positive-value policy.

Fresh/reset systems include one published Global Radius scale, sharing the
existing registered Global term. Its linear formula inherits base 8 px and
Step 2 px, with two smaller and eight larger values: 4 through 24 px. Source,
Registry and token identities remain fixed during edits and shared renames.
Hide from publishing excludes Radius tokens/artifacts, not editing or previews.
No Radius-specific adaptive modes or controls are introduced; existing explicit
bindings retain their owner-scoped comparison behavior.

Radius Base value and formula-variable fields edit the selected shared formula
directly, like Typography, rather than creating per-scale overrides. There are
no Radius Revert controls. Every inheriting consumer of that formula sees the
new defaults; range, rounding and publishing stay per scale. Existing stored
overrides are preserved until an explicit edit to that part, which clears that
part's Radius overrides for the selected formula and updates any binding neutral
points without dropping the remaining connection. Formula-library locks remain
read-only; consumer Allow override flags do not lock editing the formula itself.
Save/Cancel and Changes retain the existing formula lifecycle and Undo behavior.
Spacing and Size keep their per-scale override and Revert controls.

The Radius upgrade introduced authoring record version 2 under the unchanged
`leonardo:authoring:v1` key. Current records use version 6, including Elevation, Structures, variant intent and canonical taxonomy as
described above. Recognized version-1 working and saved snapshots first upgrade to
include Radius and its Registry/formula dependencies. Existing names, edits and
saved differences are preserved; the two snapshots receive the same default
Radius without a false change entry. Earlier spacing examples are not merged.
Reads are pure; upgraded records are written only after all snapshot and
attachment checks pass. Identity conflicts, invalid records and write failures
are surfaced without replacing the original record. Current version-six snapshots require Radius, Elevation, Structures and variant intent,
so missing current data cannot be silently filled from defaults.

Default Radius adds 11 published token concepts and 11 baseline mode-values.
Unrelated global modes do not multiply that impact denominator. Explicit bindings
count their owning mode identities, including equal-valued modes; explicit token
assignments keep their full authored contexts. Chart samples and native Analysis
evaluation rows remain distinct from this saved/shipped denominator.

The materialization fingerprint was refreshed for the reviewed default-data
change. The prior pin already differed from committed defaults at `69894c6`;
comparison of the normalized committed and updated datasets preserved valid
projection and showed one additional non-taxonomy record for the new rounding
rule. The exact fingerprint assertion, UUID/output checks and coverage checks
remain in place.

The foundation header's medium Add action opens an S2 Menu. Available mode sets
not already attached appear first; the final Create new mode set action is
separated from them. Selecting a set opens a small S2 Dialog to select
mode-specific variables before adding its card. Changes stay staged until
Apply; Cancel changes neither capabilities nor foundation membership.
Creation reuses the Modes editor in an S2 DialogContainer, with the current
foundation selected, then continues to the same variable-selection step.
The new set, its settings and its card are committed together only on Apply.
Cancel discards the draft. Read-only mode exposes neither action.
Mode-row Edit buttons open only that mode's value controls, never set-wide
configuration. A card with no editable variables still supports mode selection
but has no Edit buttons. The Modes page retains set-wide configuration.

Deleting a foundation's mode-set card in Edit mode is a one-step cleanup, not
a request to reset its settings first. It removes that foundation's overrides
from every mode, its enabled variables and adaptive claims in that set, related
temporary previews, and the card's interface attachment. Spacing and Size also
release their explicit scale bindings to that set. Shared/base foundation values,
formula settings, UUIDs and other foundations' use of the set remain intact.
Mode-specific token value assignments for this foundation that reference the
removed set are discarded; shared token overrides, names, descriptions and
other foundations' token assignments are retained. Cancel restores the removed
data; Save and refresh use the same durable lifecycle as other authoring edits.

Generated JSON uses the existing cascade-row format, not nested legacy `sets`.
Removing a dependency removes that axis's mode fields and qualified rows. When
no dependencies or explicit value assignments remain, each token concept has
one row with its shared value. Remaining mode dependencies still produce their
own qualified rows even if their values are equal. Other foundations' explicit
token edits cannot reintroduce a removed Color axis. This is scoped output
emission, not a change to the Analysis evaluation-sample or impact-denominator
policy. Local checks remain implementation evidence for LTAX-005, not upstream
resolution-contract acceptance.

This bounded EPIC-3.1/3.2/3.3 follow-up belongs to the existing LTAX-001 and
LTAX-002 gaps. It does not change their alignment disposition or RFC acceptance,
or introduce a new token concept or mode-value denominator. Pending term rows are
not saved taxonomy changes or valid generator input.

In Edit mode, the Terms table uses S2 editable-cell popovers for names and
descriptions. Add term appends a separate draft with an autofocused S2 text
field; acceptance validates the whole value against the shared Registry.
Cancel discards the draft without changing the taxonomy. Draft UUIDs are minted
once and retained when accepted. Read-only mode has no term editing or adding
controls. This uses no controlled-open or private editable-cell API.

Review packet recorded on 2026-10-06 following [PC-0.1](archive/design-data-portable-contract-proposal.md)
and the [execution plan](archive/architecture-alignment-plan.md). This document translates
the target into the authoring application's actual data flow, not merely an
external transfer/evaluator proposal.

**Implementation update:** the user subsequently approved the spacing/size build,
the local proposed structured-token format with UUIDs, and dependency/assignment-based
emission. The implementation and verification limits are recorded below. Earlier
pending statements preserve the original review boundary, not the current build status.

The user clarified the purpose:

1. Foundation authoring state/localStorage produces new foundation data under the
   proposed foundational schemas, for eventual commits back to design-data.
2. That source generates new tokens, also stored in localStorage, that follow the
   explicitly selected design-data token contract.

The user approved an architecture-slice **review and implementation packet**, not
production implementation. They approved D-01/D-02/D-06's local direction and chose
**update generated tokens while editing**: working source and working token output
stay synchronized; Save establishes the baseline; Cancel restores both. Temporary
preview controls do not persist generated tokens.

The earlier D-03–D-05 question was not accepted: its terminology was unclear and the
user instead clarified this application purpose. Do not record that answer as
approval of a strict evaluator, permission policy, schema profile or runtime fix.
Exact schemas, token profile/classification/emission and production changes remain
specific approval boundaries. No storage keys/formats or generation behavior change
as a result of this review packet.

Primary alignment: EPIC-7.1/7.3; foundation-schema proposals draw on EPIC-1.9,
EPIC-5.5 and INIT-9. Future Git-backed committing is INIT-10, not implemented here.
Schema and vocabulary choices remain joint future-contract work, not default-data
adoption or a mandate to mirror current upstream names/values/density rows.

## The application data flow

### Typography architecture slice

The Foundations Typography panel has System settings, Mode sets, Font sizes,
Line heights and Iconography. Font sizes opens initially. Mode sets reuses the
shared foundation interaction; an unclaimed Text size control lives inside it.
Component size is retained in the document and calculation, but is not a
Typography control. Its eventual product-default owner and size/spacing
presentation remain EPIC-2.5 dependencies.

The canonical `scale-type-typography` formula owns the shared base, neutral ratio,
and mandatory ratio adaptation. Typography and the focused Logic editor update
the same working formula. Offset, formula replacement and adaptation opt-outs
are unavailable for Type scale; other geometric formulas retain Offset and
explicit consumer overrides/bindings. Smallest/neutral/largest ratio anchors
refer to Text size settings -4/0/8, not minimum/maximum font-length constraints.
Shared edits are tracked once under Logic, not copied into Typography.

Interpolation definitions own reusable methods or normalized progress
expressions. Each line-height definition owns its input and multiplier ranges.
Cards have stable identities and two registered output names, edited together.
Renaming does not change concepts or references. Newly enabled adaptive cards
start with equal multiplier endpoints from their default; configured ranges
survive disabling and re-enabling. Used cards require an explicit replacement;
removal and Undo preserve unrelated choices and token edits. There are no
Typography spacing fields or token families.

Calculation and numeric token overrides remain canonical pixels. px, rem, em
and pt are presentation/output choices, with a fixed 16 px authoring reference
and 1 pt = 4/3 px. Unitless multipliers are not converted. Text rounding precedes
constraints; line-height interpolation uses that final font size. Line-height
rounding produces a length and its matching multiplier (length / font size).
Text-aligned icons have their own base and the shared adaptive ratio;
line-height-aligned icons independently call the same calculation and are exact
generated lengths, not aliases. em is context-relative at CSS consumption time;
the Elements sample uses canonical lengths and unitless line heights to avoid
compounding. No app-wide root-size change is made.

Length controls use a zero-based step grid and reset their displayed input when
units change, avoiding small offsets or stale values. Source validation still
rejects zero lengths and invalid ranges. Card-name drafts are cleared when the
registered name or editing state changes, including Cancel.

Typography settings and shared Type scale/shape edits are checked across the
supported Text size range before committing. Invalid generated ratios or
line heights are rejected without partially changing the shared source.

Hide from publishing is app-owned metadata. All Typography families remain in
authoring Tokens, previews and saved concept inventories; publishing CSS, the
Tokens taxonomy-packet download and the publishing Analysis projection omit
them. Manual overrides cannot restore
hidden publication output. This does not claim upstream support for
`hideFromPublishing` or add a new token exporter.

Current Typography/formula/interpolation contracts intentionally break older
prototype records. No migrations or legacy aliases are introduced. Invalid
coherent records stay preserved behind the existing explicit Reset all flow.
Save, Cancel and refresh capture the document, shared libraries, Registry names,
references and token edits together. Temporary previews and dialogs do not
change saved/shipped denominators. A new card adds two stable concept families;
equal family counts or values do not establish unchanged concept coverage.

Naming work remains linked to LTAX-001/LTAX-002 and mode ownership to LTAX-005.
LTAX-006 separately tracks the new app-owned formula/publication contract and its
unassessed upstream mapping. Local implementation checks are not manual
architecture acceptance, RFC acceptance or design-data conformance.

```text
Foundation editors, formula/rule libraries, modes and explicit token edits
                               |
                     Authoring state + localStorage
                         (authoritative intent)
                               |
                    One captured source snapshot
                     /                       \
Proposed foundation-schema artifacts     Existing authoritative generators
 (commit-ready authoring projection)           |
                                      Token materialization/serialization
                                       under a selected design-data profile
                     \                       /
                   Validated, source-linked local artifact bundle
                     /                       \
      Foundation data for future commit     Generated tokens for future commit
```

Foundation artifacts and generated tokens are distinct data products. A formula,
binding, mode declaration or rounding program is not itself a token value. Tokens
are derived output; edits to tokens must continue to be represented as explicit
authoring overrides, not become an independently writable second source of truth.
Generation remains shared with views, Tokens, exports and Analysis.

LocalStorage is a persistence boundary, not proof of schema conformance, saved
status or upstream adoption. A working artifact can be durable but still unsaved
relative to the edit-session baseline. Temporary previews are neither authored
foundation changes nor materialized token assignments.

## Current implementation versus intended behavior

| Responsibility                         | Current source evidence                                                                  | Remaining gap                                                                                                                                                                                    |
| -------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Persist foundation edits               | `src/state/persist.ts`; `src/features/scales/foundationState.ts`; color/typography state | Native documents persist, not yet the proposed commit-ready foundation artifact contract                                                                                                         |
| Persist libraries, modes and overrides | Logic/mode state, `tokens/overrides.ts`, `tokens/browserEdits.ts`                        | Native intent exists; future artifact serialization/reference versions remain to be specified                                                                                                    |
| Save and Cancel                        | `src/features/edit-session/state.ts`                                                     | Saved source snapshot exists; no paired persistent generated-token artifact lifecycle                                                                                                            |
| Generate dimension output              | `foundationState.ts:48–54` and current spacing/size generators                           | Derived atoms produce output in memory, not stored design-data tokens                                                                                                                            |
| Generate/edit token browser output     | `src/features/tokens/browserState.ts:31–37`, `browserSources.ts`, `browserModel.ts`      | Presentation rows/edits are not a spec-validated persisted token collection                                                                                                                      |
| Color cascade output                   | `src/features/tokens/cascadeExport.ts`                                                   | Existing generated representation is not proof that every domain/token/profile is conformant                                                                                                     |
| Authoring/output Analysis              | `src/features/design-data/projection.ts`, `materialization.ts`                           | Reporting projections and samples are not the materialization/persistence implementation                                                                                                         |
| General persistence                    | `src/state/persist.ts`; `src/features/edit-session/storage.ts` and `persistence.ts`      | One versioned working/saved record; coalesced working writes and immediate Save/Cancel/Reset. Failures are surfaced; invalid records are preserved. Future artifact persistence remains separate |

This packet does not claim those gaps were solved by R1–R4. Existing native shape
validators, round-trip fixtures and generator reproduction are useful evidence,
not the proposed foundational schema or full design-data token validation.

## Decision dispositions

| Decision                          | Disposition                              | What may proceed / what remains open                                                                                                             |
| --------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| D-01 artifact separation          | **Local direction approved**             | Foundation authoring artifacts and token output stay separate. Final layout, schema URI authority and format are still provisional               |
| D-02 identity/references          | **Local direction approved**             | Preserve existing IDs and use explicit scope/revision references. Exact encoding and necessary token identity adaptation still need review       |
| D-03 evaluation contract          | **Concrete application design pending**  | Reuse existing generators; no new evaluator. Select/profile the actual source→token contract before claiming conformance                         |
| D-04 units/permissions            | **Policy pending**                       | Review known base-binding and neutral-point boundaries as part of real authoring validation. No runtime change or silently adopted bypass        |
| D-05 invalid/unsupported behavior | **Detailed behavior proposed below**     | Persisting a draft is distinct from producing validated tokens. Failure handling must preserve work, but the exact runtime policy needs approval |
| D-06 upgrades/baselines           | **Local direction approved**             | Retain baselines and require reviewed upgrades; no automatic override rebasing or semantic migration                                             |
| D-07 taxonomy ownership           | **Unresolved**                           | PR #1454 remains prospective evidence; no draft catalog adoption, global rename or accepted new trigger-placement rule                           |
| D-08 canonical emission/layers    | **Partly constrained, still unresolved** | Retain approved R3 distinctions. No automatic Cartesian emission, default/wildcard inference or substitute layer resolver                        |
| Working-token persistence timing  | **Approved**                             | Update from working source while editing, not only on Save; Cancel restores source and triggers matching token regeneration; exclude previews    |

The application purpose is approved. D-03–D-05 are not permission to narrow the
whole product to dimensions or replace native live-editor recovery with a new
transfer-only architecture. A first dimension slice is an implementation-order
recommendation, not the complete foundation authoring contract.

## Proposed implementation contract

### Source ownership and artifact projections

For an additive first slice, existing persisted authoring state remains the
operational source of truth. Capture foundations together with all referenced
formulas, interpolations, rules, modes, claims and explicit overrides. Serialize a
commit-ready foundation artifact projection and generate a token artifact from
that same captured snapshot. The projection must retain authored programs,
identities, references, permissions and baselines; it cannot be a flattened list
of generated values.

Do not create another editable copy of foundation intent in the artifact store.
If the proposed foundational schemas are later adopted as the authoritative native
state representation, that is a separately approved migration with hydration,
compatibility and rollback checks. Both the additive projection and future adoption
must demonstrably meet the proposed schema; attaching `$schema` is insufficient.

### Token contract and materialization

The generated token artifact must use an explicitly selected profile with pinned
token/value schemas and reference/catalog semantics. Record whether it targets
the configured current contract, a pinned prospective draft, or an approved local
joint-target contract. Separate checks for shape, references/vocabulary, generation,
serialization and query/resolution support. Never run the installed old SDK against
draft data and call the result draft conformance.

The output is actual token data, not `AnalysisRecord`, `BrowserTokenSource`, or an
R3 scenario observation. Existing browser names and naked numeric values need an
evidenced adapter to the selected structured-name/value-type contract. Preserve
`value` XOR `$ref`, units, identities and authored overrides; do not invent aliases,
infer taxonomy from labels or remint IDs on an ordinary rename.

Before implementing a domain, approve its output family/classification and emission
rule. The current non-color Analysis Cartesian matrix remains an evaluation matrix,
not permission to persist every sample as a canonical token. An unused declared mode
creates no assignment. Identical explicit assignments remain distinct. Platform
selection, modes, overrides and extensions are not added by this storage slice.

### Durable pairing and generation provenance

Recommended storage design: an additive versioned artifact-bundle entry containing
separate foundation and token artifacts, source fingerprint, profile identity and
validation status. A single-entry write avoids a partially replaced artifact pair;
it does **not** make all existing source keys and saved-baseline keys transactional.
Exact key/envelope encoding remains proposed until implementation approval.

Generated tokens are a rebuildable derived artifact, never the hydration source for
lost foundation programs. Fingerprint all generation-relevant source intent, not
only the generated token list or a label. Record enough context/profile provenance
to identify outdated output. Do not put local storage/editor/review metadata inside
token objects unless the selected token schema explicitly supports it.

Coalesce rapid edits and suppress late generation results. Each operation must
capture its own source snapshot and generation sequence: an older edit cannot
overwrite newer output or restore discarded tokens after Cancel. Avoid persisting
on every render or subscribing only when Analysis is open. The owner belongs in
the authoring/features layer, not an Analysis view or a production backend.

### Editing, Save, Cancel, reload and failures

| Event                                      | Proposed behavior consistent with approved direction                                                                                                                                                 |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Edit foundation/library/binding/override   | Existing native draft persistence continues. Generate and validate a matching working artifact pair; persist it after coalescing successful generation                                               |
| Temporary adaptive preview                 | Keep current preview behavior in memory; do not replace durable foundation/token artifacts                                                                                                           |
| Save                                       | Existing source baseline is updated. Valid matching working artifacts become eligible for the saved commit candidate; durable working output alone does not imply saved status                       |
| Cancel                                     | Restore the existing saved source snapshot and regenerate/persist its matching output; suppress completion of discarded working jobs                                                                 |
| Revert an authored edit                    | Use existing source/edit resolvers, then regenerate; do not patch an independent generated-token store directly                                                                                      |
| Reload                                     | Validate/hydrate native source and edit baseline. Validate cache envelopes and source/profile fingerprints; rebuild missing or outdated artifacts without resetting authored work                    |
| Invalid/unsupported source or token result | Preserve the draft. Keep the last valid artifact pair associated with its original source/profile and label it stale/not commit-ready; never present it as generated from the invalid current source |
| Storage quota/unavailable storage          | Keep state correct in memory and expose failure to persist the artifact; do not claim durable success or clear unrelated storage                                                                     |
| Profile/schema upgrade                     | Require explicit compatibility/migration review. Retain old source evidence and baselines; do not silently rebase overrides or normalize meaning                                                     |
| Future commit to design-data               | Use a saved, validated, source-matching foundation/token candidate. No automatic commit/push, backend or credential change is authorized here                                                        |

Validation/export eligibility should not silently replace existing Save semantics.
Whether invalid authored drafts may be saved while remaining ineligible for commit
is part of the implementation approval, not a hidden new editor restriction.
Persistence failures currently swallowed by the shared helper need explicit handling
for the new artifact repository; changing the shared helper itself would expand scope.

## Recommended next build packet — pending approval

Start with **spacing and size foundation artifacts plus their token output** to
exercise the existing shared dimension engine. Keep the model extensible to color
and typography, but do not count those domains as converted or validated by a
dimension-only slice. No editor redesign or new evaluator is needed.

Prerequisites to settle before code:

1. Agree the local proposed foundational artifact shape and reference/version
   encoding for these domains, including shared definitions and override intent.
2. Select the token schema/catalog profile and the exact output naming/value-type
   adapter. A generic “design-data spec” claim is not sufficient for validation.
3. Approve which records these recipes actually materialize, distinct from Analysis
   samples, and preserve token/concept identity through rename/override/reload.
4. Approve the proposed failure/commit-eligibility behavior and storage envelope.

Likely ownership (names illustrative, no modules created by this packet):

- `src/features/design-data/`: foundation artifact model/validation/serialization,
  domain token adapter and pure source→artifact generation.
- The authoring feature layer: always-mounted orchestration using existing snapshot,
  Save/Cancel and generator boundaries; no new generator hidden in React effects.
- A focused artifact repository: versioned localStorage IO and surfaced failure
  status; never arbitrary filesystem access or upstream writes.
- Tests: model/reference/profile negatives, storage lifecycle and browser workflows.

Acceptance required for a production slice:

- Create/edit a foundation; inspect both actual persisted artifacts and prove their
  source/profile linkage and schema validation, not merely the screen or report.
- Change a shared formula/binding/rule; prove current UI and durable tokens use the
  same generator, including ordered conditions, units and exact-mode overrides.
- Save, edit again, Cancel, reload and revert; verify restored source and tokens,
  identities/baselines, and absence of delayed discarded writes.
- Add an unused mode; prove declarations are retained without inventing required
  assignments or silently materializing the report's Cartesian samples.
- Exercise malformed cache, unsupported profile, invalid output and quota errors;
  preserve authored data and distinguish stale last-good artifacts from current output.
- Exercise temporary previews; show they do not modify persisted token artifacts.
- Verify publication flags and boundary between working, saved and shipped defaults;
  do not change current impact/changelog denominators or count the cache as new edits.
- Run directly affected unit checks, lint/build and browser interactions with empty
  pageerror assertions, including every affected authoring/token/Analysis surface.

No imported default records, upstream fixes/submissions, SDK replacement, taxonomy
editor, Git committing, storage reset, canonical-ID remapping, product-default
relocation or roadmap edit is part of this recommended packet. `componentSize`
stays in typography until EPIC-2.5. Unsupported domains/profile choices stay visible;
neither this review nor a first slice constitutes complete interoperability.

## Approved spacing/size implementation and verification

The user selected a full architecture slice, proposed structured names and UUIDs,
and the baseline/binding/override emission rule. Implemented owners:

- `src/features/design-data/dimensionArtifacts.ts`: actual exported JSON Schema
  definitions, source capture, semantic checks, emission, UUIDs and cache reproduction.
- `dimensionArtifactRepository.ts`: additive page-session repository and generation
  sequencing/coalescing with last-good output and surfaced failures.
- `dimensionArtifactState.ts`, `useDimensionArtifacts.ts`, `src/App.tsx`: always-mounted
  synchronization; opening Analysis is not required to generate artifacts.
- `src/views/analysis/AnalysisView.tsx`: existing-view storage/provenance status.

The current page-session repository uses the existing logical key
**`leonardo:v1:artifacts/dimensions`**, bundle schema version **3**.
Profile: **`leonardo-proposed-dimensions-v3`**. Foundation schema:
`urn:leonardo:proposal:dimension-foundations:3`; token schema:
`urn:leonardo:proposal:dimension-token:3`. These are explicit local proposal identifiers,
not adopted upstream schema URIs or an SDK conformance claim. The normative token
schema's string-only unknown name fields conflict with the numeric `scaleIndex`
catalog/data representation; this implementation does not patch or conceal that conflict.

The single stored bundle contains separate `foundation`, `tokens`, and `lineage`
payloads, profile identity and source SHA-256. The foundation payload retains native
spacing/size/radius recipes, directly referenced formulas/rounding definitions, pending rules,
mode declarations, native dimension edits and captured generator plans/inputs. Typed
references carry family, local owner and snapshot revision. Captured numeric mode inputs
are evidence from the current native resolver; no independent portable color/typography
provider, evaluator or complete platform-reference graph is claimed by this first profile.

Token example (UUID values are placeholders here, not new literal default records):

```json
{
  "$schema": "urn:leonardo:proposal:dimension-token:3",
  "uuid": "<deterministic row UUID>",
  "conceptId": "<deterministic concept UUID>",
  "name": { "tokenCategory": "Spacing", "scaleIndex": 100 },
  "value": "8px"
}
```

UUID seeds use domain, existing scale ID, step and explicit context, never the display
label. No existing native scale/browser/report ID is reminted. The dimension token UUIDs
are new derived artifact identities: native dimension browser rows did not previously
have these persisted UUIDs, and no cross-repository identity equality is inferred.
Name edits and native edit baselines stay in source/lineage; they do not rewrite stable
structured identity. Spacing/Size retain signed finite px dimensions and their
existing warnings. Radius requires finite, non-negative raw and rounded values;
invalid Radius output and negative assignments fail explicitly. This versioned
local profile extension does not claim new upstream support. Old profile bundles
are not current caches. Artifacts remain derived page-session state, not a second
durable authoring record or browser-persisted artifact cache.
Literal-only output rejects `$ref`/`value` mixtures; aliases are not synthesized here.
The v3 structured name uses the actual Registry projection, including typed
numeric coordinates, rather than mandatory Property/Foundation scale fields.
The complete pre-migration materialization pins remain historical evidence at
`c84de71cec30d63bac6ee2034a7989cf47e751fc`. All three pins were reproduced from
that commit, then compared through an explicit naming-only invariant adapter.
All 3,486 existing token rows preserve IDs, values, units, contexts, generation
and mode wiring; no unrelated value differences were repinned as naming changes.

Every published primitive gets a default-evaluated unqualified baseline. Additional
binding records contain the actual dependent axes; explicit value overrides contain the
full exact authored mode selection, including intentional default assignments. Values
are not used to deduplicate contexts. Where a binding and override produce the same
record identity, the effective override retains its generated baseline and authored edit
evidence in lineage. Unsupported/stale/noncanonical or unmaterializable assignments are
errors, not dropped into apparently complete output. Unpublished recipes/edits remain
source intent without emitted tokens. Existing safety limits are supplemented by local
artifact limits; limits produce stale last-good status rather than partial valid output.

Working source changes regenerate the bundle while editing; Save only advances the
existing edit baseline, and Cancel/reload/revert continue to restore native source and
rebuild output. The cache is never an authoring hydration source. Cache reads validate
the local schemas, source fingerprint/references and regenerated token/lineage content.
Invalid caches are rebuilt without clearing source or unrelated keys. Invalid generation
keeps last-good artifacts marked stale; quota/unavailable-storage errors retain memory
and report non-durable status. Single-entry artifact writes do not make the existing
native source/baseline keys transactional; reload always reconciles from authoritative
source. Current Save semantics and impact/changelog denominators are unchanged.

Generation is coalesced and late jobs suppressed. The hook uses content-based requests
and Jotai's synchronous snapshot subscription to prevent status updates cancelling jobs
or transition-time updates being missed. Temporary previews are excluded. Fresh sessions
may generate artifacts from existing app-seeded native state; no upstream token/default
data is imported or shipped defaults overwritten. Production builds also support local
artifact generation/storage; the reference Analysis endpoint remains honestly unavailable.

Verification: **26 non-SDK standalone checks**, lint/typechecks and build pass; the
pre-existing large-chunk warning remains. **20 focused browser tests pass at a 2200×1000
desktop viewport**, including explicit mobile Analysis checks, new artifact lifecycle/
quota/corruption paths, native spacing editing, existing token edits/Save/Cancel,
CLI/page/reference-refresh parity, hosted behavior and minimum color smoke. Every
selected browser path collects pageerror events and asserts none. No full app/Storybook
or complete upstream SDK conformance pass is claimed.

**Remaining viewport acceptance:** standard 1280px runs encountered Change log panel
pointer interception over token edit buttons; three existing edit regressions and later
new artifact tests were obstructed. Their wider-desktop paths pass. Concurrent edits
in `src/pages/BrowsingContext.tsx` remove the page wrapper; that change and Home edits
were preserved. No causal baseline-revert experiment or responsive layout repair was
performed, so do not claim the standard-width suite passes or conclusively attribute
the overlap to one change. Resolve that layout scope with the user separately.

Color/typography artifact conversion, complete foundation-schema adoption, upstream
profile/catalog acceptance, platform/layer resolution and Git commits remain excluded.
The new cache is not a new saved-change domain or an expansion of current report counts.
