---
"@adobe/design-data-spec": minor
---

**Spec:** Lift manifest query notation from deferred to normative (RFC #715 / SPEC-039).

`spec/manifest.md` previously instructed implementations to treat `include`/`exclude` entries as
opaque identifiers. That clause is now removed: each entry MUST parse as a valid query expression
per `spec/query.md` and MUST use only the supported query keys.

New Layer 2 rule SPEC-039 (`manifest-query-parseable`) enforces this at validation time by calling
the same parser used by the `query` and `diff --filter` CLI subcommands. Parse failures report the
failing entry's instance path and the query parser's error message to guide migration.

**Migration:** If your manifest uses non-query strings in `include`/`exclude`, update them to the
query notation defined in `spec/query.md`. The SPEC-039 diagnostic reports the exact position and
key that failed, so running `validate` against your manifest will surface any entries that need
updating.
