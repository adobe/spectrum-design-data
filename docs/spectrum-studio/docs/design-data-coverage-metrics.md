# Human-readable data comparison

Analysis now opens with a coverage overview, not the technical audit. Its purpose is
to help a person understand differences and choose an appropriate response. A missing
record, an unverified mapping, a schema limitation and a different value are not the
same problem—and none automatically dictates what must be built.

## Local checkout configuration

Ordinary `pnpm dev` and CLI reporting read server-only `DESIGN_DATA_PATH` from the
ignored `.env.local` configuration; a shell environment override takes precedence.
Use `.env.example` as a template. Do not prefix the setting with `VITE_` or put a
machine-specific checkout path in tracked application code. The dev adapter uses the
active Vite mode, and reads an optional server-only `DESIGN_DATA_SDK` override.
Missing/unreadable checkout responses show an explicit connection/configuration
problem and suppress coverage charts, rather than presenting absence as 0% coverage.

## What the percentages mean

### Token comparison

The **Tokens** view shows active tokens from both sources, including generated
and manual app tokens, semantic tokens, compatibility aliases, and types the
analysis cannot yet classify or compare. Deprecated tokens from either source
are hidden from the table but retained in the underlying inventory and reports.
App-only tokens remain visible. Unknown types show **Unclassified**, not an
empty result.

Analysis opens on **Working authoring**, including current edits but excluding
temporary preview controls. Saved data and shipped defaults remain available.
Source files, record IDs, schema evidence, alias targets, and diagnostics are
retained in `colorOpacity.inventory` in JSON and the complete inventory section
in Markdown. Sources excluded from publishing are listed with a reason; the
analysis does not invent token output for them. A failed source makes the
inventory partial, so unmatched records cannot establish confirmed absence.

Inventory is separate from migration scoring. Nondeprecated supported reference
tokens define migration requirements. App-only, deprecated, compatibility-alias,
and unclassified inventory rows do not inflate those requirements or become
failures just because they are inventoried. Inventory-only rows cannot be selected
for applying reference values. Elevation compares complete shadow layers, not
their fields as standalone tokens.

Font-size steps belong to **Typography**, not the layout **Size** category.
Confirmed app `text`/`size` metrics adopt the reference `font-size` concept and
row identities through the shared authoring reconciliation. Analysis matches
the shared concept first, then its row and mode context. Reviewed typography
mappings remain a fallback for unreconciled inputs; equal values never establish
identity. Additional text-scaling variants stay in the inventory and
enhancements without adding migration requirements.

Mode conditions describe real variations, not every setting selected to run a
generator. For example, `accessory-gap-extra-large` shares the reference's
canonical 8px baseline identity, while the app's deliberate mobile 10px branch
has a separate row under the same concept. Unrelated Color scheme, Contrast
and Text scaling selections do not create extra rows. A specific branch takes
precedence over its fallback, and equal-valued authored branches remain
separate. Adopting identity does not copy reference values or make differences
pass.

With all modes shown, expand a token to see its required mode contexts. Choosing
any mode filter flattens the table to one row per matching context, with the mode
combination in the name. The table reuses the Tokens page's search, category
filters, and mode controls, without adaptive controls, grid view, or Add token.
The paired values remain in their original notation. Open a token name for
classification differences, references, resolution chains, and source locations.

| Result             | Meaning                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------- |
| Pass               | Classifications align and every required value matches.                                                       |
| Acceptable         | Classifications align and every required color is exact or has Delta E 2000 below 2, with matching alpha.     |
| Fail               | An established counterpart has different classifications, lacks a required mode, or exceeds the value policy. |
| Unable to evaluate | The counterpart is unconfirmed or ambiguous, or resolution, inventory, or freshness evidence is unavailable.  |

Each child badge describes its value only. The parent includes classifications
and every required context. Filtering does not change the parent's result.
Fail takes precedence over incomplete evidence; incomplete evidence takes
precedence over Acceptable. An empty mode inventory cannot pass.

Value cells put a compact preview beside the value. **Difference** shows Delta E
2000 for colors and app minus design-data for compatible numeric values, including
the unit and a plus sign for positive differences. Other assessed values show
Not applicable; unresolved or stale differences show Unavailable.

The last column, **Visual comparison**, shows the app value on the left and
design-data on the right, using touching swatches for color and opacity.
Opacity uses the preview surface for that row's mode combination, not the global
preview settings. If a value or its required preview surface is unavailable, the
visual comparison reads Unavailable.

#### Apply reference values

