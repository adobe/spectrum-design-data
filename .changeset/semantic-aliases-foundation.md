---
"@adobe/design-data-spec": minor
---

Semantic alias foundation: SPEC-042 alias-target-domain + icon-color alias pilot.

- **SPEC-042** (`sdk/core`): alias tokens now inherit domain from their target schema.
  A color alias carrying `colorFamily` is valid when its alias chain resolves to a
  color-domain schema (`color.json`, `color-set.json`).
- **taxonomy.md**: new "Alias / semantic token name objects" section documenting the
  alias-target-domain rule with examples.
- **icons.json**: 20 alias tokens gain `name` — 4 hue-background, 12 hue-primary,
  3 semantic primary, 1 disabled-primary. 3 polarity tokens deferred (RFC pending).
- **token-corpus-migrate**: alias.json dispatch + 4 new `iconColorNameForKey` patterns.
