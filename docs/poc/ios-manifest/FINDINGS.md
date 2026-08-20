<!-- Copyright 2026 Adobe. All rights reserved. -->

<!-- Licensed under the Apache License, Version 2.0 (the "License");           -->

<!-- you may not use this file except in compliance with the License. You may -->

<!-- obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0 -->

<!-- Unless required by applicable law or agreed to in writing, software       -->

<!-- distributed under the License is distributed on an "AS IS" BASIS,        -->

<!-- WITHOUT WARRANTIES OR REPRESENTATIONS OF ANY KIND, either express or     -->

<!-- implied. See the License for the specific language governing permissions -->

<!-- and limitations under the License.                                        -->

# Spectrum iOS platform manifest — POC findings

**Status:** proof of concept, **not production**. Tracks bd `spectrum-design-data-284.10`
/ `spectrum-design-data-7mt.3` (Aug 28 2026 milestone, "cascade proven on iOS first").

**Goal:** validate the [Platform Manifest spec](../../../packages/design-data-spec/spec/manifest.md)
(draft `1.0.0-draft`) against a real platform, using real data from Spectrum iOS's actual token
package (`spectrum-tokens-ios`, not fabricated), before extending the model to Android.

The manifest+cascade engine this POC exercises already exists and is not part of this deliverable:
`TokenGraph::apply_platform_manifest` (`sdk/core/src/graph.rs:737`), `manifest::apply_configured`
(`sdk/core/src/manifest.rs`), `cascade.rs` resolution. This POC is data + a validation writeup.

## What's here

* **`manifest.json`** — a real iOS Layer-2 manifest: `foundationVersion` pin, `include`/`exclude`
  query filters, two typed `overrides`, and `extensions.tokens` (net-new + contrast-mode tokens).
* **`.design-data.toml`** — `type = "github"`, pinned to `@adobe/spectrum-tokens@15.0.0`, with a
  **top-level `manifest` key** that cascades on top of the remotely-fetched foundation. This is the
  original intent, now functional: the POC surfaced gap #0 (the manifest cascade only applied to a
  `type = "path"` source), which was then fixed in `sdk/core` — see gap #0 below for the fix and the
  source-strategy rationale.
* This document — what was tested, what worked, and where the model has real gaps.

## Grounding: what real Spectrum iOS actually does

Source: `spectrum-tokens-ios` (`~/Spectrum/spectrum-tokens-ios` in this environment), which pins
`@adobe/spectrum-tokens@13.0.0` and ships `ios-tokens/override-log.csv` — a real log of **742**
overrides applied on top of the foundation token set. Classifying those 742 rows by shape:

| Category                         | Count | Shape                                                                        |
| -------------------------------- | ----- | ---------------------------------------------------------------------------- |
| Net-new tokens ("Custom token")  | 177   | Foundation has no equivalent at all                                          |
| Contrast/elevated-only additions | 399   | `light`/`dark` unchanged; `lightIncreased`/`darkIncreased`/`elevated*` added |
| True value changes               | 11    | `light`/`dark` base values actually replaced                                 |
| Typography / other               | 155   | `font-size.json`, `letter-spacing.json`, component files, etc.               |

**The dominant iOS override pattern (399 of 742, \~54%) is adding increased-contrast color
variants** — not changing existing values. That's the central thing this POC needed to test against
the manifest model, because:

Foundation defines a `contrast` mode set (`packages/design-data/mode-sets/contrast.json`, modes
`["regular", "high"]`) but **ships zero tokens with a `high` value** — every foundation color token
that has a `contrast` field simply... doesn't have one; `high` falls back to the `regular` default.
So "add the high-contrast variant iOS actually ships" cannot be represented as a *value replacement*
of an existing token — there is no existing `contrast=high` record to target. It has to be new data.

## Manifest content, and why

