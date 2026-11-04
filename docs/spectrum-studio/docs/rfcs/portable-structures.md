<!-- Copyright 2026 Adobe. All rights reserved. -->

# Portable Structure authoring

Status: local Studio implementation and upstream proposal, not an accepted
Design Data specification. Tracked under LTAX-013.

## Purpose

A Structure describes reusable layout, content roles and configurable design
differences. It is not a component API, a resolved token collection or an editor
document. Preserve those distinctions when sharing its data.

Studio now separates four responsibilities in its Structure document:

| Section                          | Responsibility                                                                |
| -------------------------------- | ----------------------------------------------------------------------------- |
| `structures`                     | Definitions, Registry names, bindings, composition, options and configuration |
| `publications`                   | Existing generated concept/row identities, scoped to their source occurrence  |
| `examples`                       | Concrete glyph resources for default or option-specific content               |
| Session state, stored separately | Selected options, selected layers, panels and canvas position                 |

Moving publication records improves definition readability. It does not reduce
total storage. Existing IDs must not be pruned merely because an output is
currently inactive.

## Example

This excerpt uses existing List-item and Registry identities. It omits its
composition, binding effects and generation recipes, not their requirements.

```json
{
  "conceptId": "e00f9ed1-95c7-4a81-b8a7-b2600e0a1001",
  "name": {
    "categoryId": "b07988e3-0510-4bf5-a531-86ea718b1003",
    "termId": "c0abaa73-3a65-4d2d-854e-410c098f86b0"
  },
  "options": [
    {
      "id": "e00f9ed1-95c7-4a81-b8a7-b2600e0a1401",
      "kind": "variant",
      "name": {
        "categoryId": "f65fecd0-3e68-4531-927d-cd52c203c0de"
      },
      "classification": {
        "0bb57816-c2eb-4d6c-bfb1-ac5d7520e88a": "b07988e3-0510-4bf5-a531-86ea718b1103"
      },
      "defaultOptionId": "e00f9ed1-95c7-4a81-b8a7-b2600e0a1402",
      "values": [
        {
          "id": "e00f9ed1-95c7-4a81-b8a7-b2600e0a1402",
          "name": {
            "categoryId": "f65fecd0-3e68-4531-927d-cd52c203c0de",
            "termId": "b9e315d9-ad01-46e4-8371-fa51af88fe53"
          },
          "classification": {}
        },
        {
          "id": "e00f9ed1-95c7-4a81-b8a7-b2600e0a1403",
          "name": {
            "categoryId": "f65fecd0-3e68-4531-927d-cd52c203c0de",
            "termId": "6bc36b92-e824-4946-8340-147d5cc95cc5"
          },
          "classification": {}
        }
      ]
    },
    {
      "id": "f12bf875-d06d-49c2-9134-676fb88ab8e7",
      "kind": "boolean",
      "name": "Drag handle",
      "defaultValue": true
    }
  ]
}
```

The names resolve to Structure/List-item and Density/Regular/Spacious. The
additional `classification` preserves the existing property=padding publication
meaning. It is not the Density label. Local Booleans have no token-name assignment;
a future explicit anatomy link must not create one.

## Identity, names and composition

Allocate authored UUID-v4 identities once. A Structure concept, a Registry term
and an option occurrence are different identities, even when they share a label.
Retain existing generated binding/output identity algorithms during migration.

New top-level Structure names register or reuse a Structure term. Historic Text
continues to reference its Element term: Studio currently prohibits duplicate
words across Registry categories. This compatibility exception does not authorize
a new cross-category uniqueness rule. Owned Layout labels remain local and do not
become catalog entries or token-name segments.

Definition references use occurrence UUIDs. A configuration target declares its
owning Structure and an array of occurrence IDs, plus a binding/element ID in its
typed effect. Empty paths address the owner. Every path hop must remain owned;
parent configuration cannot cross an independent Base or Text reference.

## Configuration and interpretation

Conditions select one declared nondefault option value. Effects cover the
existing binding selection/suppression, generated size, visibility, Boolean
visibility relationship, child ordering and leaf fields. This is not a general
expression language or an ordered cascade.

Preserve conflict reporting, padding suppression and Boolean conjunction/inversion.
Layers retain hidden authored nodes while renderers use effective visibility.
Independent references resolve their own defaults, not another preview's choices.

The portable read adapter feeds Studio's existing resolver and generator. It is
not a second generator or a second saved representation. Existing edit operations,
dependency guards, Changes and resets work on its runtime projection. The shared
configuration operation owns root/nested writes; view callbacks do not assemble
the persisted effect records.

Leaf settings retain complete snapshots, matching the existing authoring model.
Every optional field has a value or explicit removal, and every snapshot has a
glyph resource or `null`. Incomplete snapshots are rejected, not expanded into
unintended authored values. Binding, order and visibility differences remain
sparse. A future sparse leaf-patch model must preserve intentionally pinned values
when shared defaults change; it is not implemented here.

## Relationship to existing contracts

| Existing contract             | Reuse                                                   | Limit                                                                |
| ----------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------- |
| Component declaration         | Registry options and component-facing API concepts      | Does not define executable Structure composition                     |
| Anatomy                       | Part identity and descriptive containment               | Not layout order, visibility logic or a rendering program            |
| Component/Token Relationships | Explicit consumer scope and value/reference distinction | Its closed schema has no Structure occurrence or derivation scope    |
| Token cascade                 | Existing primitive/semantic token selection             | Does not replace composition of independent Structure option effects |
| Foundation recipes and rules  | Existing formula-driven generation                      | Keep recipes; resolved tokens cannot reconstruct authoring intent    |

Web and native renderers can consume the same effective graph and map its roles,
bindings and resources to their own layout systems. CSS and intrinsic measurement
remain in Studio's web resolution layer. No native renderer or platform-complete
export is implemented by this proposal.

## Compatibility and adoption

Studio's authoring envelope version 21 serializes portable Structures, publication
records and resources in one atomic saved/working write. Each older snapshot is
migrated independently; shared name allocations reuse IDs across those baselines.
There is no new browser-storage key or automatic reseeding.

The local JSON schema is generated from TypeScript. Portable schema version 1 is
not the older runtime Structure schema version 7 or a released Design Data version.
Invalid sources report errors without replacing the stored record. Preview,
export and interpretation must not allocate output identities.

Tests cover generated output preservation, identity/resource round trips, parent
combinations, narrow edits, source isolation, duplicate/cyclic targets, Registry
bindings, Save/Cancel/reload and failed writes. These establish local behavior,
not upstream architecture acceptance.

Shared-schema adoption, canonical corpus migration, SDK support, portable formula
execution and a formal component-anatomy mapping require separate upstream review.
