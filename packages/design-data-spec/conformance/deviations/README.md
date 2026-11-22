# Platform deviation fixtures

Files for `extensions/deviations/` (see `spec/manifest.md#extensionsdeviations`), one case per folder.

* `valid/` passes Layer 1 and loads (`manifest-extensions/valid/deviations-load` is the same file under a manifest). A file that fails the schema is rejected at load (`manifest-extensions/invalid/deviations-missing-status`).
* `invalid/SPEC-109-duplicate-id` is schema-valid; SPEC-109 reports the repeated id.
* `invalid/SPEC-110-*` fail the existence checks against a `switch` component with a `track` part and no `no-such-state`.

The `validation_conformance` harness runs `dataset.json` graphs and does not read this folder; the rules' unit tests (`sdk/core/src/validate/rules/spec109.rs`, `spec110.rs`) load these files.
