---
title: "Why Figma and DTCG became plugins"
date: 2026-09-21T12:00:00Z # noon UTC avoids local-timezone date rollback in the `date` liquid filter
author: Spectrum Design Data
category: Decisions
description: >-
  The ownership boundary that pulled Figma's Variables API and the W3C DTCG
  spec out of design-data-core, how it composes with per-platform manifests
  like spectrum-ios-design-data, and where a third-party plugin protocol
  could go from here.
---

`design-data-core` is the resolution engine: it owns the token graph, the
cascade, the platform-manifest model. It does not own the Figma Variables
REST API, and it doesn't own the W3C Design Tokens Community Group (DTCG)
spec either. Both were compiled in anyway, so core's dependency tree carried
Figma's `reqwest`/`tokio` stack whether or not a build ever touched Figma,
and any drift in either external spec became a change to core itself.

The fix isn't a plugin framework for its own sake. It's drawing the line
where ownership actually changes hands: what design-data owns and versions
stays in core, and what someone else owns moves to a crate that depends on
core's public API instead of living inside it.

<figure>
  <img src="/assets/images/extracting-figma-and-dtcg-into-plugins-ownership.svg" alt="design-data-core owns the token graph, cascade, and manifest model behind a Public API; the dtcg exporter and figma plugin sit outside core and depend on that API rather than being owned by it.">
  <figcaption>The boundary is the public API — plugins depend on it from outside, core never depends on them.</figcaption>
</figure>

## Two shapes, matching what actually exists

- **Pure exporters** are a one-shot `TokenGraph` + resolved winners →
  document transform, with no I/O of their own. `design-data-dtcg` is the
  only implementor today, via:

  ```rust
  pub trait TokenExporter {
      fn format_id(&self) -> &'static str;
      fn export(&self, graph: &TokenGraph, winners: &[TokenRecord],
                 mode_ctx: &HashMap<String, String>) -> serde_json::Value;
  }
  ```

- **Bidirectional plugins** do more than a one-shot transform.
  `design-data-figma` fetches live variables, diffs them against the
  resolved graph, and can write changes back, so forcing it through the
  trait above would leak a fake uniform shape. It keeps its own CLI
  subcommands (`figma export`/`import`/`audit`/`diff`/`pair`) instead.

The CLI resolves an exporter by `format_id()` from a small static list
rather than a hardcoded match arm. That list is the seam a second pure
exporter drops into with no other code change.

| Status | Item |
| --- | --- |
| Shipped | Figma and DTCG extracted into `sdk/plugins/figma` and `sdk/plugins/dtcg`, behavior-preserving |
| In review | `TokenExporter` trait, the compiled-in seam pure exporters implement |
| Spec only | Third-party subprocess protocol, see below |

## Plugins sit downstream of platform manifests

Platform teams already run their own copy of the design data. They pin a
foundation dataset from this repo, layer a private `manifest.json` on top
(include/exclude filters, value overrides, net-new tokens), and resolve
their own winners. `spectrum-ios-design-data` does exactly this: a
`.design-data.toml` pins a foundation release over GitHub, a 350&nbsp;KB
manifest carries the platform's real overrides, and the resolved output is
what iOS actually ships against. More than half of those overrides turned
out to be increased-contrast and elevated-mode variants that a single
shared foundation table couldn't hold on its own.

Every plugin, pure exporter or bidirectional, sits strictly downstream of
that cascade:

<figure>
  <img src="/assets/images/extracting-figma-and-dtcg-into-plugins-pipeline.svg" alt="Open graph flows into manifest::apply_configured, then cascade::resolve_dataset, then exporter.export.">
  <figcaption>A plugin's own code starts at the last step — everything upstream of exporter.export is already resolved for it.</figcaption>
</figure>

A plugin never touches the manifest or the source config, and it doesn't
need to know an iOS-flavored dataset exists at all. It gets the same
resolved shape whether the input was the shared foundation or a platform's
fully overridden copy of it, so a platform team's private manifest and a
plugin's export logic can change independently of each other.

## Specified but not built: third-party subprocess plugins

Everything above is in-monorepo and compile-time, so a new exporter still
means a PR to this repo. [`sdk/plugins/PLUGINS.md`](https://github.com/adobe/spectrum-design-data/blob/main/sdk/plugins/PLUGINS.md)
specifies, without implementing, what an out-of-repo plugin would look
like: a subprocess protocol rather than dynamic loading. A batch CLI never
hot-reloads anything, so a runtime plugin loader wouldn't buy anything
here.

| Step | Contract |
| --- | --- |
| Discovery | `design-data export --format <name>` looks for `design-data-export-<name>` on `PATH` |
| stdin | The resolved graph, winners, and mode context: the same state a `TokenExporter` gets after the manifest cascade, not the raw pre-manifest fixture shape |
| stdout | Target-format bytes, written verbatim to the CLI's export output |
| Failure | Non-zero exit or anything on stderr is a hard failure, no partial output |

One thing is deliberately left open: a `TokenExporter` gets one resolved
slice for one mode context, but a target that needs every mode in a single
output, like an iOS asset catalog with light, dark, and increased-contrast
in one file, needs more than that slice. Whether the subprocess gets
invoked once per mode or handed all modes in one payload isn't decided yet.
That should be settled by whichever plugin actually needs it, not guessed
at now.

This only gets built when a real external author shows up.

## What this opens up

Right now, this mainly benefits implementation teams. Any platform
maintaining its own manifest-cascaded dataset, whether that's iOS, Android,
web, or something we haven't seen yet, is already the audience for the
`TokenExporter` seam. A platform-specific export format is a crate under
`sdk/plugins/` away, and it inherits the manifest cascade for free. The
pattern `spectrum-ios-design-data` already proved, pinning a foundation and
layering a private manifest on top, is the shape to reach for whenever a
team needs its own version of the data.

The subprocess protocol is what makes this interesting beyond this repo's
own contributors, once it exists. A product team that wants Spectrum tokens
in a format this team has no reason to maintain, whether that's a
proprietary build pipeline or a different design tool entirely, wouldn't
need a relationship with this repo's maintainers to get it. They'd write
one binary that reads resolved winners on stdin and writes their bytes on
stdout: the same shape `design-data-dtcg` already implements in-process.
The boundary that justified pulling Figma and DTCG out of core is the same
one that would let an unrelated Adobe product own its export path outright.

None of that needs deciding now. It's the reason the spec exists before the
implementation does.

## Further reading

- [`sdk/plugins/PLUGINS.md`](https://github.com/adobe/spectrum-design-data/blob/main/sdk/plugins/PLUGINS.md):
  the full plugin model specification
- [Exporting Spectrum tokens to DTCG](/articles/exporting-tokens-to-dtcg/):
  what the DTCG exporter actually produces
- [Spectrum Design Data on GitHub](https://github.com/adobe/spectrum-design-data)
