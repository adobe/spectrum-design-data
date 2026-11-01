---
"@adobe/design-data-spec": minor
"@adobe/design-data-wasm": patch
---

Validate platform-owned visual recipes. SPEC-079 and SPEC-080 are now enforced.

**Spec:**

- SPEC-079 (warning): a recipe in a platform's `extensions/visuals/` must render over the
  request grid without a scene diagnostic. It is planned to become an error in a later minor
  release.
- SPEC-080 (info): a platform recipe that replaces a foundation recipe reports the pair.
- Conformance fixtures `invalid/SPEC-079`, `invalid/SPEC-080` and `valid/SPEC-079`.

**CLI:**

- `design-data validate --platform <id>` runs the recipe rules SPEC-060 to 063, 066 to 071 and 075
  over platform-owned recipes. SPEC-076 skips a foundation recipe the platform replaces. Output
  is unchanged when the manifest ships no `extensions/visuals/`.

**WASM:** the core change is compiled in; `Dataset.validate()` passes no manifest, so its
output is unchanged.
