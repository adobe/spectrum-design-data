<!-- Copyright 2026 Adobe. All rights reserved. -->

# Figma variables baseline snapshot — S2 – Web

Captured 2026-07-29 from the "S2 – Web" Figma file (`file-key xHBWBBIe2eo5vwoCeNrC4Q`) via:

```bash
cargo run -p design-data-cli -- figma read --file-key xHBWBBIe2eo5vwoCeNrC4Q --format json | jq -S .
```

`s2-web-variables.baseline.json` is the `--format json` output (a `VariablesMeta`:
`{ "variables": {...}, "variableCollections": {...} }`), key-sorted with `jq -S` for
stable, reviewable git diffs. It is ground truth for the name audit
(`spectrum-design-data-11k.4`) and the offline `figma diff --snapshot` work
(`spectrum-design-data-11k.6`).

## Totals

* **2961 variables** total (10 of them `remote: true` — inherited from a linked
  library rather than defined locally in this file).
* **9 variable collections** (local + remote):

| Collection ID                                | Name              | Modes                  | Variables | Remote |
| -------------------------------------------- | ----------------- | ---------------------- | --------: | ------ |
| `VariableCollectionId:3242:109`              | `.Platform scale` | Desktop                |       865 | no     |
| `VariableCollectionId:3242:1436`             | `Iconography`     | Modeless               |        14 | no     |
| `VariableCollectionId:3242:1437`             | `Typography`      | Modeless               |       179 | no     |
| `VariableCollectionId:3242:1438`             | `Layout`          | Modeless               |       329 | no     |
| `VariableCollectionId:4821:94`               | `.Color theme`    | Light, Dark, Wireframe |       782 | no     |
| `VariableCollectionId:8:1601`                | `S2.Color-theme`  | Modeless               |       782 | no     |
| `VariableCollectionId:0aba8963.../8212:124`  | `Iconography`     | Modeless               |         1 | yes    |
| `VariableCollectionId:74b0f8ae.../3242:6005` | `Layout`          | Modeless               |         6 | yes    |
| `VariableCollectionId:83e7bfd1.../4821:8216` | `S2.Color-theme`  | Modeless               |         3 | yes    |

Note: several collection *names* repeat (`Iconography`, `Layout`, `S2.Color-theme`)
across local vs. remote-linked-library collections — they are distinct collections
with distinct IDs, not duplicates. `figma read --format pretty`'s summary
(`summarize_variables`) excludes `remote == true` variables/collections from its
sample output; this JSON snapshot includes everything the API returned.
