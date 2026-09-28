# Platform manifest migration runbook

This is the step-by-step for moving a platform manifest that's been
incubating in `platforms/<id>/` out to a repo the implementation team owns
(spectrum-design-data-h890.27.13). It complements
[`platforms/README.md`](../platforms/README.md), which explains the
incubation model and the ejection contract at a glance; this document is the
full runbook, using the iOS proof-of-concept
(`GarthDB/spectrum-ios-design-data`, spectrum-design-data-h890.22) as the
worked example throughout.

Nothing here is a one-way door taken lightly: every step keeps the cascade
consumable the whole way through, and the in-repo copy is only deleted at the
very end, after the external repo is proven green.

## Prerequisites

* The team is ready to own a repo (or a directory in their main repo) that
  gets reviewed and versioned independently of this monorepo.
* The manifest has been incubating in `platforms/<id>/` long enough that its
  `formatting`/`include`/`exclude`/`overrides` are stable — migrating is not
  the moment to also redesign the manifest's content.
* **The pinned `foundationVersion` tag must actually exist as a published
  foundation release**, and that release's `manifest.schema.json` must
  already contain every schema field the manifest uses. This sounds obvious
  but is easy to get backwards during active schema development: this
  session added `platform`/`platformVersion`/`repository`/`formatting.prefix`
  to `manifest.schema.json`, and ejecting-then-validating against the *real*
  `@adobe/spectrum-tokens@15.4.1` release tag failed Layer 1 validation with
  "Additional properties are not allowed" — that release predates these
  fields. Wait for a foundation release that includes the schema additions
  the manifest relies on before ejecting for real, or the ejected repo's own
  CI will fail on its first run.

## Step 1 — Eject

From the monorepo root:

```bash
design-data platform eject <id> --out /path/to/new-repo
```

This copies `manifest.json`, `extensions/`, and `README.md` (generating a
stub if none exists) into the target directory, writes a standalone
`.design-data.toml` that pins the foundation via
`[source] type = "github"` at the manifest's own `foundationVersion`, writes
`.github/workflows/validate.yml` wired to this repo's
[`.github/actions/validate`](../.github/actions/validate) composite action,
and best-effort copies this repo's `LICENSE`. It refuses to run against a
`[platforms.<id>]` entry that's already `Remote` ("already external") or an
unknown id, listing the ids that are actually configured.

Inspect the output before moving on — in particular, confirm
`.design-data.toml`'s `tag` matches a real foundation release (see
Prerequisites above) and that `.github/workflows/validate.yml`'s
`dataset-path`/`manifest` inputs match the target repo's intended layout if
it isn't a manifest-only repo (e.g. a `design-data/` subdirectory inside the
team's main repo, rather than the repo root).

## Step 2 — Preserve history and push

The eject command copies working-tree content only — it does not carry this
repo's commit history for `platforms/<id>/`. To keep that history in the new
repo, split it out with `git subtree` before pushing:

```bash
git subtree split --prefix=platforms/<id> -b eject/<id>
git push <destination-repo-url> eject/<id>:main
```

Then layer the ejected working tree (`.design-data.toml`,
`.github/workflows/validate.yml`, `LICENSE`) on top of that pushed history —
either by committing it directly in a fresh clone of the destination repo,
or by rebasing the `eject/<id>` branch onto it. For the iOS POC this landed
as a single follow-up commit in the destination repo (`GarthDB/spectrum-ios-design-data`,
commit `1d60f07`) placing `components/tab-bar-ios.json` and
`registry/platform-extensions/ios-states.json`, then wiring them into
`manifest.json`'s `extensions.components`/`extensions.platformExtensions`.

Confirm CI is green in the new repo — its `validate.yml` workflow runs the
same `.github/actions/validate` composite action this monorepo uses, so a
failure here means the same thing it would here: a real Layer 1 or apply-time
validation problem (see Prerequisites for the most likely cause).

## Step 3 — Flip the in-repo entry from `path` to `github`

In this repo's root `.design-data.toml`, change the `[platforms.<id>]` entry
from a local path to a `Remote` entry (`PlatformManifestEntry::Remote` in
`sdk/core/src/data_source/mod.rs`):

```toml
[platforms.<id>]
repo = "adobe/<id>-design-data"   # or wherever the team placed it
tag = "v1.0.0"                    # exactly one of tag / branch / sha
# manifest_path defaults to "manifest.json" at the tree root; set it if the
# manifest lives in a subdirectory of the destination repo.
```

Verify locally before committing this change:

```bash
design-data platform show <id>    # confirms source: remote — <repo>@<tag>
design-data --platform <id> validate-manifest
design-data --platform <id> query --filter "component:button"
```

`platform show` reports the resolved location and an advisory
foundation-version-drift check either way — it doesn't distinguish local vs.
remote in what it validates, so a clean `validate-manifest` here is the same
signal it always was, just now fetching from the new repo instead of reading
`platforms/<id>/` on disk.

## Step 4 — Verify consumers

Anything that resolved this platform's manifest locally now fetches it
remotely instead (cached under `.../sources/github/<repo>@<tag>/`, the same
`fetch::ensure_cached` machinery a top-level `[source] type = "github"` foundation
pin already uses) — re-run whatever consumed the manifest before the flip:

* `moon run root:validate-platforms` (spectrum-design-data-h890.27.12) — the
  CI task that validates every `platforms/*` entry. Once flipped, this same
  task now exercises the remote-fetch path for `<id>` instead of the local one.
* Any downstream codegen or MCP/TUI flows that use `--platform <id>` or
  `DESIGN_DATA_PLATFORM=<id>` (spectrum-design-data-h890.27.14).
* A real network fetch requires the `fetch` cargo feature and network access
  in whatever environment runs these checks (CI runners need outbound GitHub
  access; this is already true for foundation pins today).

## Step 5 — Remove the in-repo copy

Only after the new repo is live, CI is green, and Step 4's consumers have
been re-verified against the remote entry:

```bash
git rm -r platforms/<id>/
```

Update `platforms/README.md`'s status table (remove the row, or mark it
"Graduated" with a link to the new repo — see how
spectrum-design-data-h890.22.6 tracks the still-open Android follow-up for
the precedent), and remove the team's entry from `CODEOWNERS` if it only
existed to review `platforms/<id>/`.

## Known limitations to route around, not silently hit

* **`design-data primer` does not apply a `--platform`-selected manifest.**
  `run_primer` (`sdk/cli/src/main.rs`) never calls
  `manifest::apply_configured`, so `primer --platform <id>` always reports
  `Platform ext.: 0` regardless of the manifest's content — this is a
  pre-existing gap, not something the migration causes or fixes. It does
  *not* affect `query`/`resolve`/`convert`/`validate-manifest`, which all
  call `apply_configured` correctly. Don't use `primer` output as a
  migration-verification signal; use `validate-manifest` and `query` instead
  (see Step 3). Tracked for the general `--platform` scoping pass
  (spectrum-design-data-h890.27.14).
