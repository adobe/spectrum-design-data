# Token Studio sunset roadmap

<!-- Copyright 2026 Adobe. All rights reserved. -->

**Status:** Draft roadmap, Phase 0 in progress.

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

- Ship the [token change request issue form](../.github/ISSUE_TEMPLATE/token-change-request.yml)
  as the designer-facing intake, replacing "open a Token Studio PR" for one-off requests.
- Announce the new intake in `#spectrum-tokens`; Token Studio still accepted during
  transition.

### Phase 1 — foundation-corpus write target (gating)

The shipped CLI/TUI/MCP authoring write path currently targets product-layer files, not
the foundation corpus (`packages/design-data/tokens/*.tokens.json`). Redirecting it is
**Phase B** in `authoring-workflow.md` §Scheduled promotion, and is **not yet shipped**.
Nothing below can complete until this lands. Track as its own epic; see RFC
[#625](https://github.com/adobe/spectrum-design-data/discussions/625).

### Phase 2 — verify Figma export parity

- Confirm `design-data figma export` reads the cascade token format
  (`packages/design-data/tokens/`) end to end. The CLI help text calls its input a
  "legacy token source directory" — that naming is overloaded; verify
  `build_export_payload`'s expected input shape in `sdk/core/src/figma/mapping.rs` before
  relying on it.
- Confirm round-trip to legacy output (`design-data:legacy-output`,
  `design-data:roundtrip-verify`) so `@adobe/spectrum-tokens` consumers see no regression.

### Phase 3 — decommission the inbound sync

Once the native path is authoritative and verified, retire:

- `tools/token-changeset-generator/`
- `.github/workflows/enhance-sync-pr.yml`
- `.github/actions/extract-source-pr-info`
- the `enhance-sync-pr` skill

Coordinate with the external `spectrum-tokens-studio-data` repo owners (`mrcjhicks`) —
sync PRs originate there, so this is a cross-repo change, not a delete-and-done in this repo.

## References

* [authoring-workflow.md](../packages/design-data-spec/spec/authoring-workflow.md)
* [rfc-coordination.md](rfc-coordination.md)
* RFC [#625](https://github.com/adobe/spectrum-design-data/discussions/625) — Token Authoring Workflow
