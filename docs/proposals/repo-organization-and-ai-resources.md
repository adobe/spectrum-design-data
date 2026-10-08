<!-- Copyright 2026 Adobe. All rights reserved. -->

# Proposal: organize repository tools and AI resources

## Purpose

Aaron raised four related questions in Slack: how to keep legacy work distinct, whether packages
need their own AI instructions and `llms.txt`, whether to generate editor-specific resources from a
tool-agnostic source, and how to distinguish repository housekeeping from help for Spectrum users.

This proposal is for discussion with Aaron or the AI/Data squad. It does not move or remove files.
Spectrum 1 already lives on the `s1-legacy` branch and predates the repository's AI tooling, so the
main-branch question is how to handle deprecated or one-off S2-era assets—not how to relocate S1.

This proposal is stacked on [#1532](https://github.com/adobe/spectrum-design-data/pull/1532), which
fixes the Hub documentation layout and MCP data source. The inventory was collected from `main`
before that change; the transformer entry below reflects its removal in the stack's base.

## Current AI resources

The repository has root `AGENTS.md`, `CLAUDE.md`, and `llms.txt` files, Claude-specific rules and
skills under `.claude/`, and a few package-level `CLAUDE.md` files. It does not yet have a shared
`.ai/` source or generated Copilot and Cursor rule directories. Package-specific guidance is
therefore uneven, and the root agent instructions mix general repository guidance with maintainer
workflows.

## Recommendation

Start with a **metadata-backed audience index**, not a directory-wide move. Keep package paths stable
while adding an explicit audience classification and a generated index. This makes internal tools
easier to identify without immediately changing workspace globs, Moon project paths, workflow
selectors, package repository links, or published package paths. Reconsider physical moves only for
confirmed archive candidates after checking their consumers and CI references.

For AI resources, use one root `.ai/` as the tool-agnostic source of truth, following
[Spectrum Web Components' model](https://github.com/adobe/spectrum-web-components/tree/main/.ai):
path-scoped rules, skills, and lessons live there; a sync task generates the Copilot and Cursor
files, while Claude and Cursor native discovery paths link to the same source. Add a short nested
`AGENTS.md` in every workspace package. Publish package-level `llms.txt` only for packages intended
for external use; make the root `llms.txt` an index rather than duplicating all package content.

Audience, package publication status, and lifecycle should be separate fields. A tool may be
consumer-facing and deprecated, or internal while still published; neither fact should be inferred
from its directory name or npm scope.

## Preliminary inventory

The categories below describe intended audience, not permission to move or delete. “Published” means
the package appears configured for npm publication; verify registry and downstream usage before any
deprecation or removal.

### Packages

| Path                                  | Audience / status                                            | Proposed handling                                                            |
| ------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `packages/component-schema-converter` | Unclear; no package manifest found                           | Verify references; remove only if confirmed to be an empty workspace remnant |
| `packages/component-schemas`          | Consumer-facing; published                                   | Keep; package-specific usage guidance and `llms.txt` are appropriate         |
| `packages/design-data`                | Consumer-facing; published                                   | Keep; package-specific guidance and `llms.txt` are appropriate               |
| `packages/design-data-spec`           | Consumer-facing specification; published                     | Keep; document conformance and authoring usage                               |
| `packages/design-system-registry`     | Consumer-facing compatibility shim; deprecated and published | Keep compatibility path until a separately agreed deprecation/removal plan   |
| `packages/token-names`                | Internal taxonomy data; private                              | Keep with maintainer-oriented instructions; no consumer `llms.txt`           |
| `packages/tokens`                     | Consumer-facing; published                                   | Keep; package-specific guidance and `llms.txt` are appropriate               |

### Tools

| Path                               | Audience / status                                  | Proposed handling                                                                                                          |
| ---------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `tools/changeset-linter`           | Repository housekeeping; published                 | Classify as internal even though it is published; decide separately whether publication is intentional                     |
| `tools/component-diff-generator`   | Consumer-facing; published                         | Keep; document its public CLI/API                                                                                          |
| `tools/component-options-editor`   | Internal authoring tool; private                   | Keep in the maintainer/authoring category                                                                                  |
| `tools/demo`                       | Repository demonstrations; no package manifest     | Keep separate from consumer tool documentation                                                                             |
| `tools/design-data`                | Consumer-facing library; published                 | Keep; package-specific guidance and `llms.txt` are appropriate                                                             |
| `tools/design-data-agent-mcp`      | Consumer-facing MCP/skill; published               | Keep; package instructions should explain installation and user workflows                                                  |
| `tools/design-data-mcp`            | Consumer-facing MCP server; published              | Keep; package instructions and `llms.txt` are appropriate                                                                  |
| `tools/design-data-mcp-eval`       | Internal evaluation tooling; private               | Keep out of consumer-facing indexes                                                                                        |
| `tools/design-data-skill`          | Consumer-facing skill; published                   | Keep; document installation and usage                                                                                      |
| `tools/diff-generator`             | Consumer-facing CLI/library; published             | Keep; package-specific guidance and `llms.txt` are appropriate                                                             |
| `tools/ios-override-importer`      | One-time internal importer; private                | Archive candidate, but retain its test target and confirm whether the import is complete before moving                     |
| `tools/markdown-generator`         | Repository content-generation tool; private        | Classify as housekeeping; verify whether any output is still generated before considering archive                          |
| `tools/optimized-diff`             | Consumer-facing library; published                 | Keep; package-specific guidance and `llms.txt` are appropriate                                                             |
| `tools/release-analyzer`           | Repository release-analysis tool; private          | Classify as housekeeping                                                                                                   |
| `tools/remark-changeset`           | Unclear; no package manifest found                 | Verify references; remove only if confirmed to be an empty workspace remnant                                               |
| `tools/s2-docs-mcp`                | Consumer-facing documentation MCP; published       | Keep; package-specific instructions and `llms.txt` are appropriate                                                         |
| `tools/s2-docs-to-document-blocks` | Internal documentation-data transform; private     | Classify as housekeeping                                                                                                   |
| `tools/s2-docs-transformer`        | Retired internal documentation scraper/transformer | Removed by [#1532](https://github.com/adobe/spectrum-design-data/pull/1532); no additional archive or relocation is needed |
| `tools/s2-implementation-metadata` | Internal verification scripts; no package manifest | Classify as housekeeping                                                                                                   |
| `tools/spectrum-design-data-mcp`   | Consumer-facing but deprecated; published          | Do not treat as an internal tool or move it; preserve compatibility until an explicit npm deprecation/removal decision     |
| `tools/spectrum-diff-core`         | Consumer-facing shared library; published          | Keep; package-specific guidance and `llms.txt` are appropriate                                                             |
| `tools/spectrum-hub-fetcher`       | Internal Hub sync tool; private                    | Classify as housekeeping                                                                                                   |
| `tools/token-changeset-generator`  | Internal release workflow tool; private            | Classify as housekeeping                                                                                                   |
| `tools/token-corpus-migrate`       | Internal taxonomy migration CLI; private           | Keep as maintainer tooling; its documentation and the spec still reference it                                              |
| `tools/token-manifest-builder`     | Internal Style Dictionary-era utility; private     | Archive candidate; verify whether the old input format is still supported                                                  |
| `tools/token-mapping-analyzer`     | Internal taxonomy analysis; private                | Keep as maintainer tooling; it is imported by a design-data-spec script and has CI coverage                                |
| `tools/token-name-parser`          | Unclear; no package manifest found                 | Inspect tracked source and references before deciding; generated output alone is not enough to establish it is unused      |
| `tools/token-naming-audit`         | Internal token audit CLI; private                  | Keep as maintainer tooling; it has a CI target                                                                             |
| `tools/transform-tokens-json`      | One-time internal token transform; private         | Archive candidate after verifying no remaining input/output dependency                                                     |

### Other repository areas

| Path                                                       | Audience / status                                                                        | Proposed handling                                                                             |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `sdk/`                                                     | Consumer-facing CLI, libraries, and integrations                                         | Keep; nested instructions should distinguish CLI, core, WASM, and plugins where useful        |
| `platforms/`                                               | Incubating platform-manifest examples for implementation teams                           | Treat as consumer/implementation guidance, not housekeeping                                   |
| `docs/visualizer`                                          | Older visualizer; likely legacy, but relationship to the current S2 viewer is unverified | Verify deployment links and consumers before archiving                                        |
| `docs/s2-visualizer`, `docs/s2-tokens-viewer`, `docs/site` | User-facing Spectrum 2 tooling and documentation                                         | Keep outside the housekeeping category                                                        |
| `docs/release-timeline`, `docs/token-diff`                 | User-facing documentation visualizations                                                 | Keep; classify by audience rather than by being build output                                  |
| Root strategy, wiki, and review Markdown files             | Mixed maintainer reference and durable project decisions                                 | Curate into appropriate `docs/` locations; do not bulk-move or delete                         |
| `dist/`, `graphify-out/`                                   | Generated-looking root directories                                                       | Check tracking and producers before cleanup; do not assume all generated files are disposable |

## Classification options

1. **Metadata plus generated index — recommended first.** Add an explicit audience field to package
   metadata or a repository-owned manifest, with separate lifecycle and publication fields. Generate
   an index that separates consumer tools from maintainer tools and lists deprecated products
   separately. Keep paths stable while checking the index against Moon, pnpm, CI, and package
   references.
2. **Physical directories.** Move user-facing packages under a consumer-facing root and internal
   tools under a housekeeping root, with a separate archive area for retired internal assets. This
   makes the distinction visible but changes paths referenced by workspace config, Moon, GitHub
   Actions, documentation, and npm package repository metadata. Moving a deprecated *published*
   package is not a deprecation plan and may make its current package path harder to find.

Do not put published-but-internal packages into an npm-facing “consumer” category simply because
they are public on the registry. The audience index and the publication decision need independent
values.

## AI resource model

| Resource                                            | Proposal                                                                                                                                   |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Root `.ai/`                                         | Canonical tool-neutral rules, skills, and lessons; add scripts for generating and validating derived files                                 |
| `.github/instructions/` and `.cursor/rules/`        | Generated from `.ai/`; do not hand-edit generated files                                                                                    |
| `.claude/rules`, `.claude/skills`, `.cursor/skills` | Native discovery links to the shared source where the clients support it                                                                   |
| `AGENTS.md`                                         | Keep concise root instructions; add a short nested file in every workspace package and include only package-specific workflows or behavior |
| Package `llms.txt`                                  | Hand-maintained or generated from package docs for intended external packages only; add to each package's npm `files` list                 |
| Root `llms.txt`                                     | Short repository overview linking to package-level resources and identifying maintainer-only tools                                         |

Migrate the existing package `CLAUDE.md` guidance into the shared structure. Keep compatibility
links only where a client needs them. Do not copy the full root `AGENTS.md` into every package.
Beads, Scout, Jira, release, and contribution procedures are maintainer workflows, not instructions
for users of Spectrum tools. Keep consumer installation and usage help in package READMEs and
`llms.txt`; keep repository operations in maintainer instructions.

## Decisions for the discussion

* Prefer metadata/index first or accept the path churn of physical directories?
* Should any confirmed, deprecated internal tools live in a `legacy/` directory, or should they be
  removed once their history is no longer needed on the active branch?
* Should the `.ai/` source stay at the repository root, with path-scoped rules, or should packages
  own separate `.ai/` sources? The recommendation is one root source plus concise nested
  `AGENTS.md` files.
* Should package `llms.txt` files be hand-maintained or generated, and who owns their freshness?
* Which package audiences should receive external `llms.txt` files? The default recommendation is
  published consumer-facing packages only.
* Who owns the resulting AI-resource conventions and the review of audience/lifecycle metadata?

## Suggested implementation sequence

1. Agree on the classification model and inventory with Aaron / the AI-Data squad.
2. Merge [#1532](https://github.com/adobe/spectrum-design-data/pull/1532) first; its removal of the S2 docs transformer already handles that archive candidate.
3. Add the audience/lifecycle inventory and generated index; validate all paths against workspace,
   Moon, CI, docs, and package metadata.
4. Adopt the root `.ai/` source and generator/validator tasks; migrate existing Claude rules and
   skills without losing current behavior.
5. Add concise `AGENTS.md` files to all workspace packages and external `llms.txt` resources to the
   agreed consumer-facing packages; verify package contents and freshness in CI.
6. Handle confirmed empty or superseded internal assets in separate, reviewable changes. Use
   explicit package deprecation plans for published packages and retain compatibility until those
   plans are complete.

## Evidence notes

* Aaron's request and the clarification that S1 already lives on `s1-legacy` came from the linked
  Slack conversation.
* The replacement MCP is documented as the maintained option, while the older package explicitly
  says it remains available for compatibility: `tools/spectrum-design-data-mcp/README.md:3-9`.
* At inventory time on `main`, `s2-docs-transformer` was private and had Moon tasks over
  `docs/s2-docs`: `tools/s2-docs-transformer/package.json:2-18`,
  `tools/s2-docs-transformer/moon.yml:3-46`. Those files are removed in
  [#1532](https://github.com/adobe/spectrum-design-data/pull/1532), the base of this stack.
* The importer calls itself one-time and remains in the CI target list:
  `tools/ios-override-importer/package.json:2-11`, `.github/ci-targets.json:29`.
* The taxonomy migration is documented as a one-shot operation and is still referenced by the spec:
  `tools/token-corpus-migrate/README.md:3-5`, `packages/design-data-spec/spec/taxonomy.md:332`.
* The mapping analyzer is imported by a design-data-spec script and has a CI target:
  `packages/design-data-spec/scripts/seed-token-bindings.mjs:35`, `.github/ci-targets.json:20`.
* `token-naming-audit` is a CLI with a CI target, so it is internal active tooling rather than an
  archive candidate: `tools/token-naming-audit/package.json:2-10`, `.github/ci-targets.json:42`.
* The design-data agent MCP is explicitly installable by external users and includes packaged
  resources: `tools/design-data-agent-mcp/README.md:25-52`, `tools/design-data-agent-mcp/package.json:10-19`.
