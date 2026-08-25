# Validate design-data

Reusable composite Action for platform-manifest repos. Installs the
`design-data` CLI, validates the dataset and platform manifest, and checks for
foundation drift (the pinned `foundationVersion` vs. the foundation's latest
tag).

## Usage

```yaml
name: Validate

on:
  pull_request:

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: adobe/spectrum-design-data/.github/actions/validate@main
        with:
          dataset-path: .
          manifest: manifest.json
```

## Inputs

| Input                   | Default                      | Description                                            |
| ----------------------- | ---------------------------- | ------------------------------------------------------ |
| `dataset-path`          | `.`                          | Path passed to `validate-dataset`/`validate-manifest`  |
| `manifest`              | `manifest.json`              | Platform manifest file                                 |
| `cli-version`           | `latest`                     | `design-data-cli` release version to install           |
| `install-method`        | `release`                    | `release` (direct binary download) or `homebrew`       |
| `foundation-repo`       | `adobe/spectrum-design-data` | Repo checked for foundation drift                      |
| `foundation-tag-prefix` | `@adobe/spectrum-tokens@`    | Tag prefix identifying foundation release tags         |
| `drift-mode`            | `warn`                       | `warn` (annotate) or `fail` (block the PR) on drift    |
| `open-issue`            | `false`                      | Open a "foundation moved" issue when drift is detected |
| `github-token`          | `${{ github.token }}`        | Used for release/tag lookups and issue creation        |

## Outputs

| Output                      | Description                                           |
| --------------------------- | ----------------------------------------------------- |
| `dataset-valid`             | `validate-dataset` result (`true`/`false`)            |
| `manifest-valid`            | `validate-manifest` result (`true`/`false`)           |
| `foundation-drift`          | Whether the pinned version is behind (`true`/`false`) |
| `pinned-foundation-version` | `foundationVersion` from the manifest                 |
| `latest-foundation-version` | Latest matching tag in `foundation-repo`              |
