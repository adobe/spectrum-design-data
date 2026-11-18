<!-- Copyright 2026 Adobe. All rights reserved. -->

# RFC draft: deletion and deprecation

Status: local draft, not submitted or accepted upstream. Tracked as LTAX-024.
Studio implements phase 1 for Registry terms and categories, color scales and
aliases. Published design-data schemas and the canonical corpus are unchanged.

## Problem

Deleting an item that design-data already shipped breaks every consumer that
uses its ID or name. Deleting something a user made a minute ago breaks
nothing. Studio treated both the same way: delete, then offer Undo.

Only tokens could record that they were deprecated. Registry terms,
categories and color scales had no lifecycle data, so the only way to retire
one was to delete it.

## Proposal

### Two kinds of delete

* **Unshipped items** (made in this working session, not in the shipped
  data) delete straight away. A toast says "{Item} deleted" and offers Undo.
* **Shipped items** open a "Delete {kind}" dialog instead. Studio never
  deletes them directly. The dialog offers:
  1. **Rename instead**, for simple items such as a Registry term. The ID
     stays the same, so every mapping and reference keeps working. This is
     the recommended path when the user wants to swap one word for another
     (for example "Accent" to "Brand").
  2. **Deprecate and replace**, which marks the item as deprecated and names
     an active item of the same kind that consumers should use instead.
  3. **Deprecate**, which marks the item as deprecated with no replacement.

"Shipped" means the item's ID is in the shipped change snapshot (the data
Studio loads before any edits). Already-deprecated items explain that they
can only be removed with **Remove all deprecations**.

### Replacement rules

A replacement is always the same kind of item, active (not deprecated) and,
for tokens, the same token type.

| Item           | Rename | Replacement                                       |
| -------------- | ------ | ------------------------------------------------- |
| Registry term  | Yes    | An active term in the same category               |
| Category       | No     | None. Categories can only be deprecated           |
| Color scale    | Yes*   | An active published scale with the same steps     |
| Token (later)  | Later  | An active token of the same type                  |

\* A color scale offers **Rename instead** only when its name is a Registry
term. Renaming changes that term's text, so the scale ID, the term ID and
every step token ID stay the same.

A color scale replacement must have exactly the same contrast steps, so each
step token maps to the replacement's token at the same step. Scales with
different steps (for example gray and silver) need a fuller workflow and are
not offered.

Deprecating a published color scale also deprecates each of its step tokens,
using the existing token lifecycle and replacement fields.

### Lifecycle data

Terms, categories and color scales gain an optional `lifecycle` object. It is
present only when the item is deprecated:

```json
{
  "lifecycle": {
    "deprecated": true,
    "deprecatedIn": "",
    "deprecatedComment": "",
    "replacedBy": "<id of an item of the same kind>"
  }
}
```

* `deprecated` is always `true`. Remove the object to make the item active.
* `deprecatedIn` stays empty until a release assigns it (DEBT-047). Badges say
  "Deprecated, pending release" until then.
* `replacedBy` is optional. Categories never have one.
* A replacement may itself be deprecated later. Validation only checks that it
  still exists and is the same kind (for terms, the same category). Studio
  offers only active items when choosing.

Tokens keep their existing authoring lifecycle (`replacementIds`, which
design-data emits as `replaced_by`).

### Remove all deprecations

The Changes panel has a **More** menu (edit mode only) with **Remove all
deprecations**. A destructive confirmation explains that this is a breaking
change that cannot easily be undone once published. Before confirming, it
shows how many items will be removed, how many uses will move to a
replacement, how many values will be hard-coded, and how many items will be
kept. Then Studio:

* Removes each deprecated category (with its terms), term, color scale (with
  its step tokens) and token.
* Moves uses of a removed item to its replacement. Replacement chains are
  followed to the last active item. Uses of a scale step move to the matching
  step of the replacement scale.
* Hard-codes the resolved value, per mode, where a removed token with no
  replacement is used by a component or a value slot.
* Keeps an item, and lists it with the reason, when it cannot be removed
  safely: a category still in use, an alias with no replacement, or a token
  still used by styles or structures.
* Records a removed shipped token as `removed: true` in the token edits, so
  it disappears from the working tokens without editing source data.

The toast offers **Undo**, which restores the whole removal in one step. After
that, removed items show in the Changes panel and can be restored with Reset.
A deprecation shows in Changes as one line, such as "Deprecated, replaced by
Red", and Reset removes it as a whole.
If removing one item fails, uses already moved or hard-coded stay that way.
This is not a breaking change.

## Current limits and future GitHub wiring

Studio is not connected to GitHub or to design-data releases yet. All edits,
deprecations and removals stay in the browser until the repository cutover
(M5 in `master-migration-plan.md`). The table below lists what works today
only because of that, and what must be rewired when the connection exists.
Known-debt items DEBT-046 and DEBT-047 track the work.

| Area | How it works today | What changes when connected |
| ---- | ------------------ | --------------------------- |
| What "shipped" means | `isShipped` (`src/features/changelog/shipped.ts`) checks `shippedChangeSnapshot`, the defaults bundled into the app at build time (`src/data/design-system.defaults.json`) | Read the last published design-data release instead. Decide how to treat items merged on `main` but not yet released |
| Where work is saved | Browser storage only (`src/features/edit-session/storage.ts`). Nothing reaches other people or the repository | Removals and deprecations must be exported as a design-data change (pull request) |
| Undo | The toast's Undo is held in memory and is lost on reload or when the toast closes. Changes Reset still works after that | Once a removal is published, Undo and Reset cannot bring it back for consumers. The confirmation already warns about this, but nothing enforces it yet |
| Removed tokens | Recorded as `removed: true` in the browser token edits; source data is not edited | The export must delete the token from the design-data files. Confirm every output reader skips `removed` tokens first (DEBT-046) |
| Lifecycle data | Terms, categories and color scales use a Studio-only `lifecycle` object. Tokens use the existing token lifecycle | Map `lifecycle` to whatever design-data's schemas adopt (open question 1). Tokens map to `deprecated` and `replaced_by` |
| Release version | `deprecatedIn` stays empty; badges say "Deprecated, pending release" | Release tooling or the author fills `deprecatedIn` (open question 2) |
| Breaking-change signal | The confirmation dialog warns the user, and nothing else records it | The exported change needs a major changeset for `@adobe/spectrum-design-data` and a consumer note listing removed IDs and their replacements |
| Stale preview | The preview counts uses in this browser's copy only | Recheck against the latest repository data before publishing, because others may have added new uses of a removed item |

Other limits that do not depend on GitHub:

* If removing one item fails, uses already moved or hard-coded stay that way.
* Hard-coded values are reported only inside the removal summary (open
  question 3).
* Kinds marked `planned` in `notifications/lifecycleKinds.ts` still delete directly
  (open question 4).

## Enforcement in Studio

* `src/features/notifications/lifecycleKinds.ts` classifies every delete kind
  as `lifecycle`, `planned` or `exempt`.
* `tests/notification-usage.ts` fails when a `notify.remove` call for a
  `lifecycle` kind has no `lifecycle` descriptor.
* `.agents/rules/deletion-and-deprecation.mdc` is the agent rule for new
  features.

## Open questions

1. Should design-data's registry schemas adopt this `lifecycle` shape for
   terms, categories and color scales, or a different one?
2. Who assigns `deprecatedIn`, and when (release tooling or authors)?
3. Should hard-coding a removed token's value be reported to consumers as a
   separate change, or only as part of the removal?
4. Which other items should move from `planned` to `lifecycle` next
   (tokens, spacing and typography scales, platforms, components)?
