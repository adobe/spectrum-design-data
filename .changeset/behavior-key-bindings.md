---
"@adobe/design-data-spec": minor
"@adobe/spectrum-design-data": minor
"@adobe/design-data-wasm": minor
---

Add per-platform key bindings to the behavior contract (proposal 022), and say
that Space alone toggles Switch and Checkbox. No render or spec sheet changes.

* Schema: `behavior-bindings.schema.json` for a bindings file keyed by role;
  a vector step may be an `input` (`key`, `phase` of `down` or `up`).
* Data: `behaviors/bindings/web.json` (Space on Switch and Checkbox); key
  vectors per platform and role in `conformance/behavior/bindings/web/`,
  including "Space toggles" and "Enter does not toggle".
* Runner: `design-data behavior test --platform <id>`; a platform with no
  keyboard makes key vectors not applicable.
* SPEC-124 checks a bindings file. Spec page and proposal text updated.
* Switch and Checkbox keyboard guideline text said "Space or Enter toggles";
  it now says Space.
