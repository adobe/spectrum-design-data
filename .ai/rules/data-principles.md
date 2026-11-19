---
description: Principles for the structured design-data system (identity, anatomy, recipes, migration)
globs: packages/design-data/**/*.json, packages/design-data-spec/**, docs/proposals/**, sdk/core/**, sdk/cli/src/spec_sheet.rs
---

<!-- Copyright 2026 Adobe. All rights reserved. -->

# Data principles

1. **One source per fact.** Copies are derived or checked. A rule that only keeps copies in agreement is a smell.

2. **Identity is structured.** Prose (`context`, labels) is display only.

3. **Fix the data, do not add a field.** If structure cannot tell records apart, change the data. Remove unused fields before anyone depends on them (Hyrum's law).

4. **Vocabularies do not overlap.** A term is a part or a kind, never both.

5. **Rank sources:** tokens and Figma Web POC, then React Spectrum S2, then SWC. On a conflict or gap, assume, record a `needs-decision` bead, and carry on.

6. **Breaking changes are fine for the new format.** Legacy names and Figma variable names are generated from the name object. Hand-written names and `legacyKey` pins are counted migration debt. `@adobe/spectrum-tokens` names and structure stay stable; value changes are intentional, versioned, and in the changeset.

7. **Prove neutrality.** Byte-identical renders and spec sheets, per-component ratchet baselines, warning to error at zero per component. Measure a sample before a corpus-wide rule.

8. **Small shippable slices.** Old and new forms coexist (expand, migrate, contract). File the contract bead when the expand starts.

9. **Stop debt growing.** No new context bindings.

10. **Garth decides meaning for now.** Design confirms later through per-component `needs-decision` beads. See "When to ask" below.

11. **Recipes force the questions.** A finding is progress.

12. **Consolidate.** Propose the option with fewer tokens, terms, or options.

13. **Design sees a change before code does.**

14. **No compatibility shims.** Only `@adobe/spectrum-tokens` is a compatibility surface. To consolidate, delete the superseded term and migrate its uses. Names from other implementations are registry `aliases`: documentation plus lint, never valid names.

15. **Deprecated records are a frozen archive.** Do not rely on them or change them. If a live record needs one, repoint the live record or un-deprecate it on purpose. The identity check ignores them.

16. **Parts cover slots and named layout groups.** A part is warranted when a design source names it and it owns a value, when it is a slot, or when it is an option-togglable region. RFC [#1801](https://github.com/adobe/spectrum-design-data/issues/1801) owns slot typing, with an explicit `slots[].part` link; the slot rules are in progress, so follow the RFC rather than inventing rules here. Pending 5m92.8: `anatomy-format.md` still forbids layout groups as parts.

17. **Identity is `(property, attribute, part, between)`.** `contextRole` is derived from the property where the property implies it. `contextQualifier` is retired. Proposal 018 has the detail.

Also: readers are tolerant of unknown input, and a backfill is verified before the old form is removed.

## When to ask

A call goes to Garth if it:

* decides meaning;
* is hard to undo: published data or fields, `@adobe/spectrum-tokens`, CLI versions, schema contracts;
* is a source tie the ranking in principle 5 does not settle;
* widens scope;
* survives a review round;
* costs real credits.

Slice agents end their report with "Decisions I made", each labelled `meaning`, `contract`, `local-reversible` or `scope`, and "Questions for Garth", blocking first.

## CLI version

Bump `sdk/cli/Cargo.toml` only if its current version already has a `design-data-cli@<version>` tag. Never change `requires.cli` in a feature PR; raising it is a release-time step (bead p6ga.27). Rule and gate: `tools/cli-minimum-gate/gate.sh`.
