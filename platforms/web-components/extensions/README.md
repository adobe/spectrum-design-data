# `extensions/` (currently empty)

Per `packages/design-data-spec/spec/manifest.md#extensions-directory`, this
directory would hold one file per artifact in each of these category
subdirectories, glob+merged in sorted path order and spliced into the
Foundation→Platform cascade before it's applied to the graph:

| Subdirectory           | Holds                                                                             |
| ---------------------- | --------------------------------------------------------------------------------- |
| `tokens/`              | Platform-local `.tokens.json` token fragments                                     |
| `components/`          | Platform-local component declarations                                             |
| `fields/`              | Platform-local taxonomy field declarations                                        |
| `guidelines/`          | Platform-local guideline entries                                                  |
| `platform-extensions/` | Platform-specific terminology for a foundation term set (e.g. interaction states) |
| `relationships/`       | Platform-local token relationships (plain-add or `op: "override"`/`"remove"`)     |
| `mode-sets/`           | Platform-local mode-set declarations                                              |

No Spectrum Web Components-specific content exists yet, but
`platform-extensions/` is expected to gain a `web-components-states.json`
migrated out of the shared foundation registry in a follow-up task — see
`platforms/web-components/README.md`.
