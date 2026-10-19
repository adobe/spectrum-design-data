# Platform manifests

This directory incubates **Layer 2 platform manifests** for implementation teams
that don't yet run their own platform-manifest repo. Each subdirectory here is
shaped exactly like a standalone platform-manifest repo — `manifest.json`,
an `extensions/` tree, its own `README.md` — so it can be extracted with
`git subtree split` and pushed to a team-owned repo the moment that team is
ready, with **zero required changes for any consumer** of the cascade.

See `packages/design-data-spec/spec/manifest.md` for the full Foundation→Platform
cascade spec. `spectrum-design-data-h890.22` records the iOS externalization
proof of concept in `GarthDB/spectrum-ios-design-data`. Without an independent
iOS owner, its data incubates here at [`ios/`](ios/) under monorepo-maintainer
stewardship (`spectrum-design-data-h890.28`). The Swift demo stays external;
externalization was a tooling experiment, not a production ownership handoff.

## Why incubate here first

A platform manifest is a small, mostly-declarative artifact (a `manifest.json`
pin + filters/overrides, plus a handful of `extensions/` fragments) that's
easiest to get right with tight iteration against the foundation dataset it
targets — same repo, same CI, same PR review. Standing up a separate repo (or
carving out space in a large existing repo like `adobe/react-spectrum`) is real
process overhead that a team shouldn't have to take on just to try the cascade.

Incubating here defers that overhead without blocking on it: the manifest is
real, versioned, validated in this repo's CI, and consumable today via
`--platform <id>` — it just hasn't moved yet.

## Directory shape

```text
platforms/<id>/
  manifest.json          — specVersion, foundationVersion pin, identity fields
                            (platform/platformVersion/repository), include/
                            exclude filters, overrides, formatting rules
  extensions/             — platform-local tokens/components/fields/guidelines/
                            platform-extensions/relationships/mode-sets/
                            implementations, one
                            file per artifact (see manifest.md#extensions-directory)
  README.md               — what this platform is, current incubation status,
                            and a pointer to the team that owns the content
```

Each `<id>` must match an id registered in
`packages/design-data/registry/platform-implementations.json`.

## Selecting a platform locally

The repo-root `.design-data.toml` registers every incubating platform under
`[platforms.<id>]`. From anywhere inside this repo:

```bash
design-data validate-manifest --platform react-spectrum
design-data query --filter "property=background-color" --platform web-components
design-data platform list
design-data platform show react-spectrum
design-data validate-manifest --platform ios
```

Put `--platform` after the subcommand. Before it, the CLI reads the subcommand
name as the TUI dataset path. `DESIGN_DATA_PLATFORM` and `default_platform` also
select a platform; see [Configuring design-data for your platform](https://opensource.adobe.com/spectrum-design-data/articles/configuring-design-data-for-your-platform/).

## The ejection contract

"Ejection" is the migration path from an in-repo `platforms/<id>/` directory to
a team-owned repo (either a new standalone `<id>-design-data` repo, or a
directory inside the team's main repo — the manifest format doesn't force that
choice). `design-data platform eject <id> [--out DIR]` (h890.27.11) automates
the mechanical half:

1. Copies `platforms/<id>/manifest.json` and `extensions/` into `DIR`.
2. Writes a standalone `.design-data.toml` in `DIR` pointing `[source]` at the
   *published* foundation (`type = "github"`, pinned to a release tag) rather
   than a local monorepo path — so the ejected repo has no dependency on this
   one being checked out alongside it.
3. Writes a validation GitHub Actions workflow, `README.md`, and `LICENSE`
   (Apache-2.0, matching this repo).
4. Prints the `git subtree split` command to run against *this* repo so the
   team's new repo keeps full commit history for their manifest's evolution,
   instead of starting from a single squashed commit.

After the team's new repo is live and green in CI, flip this repo's
`[platforms.<id>]` entry from a `path` to a `github` remote (pinned to that
repo's release tag/branch/sha — see `packages/design-data-spec/spec/manifest.md`),
delete `platforms/<id>/`, and update `CODEOWNERS`. See
[`docs/MIGRATION.md`](../docs/MIGRATION.md) (h890.27.13) for the full
step-by-step, using the iOS POC as the worked example.

## Status

| id               | Team                    | Status                      |
| ---------------- | ----------------------- | --------------------------- |
| `react-spectrum` | React Spectrum          | Incubating                  |
| `web-components` | Spectrum Web Components | Incubating                  |
| `ios`            | Monorepo maintainers    | Incubating proof of concept |

The React Spectrum and Web Components teams have not been asked to take
ownership yet. These manifests exercise the cascade against their different
outputs (JS token exports and `--spectrum-*` CSS custom properties) before
either team is asked to adopt it.
