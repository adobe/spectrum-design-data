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

## Stored terms and displayed labels

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
legacy sRGB settings still migrate to Hex. Matching output notation alone does not establish matching color values.

sRGB output uses design-data's comma-separated notation: `rgb(255, 255, 255)`
for opaque colors and `rgba(0, 0, 0, 0.08)` when alpha is below one. This changes
notation only; channel precision and color calculations are unchanged.
Display P3 and Rec 2020 retain the space-separated `color(...)` syntax required
by CSS. Matching notation alone does not establish matching color values.

The default Wireframe foundation is an ordinary color scale with one seed,
`rgb(72, 110, 194)`, represented internally in OKLCh. It retains its existing scale,
stop, and term IDs and uses shared contrast steps to generate its ramp. This does
not implement a Wireframe mode, and storage upgrades do not add it to old saves.

## What the percentages mean

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

The shared report adds optional independently versioned `coverage.schemaVersion: 1`;
outer report v1 and its existing metrics/findings remain intact. CLI and page use the
same calculations and JSON/Markdown summaries. No new mappings, authoring/generator/
storage behavior, Home metric, accepted schema, upstream data import or health score
is introduced. Existing native/proposed-schema boundaries remain explicit.

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
