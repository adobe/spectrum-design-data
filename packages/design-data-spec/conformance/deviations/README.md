# Platform deviation fixtures

Files for `extensions/deviations/` (see `spec/manifest.md#extensionsdeviations`), one case per folder.

* `valid/` passes Layer 1 and loads (`manifest-extensions/valid/deviations-load` is the same file under a manifest). A file that fails the schema is rejected at load (`manifest-extensions/invalid/deviations-missing-status`).
* `invalid/SPEC-109-duplicate-id` is schema-valid; SPEC-109 reports the repeated id.
* `invalid/SPEC-111-unset-property` is a warning: the `track` recipe sets no `opacity`.
* `invalid/SPEC-110-*` fail the existence checks against a `switch` component with a `track` part and no `no-such-state`.

The `deviations_conformance` test in `sdk/core/src/lib.rs` runs every case here through `run_rules` against a `switch` component (anatomy `track`, state `keyboard-focus`, boolean option `isSelected`) whose recipe sets `fill` and `stroke` on `track`, and checks each case's `expected-errors.json` (a valid case expects none).
