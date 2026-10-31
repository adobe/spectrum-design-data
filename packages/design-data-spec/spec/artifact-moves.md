# Artifact moves

**Spec version:** `1.0.0-draft` (see [Overview](index.md))

This document defines how one artifact moves between a platform manifest and the foundation: **promotion** (platform to foundation) and **demotion** (foundation to one platform). Moving a whole platform out of this repo is a different operation; see the ejection contract in [`platforms/README.md`](../../../platforms/README.md#the-ejection-contract).

**Principle.** A move is a data operation that changes no one's output unless they choose it. The artifact keeps its identity, has one owner at a time, and other platforms lose nothing without notice.

This chapter is separate from [Manifest](manifest.md) because a move happens over time, like the deprecation policy in [Evolution](evolution.md), while the manifest describes one static cascade.

## What can move

Identity decides what can move. A move keeps the artifact's identity, so it needs a stable one.

| Artifact                             | Identity | Moves?                  | Notes                                                                                                                                                                                                                                            |
| ------------------------------------ | -------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Token                                | `uuid`   | Yes                     |                                                                                                                                                                                                                                                  |
| Relationship (CTR)                   | `uuid`   | Yes                     | Moves with its component, or on its own when the component is foundation-owned.                                                                                                                                                                  |
| Component                            | `name`   | Yes                     | Moves as a unit: anatomy, states, relationships, visual recipe and guidelines move with it.                                                                                                                                                      |
| Mode set                             | `name`   | Yes                     | Promotion adds the set, or its extra modes, to the foundation set of that name. A mode set gets an optional `lifecycle` so a move is visible on the set itself (the schema change is tracked separately; see [Open questions](#open-questions)). |
| Guideline                            | `name`   | Only with its component | A guideline is not moved on its own. It follows the component it describes.                                                                                                                                                                      |
| Field declaration                    | `name`   | No                      | Fields are the shared naming vocabulary. A platform asks the foundation team to add a value or field. They stay foundation-owned.                                                                                                                |
| Implementation mapping               | n/a      | No                      | Always platform-owned by definition (`extensions/implementations/`).                                                                                                                                                                             |
| Platform extension (term annotation) | `termId` | No                      | It annotates a foundation term for one platform. It has no foundation form.                                                                                                                                                                      |

A component is identified by `name`. Its move record says where it came from and when; the identity is separate and does not change.

**NORMATIVE:** Things a moved component only *uses* (tokens, mode sets) do not move with it. Each is checked separately in the impact check; one that is still needed in the old place stays there, or is promoted in its own move.

## Who decides

**NORMATIVE:** The foundation team decides every move. The platform team that owns the manifest **SHOULD** be part of the discussion.

A proposal is a tracked issue (a bead or a GitHub issue) that states:

1. What moves, and in which direction.
2. Why.
3. Evidence from two or more platforms (promotion), or the design decision (promotion with one platform).
4. For a promotion, the foundation values. The foundation team sets them; see [Foundation defaults](#foundation-defaults).

The issue's id is recorded in `lifecycle.moves[].proposal` when the move lands.

## Promotion criteria

**NORMATIVE:** An artifact **MAY** be promoted when either holds:

* Two or more platforms need it.
* One platform needs it and the foundation team records a design decision that it belongs in the foundation.

One platform alone is not enough. An artifact stays platform-local until there is evidence.

Demotion has no evidence threshold. The foundation team demotes an artifact when it turns out only one platform uses it, or when the design decision behind it is reversed.

## The six steps

The steps are the same in both directions. Where they differ, each direction is written out.

1. **Proposal.** Open and agree the issue above.
2. **Impact check.** List every platform and product that resolves, overrides or references the artifact. List everything the artifact references that is not moving with it. List product-layer overrides ([Product context](product-context.md)) in a separate, clearly marked list. A move cannot fix them, since neither the foundation nor a platform owns them, so the check names them as affected consumers to notify. They do not block the move. The planned `design-data platform move --dry-run` reports this.
3. **Move.** Put the artifact in its new place, with the same identity, and remove it from the old place **in the same change**. Never leave a state where both places own it.
4. **Compatibility.** Keep other platforms' output unchanged. See [Other platforms](#other-platforms).
5. **Verify.** Run dataset validation, snapshot and legacy-output parity, and SPEC-076 for each affected platform (`validate --platform <id> --visuals-path`).
6. **Record provenance.** Add a `lifecycle.moves` entry.

### Promotion

* **3.** Move the file content from `platforms/<id>/extensions/<kind>/` into the matching foundation directory under `packages/design-data/`. Delete the extension file.
* **Mode added to a set.** **NORMATIVE:** A promotion that adds a mode to a foundation mode set **MUST** declare a fallback mode for it, and validation **MUST** check that the fallback exists in the set. A token that omits a mode field applies under the set's default, which for `colorScheme` is `light`, a poor stand-in for `dark-elevated`. Without a declared fallback, platforms with no values for the new mode would silently resolve to the wrong thing. SPEC-005 already checks peer-mode coverage; the fallback check is proposed as SPEC-078 below.
* **4.** The foundation record carries the values the foundation team set. A platform whose values differ keeps them as an `overrides` entry (tokens) or a platform replacement (mode sets, components). Its output does not change.
* **Version.** **NORMATIVE:** A promotion adds foundation content, so it is a **minor** change ([Evolution: Change classification](evolution.md#change-classification)). The release that contains it is the `version` recorded in the move.

### Demotion

* **3.** Move the record into `platforms/<id>/extensions/<kind>/` with the same identity. In the foundation, replace it with a **deprecated stub**: the same identity and value, `lifecycle.deprecatedIn` set to the current foundation version, a `deprecatedComment` naming the platform, and the `lifecycle.moves` entry. The stub is the announcement.
* **4.** Other platforms keep resolving the stub for the whole notice period, so their output does not change.
* **Notice period.** **NORMATIVE:** The stub **MUST** stay in the published dataset for at least the window in [Evolution: Migration windows](evolution.md#migration-windows): two minor versions after `deprecatedIn`, or a later `plannedRemoval`. A demotion is a deprecation, not a removal, so the stub is a **minor** change. Removing the stub afterward is the breaking step. [Evolution](evolution.md) lists removal as a major change but also permits it two minors after `deprecatedIn`. These do not conflict: removal after the window is allowed in a minor release because the deprecation already gave notice, and removal before the window ends needs a major release. A demotion does not use `replacedBy`, because the successor has the *same* identity and lives outside the foundation.
* A platform that wants to keep the artifact **MUST** copy it into its own `extensions/` before the stub is removed. The `lifecycle.moves` entry names which platform received it.

## Other platforms

Overrides and extensions in other platforms are kept, not rewritten.

* **Promotion.** An existing override still replaces the foundation record for that platform ([Manifest: overrides](manifest.md#overrides)). Its `overriddenFrom` now holds the **new** foundation value, because `overriddenFrom` is computed from whatever the foundation holds at load time. Platforms that already carried a copy of the artifact in `extensions/` **MUST** remove it in the same change, or SPEC-077 (below) would flag the duplicate.
* **Demotion.** An override of the demoted token keeps working while the stub exists, because the stub has the same `uuid`. When the stub is removed the override has no target. The impact check lists these overrides so their owners can act during the notice period.
* `overriddenBy` and `overriddenFrom` stay in-memory only. They say who is overriding a record now. They are not history; `lifecycle.moves` is.

### Foundation defaults

**NORMATIVE:** When platforms disagree on a promoted artifact's values, the foundation team chooses the foundation values in the proposal. This specification does not pick a default.

## Recording a move

**NORMATIVE:** Every move **MUST** add one entry to `lifecycle.moves` on the artifact (the foundation record, or the platform record after a demotion), keeping earlier entries. The array is a history, oldest first.

| Field       | Type                  | Required | Meaning                                     |
| ----------- | --------------------- | -------- | ------------------------------------------- |
| `direction` | `promote` or `demote` | Yes      | Which way it moved.                         |
| `from`      | place                 | Yes      | Where it was.                               |
| `to`        | place                 | Yes      | Where it is now.                            |
| `version`   | string (version)      | Yes      | Foundation version that contains the move.  |
| `proposal`  | string                | Yes      | Issue id of the proposal.                   |
| `date`      | string (date)         | No       | Date the change landed.                     |
| `decidedBy` | string                | No       | Who decided, for example `foundation team`. |
| `evidence`  | array of string       | No       | Platform ids that needed it (promotion).    |
| `comment`   | string                | No       | Free text.                                  |

A **place** is `{ "foundation": true }` or `{ "platform": "<id>", "platformVersion": "<version>" }`. `platformVersion` is optional.

```json
"lifecycle": {
  "moves": [{
    "direction": "promote",
    "from": { "platform": "ios", "platformVersion": "0.3.0" },
    "to": { "foundation": true },
    "version": "3.8.0",
    "proposal": "spectrum-design-data-p6ga.8.19",
    "date": "2026-11-12",
    "decidedBy": "foundation team",
    "evidence": ["ios", "android"]
  }]
}
```

How these fields relate to the existing ones:

| Field                            | Where it lives                 | Relationship                                            |
| -------------------------------- | ------------------------------ | ------------------------------------------------------- |
| `lifecycle.moves`                | Authored, in the data file     | Permanent history of moves.                             |
| `lifecycle.deprecatedIn`         | Authored, on the demotion stub | Starts the notice period. A promotion does not set it.  |
| `lifecycle.replacedBy`           | Authored                       | Not used by moves; the successor has the same identity. |
| `overriddenBy`, `overriddenFrom` | In memory only                 | Current override state. Never written, never history.   |

## Detecting a half-finished move

**PROPOSED, not implemented.** Two rules.

`SPEC-077` (`artifact-single-owner`, error): when a dataset is loaded with a platform manifest, the same identity (token or relationship `uuid`, or component, mode set or guideline `name`) **MUST NOT** be *defined* in both the foundation and the platform's `extensions/`, with one exception. During a demotion window the artifact exists in both places on purpose: the foundation record is a deprecated stub (it has `lifecycle.deprecatedIn` and a `lifecycle.moves` entry whose `from` is the foundation) and the platform copy overrides it. The rule fires when both records are active and not deprecated, or when the stub outlives its window. A manifest `overrides` entry is not a definition and is always allowed.

`SPEC-078` (`promoted-mode-fallback`, error): a mode added to a foundation mode set by a promotion **MUST** have a declared fallback mode that exists in the same set. The field that declares it is decided in its implementation bead.

## Open questions

Settled in this chapter: version bumps, the fallback for a promoted mode, the `lifecycle.moves` shape for components, the stub-and-copy overlap during a demotion window, and product-layer overrides in the impact check.

1. **Mode-set schema.** This chapter says mode sets carry an optional `lifecycle`. The mode-set schema has none and allows no extra properties, so adding it is a published schema change with its own changeset. Tracked as a follow-up bead.
2. **Fallback field.** Where the fallback mode is declared (on the mode set, or per mode) is not decided.
3. **`platformVersion` on `overriddenBy`.** Deferred in p6ga.8.9. Add it only if diff tooling or the iOS Figma work needs it.

## References

* [Manifest](manifest.md): capability matrix, overrides and `extensions/`.
* [Evolution](evolution.md): deprecation lifecycle and migration windows.
* [Token format: Lifecycle and metadata](token-format.md#lifecycle-and-metadata).
* [Cascade](cascade.md): layer precedence.
