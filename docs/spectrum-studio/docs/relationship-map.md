<!-- Copyright 2026 Adobe. All rights reserved. -->

# How agents use the relationship map

The relationship map helps agents find what existing code and data depend on,
and what depends on them. Agents manage it through the
[relationship-map skill](../../../.ai/skills/relationship-map/SKILL.md).
You do not need to write graph queries or update it yourself.

It covers Spectrum Studio, `packages/design-data`, `packages/design-data-spec`,
`sdk` and `tools/design-data`. It is not a map of the entire monorepo.

## What happens during a task

For normal local changes, the agent inspects the changed owner and immediate
relevant dependencies/dependents in source and tests. It does not automatically
walk every connected part of the project.

When graph work is specifically approved, the agent requests a small
summary for the relevant area. It includes incoming and outgoing relationships,
source locations, circular import groups and known gaps. The agent uses those
leads to inspect existing owners and reusable code instead of starting from a
wide file search.

The command checks whether the saved map matches the current source,
configuration and tools. If it does, it reuses the map. If it does not, it
stops without rebuilding. A full rebuild requires separate approval and an
explicit refresh command. Narrowing the summary does not narrow the cost of
hashing inputs or loading the saved graph, so even cached queries are currently
heavy work. Missing bounded current context is a reported evidence gap, not
a requirement to block development until the entire graph can be rebuilt.

After changing mapped inputs, the agent reviews the changed direct relationships
in source. If graph comparison is explicitly approved and a current generation
is available, it can compare with the start generation. This shows added and removed relationships and
cyclic import groups containing added links. The agent explains intended
changes and checks unexpected ones in source. Changes made concurrently by
another session are not automatically attributed to this task.

## What this does and does not establish

The map records directed imports, type-only imports, structured-data references,
package declarations and Rust syntax facts. Relationships include source
evidence. Unresolved references remain visible rather than disappearing.

It does not prove which code executes, whether two functions behave alike,
which state subscriptions run, or whether a change is fast or correct. Rust
symbols, macro expansion and some dynamic/cross-language references need other
tools or source inspection. Counts of unresolved references are not bug counts.

The graph is evidence, not architectural authority. An existing relationship
may be worth changing; a circular group is a review lead, not proof of a crash.
There is no new architectural CI gate or automatic refactoring.

Compact context is limited to 8 KiB. Truncation includes omitted counts and a
path to that request's detailed result. This reduces unnecessary prompt content,
but does not guarantee a particular token saving or eliminate source reading.

## Storage and safety

Generated maps and the pinned local Python environment live under
`.cache/relationship-map/` at the checkout root. They are ignored by Git and
independent of the original Copilot session. Sessions in this checkout share
the cache; other worktrees/checkouts set up their own.

Each graph generation is verified before it replaces the current one. A failed
refresh leaves the previous generation available, but not falsely marked
current. A busy runner, moving source or failed refresh stops the operation:
the agent reports the problem rather than retrying or bypassing limits.
No watcher, service or recurring indexing job is installed.

Initial setup is an explicit operation. It uses an available `uv` executable
to install Python 3.12.12, tree-sitter 0.26.1 and tree-sitter-rust 0.24.2 into
the checkout-local cache. Routine queries never install software.

## Agent commands

From the monorepo root:

```sh
# Inspect the selected operation without running it.
pnpm --dir docs/spectrum-studio check:list --only relationship-map-context

# After explicit approval: initial setup; uv must already be available.
pnpm --dir docs/spectrum-studio check:focused --profile performance --only relationship-map-setup --heavy-approved --scope-approved

# After separate approval: refresh the five-area map.
pnpm --dir docs/spectrum-studio check:focused --profile performance --only relationship-map-refresh --heavy-approved --scope-approved

# Approved cached context: never rebuilds automatically.
pnpm --dir docs/spectrum-studio check:focused --profile performance --only relationship-map-context --heavy-approved --scope-approved --graph-focus docs/spectrum-studio/src/features/styles

# After approval: report freshness without rebuilding.
pnpm --dir docs/spectrum-studio check:focused --only relationship-map-status --heavy-approved --scope-approved

# Approved comparison: requires an already-current graph.
pnpm --dir docs/spectrum-studio check:focused --profile performance --only relationship-map-compare --heavy-approved --scope-approved --graph-baseline GENERATION_ID --graph-focus docs/spectrum-studio/src/features/styles
```

`--graph-focus` can be repeated. Omit it only for a specifically requested
five-area overview. Flags record permission, not grant it.
Generation IDs are checkout-local. Context and comparison print a compact
packet and write a separate full result in that runner invocation's output
directory. A new commit alone does not force rebuilding when source and other
tracked inputs are unchanged.

Root `AGENTS.md`, Studio's entry point and the scoped canonical rule route
agents to the skill. Client instruction/skill discovery varies. Generated-file
checks establish that the guidance is present, not that every client or model
will follow it. Automatic fresh-session loading must be observed in the client
before claiming that it is enforced.
