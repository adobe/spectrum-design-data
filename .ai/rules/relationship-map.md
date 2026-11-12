---
description: Fresh relationship context and before/after dependency review for the five mapped project areas
globs: docs/spectrum-studio/**,packages/design-data/**,packages/design-data-spec/**,sdk/**,tools/design-data/**
---

<!-- Copyright 2026 Adobe. All rights reserved. -->

# Relationship-aware work

Read `.ai/skills/relationship-map/SKILL.md` when working in these areas.
Review the changed owner and immediate relevant dependencies/dependents in
source/tests before relationship-sensitive changes. Use existing graph evidence
as leads when available; do not rediscover the entire architecture.

Graph queries, freshness checks and refreshes are explicitly approved heavy work,
not mandatory local startup/completion steps. A focused response can still
require broad hashing/loading. Queries never rebuild automatically. Request
`relationship-map-refresh` separately if a full rebuild is necessary.
When bounded current context is unavailable, state the limitation and use
focused source/test evidence; never present an old graph as current.
Busy means not run, not wait: continue independent work without polling/retries.
Stop graph work on failed refresh or resource cutoff. Never bypass admission
or install dependencies during a query.

Before creating new logic, check existing owners and relevant SDK/tool APIs.
Confirm behavior and runtime compatibility in source/tests. Keep Scout and
Ferrograph's existing semantic/symbol roles; graph links are not architectural
authority or a complete call/data-flow graph.

If approved graph work returns a current generation, retain its ID. Compare
against that baseline only within explicitly approved scope and budgets.
Otherwise review changed direct relationships in source and report the graph
evidence gap. Explain intended changes
and investigate unexpected coupling within the approved scope. Concurrent
checkout changes are not automatically attributable to this task.

Read compact packets and cited source, not the complete `graph.json`. Do not
expand map coverage, add architectural gates or refactor unrelated modules
without approval.
