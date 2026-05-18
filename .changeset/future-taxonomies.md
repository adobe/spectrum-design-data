---
"@adobe/design-data-spec": minor
---

Add normative color, typography, and motion token taxonomies (closes issue #942).

- **spec/taxonomy.md**: four subsections under "Token-type taxonomies" — semantic/layout
  (existing), color, typography, motion; each with a field table and serialization order.
- **spec/token-format.md**: split semantic fields table into universal and domain-scoped.
- **fields/**: 6 new declarations (`colorFamily`, `family`, `weight`, `style`,
  `motionRole`, `easing`) with domain `scope`; `scaleIndex` position moved to 99.
- **registry/**: 6 new value files for color families, typography families/weights/styles,
  and motion roles/easing curves (motion entries provisional).
- **SPEC-042** (`field-scope-violation`, warning): domain-scoped field on wrong token type.
- **SPEC-043** (`domain-required-fields`, warning): color/typography/motion token missing
  a domain-identifying field; advisory severity, does not block the existing corpus.
- Conformance fixtures for SPEC-042 and SPEC-043.
- `docs/rfc-coordination.md`: RFC #806 future-taxonomies question resolved.
