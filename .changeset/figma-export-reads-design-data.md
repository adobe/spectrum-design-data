---
"@adobe/design-data-tui": minor
---

`design-data figma export` and `figma audit` read the design-data graph, not `packages/tokens/src`.

- **sdk/cli/**: load the resolved dataset (or `--manifest` cascade), then project it
  through the legacy converter before mapping. The token path argument is now an
  optional override.
- **sdk/core/src/legacy.rs**: add a per-file graph projection with a global UUID map.
- **sdk/plugins/figma/**: audit shares the projected input; mapper behavior is unchanged.
- **sdk/cli/tests/**: a parity test proves the projection equals `packages/tokens/src`.
