---
name: parametric-systems-design
description: >-
  Required before planning or implementing Spectrum Studio features that affect
  authored data, relationships, naming, formulas, rules, generators, or generated
  output, even when requested as UI changes. Identify reusable source data,
  ownership, references, derivation, consumers, and propagation checks.
license: Apache-2.0
---

<!-- Copyright 2026 Adobe. All rights reserved. -->

# Parametric systems design

Spectrum Studio authors systems, not screens or isolated token values. Simple,
reusable definitions are the source of truth; UI and generated design data are
consumers. Apply this check before choosing controls or adding persisted fields.

## Required check

Read Studio's `AGENTS.md` and the relevant domain skill. In the existing plan or
implementation reasoning, briefly state **data owner -> derivation -> consumers**,
using actual model and function names where they exist. Do not create a separate
architecture document for each task.

1. **Find the source and owner.** What does the designer actually author? Which
   domain owns it? Identify existing formulas, rules, scales, option groups,
   structures, and Registry terms to reuse before introducing new definitions.
   Persist intent and references, not a second editable copy of generated results.
2. **Connect definitions by reference.** Use stable identities and explicit
   relationships. Do not infer identity or behavior from display labels. System
   vocabulary and generated names use Registry terms and existing classification
   ordering; descriptions, local labels, and uncommitted drafts are separate.
   Follow Studio's `taxonomy-vocabulary` skill for the naming procedure.
3. **Trace the derivation.** Show how the requested behavior reaches the existing
   formula, rule, generator, or resolver and then each affected preview/output.
   Do not compute a second version inside a component or exporter. Shared
   semantics can have different rendering/export adapters; they do not require
   one giant generator. Layout, visibility, and relationships can remain design
   data without becoming tokens. Do not generate tokens merely to represent UI.
4. **Separate state by purpose.** Distinguish authored inputs, derived results,
   and temporary selection or preview state. Preview switches must not silently
   change authored defaults. Caches are disposable derivatives, not independently
   editable sources. Manual overrides remain explicit, visible, and revertible.
5. **Configure presentation from capabilities.** Reuse controls and bind them to
   the selected domain object. Show only supported properties. Do not duplicate
   domain behavior per panel or shape stored data around a screen's layout.
6. **Name the evidence.** For new behavior, add a focused test changing an upstream
   input and checking affected consumers, unchanged unrelated consumers, and
   preview/output agreement where applicable. Name checks for save, reload,
   Changes, Impact, and reset when authored data changes. UI screenshots alone
   do not establish this contract.

Use the smallest existing abstraction that fulfills the request. Do not add a
generic engine, global library, or generator registry speculatively. If a
required shared capability is missing, explain the bounded extension and ask
about genuine architectural choices rather than silently building a workaround.
Pure styling changes only need to confirm that system behavior is unchanged.

## Two examples

* **Variant requested as a new canvas card:** reference the shared structure and
  store only the option's differences, instead of copying a complete structure
  per card. Resolve the differences through the shared path. A layout-only
  difference does not require a semantic token.
* **Element-specific Appearance panel:** configure reusable controls from the
  element's supported fields and bind them to its domain data, instead of
  duplicating pickers and keeping separate panel-owned values.

## Existing procedures still apply

Use Studio's `authoring-lifecycle` skill for persistence, Changes, Impact, and
reset integration; `design-data-contract` for output alignment and diagnostics;
and `component-catalog` for control reuse. This check chooses the systems model,
not a replacement for those procedures. Do not block loading or editing because
authored data differs from the reference specification.
