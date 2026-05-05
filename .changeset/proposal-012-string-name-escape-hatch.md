---
"@adobe/design-data-spec": minor
---

Add string-name escape hatch (Proposal 012). Allows a token's `name` to be
a plain string when the structured taxonomy cannot express it. String-named
tokens are schema-valid but trigger SPEC-017 (severity: warning,
category: tech-debt), making tech debt visible and trackable. No breaking
changes — all existing name-object tokens are unaffected.
