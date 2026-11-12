---
name: relationship-map
description: >-
  Required for relationship-sensitive planning, features, refactors and impact
  review in Spectrum Studio, design-data, design-data-spec, sdk or tools/design-data.
  Review immediate dependencies/dependents in source. Graph work is optional,
  explicitly approved and bounded; context queries never rebuild automatically.
license: Apache-2.0
---

<!-- Copyright 2026 Adobe. All rights reserved. -->

# Relationship map

Use the source-backed map already implemented in this repository, not a Graphify
installer or a new indexing service. The user should not operate the graph.

## Start with the task

Read the relevant package guidance and, for Studio, its existing domain map and
master migration plan. State the owner -> shared derivation -> consumers in the
existing plan/reasoning when the task changes system behavior.

For normal local work, inspect the changed owner, direct dependencies and direct
consumers relevant to the requested behavior. Keep the scope to that element,
not every transitive consumer. State any graph-evidence gap.

Graph context is not a mandatory startup or completion step. Even a narrow
response currently hashes broad inputs and loads complete graph artifacts.
Request permission for that named heavy work before running it. From the
repository root, inspect the exact selection first; after approval:

```sh
pnpm --dir docs/spectrum-studio check:list --only relationship-map-context
pnpm --dir docs/spectrum-studio check:focused --profile performance --only relationship-map-context --heavy-approved --scope-approved --graph-focus docs/spectrum-studio/src/features/styles
```

Replace the focus with the task's root-relative file/directory. Repeat
`--graph-focus` for multiple immediate related paths. Omit it only for a
specifically requested five-area overview. No query JSON or log-directory
configuration is needed.

The context operation checks content/configuration/tool fingerprints. It reuses
a verified current generation or stops with an explicit stale/missing result.
Queries never extract automatically. If a full refresh is necessary, obtain
separate approval and select `relationship-map-refresh` with
`--heavy-approved --scope-approved`. A profile or flag records approval, not
grants it. No retry, higher limit or application change is authorized.

Save the returned `generation` ID in task reasoning. Read the compact output:
dependencies and dependents have explicit `source`/`target`, relationship kind,
type/value phase, resolution status and source evidence. If `truncated` is true,
narrow the focus or inspect the uniquely named `detail` result selectively.
Never load the complete graph into the prompt.

## Use the evidence

* Inspect existing owners, helpers and package APIs before adding new logic.
  Verify actual availability and browser/Node/Rust compatibility; a declared
  package export may point at missing or generated source.
* Inspect cited source for behavior and use the existing Scout/Ferrograph
  procedures where available. Imports do not prove execution, equivalent
  behavior, state propagation, duplication or performance.
* Preserve `unresolved` and unsupported relationships as unknowns. Follow the
  existing bounded source/test procedures for runtime subscriptions, calls,
  macros and cross-language flows that the map does not resolve.
* Name proposed relationship changes in the feature/refactor plan. The current
  architecture need not be preserved when a reviewed change improves it.
* Other checkouts/worktrees have independent caches and generation IDs. Do not
  pass a generation ID as though it belongs to a different checkout.

## Finish with a relationship review

Review changed immediate relationships in source/tests. If a current generation
was obtained and graph comparison is explicitly approved, compare against it:

```sh
pnpm --dir docs/spectrum-studio check:focused --profile performance --only relationship-map-compare --heavy-approved --scope-approved --graph-baseline GENERATION_ID --graph-focus docs/spectrum-studio/src/features/styles
```

Replace `GENERATION_ID` with the actual returned ID. Comparison requires an
already-current graph and never rebuilds it. It reports added/removed relationships and cyclic groups with
added value-import links. Shifted source line numbers are not new dependencies.
Explain intended changes; investigate unexpected links within the task's scope.
Do not silently fix unrelated architecture or infer a regression from counts.
Check source attribution when other sessions changed the shared checkout.

Do not refresh automatically at startup, completion or after an edit.
Use focused source evidence when current graph evidence cannot be obtained
within the approved budget. Never label stale evidence current, add a watcher
or run periodic indexing.

## Setup and stopping

Graphs and the pinned Python runtime live in `.cache/relationship-map/` in this
checkout. A new session in the same checkout reuses them. They are disposable
derivatives, never the canonical source or committed artifacts.

If setup is missing, use the explicitly selected setup operation with an
available `uv` executable:

```sh
pnpm --dir docs/spectrum-studio check:focused --profile performance --only relationship-map-setup --heavy-approved --scope-approved
```

Setup, unlike a query, explicitly installs the pinned Python/runtime dependencies
locally. An existing `uv` outside PATH can be supplied with
`--graph-uv /absolute/path/to/uv`. Never hard-code this machine's path into
instructions, install global packages, or silently download tools during
context preparation. If `uv` is unavailable, report the setup prerequisite
instead of substituting an incomplete graph.

A busy runner returns immediately: continue independent work, without waiting,
polling or retrying. Failed refresh, moving source, cutoff or incomplete cleanup
stops graph work. Ask before retrying or launching replacement work.
Never delete another run's lease or processes. The previous
generation may remain on disk but must not be presented as current.

See the [plain-English guide](../../../docs/spectrum-studio/docs/relationship-map.md)
for coverage and client-discovery limits. Startup guidance is not proof that
every agent client automatically loaded this skill; follow its readable source
path if native skill discovery is unavailable.
