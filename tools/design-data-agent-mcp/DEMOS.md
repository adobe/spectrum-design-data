<!--
Copyright 2026 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
-->

# Verified demo scenarios

`docs/site/src/pages/ai.md` markets a set of "what you can do with it" scenarios for the
Spectrum design-data MCP. This file is the live-verified scenario matrix behind that
marketing copy: every row was actually run against the tools wired into this repo's
`.mcp.json` (the **agent** server, `@adobe/design-data-agent-mcp`, embedded dataset
`3.2.5`), grouped by the persona who'd run it.

Re-run with `node tools/design-data-agent-mcp/scripts/verify-demos.mjs` after any change to
`src/tools/read.js` or the embedded dataset — it asserts the ✅ rows stay green and the ❌
rows stay tracked (not silently "fixed" without updating this file).

**Surface note:** `docs/site/src/pages/ai.md` documents the **public** `@adobe/design-data-mcp`
package (tool names prefixed `design-data-*`, e.g. `design-data-suggest`). This repo's
`.mcp.json` wires the **agent** package instead (bare tool names, e.g. `query_tokens`) which
has a different, smaller tool set — notably **no `suggest` tool**. Rows below are marked
`agent` or `public` accordingly.

Legend: ✅ pass · ⚠️ partial/misleading · ❌ fails as documented

## Custom-component developer

| Intent                                                     | Tool + args                                         | Surface | Status        | Note                                                                                                                                                                                                                   |
| ---------------------------------------------------------- | --------------------------------------------------- | ------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Get oriented before touching tokens                        | `primer`                                            | agent   | ✅             | Returns tokenCount, components\[], properties\[], taxonomyFields.                                                                                                                                                      |
| "What tokens does Button use?"                             | `query_tokens filter="component=button"`            | agent   | ❌             | Always `[]` — tokens aren't component-indexed despite `component` being an advertised filter key. (bead `spectrum-design-data-42lp`)                                                                                   |
| Follow Button's declared token bindings instead            | `describe_component id="button"` → `tokenBindings`  | agent   | ⚠️            | Works, but only lists 3 corner-radius bindings, and **all 3 reference token names that don't exist** in the registry (`corner-radius-button-small/large/extra-large`). Tracked in-depth: `spectrum-design-data-vpk.2`. |
| Pick a real value for a known property                     | `resolve_token property="corner-radius"`            | agent   | ✅             | Resolves and reports `candidateCount`, `ambiguous`, and `deprecated`; add variant/state/colorRole when the property is shared. (bead `spectrum-design-data-mhg5`)                                                      |
| Resolve a value in dark mode                               | `resolve_token property="color" colorScheme="dark"` | agent   | ✅             | The mode-set context is honored; inspect `ambiguous` and narrow with variant/state/colorRole when needed.                                                                                                              |
| Confirm Button's real prop vocabulary (variant/size/state) | `describe_component id="button"` → `options`        | agent   | ✅             | Full, accurate: variant (accent/negative/primary/secondary), size (s/m/l/xl), style, isDisabled/isPending/isLabelHidden, staticColor.                                                                                  |
| Read a guideline before committing a pattern               | `describe_guideline id="colors"`                    | agent   | ✅             | Full documentBlocks (purpose/guideline/do-dont/accessibility).                                                                                                                                                         |
| Filter tokens by a bare property name                      | `query_tokens filter="property=background-color"`   | agent   | ✅             | Returns the matching token set (many are deprecated aliases — check `lifecycle.deprecatedIn`).                                                                                                                         |
| Reverse-lookup a token from a hex value                    | *(no tool)*                                         | —       | ❌             | Not supported by any read tool; `suggest`/`resolve` both key off names, not values.                                                                                                                                    |
| Export a resolved token set as CSS/JS                      | *(no tool)*                                         | —       | ❌ (by design) | Documented non-goal — "does not generate component code."                                                                                                                                                              |

## Figma-variables designer

| Intent                                                               | Tool + args                                                                        | Surface | Status        | Note                                                                                                                                                                                                    |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Confirm real variant/size/state names before naming a Figma variable | `describe_component id="button"` → `options`                                       | agent   | ✅             | Authoritative vocabulary.                                                                                                                                                                               |
| "What's this token's hex in dark mode + high contrast?"              | `resolve_token property="<x>" colorScheme="dark" contrast="high" variant="accent"` | agent   | ✅             | Works for single-purpose properties; use narrowing fields and inspect `ambiguous`/`deprecated` for shared properties.                                                                                   |
| See mode-set values (color scheme / scale / contrast) up front       | `primer` → `modeSets`                                                              | agent   | ✅             | Returns `{colorScheme: ["light","dark","wireframe"], scale: ["desktop","mobile"], contrast: ["regular","high"]}`, sourced from `ds.primer()`'s `modeSets` array rather than the field-catalog registry. |
| Map a Spectrum token to a Figma variable name/collection             | *(no tool)*                                                                        | —       | ❌ (by design) | No Spectrum↔Figma variable mapping in this server; that bridging lives in the separate `figma` MCP.                                                                                                     |
| Ask in plain language ("background for a selected, hovered row")     | `suggest_token intent="…"`                                                         | agent   | ✅             | Ranks matching Spectrum tokens by confidence using natural-language intent. (bead `spectrum-design-data-st8c`)                                                                                          |

## PM / prototyper

| Intent                                                      | Tool + args                                                | Surface | Status | Note                                                                                                                                           |
| ----------------------------------------------------------- | ---------------------------------------------------------- | ------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Get oriented: token counts, components, registry vocabulary | `primer`                                                   | agent   | ✅      | Also surfaces `provenance.datasetStatus` — flags when the embedded snapshot is stale.                                                          |
| Check the embedded data is current                          | `primer` → `provenance.datasetStatus`                      | agent   | ✅      | Self-reporting works; it reports the live embedded version and current npm publication, and `isStale` is `false` when the snapshot is current. |
| Enumerate a component's options for a spec doc              | `describe_component id="<any>"`                            | agent   | ✅      | Verified on `button`; same shape for every component listed in `primer.components`.                                                            |
| Browse guideline categories                                 | `list_guidelines` / `list_guidelines category="designing"` | agent   | ✅      | 25 guidelines returned; category filter is a plain equality match.                                                                             |

## Contributor / PR reviewer

| Intent                                               | Tool + args                                 | Surface | Status | Note                                                                                                                                |
| ---------------------------------------------------- | ------------------------------------------- | ------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Validate a dataset against schema + relational rules | `validate_usage path="<dataset>"`           | agent   | ✅      | Layer-1 + Layer-2 checks run; `exceptionsPath`/SPEC-007 naming allowlist is **not honored** in-process (documented gap in read.js). |
| Diff two dataset snapshots                           | `diff_datasets oldPath="<a>" newPath="<b>"` | agent   | ✅      | `filter` is a case-insensitive **substring on token name only** — not the query-expression grammar used elsewhere.                  |

## Known-broken examples to never copy into docs again

These are the exact strings that appear (or appeared) in shipped docstrings/SKILL.md and
**do not work** against the embedded dataset — kept here so nobody re-adds them:

* `query_tokens filter="category=color"` → `category` is not a valid filter key.
* `resolve_token property="accent-background-color-default"` → that's a legacyKey-shaped
  compound name; `resolve_token` wants the bare `name.property` segment (see `primer.properties[]`).
* `query_tokens filter="component=button,state=hover"` → always `[]`; tokens aren't
  component-indexed.
