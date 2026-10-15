# Token Studio sunset roadmap

<!-- Copyright 2026 Adobe. All rights reserved. -->

**Status:** Draft roadmap. Phase 0, Phase 1, and Phase 2 complete; Phase 3 (decommission the inbound sync) next.

## Why

Token Studio is not the authoritative authoring surface for design-data tokens — it's an
inbound sync. Designers author in Token Studio, an external `spectrum-tokens-studio-data`
repo converts the change, and a PR (opened by `mrcjhicks`, titled
`feat: updates from spectrum-tokens-studio-data`) lands here. `.github/workflows/enhance-sync-pr.yml`
decorates that PR and runs `tools/token-changeset-generator` to produce a changeset.

A native path already exists: the `design-data` CLI/TUI and the MCP authoring-session
tools (`start_authoring_session` → `step_classification` → `step_values` →
`authoring_session_commit`, see
[authoring-workflow.md](../packages/design-data-spec/spec/authoring-workflow.md)) write
tokens directly, and `sdk/core/src/figma/` exports them to Figma Variables without Token
Studio in the loop at all. This doc tracks retiring the Token Studio sync in favor of
that native path.

## Phases

### Phase 0 — now (unblocked)

* Ship the [token change request issue form](../.github/ISSUE_TEMPLATE/token-change-request.yml)
  as the designer-facing intake, replacing "open a Token Studio PR" for one-off requests.
* Announce the new intake in `#spectrum-tokens`; Token Studio still accepted during
  transition.

### Phase 1 — foundation-corpus write target (gating) — done

The CLI/TUI/MCP authoring write path now targets the foundation corpus
(`packages/design-data/tokens/*.tokens.json`) directly, rather than product-layer files. This
redirect was **Phase B** in `authoring-workflow.md` §Scheduled promotion and has **shipped**
(epic `spectrum-design-data-122`,
closed). Phases below are unblocked; see RFC
[#625](https://github.com/adobe/spectrum-design-data/discussions/625).

### Phase 2 — verify Figma export parity

The [SDK Figma export documentation](../sdk/README.md#figma) describes concurrency
guards, readback verification, and recovery from ambiguous writes. These checks
protect publication state; they do not replace token-format parity checks below.

* **Done:** `design-data figma export` and `figma audit` load the cascade `TokenGraph`
  (`packages/design-data/tokens/` plus relationships and the manifest cascade) and
  project it through `legacy::convert_graph` into the legacy-shaped Figma mapper. They no
  longer read `packages/tokens/src`.
* **Done:** `sdk/cli/tests/cli_legacy_projection_parity.rs` proves the projection equals
  `packages/tokens/src`, and `design-data:legacy-output` / `design-data:roundtrip-verify`
  keep `@adobe/spectrum-tokens` consumers free of regressions.
* **Next:** a native mapper over the graph with no legacy-shape projection (bead
  `spectrum-design-data-xqln.14`), using the parity test as its oracle.

### Phase 3 — decommission the inbound sync

Once the native path is authoritative and verified, retire:

* `tools/token-changeset-generator/`
* `.github/workflows/enhance-sync-pr.yml`
* `.github/actions/extract-source-pr-info`
* the `enhance-sync-pr` skill

Coordinate with the external `spectrum-tokens-studio-data` repo owners (`mrcjhicks`) —
sync PRs originate there, so this is a cross-repo change, not a delete-and-done in this repo.

## References

* [authoring-workflow.md](../packages/design-data-spec/spec/authoring-workflow.md)
* [rfc-coordination.md](rfc-coordination.md)
* RFC [#625](https://github.com/adobe/spectrum-design-data/discussions/625) — Token Authoring Workflow
