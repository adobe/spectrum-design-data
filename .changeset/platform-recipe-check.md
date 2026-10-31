---
"@adobe/design-data-spec": minor
"@adobe/design-data-tui": patch
"@adobe/design-data-wasm": patch
---

Check that visual recipes still resolve under a platform manifest.

**Spec:**

- New warning SPEC-076: every token or relationship binding a recipe resolves on the foundation
  must also resolve once the platform manifest's cascade is applied.
- New conformance fixture `invalid/SPEC-076`.

**CLI:**

- `design-data validate --platform <id> --visuals-path <dir>` runs SPEC-076 and names each binding
  the platform drops. It reuses the render scene diagnostics.

**Platforms:**

- The iOS manifest no longer carries an `include` whitelist. It shipped only a few properties,
  which dropped the height, padding, font-size and icon-size tokens recipes bind.
