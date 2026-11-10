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

## Moving one artifact (promote and demote)

The ejection contract moves a whole platform. This section moves **one artifact**
(a token, component, mode set or relationship) between a platform's `extensions/`
and the foundation. The normative rules are in
[`artifact-moves.md`](../packages/design-data-spec/spec/artifact-moves.md).

A move changes no one's output unless they choose it. The artifact keeps its
identity, has one owner at a time, and other platforms lose nothing without notice.

**Who decides.** The foundation team decides, ideally with the platform team in
the discussion. A proposal is a tracked issue: what moves, why, and evidence from
two or more platforms.

**Promote** (platform to foundation) when two or more platforms need the artifact,
or one platform needs it and the foundation team records a design decision.
Promotion is a minor foundation version. The foundation team sets the foundation
values.

**Demote** (foundation to one platform) with notice. The foundation keeps a
deprecated stub with the same identity for at least two minor versions, the same
window as any deprecation ([Evolution](../packages/design-data-spec/spec/evolution.md#migration-windows)).

**Cannot move on their own:** fields (shared vocabulary), implementation mappings
and platform extensions (always platform-owned). Guidelines move with their
component.

The six steps, for both directions:

1. **Proposal.** What, why, evidence.
2. **Impact check.** Who resolves, overrides or references it.
3. **Move.** Same identity, removed from the old place in the same change.
4. **Compatibility.** Other platforms' overrides are kept; a demotion leaves the stub.
5. **Verify.** Validate, snapshot and parity, SPEC-076.
6. **Record.** Add a `lifecycle.moves` entry.

`design-data platform move --dry-run` (step 2) and `design-data platform move`
(step 3) are **planned** (p6ga.8.18.2 and p6ga.8.18.3). Until they exist, do
steps 2 and 3 by hand.

### Example A: promote Dark Elevated

Context: bead p6ga.8.8 declares Dark Elevated as an iOS-local `colorScheme`
(`light`, `dark`, `dark-elevated`) in `platforms/ios/extensions/mode-sets/`. That
file **does not exist yet**; the paths below are what it will be. Suppose Android
now needs an elevated dark surface.

1. **Proposal.** Issue with evidence from `ios` and `android`, and the foundation
   values for `dark-elevated`.
2. **Impact check.** Mode sets have no `uuid`; the identity is the name
   `colorScheme`. Check who sets `colorScheme`: today `packages/design-data/mode-sets/color-scheme.json`
   lists `light`, `dark`, `wireframe`, and iOS excludes `colorScheme=wireframe`
   in `platforms/ios/manifest.json`. Look for the `colorScheme=dark-elevated` tokens
   in `platforms/ios/extensions/tokens/`. Planned: `design-data platform move --dry-run`.
3. **Move.** Add `dark-elevated` to the foundation `colorScheme` and move the
   `dark-elevated` tokens (with their `uuid`s) from `platforms/ios/extensions/tokens/`
   to `packages/design-data/tokens/`. Delete the iOS replacement mode set in the
   same change. Planned: `design-data platform move`.
4. **Compatibility.** The promotion must declare a fallback for `dark-elevated`
   (here `dark`; the set's default is `light`, which would be wrong). Platforms with
   no values for the new mode resolve to the fallback, so their output is unchanged. Any iOS value that differs from the
   foundation value stays as an entry in `platforms/ios/manifest.json` `overrides`.
5. **Verify.**
   ```bash
   moon run design-data:validate
   design-data validate --platform ios --visuals-path <visuals dir>
   design-data validate-manifest --platform ios
   moon run tokens:verifyLegacyOutput
   ```
   Check that the legacy output has no diff for platforms you did not mean to change.
6. **Record.** Add a `lifecycle.moves` entry (`direction: promote`, `from: ios`,
   `to: foundation`, `evidence: [ios, android]`) to each moved token and to the
   `colorScheme` mode set (once mode sets can carry `lifecycle`; see the open
   questions).

### Example B: demote a foundation token to one platform

Hypothetical. Take the foundation token with `uuid`
`736e4768-7944-40ec-a412-4cd36299e03d` (`color-aliases.tokens.json`, seafoam
`visual` color, dark scheme). Suppose the foundation team decides only iOS needs it.
iOS already overrides it in `platforms/ios/manifest.json`.

1. **Proposal.** Issue stating that iOS is the only consumer.
2. **Impact check.** Search for `$ref`s and overrides that target this `uuid`
   (`design-data query --filter "colorFamily=seafoam"` with and without `--platform`).
   Other platforms that resolve it need the notice period. Planned:
   `design-data platform move --dry-run`.
3. **Move.** Add the token, with the same `uuid`, to `platforms/ios/extensions/tokens/`.
   In the foundation file, keep the record as a stub with `lifecycle.deprecatedIn`
   set to the current foundation version, a `deprecatedComment` that names `ios`,
   and the `lifecycle.moves` entry. Remove the iOS `overrides` entry for this
   `uuid`, because the extension now holds the value.
4. **Compatibility.** Other platforms still resolve the stub, unchanged, for at least
   two minor versions. After that, the stub is removed under the normal removal policy.
5. **Verify.** The same commands as in Example A.
6. **Record.** `lifecycle.moves` on both records (`direction: demote`,
   `from: foundation`, `to: ios`).

### Open questions

Not settled yet; see the spec for the full list.

* Mode sets need an optional `lifecycle` (a schema change, tracked separately).
* Where the fallback mode for a promoted mode is declared.
* Whether `overriddenBy` should carry `platformVersion` (deferred).

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