In edit mode, checkboxes select exact token instances. Selecting a parent selects
its visible eligible mode instances; Select all respects the current filters.
Unconfirmed, unresolved, stale, and deprecated instances cannot be selected.
The action bar opens **Bulk edit**, whose only option is **Apply design-data value
as override**. It starts unchecked.

Applying replaces any existing assignment in each selected instance's exact mode
combination. The batch validates before a single write; a conflicting reference
value, invalid assignment, or changed source leaves the batch unapplied.
The comparison then switches to **Working authoring**. These are ordinary manual
overrides, visible in Tokens, Changes, Impact, component values, and canonical
output. They retain generated baselines and participate in the existing Save,
Cancel, staleness, and reset behavior. Applying does not save the edit session.

#### Results by mode

The **Results by mode** table separates Pass, Acceptable, Fail, and Unable to
evaluate for each required reference mode. It counts individual mode values,
not the token's overall result. For example, a token can pass in Light and fail
in Dark while its overall result remains Fail.
Its stacked bars show the same counts: Pass is green, Fail red, Acceptable orange,
and Unable to evaluate light gray.

Select **View results** to inspect a mode's values. Mode-set filters can be
combined, such as Dark and High contrast, and **Mode value result** isolates
passing, acceptable, failing, or unavailable values. **Token overview** still
filters by the complete token result. Selecting a token shows details for its
visible mode rows; its overview badge always includes all required modes and
classifications. Filters never alter the comparison or downloaded reports.

The summary always covers the full required inventory, before table filters.
Each value is counted once within each mode-set group; a value with multiple
axes contributes to each applicable group. Do not add counts across mode sets.
Token totals count distinct tokens within a group. **Pass or acceptable** divides
those two value counts by all required values in the group, including values
that cannot be evaluated. It is unavailable when all evidence is unassessable.
Missing or partial inventory and stale evidence cannot claim passing results.

Rows without an axis are listed as **Not mode-specific**, not assumed to be the
default mode. Missing mode declarations remain higher-level findings in
**Mode coverage**. App enhancements are excluded from required-mode summaries
and filters. JSON's `colorOpacity.modeBreakdown` and Markdown include the same
full-inventory counts, using reference mode keys independently of app labels.
The shared grouping helper also supports future token types.

#### Comparison policy

Opacity is exact after normalization to a finite alpha from 0 to 1. For example,
`0.4`, `"0.4"`, and `"40%"` are equivalent. There is no opacity tolerance.
Color comparison reuses the exact and Delta E 2000 rules described below.
Other supported foundational values require exact normalized equality. Numeric
values compare only in compatible units; absolute conversions include px/pt and
ms/s. Relative units such as rem and em are not guessed. Typography strings compare
exactly for supported string properties. Shadows compare their ordered layers,
dimensions, and normalized colors. Unsupported values, including Motion while
Studio has no generator for it, remain Unable to evaluate.

The retained `colorOpacity` report key now uses schema version 4 with
`scope: "foundation-tokens"`. It records the color policy, Delta E 2000 distances,
and normalized numeric differences. Analysis,
CLI JSON, and Markdown use the same assessment. Counts separate source records,
token concepts, and required mode values. App-only tokens remain searchable;
deprecated records remain in reports, not the table. Neither increases reference
coverage. Partial, empty, or stale
inventories do not publish a completion percentage. Saved and working datasets
remain provisional; shipped defaults are an alternative comparison source.

Required contexts come from the reference token, its concept siblings, and its
alias dependencies. A declared mode set does not require every token to have a
value in every mode. An omitted shared axis uses the reference's declared default
for migration comparison, translated to the matching app mode. If the app defaults
to High but the reference defaults to Regular, comparison explicitly selects
Regular. An app-only axis uses its valid app default for the baseline.

The read-only SDK batch adapter still applies the canonical cascade when
selecting siblings and following aliases. A wildcard value's ability to resolve
in another context does not create another migration requirement. Deprecated
dependency targets remain available without joining the active denominator.
Dangling references, cycles, duplicate identities, and unsupported contexts
produce diagnostics, not fallback values.

### Mode coverage and enhancements

The independently versioned `modeCoverage` section (schema version 1) checks
mode-set and mode support across the two datasets. Sets match by canonical key,
unique identity, or explicit reviewed mappings, not display labels. Mode keys
match exactly unless a reviewed declaration mapping supplies `modeKeys`, an
object from app keys to reference keys. The report retains matching evidence.

