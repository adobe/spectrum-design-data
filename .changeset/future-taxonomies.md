---
"@adobe/design-data-spec": minor
---

Add normative color, typography, and motion token taxonomies to `spec/taxonomy.md`
(closes RFC #806 open question, issue #942).

- **spec/taxonomy.md**: restructured into four subsections under "Token-type
  taxonomies": semantic/layout (existing), color, typography, motion. Each new domain
  has a Category/Field/Answers/Description table and a default serialization order
  example. Removed the deferral note; updated the Scalability section.
- **spec/token-format.md**: split the semantic fields table into universal and
  domain-scoped groups; added `scaleIndex` to the universal table; added a new
  "Domain-scoped semantic fields" table listing `colorFamily`, `family`, `weight`,
  `style`, `motionRole`, `easing`.
- **fields/**: 6 new field declarations (`colorFamily`, `family`, `weight`, `style`,
  `motionRole`, `easing`) each with `scope` set to their domain; `scaleIndex`
  position moved from 16 → 99 so it always serializes after domain-family fields.
- **registry/**: 6 new registry value files (`color-families.json`,
  `typography-families.json`, `typography-weights.json`, `typography-styles.json`,
  `motion-roles.json`, `easing-curves.json`). Motion registries are marked provisional
  until motion tokens land in the foundation dataset.
- **SPEC-042** (`field-scope-violation`, warning): flags name objects that mix a
  domain-scoped field (e.g. `colorFamily`) with an incompatible token `$schema` type.
- **SPEC-043** (`domain-required-fields`, warning): flags color/typography/motion
  tokens whose name objects lack any domain-identifying field. Advisory severity;
  does not block the existing corpus during migration.
- Conformance fixtures added for SPEC-042 and SPEC-043.
- `docs/rfc-coordination.md`: RFC #806 "future taxonomies" open question struck
  through as resolved.
