---
"@adobe/design-data-spec": major
---

refactor(spec): remove validate.js and canonical.js public exports

The `./src/validate.js` and `./src/canonical.js` package exports have been removed. Conformance validation is now handled exclusively by the Rust SDK core (`sdk/core`). Consumers who imported these paths should migrate to the Rust-based conformance harness.
