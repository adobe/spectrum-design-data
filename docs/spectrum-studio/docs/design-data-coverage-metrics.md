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

### Primitive palette completion

The **Primitive palette** view compares non-deprecated records from
`tokens/color-palette.tokens.json`, including private records. Gray is the first
worked family; the same assessment covers the rest of the palette. Semantic and
component colors are outside this scope.

Palette assessment v1 is an additive report section, shared by Analysis,
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
Delta E 2000 is reported only as explanatory information. Invalid/unresolved
colors are unassessable, not equal strings. The older technical audit's
perceptual tolerance does not establish palette completion.

The **Close enough** color tolerance is an absolute difference of at most **1
per R, G and B channel**, measured on the 0–255 sRGB scale. For example,
`rgb(217, 217, 217)` is close enough to `rgb(218, 218, 218)`. A difference of 2 in
even one channel is not aligned. Channels are converted at full precision, not
rounded, clipped or gamut-mapped to make them pass. Both colors must be within
sRGB for this tolerance to apply; equivalent wide-gamut colors can still match
exactly under the existing rule. Opacity must match, allowing only conversion
round-off, not an alpha tolerance. This policy applies to all primitive palette
families, not just Gray. It does not change generator settings, color values,
classification matching, missing-mode handling or the technical audit.

Analysis, CLI JSON and Markdown share the tier results, counts and policy.
The report retains exact equality alongside the tier and includes per-channel
differences where the sRGB tolerance is applicable.

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
