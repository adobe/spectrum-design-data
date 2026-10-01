<!-- Copyright 2026 Adobe. All rights reserved. -->

<!-- Licensed under the Apache License, Version 2.0. -->

# Hub MCP evaluation

This internal package checks whether the built Spectrum MCP supplies useful grounding
and provides an opt-in runner for agent answers. It does not publish to npm.

## Offline checks

```sh
moon run design-data-mcp-eval:test
```

The AVA suite builds private Desktop MCP bundles and uses them over stdio with a clean
server environment and import guards against workspace fallback. It compares the
catalog to the canonical manifest and checks the facts
needed by 13 scenarios: error copy, voice and tone, containers, typography exceptions,
button progress, unsupported requests, conflicting cursor guidance, and guideline/token
lookup. The normal PR CI Rust lane runs these checks without a model or API key.

These tests prove retrieval and grounding contracts. They do **not** prove an agent can
choose the right guideline, detect every unsupported question, or produce a good answer.
The unsupported-request contract checks an unknown-ID error, not semantic absence across
the corpus. The separate MCP package suites check both server variants; this scenario
runner targets the read-only Desktop MCP tool surface.

## Agent runs

Use an approved OpenAI-compatible chat-completions endpoint with tool calling. No paid
provider, model, or endpoint is selected automatically. A compatible local model server
can use an HTTP loopback endpoint; remote endpoints must use HTTPS. The runner sends
only scenario questions and public MCP data, not repository source or workspace files.

```sh
export EVAL_ENDPOINT=https://your-approved-provider.example/v1/chat/completions
export EVAL_MODEL=your-approved-model-version
# Set EVAL_API_KEY through your secret manager if the endpoint requires it.
moon run design-data-mcp-eval:evaluate -- --limit 1 --scenario heading-weight-exception
```

The agent sees tool definitions and the question, not the fixture's expected answer
or retrieved documentation. It must call the MCP tools itself. Only the seven read
tools are exposed. Reports include its answer, tool calls/results, automated checks,
human-review rubric, model ID, token usage when supplied by the provider, manifest and
WASM hashes, scenario hash, and CI commit. Do not use a moving model alias for a baseline
if the provider offers an immutable version.

Before spending inference requests, the runner checks every shipped guideline against
the canonical corpus. The default artifact is the Moon-staged bundle. Use `--artifact`
with an absolute path to a trusted alternate staging tree for packaging investigations.
Tests own private trees so parallel packaging tests cannot replace a running artifact.
Evaluation loads its import guards from outside the artifact without writing to the
staging tree. An archive regression verifies that evaluation leaves the tree unchanged
and that subsequent MCPB packing excludes the test guards.

Each scenario has at most eight model turns, sixteen tool calls, and a two-minute
timeout. A run has at most 64 inference requests, 2,000,000 cumulative prompt characters,
and 1,024 requested output tokens per request. These are request/context ceilings,
**not a monetary guarantee**; check the provider's pricing and quota before running.
There are no automatic provider retries or paid-provider fallbacks.

The exit codes are `0` for passing automated screens, `1` for screen regressions, and
`2` for configuration, provider, transport, or execution failures. Failed tool results
remain in the trace and cannot satisfy required retrieval. An execution failure stops
the remaining scenarios and is reported separately from answer regressions.

## GitHub Actions

After merging to `main`, run **Hub MCP agent evaluation** manually from Actions. Set
repository variables `EVAL_ENDPOINT` and `EVAL_MODEL`, and secret `EVAL_API_KEY` if needed.
The workflow accepts a scenario limit and optional scenario ID. It runs only on `main`,
has read-only GitHub permissions, and exposes the provider key only to the agent step.
It never runs privileged evaluation on PR code or uses `pull_request_target`.

Weekly scheduled execution is disabled unless `EVAL_SCHEDULE_ENABLED` is `true`.
The workflow uploads reports for 14 days and visibly fails for execution errors or
screen regressions, but is separate from required PR checks and the release workflow.
Do not add it to branch protection or make publishing depend on it.

Standard GitHub-hosted runner compute for public repositories is distinct from model
inference billing. Confirm current availability and terms for the selected provider;
this package does not assume GitHub Models or a free inference allowance exists.

## Scenarios and human review

Edit `src/scenarios.js` to add a source-backed case. Each case needs a realistic question,
tool/argument grounding contracts with required phrases, answer patterns, acceptable
citations, a rubric describing exceptions, and any narrowly scoped forbidden claims.
Use normalized phrases rather than full prose snapshots. Keep 10-15 cases and run the
offline tests after changing the corpus or fixtures.

Answer patterns and citation presence are only automated screens. A model can satisfy
them with a wrong or contradictory answer; negation and paraphrases can also cause false
failures. Every result therefore requires human rubric review for factual correctness,
claim-level grounding, useful recommendations, exceptions, and appropriate abstention.
Review failures rather than lowering thresholds to make a run green.

The cursor-conflict case records contradictory merged button guidance.
When that content is reconciled, update its evidence and rubric instead of preserving
the contradiction as a permanent requirement. Check the cross-tool case distinguishes
the medium-card example from a universal padding rule. Indexed spacing is queried
with `property=spacing`, then selected by `raw.name.scaleIndex === 300` in the
returned data. The query filter does not accept `scaleIndex`, and property-only
resolve cannot uniquely resolve a legacy name such as `spacing-300`.

Before considering release gating, establish a human-reviewed baseline across repeated
runs of a fixed model, document false positives/negatives, compare against deliberate
bad-answer examples, and agree on acceptable variation and outage handling. This initial
implementation does not gate releases on model scores.
