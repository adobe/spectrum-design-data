---
"@adobe/s2-docs-mcp": patch
---

Drop the `commander` runtime dependency from `bin/s2-docs.js`. Claude Code
plugin installs do not run `npm install` for the plugin's own
`dependencies`, so the previous CLI crashed on first use with
`Cannot find package 'commander'`. The rewritten bin uses Node's built-in
`process.argv` for the same five subcommands (`list`, `get`, `search`,
`use-case`, `stats`) and produces identical JSON output. Bumps
`.claude-plugin/plugin.json` to `1.0.1` so existing users with the broken
`1.0.0` cache get the fix automatically on `/plugin marketplace update`.