A missing reference mode set produces one set-level Fail. A missing mode in a
matched set produces one mode-level Fail. Required token rows link to these
findings rather than inventing unrelated value differences. Missing global High
support does not fail a Regular-only palette token, but the missing capability
remains visible in Mode coverage. Different declared defaults are shown
separately and do not imply missing support.

The separate **Enhancements** section lists additional app mode sets, additional
modes, and app token variants that the reference token does not require. For
example, design-data declares High contrast globally, but its Regular-only base
palette does not require High variants. Those app variants are enhancements,
even when their values differ from the Regular reference value.

Enhancements show app values without an invented reference value or a failing
comparison. They never affect token verdicts, required-value denominators, or
migration percentages. Structural findings are counted separately from affected
tokens. Missing, invalid, ambiguous, or stale evidence cannot establish an
enhancement or prove that a capability is missing.

JSON and Markdown carry the same structural results and token enhancements as
Analysis. Resolved-value caches include the context-policy version so values
selected under an older policy are not reused.

The dev server resolves batches off the UI thread and caches reference inputs.
App evidence is cached with its dataset and reference hashes. The CLI resolves
both inputs through the same adapter. Evidence records the SDK executable hash;
a binary older than its resolver sources is unavailable until rebuilt. Hosted
builds without that server adapter can compare literals but cannot claim resolved
alias coverage.

Comparison itself never changes authored data. Only the explicit override action
writes values. It does not create missing generators, accept exceptions, alter
UUIDs, or establish upstream schema adoption.

### Primitive palette compatibility report

The retained **primitive palette** report compares non-deprecated records from
`tokens/color-palette.tokens.json`, including private records. Gray is the first
worked family; the same assessment covers the rest of the palette. Semantic and
component colors are outside this scope.

Palette assessment v2 is an additive report section, shared by Analysis,
JSON, Markdown, and the CLI. Existing coverage and technical findings retain
their meanings and their existing comparison policy.

- **Represented:** a unique counterpart exists for at least one mode row in a
  reference concept. Classification matching or a reviewed pair establishes the
  counterpart; matching labels and equal colors do not.
- **Classification aligned:** every required row has the canonical
  classifications, or a scoped accepted exception.
- **Exact mode values:** uniquely paired rows have equal normalized colors,
  independently of their classification outcome.
- **100% aligned:** identity and classifications align, and values match exactly
  in every required reference context.
- **Close enough:** identity and classifications align, every required context is
  represented, and each value is exact or within the color tolerance below.
  At least one value is not exact.
- **Not aligned:** a required counterpart is missing, classifications differ
  without an accepted exception, or a color exceeds the tolerance.
- **Unable to evaluate:** identity is ambiguous, a color cannot be resolved, or
  required comparison evidence is unavailable. This is not a successful match.
- **Complete:** a concept has confirmed identity, aligned classifications, and
  exact values in every reference context. Missing Wireframe or other required
  contexts prevents completion even if Light and Dark match. This existing
  percentage remains an **exact-completion** measure; close-enough concepts are
  counted separately rather than presented as exact matches.

Completion divides complete concepts by all eligible reference concepts, not
just matched concepts. Partial/unavailable inventories, uncertain identities,
and stale evidence suppress the percentage. Zero reference concepts is not 0%.
App-only rows do not increase completion. Excluded deprecated rows retain their
IDs and reasons in the report.

Shipped editor defaults are the official baseline. Saved and working comparisons
are provisional and do not replace it. Temporary adaptive preview controls are
not the required-context inventory.

Exact color equality uses concrete-color parsing and XYZ D65 conversion plus
alpha, without gamut mapping, clipping, 8-bit quantization, or compositing.
Equivalent hex/RGB notation can match. A 32-machine-epsilon conversion-roundoff
allowance, scaled by the larger of one and the channel magnitude, covers
floating-point conversion noise only. Near-but-unequal colors remain different
in the exact-equality result, while receiving a separate alignment tier.
Only when colors are not exactly equal, calculate **Delta E 2000** using
Color.js. A finite distance **strictly below 2** is **Acceptable** (called
**Close enough** in the primitive palette compatibility report). A distance of
exactly 2 or greater is not aligned. This replaces the per-channel tolerance.
For example, `rgb(217, 217, 217)` and `rgb(221, 221, 221)` are acceptable despite
differing by more than one step per channel.

