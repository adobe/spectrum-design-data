# Spectrum 2 docs

Markdown mirror of the public [Spectrum Hub](https://spectrum.adobe.com) content that feeds `documentBlocks` in `packages/design-data`. The layout follows the Hub information architecture.

```
docs/s2-docs/
├── web/
│   ├── rsp/components/<hub-slug>.md   # React Spectrum (feeds component JSON)
│   └── swc/components/<hub-slug>.md   # Spectrum Web Components (reference)
├── foundations/  content/  support/  getting-started/   # guidelines, at their Hub paths
```

Component pages carry `design_data_targets`, `platform`, `hub_path`, `swc_exists` and `category` frontmatter. Guideline pages carry `slug`, `category`, `hub_path` and `source_url`.

## Automation

Don't edit these files by hand. Two workflows keep them current and open PRs:

* `.github/workflows/hub-component-sync.yml` — fetches components, stages `web/{rsp,swc}/components`, regenerates `packages/design-data/components` blocks.
* `.github/workflows/hub-guideline-sync.yml` — fetches guidelines, stages them at their Hub paths, regenerates `packages/design-data/guidelines`.

Some legacy guidelines have no Hub page. They exist only as JSON in `packages/design-data/guidelines`.

## Local run

```bash
node tools/spectrum-hub-fetcher/src/component-sync-cli.js --help
node tools/spectrum-hub-fetcher/scripts/stage-components.js --from <fetch-dir> --to ./docs/s2-docs --prune
node tools/spectrum-hub-fetcher/scripts/stage-docs.js --help
node tools/s2-docs-to-document-blocks/src/cli.js --help
```

The [`@adobe/s2-docs-mcp`](../../tools/s2-docs-mcp) server reads the generated design-data JSON.
