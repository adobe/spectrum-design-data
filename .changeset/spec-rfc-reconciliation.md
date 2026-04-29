---
"@adobe/design-data-spec": patch
---

Reconcile spec with RFC discussion family.

- Add `lastModified` lifecycle field on tokens (originally proposed in RFC #623, missed during initial implementation). Records the spec version when a token's value or non-formatting metadata last changed. Validated by new rule `SPEC-014: lastModified MUST NOT precede introduced`.
- Clarify in `manifest.md` that the query notation defined in `spec/query.md` is normative for programmatic use; manifest `include`/`exclude` adoption is deferred to a post-`1.0.0-draft` revision.
- Add a worked `card`-as-`structure`-vs-`component` example to `taxonomy.md` to disambiguate scope decisions.
- Replace open-ended "additional taxonomies will be defined" sentence with a pointer to the open RFC discussion (#806 Q3).
- Update legacy-format mapping table in `evolution.md` to note `lastModified` has no legacy equivalent.

All changes are additive or clarifying; no token data or existing rule semantics change.