The comparison uses full-precision colors, including supported wide-gamut
colors, without rounding, clipping, gamut mapping, or background compositing.
Alpha must still match, allowing only conversion round-off, not an opacity
tolerance. Invalid or unresolved colors and unavailable distances are
unassessable. Acceptable colors remain unequal in the exact result and do not
increase exact-completion counts. This policy does not change generator
settings, authored values, classification matching, required-mode handling, or
the older technical audit's separate tolerance.

Analysis, CLI JSON and Markdown share the tier results, counts and policy.
The report retains exact equality alongside the tier, Delta E 2000 distances for
non-exact colors, and per-channel differences as diagnostic evidence where both
colors are within sRGB. Channel differences no longer determine the result.

Classifications are compared before any field translations are excused.
Existing `colorName`/`contrastValue` mappings can identify a counterpart, but
do not make those fields canonical `colorFamily`/numeric `scaleIndex`.
Reference color-family vocabulary and declared mode/default contexts are
checked. A mode name is never guessed from display text.

An exception must have an explicit pair in the existing gap register's
`expected` list whose optional `nameFields` scope exactly matches the reviewed
mapping's field translations. Existing pairs without a field scope do not waive
classification differences.
Only those translated fields with equal normalized values are covered.
Counting it as accepted also requires an accepted linked RFC, the current
clean reference revision, no blockers, and current review of manual criteria.
Drafted, submitted, stale, and unverified exceptions remain outstanding.
There is no second acceptance register and no exception for arbitrary unequal
color values.

The `studio-palette-label-v1` counterpart profile handles the current editor's
registered `colorFamily` labels, legacy `colorName` labels, and numeric
`scaleIndex`. It uses exact,
unambiguous reference registry label/ID entries, never case folding or display
name parsing. Raw label and field differences still prevent classification
alignment unless the scoped exception requirements above are satisfied.
Relevant alignment work remains tracked by LTAX-002, LTAX-003, and LTAX-011;
this comparison does not close those entries or refresh their review pins.

Expand a concept to compare **App → Design-data**, one property at a time.
Field-name differences and term-value differences appear separately. Shared
classification differences appear once, with mode labels when they vary.
Color values have previews for every required mode, including missing modes.
The view links to Registry review and the existing exception register; these
links do not apply fixes, record a decision, or accept an exception.

Technical evidence is collapsed separately: counterpart rationale, diagnostics,
Delta E, source locations, UUIDs, and override provenance. Downloadable reports
retain the structured evidence. Missing override evidence means unknown
provenance, not proof the value was formula-generated.

The Registry's shipped color classification key is now `colorFamily`, matching
design-data. Version-15 stored working and saved snapshots upgrade that field
without changing category IDs, term IDs, token IDs, term values, or generated
colors. A conflicting authored `colorFamily` category is reported without
overwriting the stored record. Legacy internal generator names remain separate
from exported classification keys. Renaming a field alone does not establish
alignment: its term values and required contexts must also match.
The proposed classification standard and historical review pins are unchanged.
Their diagnostics remain independent of this field rename.

### Stored terms and displayed labels

Studio stores string classification terms in lowercase, including custom terms.
Numeric terms stay numeric. Category keys, UUIDs, references, descriptions, and
free-text labels are not lowercased. Entry casing does not create a second term.
Spaces and hyphens remain distinct in storage.

Ordinary labels, menus, and term pickers use the shared `termLabel` helper:
`illustrator-orange` appears as **Illustrator orange**. Editing drafts retain
what the person types until commit. Merely leaving a formatted input, or changing
only its casing, does not rename its term or replace its hyphens with spaces.
Analysis differences, technical evidence, generated token names, code, and downloads
keep exact raw values rather than these display labels.

Version-17 storage upgrades both saved and working terms. It keeps IDs and
references, preserves independent edits, and resolves foundation label copies from
the Registry. Where lowercasing changes token-name serialization, the existing
compatibility-alias planner retains the old name. For example,
`InDesign Magenta` becomes `indesign magenta`, and the old
`in-design-magenta-...` names remain aliases for the same token IDs.
Failed upgrades report an error without replacing the stored record.

Fresh and reset defaults use RGB output. Existing saves retain their chosen format;
legacy sRGB settings still migrate to Hex. Exact palette agreement and
close-enough tolerance remain separate results, regardless of output notation.

sRGB output uses design-data's comma-separated notation: `rgb(255, 255, 255)`
for opaque colors and `rgba(0, 0, 0, 0.08)` when alpha is below one. This changes
notation; the shared serializer emits whole-number sRGB channels.
Display P3 and Rec 2020 retain the space-separated `color(...)` syntax required
by CSS. Matching notation alone does not establish matching color values.

