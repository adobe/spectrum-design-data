---
"@adobe/design-data-tui": patch
---

Parse embedded JSON objects in validate error messages into readable key=value form.

- **sdk/tui/src/update_command.rs** (`compact_json_refs`): new helper that finds
  the first `{…}` in a string and replaces it with `key=value` pairs, so
  SPEC-018 messages like `Token '{"component":"chevron-icon",...}'` become
  `Token 'component=chevron-icon property=size-75'`.
