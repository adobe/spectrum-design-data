---
"@adobe/design-data-spec": minor
"@adobe/design-data-tui": minor
"@adobe/design-data-wasm": patch
---

`validate --platform` now reports a platform manifest that cannot apply (SPEC-082).

**Spec:** new rule SPEC-082 `platform-manifest-applies` (error). A platform manifest MUST apply
to the foundation dataset; a validator that cannot apply it MUST report an error, not skip the
platform rules silently. It stays silent when an `include`/`exclude` entry does not parse,
because SPEC-039 reports that. Documented in `rules.yaml`, `spec/manifest.md` and the
`invalid/SPEC-082` conformance case.

**CLI:** SPEC-076, SPEC-079 and the platform recipe checks returned nothing when the manifest
failed to apply (for example it extends a mode set not loaded, as without `--mode-sets-path`),
so `validate --platform <id>` exited 0. It now reports SPEC-082 and exits 1. Output for
manifests that apply is unchanged. The native binary is versioned by `@adobe/design-data-tui`.

**WASM:** the rule is in the core set; WASM validate passes no manifest, so nothing changes.

Bump levels: spec minor (new rule), tui minor (can now exit 1), wasm patch (no change).