The default Wireframe foundation is an ordinary color scale with one seed,
`rgb(72, 110, 194)`, represented internally in OKLCh. It retains its existing scale,
stop, and term IDs and uses shared contrast steps to generate its ramp. This does
not implement a Wireframe mode, and storage upgrades do not add it to old saves.

### Existing inventory coverage

- **Confirmed coverage:** unique reference identities/rows with a counterpart under
  an existing reviewed mapping or exact identity, divided by the reference inventory.
  Value inequality does not reduce this number.
- **Missing app data:** the selected app projection has no records of a classified
  category/family and the app inventory is complete. This is absence in that projection,
  not proof the app cannot author an equivalent concept another way.
- **Not matched yet:** remaining reference data, including ambiguity and unclassified
  families. It is not counted as missing. Category/type grouping creates no matches.
- **Value agreement:** equal / value-compared pairs. This is separate from coverage;
  different presets and authored values can be legitimate.
- **No reference records:** no percentage denominator; show an explanation, not 0%.

The token-identity lens deduplicates explicit concept IDs. Missing concept IDs fall
back to UUID/record identity, with the number of such rows disclosed. It is not a
canonical concept-count claim. The mode/output-row lens retains contexts and app
evaluation samples; those rows are not automatically materialized assignments.

All-token and all-color aggregates deduplicate their reference identities, including
across families. Supplemental findings do not count as extra matches. Empty native
override/claim maps count their entries, not an empty container as an authored item.
Every discovered data category remains visible; known token families and unclassified
tokens are shown separately. Platform declarations/declared platform vocabulary share
an inventory grouping without inferring matching IDs.

Inventory completeness is distinct from SDK validity. Parsed inventories can remain
complete despite reference schema/SDK diagnostics. Partial inventories show observed
counts and a warning; failed app input never proves a category absent. Transport
failure retains explicitly stale last-good coverage.

## Data is not schema support

Schema counts are the compared inputs' inventories, not a requirements checklist or
a census of all source-code models. **Schema compatibility percentage remains not
assessed.** Reporting 1 vs. 20 schema identifiers does not prove a 95% schema gap.
The schema/model view explains reviewed disagreements and their consequences without
presenting recommendations as mandatory instructions. A numerical schema-support
score needs a separately evaluated, explicit capability/requirements denominator.

Side-by-side drill-downs distinguish confirmed counterparts, absent classified output,
unmatched data and value/format differences. A human may choose to add data, define a
mapping, propose a schema change, or retain intentional divergence. Detailed comparison
keeps the existing findings, provenance, evidence and downloads as supporting detail.

## Scope and verification

The shared report adds optional independently versioned `coverage.schemaVersion: 1`
and `palette.schemaVersion: 1`; outer report v1 and its existing metrics/findings
remain intact. CLI and page use the same calculations and JSON/Markdown summaries.
The palette counterpart profile and explicit Registry field upgrade are described
above. Neither changes generator parameters, accepts a schema, imports upstream
token data, or adds a Home metric or health score. Existing native/proposed-schema
boundaries remain explicit.

Verification includes 27 non-SDK unit commands, lint/typechecks/build, new overview
and stale/partial tests at the normal viewport with mobile overflow checks, and 22
focused browser regressions at the existing wide-desktop test viewport. The latter
includes explicit mobile checks, all prior technical-plane workflows, CLI/page refresh
parity, artifact Save/Cancel/reload/quota behavior and minimum color smoke. All selected
paths assert empty pageerror lists. Standard-width token/Change log overlap remains
outside this change; no full app/Storybook or upstream conformance pass is claimed.

## Requested comparison scheduling

The page projects only the selected dataset in a worker, using the same native
projection, record fingerprint, comparison and gap-register functions as before.
Opening the page no longer projects saved and working authoring on the UI thread.
Saved gap evidence is requested only in the alignment-register view. An unchanged
selected input can reuse its complete projection when reference data refreshes.
Native synchronous selectors remain available for CLI and model checks.

New input invalidates the displayed comparison and its download actions before
effects run. Superseded jobs are cancelled; a late reply cannot restore an older
report. Public Spectrum busy presentation and explicit error/retry keep source
selection and navigation available without new visible loading captions.
A reference refresh can retain the last successful reference while explicitly
marking its report and downloads stale; transport failure preserves that same
boundary. Missing, partial and stale evidence retain the canonical assessment
rules; no percentages, gap closures, pins or acceptance records are invented.
