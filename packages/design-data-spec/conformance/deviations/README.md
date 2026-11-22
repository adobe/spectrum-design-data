# Platform deviation fixtures

Files for `extensions/deviations/` (see `spec/manifest.md#extensionsdeviations`), one case per folder. Not read by the Rust `validation_conformance` harness: the engine does not load `extensions/deviations/` yet (follow-up PR 2 of proposal 019), so SPEC-109 to SPEC-111 are defined in `rules/rules.yaml` and not enforced. Cases in `valid/` pass Layer 1. `invalid/SPEC-109-*` fails Layer 2 uniqueness (the file is schema-valid; the duplicate id is the SPEC-109 uniqueness half) and `invalid/SPEC-110-*` fail the existence checks against the `switch` component.