* **`foundationVersion`**: pinned to `@adobe/spectrum-tokens@15.0.0` — the current dataset, not
  iOS's real `13.0.0`. `13.0.0` predates the cascade token format entirely (structured `name`
  objects, mode sets, UUIDs); a manifest against it isn't meaningful. **This version gap is itself
  a finding** — see [Gaps](#gaps-found) below.
* **`include`**: the token `property` families iOS's generated Swift sources actually cover
  (`color`, `size`, `line-height`, `font-weight`, `font-family`, `text-align`, `corner-radius`,
  `border-width`, `opacity`, `background-color`) — verified present in
  `packages/design-data/tokens/*.tokens.json` before use; not guessed.
* **`exclude`**: `colorScheme=wireframe` — iOS ships only light/dark (+ increased-contrast
  variants); the design-tool-only `wireframe` scheme (460 color tokens) is real overhead it never
  consumes.
* **`overrides`**: the two clearest of the 11 real "true value change" rows —
  `disabled-background-color` and `disabled-border-color` — targeted **by UUID**
  (`a46de9d2-…`, `474ae56c-…`), each replacing the resolved literal color with iOS's actual new
  value (`rgba(0, 0, 0, 0.03)`, `rgba(0, 0, 0, 0.15)`).
* **`extensions.tokens`**: one representative net-new token (`accent-background-color-pressed`,
  a real "Custom token" row, light+dark) plus the `contrast=high` variants of
  `accent-background-color-default` (light+dark) — using the increased-contrast values from the
  real override log. This is the concrete resolution of the central question above: **increased-
  contrast values belong in `extensions`, not `overrides`**, because there is no existing record to
  override.
* **`extensions.formatting`**: `casing: camelCase`, matching iOS's real Swift symbol style
  (`accentBackgroundColorDefault`). Left minimal — see gaps.

## What was verified (commands run against real fetched/local data)

All runs used the CLI built from this repo (`cargo build -p design-data-cli`, `fetch` feature is
on by default for the CLI binary).

**1. Remote pin + manifest cascade compose end-to-end.** With `.design-data.toml` at
`type = "github"` (tag `@adobe/spectrum-tokens@15.0.0`) and a **top-level** `manifest` key, the CLI
downloads and caches the tagged release tarball (pure HTTPS, no Node/git binary — the tarball ships
the full dataset including `packages/tokens/schemas/**`), then applies the manifest on top of the
fetched foundation. `query --filter "property=color" --count` against the fetched dataset returns
the manifest-filtered **1136** (not the unfiltered baseline 1587), `resolve color` reports
`File: manifest.json` for extension tokens, and overrides/extensions materialize (items 2–4 below,
re-verified against the `github` source). This is the resolution of gap #0: the manifest used to
apply only to a `type = "path"` source. See [Gaps](#gaps-found) #0 for the fix.

**2. Filtering works.** `query --filter "property=color"` returns 1587 without a manifest configured;
with this manifest's `exclude: ["colorScheme=wireframe"]` applied, it drops to 1136 — the wireframe-
scheme color tokens are correctly removed.

**3. Extensions materialize and are queryable.** `query --filter "property=color,state=pressed"`
with the manifest configured returns exactly the 2 net-new `accent-background-color-pressed`
records (light/dark) from `extensions.tokens`; `query --filter "property=color,contrast=high"`
returns exactly the 2 `contrast=high` records. Neither exists in the foundation set.

**4. Overrides land as new Platform-layer records, not in-place replacements.** After adding the
UUID-targeted overrides, `query --filter "property=color,state=disabled"` count went from 7 to 9 —
the original 2 alias records (`$ref` to `disabled-background-color`/`disabled-border-color`,
untouched) are still present, **plus** 2 new synthetic records carrying the override's literal
value. `query` shows the full graph across all layers; only `resolve()` / `resolve_property()`
apply `Foundation < Platform < Product` precedence to pick a single winner. This is a genuine,
useful distinction to document for anyone using `query` output to "count what a platform ships" —
it will double-count overridden tokens unless you know to resolve, not just query.

## Gaps found (worth raising before Nov 20 adoption work)

0. **RESOLVED — manifest hoisted to a top-level, source-independent config key; `github` source
   accepts tag/branch/sha.** As originally found, the manifest cascade only applied to a
   `type = "path"` source: `SourceConfig::Path` was the *only* variant with a `manifest` field, and
   because `SourceConfig` had no `deny_unknown_fields`, `manifest = "..."` under `type = "github"`
   was silently dropped, leaving `ResolvedData::platform_manifest = None` and
   `manifest::apply_configured` a permanent no-op. Fixed in `sdk/core`:

   * **Hoisted `manifest` to the top level of `DesignDataConfig`** (`data_source/mod.rs`) — it's a
     local, platform-authored file, orthogonal to where the *foundation* comes from, so coupling it
     to one source variant was the root cause. It now cascades over **any** source (path, github,
     even the embedded/probed default). `#[serde(deny_unknown_fields)]` on both `DesignDataConfig`
     and `SourceConfig` makes a misplaced key error loudly instead of vanishing.
   * **Extended the `github` source to pin by `tag`, `branch`, or `sha`** (`data_source/fetch.rs`) —
     GitHub serves an archive tarball for any ref (`/archive/refs/tags/{tag}`,
     `/archive/refs/heads/{branch}`, `/archive/{sha}`), so "track a branch/directory of the
     foundation repo" needs **no `gix`, no git binary, no new dependency**. Branch pins (mutable)
     bypass the `.complete` sentinel and refetch each run; tag/sha (immutable) keep the fast path.

   **Source-strategy rationale (github vs npm vs git — the question this fix answered):** the
   constraint was that npm effectively requires Node, which many iOS/Android devs lack. But fetching
   is HTTPS either way — the real differentiator is *dataset completeness*. The legacy
   `@adobe/spectrum-tokens` npm tarball ships tokens only (no schema catalog); `@adobe/spectrum-
   design-data` ships tokens/components/fields/mode-sets/guidelines but **not** `schemas/`. The
   **GitHub release tarball ships everything over pure HTTPS with no Node and no git binary**, and
   now supports tag/branch/sha — so it strictly dominates npm for the cascade. `npm` and `git`
   remain stubbed, with errors that point at `type = "github"`; a real `gix` `git` source (for
   non-GitHub hosts) is YAGNI here.
1. **Override targets by legacy slug silently no-op.** The manifest schema's `target` field is
   documented as "enough information to identify the target token," and `resolve_override_targets`
   (`sdk/core/src/graph.rs:903`) does fall back to a direct key lookup — but that lookup is against
   the graph's internal key, **not** the `legacy_name_index` that maps human-readable legacy slugs
   (`disabled-background-color`) to that key. Targeting by the plain legacy name failed with **no
   error and no effect** — the override was simply dropped. Only a UUID (or a query expression
   matching exactly one record) reliably works today. Given `legacyKey` isn't itself a supported
   query key either (`spec/query.md#supported-keys`), a platform author has no legible way to
   target "the token with legacy name X" — they need its UUID. **This is a real usability gap** for
   anyone hand-authoring a manifest from an override log like iOS's, which speaks in legacy names.
2. **Type-safety guard doesn't cover alias-only targets.** Cascade type-safety
   ("overrides MUST NOT change resolved type") is enforced in `graph.rs:790-798` only when the
   *matched foundation record itself* carries a literal `"value"` field to compare against. Both
   override targets here are pure `$ref` aliases with no `"value"` field, so `orig_value` is `None`
   and the check is skipped unconditionally. Verified directly: an override with `"value": 42`
   (number) against the same alias-typed UUID applied with **no error**. Alias-typed tokens are the
   large majority of the color corpus, so this gap likely covers most real overrides, not an edge
   case.
3. **Foundation version pin predates the cascade format.** iOS's real, current pin
   (`@adobe/spectrum-tokens@13.0.0`) has no `packages/design-data/*` cascade dataset at all — it's
   pre-cascade legacy format. A real adoption manifest can't target that tag; iOS would need to
   move its pin forward to a cascade-format release (`15.0.0`+) as a prerequisite, independent of
   the manifest work itself.
4. **`extensions.tokens` isn't schema-validated.** `manifest.schema.json`'s `extensions` property
   only declares `formatting`; everything else (including `tokens`) is accepted purely via
   `additionalProperties: true` — no shape validation before `apply_platform_manifest` consumes it.
   A malformed extension token (bad `$schema`, missing `name` fields) fails silently or downstream,
   not at manifest-validation time.
5. **`extensions.formatting` is under-specified for iOS's actual naming.** Real iOS Swift symbols
   (`accentBackgroundColorDefault`) don't map cleanly from foundation's structured `name` object via
   `conceptOrder`/`casing`/`delimiter`/`abbreviations` alone — iOS's actual generator
   (`Tools/tokentool`) does custom Swift codegen, not driven by this taxonomy today. Reconciling the
   two is unscoped follow-up work, not blocking for this POC.
6. **`npm`/`git` sources are deliberately unimplemented** — not a gap. The published npm tarballs
   are dataset-incomplete for the cascade and the `github` source now covers tag/branch/sha over
   pure HTTPS; both stubs error with a pointer to `type = "github"`. See gap #0's source-strategy
   note for the full rationale.
7. **`query`/`resolve`'s positional `PATH` is independent of `.design-data.toml`'s `[source]`
   root — passing `.` silently loads whatever `*.json` files happen to sit under the literal cwd,
   not the configured dataset.** Discovered directly while writing this doc: an earlier run left
   a stray fetched-tarball cache under this very directory (`sources/`, from testing gap #0's
   `github` source, since deleted — never committed), and `query .` picked that up by accident,
   producing a plausible-looking but coincidental result. With that directory gone, `query .` from
   here recurses only into this dir's own `*.json` (picking up `manifest.json` itself) and returns
   a handful of records — neither an error nor the intended dataset. The commands in
   **Reproducing** below pass the real tokens directory explicitly for this reason. A platform
   author following the spec's own convention of running `design-data query .` inside a manifest's
   directory would silently get the wrong answer; `resolved.tokens_root` (tier 2/3 of
   `data_source::resolve`) exists precisely to prevent this and should probably be consulted by
   `query`/`resolve` when the CLI positional is left at its default rather than only for
   mode\_sets/components/manifest.

## Verdict

The manifest model — pin, filter, override, extend — **holds up against a real platform's real
override log**, and the cascade pieces (query filtering, overrides, extensions) work exactly as
documented. **Remote pinning now composes with the manifest cascade** (gap #0, fixed here): a
`github`-pinned foundation + a top-level `manifest` key filters, overrides, and extends end-to-end,
so the locked-in "use existing GitHub source" scoping decision is deliverable. The next tier of
gaps — [#1](https://github.com/adobe/spectrum-design-data/issues/1) (legacy-slug override targeting) and [#2](https://github.com/adobe/spectrum-design-data/issues/2) (type-safety on alias targets) — are
implementation gaps in `resolve_override_targets`, not spec problems, and are narrow, well-
understood fixes. Recommend: (a) fix [#1](https://github.com/adobe/spectrum-design-data/issues/1) and [#2](https://github.com/adobe/spectrum-design-data/issues/2) in `sdk/core`; (b) fix gap [#7](https://github.com/adobe/spectrum-design-data/issues/7) (`query`/`resolve`
should consult `resolved.tokens_root` when the positional PATH is left at its `.` default);
(c) repeat this exercise for Android to confirm the model (not just this one engine implementation)
generalizes.

## Reproducing

```sh
cd docs/poc/ios-manifest
# .design-data.toml here uses `type = "github"` (tag @adobe/spectrum-tokens@15.0.0) with a
# top-level `manifest` key. The first run fetches + caches the release tarball (pure HTTPS);
# set DESIGN_DATA_CACHE_DIR to a scratch dir so nothing lands in the repo.
export DESIGN_DATA_CACHE_DIR=$(mktemp -d)
design-data resolve color   # File: manifest.json  → confirms the manifest cascades over the github source

# For `query`, pass the fetched tokens dir explicitly — do NOT pass "." (see gap #7): the
# positional PATH loads tokens directly and is independent of `.design-data.toml`'s `[source]`
# root; only mode_sets/components/the manifest come from the resolved config. Run from this
# directory so config resolution still finds and applies manifest.json on top.
TOKENS="$DESIGN_DATA_CACHE_DIR"/sources/github/*/packages/design-data/tokens
design-data query $TOKENS --filter "property=color" --count                       # 1136 (1587 without the manifest's exclude)
design-data query $TOKENS --filter "property=color,state=pressed" --count         # extensions: 2 net-new contrast/pressed tokens
design-data query $TOKENS --filter "property=color,contrast=high" --count         # extensions: 2 contrast-mode tokens
design-data query $TOKENS --filter "property=color,state=disabled" --count        # overrides: 7 → 9 (see item 4)
```

(`design-data` = the `design-data-cli` binary built from `sdk/`, `moon run sdk:build`.)
