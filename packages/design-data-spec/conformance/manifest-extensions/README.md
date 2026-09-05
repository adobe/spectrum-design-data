# Manifest extensions conformance fixtures

Exercises the Layer 2 platform manifest's `extensions/` **directory** loader
(`packages/design-data-spec/spec/manifest.md#extensions-directory`): a sibling
`extensions/` tree (or a custom name via the manifest's `extensionsDir` field)
whose category subdirectories (`tokens/`, `components/`, `fields/`,
`guidelines/`, `platform-extensions/`, `relationships/`) are discovered,
glob+merged in sorted path order, per-fragment schema-validated, and spliced
into the manifest before it's applied to the graph.

* `base/dataset.json` — a shared minimal seed graph (three foundation tokens:
  `btn-bg`, `btn-fg`, `chk-bg` on the `button`/`checkbox` components), loaded
  once per case before that case's `manifest.json` is applied via
  `apply_configured`.
* `valid/<case>/` — `manifest.json` + an `extensions/` (or custom-named) tree
  that must apply cleanly. `expected.json` optionally carries behavior
  predicates asserted against the post-apply graph:
  ```jsonc
  {
    "relationships": {
      "byUuid": { "<uuid>": { "count": 1, "value": "8px" } },
      "absent": ["<uuid>"]
    },
    "components": { "present": ["tab-bar-ios"] },
    "fields": { "present": ["hapticStyle"] },
    "guidelines": { "present": ["ios-haptics"] },
    "tokens": { "orderByUuid": ["<uuid-1>", "<uuid-2>"] }
  }
  ```
  A case that only needs to prove "loads clean" uses `{}`.
* `invalid/<case>/` — `manifest.json` + tree that must fail `apply_configured`.
  `expected-errors.json` is `{ "errors": [{ "message_pattern": "..." }] }`;
  every pattern (regex) must match the single returned error message.

Rust SDK drives these fixtures in `sdk/core/src/lib.rs` via the
`manifest_extensions_conformance` (pass/fail + error message matching) and
`manifest_extensions_behavior` (post-apply graph predicates) test modules.

| Case                                           | Intent                                                                                                                   |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `valid/injects-component`                      | A `components/` fragment is injected as a Platform-layer component.                                                      |
| `valid/injects-platform-extension`             | A `platform-extensions/` fragment is injected.                                                                           |
| `valid/injects-field`                          | A `fields/` fragment is injected.                                                                                        |
| `valid/injects-guideline`                      | A `guidelines/` fragment is injected.                                                                                    |
| `valid/injects-relationship`                   | A `relationships/` plain-add fragment is injected.                                                                       |
| `valid/override-relationship-by-uuid`          | An `op: "override"` entry replaces a plain add sharing its `uuid`, regardless of file sort order.                        |
| `valid/plain-add-uuid-collision-append`        | Two plain adds sharing a `uuid` both append rather than one overwriting the other.                                       |
| `valid/remove-relationship-by-uuid`            | An `op: "remove"` entry deletes the matching relationship.                                                               |
| `valid/tokens-sorted-order`                    | Multiple `tokens/*.tokens.json` files concatenate in sorted path order.                                                  |
| `valid/later-file-wins`                        | Two `components/` fragments declaring the same component name dedupe to one, later file wins.                            |
| `valid/custom-extensions-dir`                  | The manifest's `extensionsDir` field is honored in place of the default `extensions/` name.                              |
| `valid/override-entry-skips-schema-validation` | An `op: "override"` relationship entry is not schema-validated against `relationship.schema.json` (only plain adds are). |
| `invalid/override-missing-uuid`                | An `op: "override"` relationship entry missing `uuid` fails loudly.                                                      |
| `invalid/unknown-term-id`                      | A `platform-extensions/` fragment referencing a non-existent `termId` fails loudly.                                      |
| `invalid/component-missing-name`               | A `components/` fragment missing `name` fails Layer 1 fragment schema validation.                                        |
| `invalid/field-invalid-kind`                   | A `fields/` fragment with an invalid `kind` enum value fails schema validation.                                          |
| `invalid/guideline-invalid-category`           | A `guidelines/` fragment with an invalid `category` enum value fails schema validation.                                  |
| `invalid/platform-extension-missing-extends`   | A `platform-extensions/` fragment missing `extends` fails schema validation.                                             |
| `invalid/token-invalid-uuid`                   | A `tokens/*.tokens.json` fragment with a malformed `uuid` fails schema validation.                                       |
| `invalid/relationship-missing-scope`           | A `relationships/` plain-add fragment missing `scope` fails schema validation.                                           |
| `invalid/extensions-dir-parent-traversal`      | `extensionsDir` containing a `..` component is rejected.                                                                 |
| `invalid/extensions-dir-absolute-path`         | An absolute `extensionsDir` path is rejected.                                                                            |
| `invalid/unknown-subdir-name`                  | An unrecognized subdirectory directly under `extensions/` (not one of the six known categories) is rejected by name.     |
