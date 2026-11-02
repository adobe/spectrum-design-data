---
"@adobe/design-data-spec": minor
"@adobe/design-data-tui": minor
"@adobe/design-data-wasm": patch
---

`validate --platform` now reports a platform manifest that cannot apply (SPEC-082).

**Spec:** new rule SPEC-082 `platform-manifest-applies` (error). A platform manifest MUST apply
to the foundation dataset; a validator that cannot apply it MUST report an error, not skip the
platform rules silently. It stays silent when an `include`/`exclude` entry does not parse
(SPEC-039 reports that).

**CLI:** SPEC-076, SPEC-079 and the platform recipe checks returned nothing when the manifest
failed to apply, so `validate --platform <id>` exited 0. It now reports SPEC-082 and **exits 1
when the manifest cannot apply**. `validate --platform ios` without `--mode-sets-path` (the iOS
manifest extends `contrast`) now fails instead of passing. Manifests that apply are unchanged.

**WASM:** the rule is in the core set; WASM validate passes no manifest, so nothing changes.
