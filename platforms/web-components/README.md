# Spectrum Web Components platform manifest

This manifest is being incubated here on behalf of the [Spectrum Web Components
(SWC)](https://github.com/adobe/spectrum-web-components) team, following the
model described in [`platforms/README.md`](../README.md). It is not yet owned
or reviewed by that team — it exists so the flexible platform-manifest
machinery in this monorepo can be built and dogfooded against a real,
sourced naming convention before SWC (or a separate `*-design-data` repo)
takes it over.

## Why `formatting.prefix`

SWC (via its underlying `spectrum-css` build) exposes every foundation token
as a CSS custom property named `--spectrum-<kebab-case-token-name>` — for
example `--spectrum-gray-100` or
`--spectrum-actionbutton-background-color-rest`. The token name itself is
**not** renamed or reordered; only a literal `--spectrum-` prefix wraps it at
the CSS custom-property emission layer. That is a real, documented SWC
convention (its own CONTRIBUTOR-DOCS), not an invented placeholder — which is
why this manifest uses the schema's `formatting.prefix` field rather than
`casing`/`delimiter`/`conceptOrder` overrides that would imply an actual
token-name transform SWC doesn't do.

`formatting.casing`, `.delimiter`, and `.conceptOrder` are intentionally left
at their kebab-case defaults, since SWC does not reorder or recase concepts —
only wraps the existing name.

## Extensions

`extensions/platform-extensions/web-components-states.json` holds SWC-specific
terminology for interaction states (`hover`, `focus`, `disabled`,
`keyboard-focus`), migrated out of the shared foundation registry
(`packages/design-data/registry/platform-extensions/`) — the exact parallel of
the completed iOS `ios-states.json` migration. It's reachable through the
Foundation→Platform cascade whenever `web-components` is the selected
platform (`design-data validate-manifest --platform web-components`, etc.).

## Ejection

When SWC is ready to own this manifest directly (in their main repo or a
dedicated `*-design-data` repo), `platforms/web-components/` is designed to
be extracted wholesale — see the ejection contract in
[`platforms/README.md`](../README.md).
