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

For a manifest-only overlay repo (foundation pinned remotely via
`.design-data.toml`, no local `tokens/` directory), pass
`skip-dataset-validation: true` — `validate-dataset`'s SPEC-044 structure
check requires a local `tokens/` dir and fails unconditionally without one.

### Pinning the action

`@main` moves on every merge. Use a tag from [`publish-validate-action.yml`](../../workflows/publish-validate-action.yml) instead. The `design-data-cli@x.y.z` tags cannot be used: GitHub rejects a second `@` in a `uses:` ref.

| Ref                                                                           | Moves?                       | Pins                                                            |
| ----------------------------------------------------------------------------- | ---------------------------- | --------------------------------------------------------------- |
| `adobe/spectrum-design-data/.github/actions/validate@validate-action/v1`      | Yes, to each new CLI release | The action files at the latest `design-data-cli` release commit |
| `adobe/spectrum-design-data/.github/actions/validate@validate-action/v0.63.0` | Never                        | The action files at the `design-data-cli@0.63.0` release commit |
| `adobe/spectrum-design-data/.github/actions/validate@<commit sha>`            | Never                        | Exactly that commit                                             |

A tag pins the action's files and scripts only. The CLI it installs is still chosen by `cli-version` (default `latest`), so set `cli-version: 0.63.0` to pin the CLI too. `v1` only moves forward within the `v1` contract; a breaking input or output change will ship under a new `validate-action/v2`. The tags are created when a `design-data-cli@x.y.z` GitHub Release is published; CLI releases with no action changes still get a tag.

## Inputs

| Input                     | Default                        | Description                                                                                                                           |
| ------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `dataset-path`            | `.`                            | Path passed to `validate-dataset`/`validate-manifest`                                                                                 |
| `manifest`                | `manifest.json`                | Platform manifest file                                                                                                                |
| `skip-dataset-validation` | `false`                        | Skip `validate-dataset` for manifest-only overlay repos with no local `tokens/` dir                                                   |
| `cli-version`             | `latest`                       | `design-data-cli` release version to install                                                                                          |
| `install-method`          | `release`                      | `release` (direct binary download) or `homebrew`                                                                                      |
| `foundation-repo`         | `adobe/spectrum-design-data`   | Repo checked for foundation drift                                                                                                     |
| `foundation-tag-prefix`   | `@adobe/spectrum-design-data@` | Tag prefix identifying foundation release tags (stable only)                                                                          |
| `drift-mode`              | `warn`                         | `warn` (annotate) or `fail` (block the PR) on drift                                                                                   |
| `open-issue`              | `false`                        | Open a "foundation moved" issue when drift is detected                                                                                |
| `open-pr`                 | `false`                        | Open a PR bumping `foundationVersion` on drift (needs `contents: write` and `pull-requests: write`; skipped on `pull_request` events) |
| `install-only`            | `false`                        | Only install the CLI onto `PATH`; skip validation, drift, and issue/PR steps                                                          |
| `github-token`            | `${{ github.token }}`          | Used for release/tag lookups, issue and PR creation                                                                                   |

The `release` install picks the binary for the runner (Linux x64, macOS arm64, macOS x64).

### Foundation bump PRs (`open-pr`)

* **Prefix default changed.** `foundation-tag-prefix` now defaults to `@adobe/spectrum-design-data@` (was `@adobe/spectrum-tokens@`). A manifest still pinned to a `spectrum-tokens` tag reports drift but is never auto-bumped; a bare semver pin ahead of the latest tag is not reported as drift. Set `foundation-tag-prefix` explicitly to keep the old behavior.
* **CI on the bump PR.** A PR created with the default `GITHUB_TOKEN` does not trigger other workflows. Pass a PAT or GitHub App token as `github-token`, and as `token` to `actions/checkout` so the push uses it.
* **Repository setting.** Enable "Allow GitHub Actions to create and approve pull requests" under Settings → Actions → General.
* **Base branch.** The PR targets the repository's default branch. `.design-data.toml` always gets the full tag (`<prefix><version>`); the manifest keeps its existing bare or full style.

## Outputs

| Output                      | Description                                                  |
| --------------------------- | ------------------------------------------------------------ |
| `dataset-valid`             | `validate-dataset` result (`true`/`false`), empty if skipped |
| `manifest-valid`            | `validate-manifest` result (`true`/`false`)                  |
| `foundation-drift`          | Whether the pinned version is behind (`true`/`false`)        |
| `pinned-foundation-version` | `foundationVersion` from the manifest                        |
| `latest-foundation-version` | Latest matching tag in `foundation-repo`                     |
