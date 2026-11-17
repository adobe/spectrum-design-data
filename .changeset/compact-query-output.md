---
"@adobe/design-data-mcp": minor
"@adobe/design-data-skill": patch
---

`design-data-query` and `design-data-suggest` now return compact, bounded output with final
values. An agent run against these tools spent most of its tokens on tool output: `query
component=button` returned about 108,000 characters (146 full token objects, each named by a CI
file path) and `property=*color*` about 1.3 million.

`design-data-query` returns `{ total, shown, tokens }`, at most 25 tokens by default (`limit`,
max 200), active before deprecated, with a hint to narrow the filter when more match. Each token
has `name`, `value`, `layer`, `uuid` and its modes. `value` is the end of the alias chain, so
`container-padding-small` shows `12px` and nothing needs a follow-up `uuid=` query. `detail:
"full"` returns the old complete token objects. `design-data-suggest` returns the same compact
shape plus `confidence`, with no `file` path.

Breaking for callers that read the old array: `query` now returns an object, and `suggest`
returns `name` instead of `tokenName`. The two sizes above become about 4,000 characters.
