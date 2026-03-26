---
name: enhance-sync-pr
description: >-
  Enhances auto-generated spectrum-design-data PRs from spectrum-tokens-studio-data sync
  (branch tokens-sync/patch-spectrum2-from-main, author mrcjhicks). Diagnoses CI failures,
  suggests fixes, creates changesets with token-changeset-generator, updates PR title/body,
  and attributes the original Tokens Studio implementer. Use when fixing sync PRs, PRs from
  tokens-sync, enhance-sync-pr workflow gaps, or missing changesets on studio syncs.
---

# Enhance sync PR (Tokens Studio → spectrum-design-data)

## When this applies

* PR opened by `mrcjhicks` from `tokens-sync/patch-spectrum2-from-main` (or similar sync branch).
* Body links to `github.com/adobe/spectrum-tokens-studio-data/actions/runs/…`.
* CI red after sync (validation, snapshot, component props, wireframe, etc.).
* Changeset missing; title still `feat: updates from spectrum-tokens-studio-data` or duplicated `feat: Feat:`.

## Repo and tools

* **Monorepo root:** workspace root (`spectrum-design-data`).
* **Changeset generator:** [`tools/token-changeset-generator`](../../../tools/token-changeset-generator) — fetches source PR motivation, runs `tdiff`, infers semver bump.
* **Automation:** [`.github/workflows/enhance-sync-pr.yml`](../../../.github/workflows/enhance-sync-pr.yml) and [`.github/actions/extract-source-pr-info`](../../../.github/actions/extract-source-pr-info).

## 1. Resolve source PR

From the design-data PR body, take the **spectrum-tokens-studio-data** Actions run URL or the **Tokens Studio PR** link.

```bash
gh pr view <N> --repo adobe/spectrum-design-data --json body,title,headRefName,url
```

If only the run URL exists, resolve merged PR from that run (same logic as `extract-source-pr-info`).

Record:

* Source PR URL (e.g. `https://github.com/adobe/spectrum-tokens-studio-data/pull/297`)
* Source author (`user.login` from that PR) for attribution

```bash
gh api repos/adobe/spectrum-tokens-studio-data/pulls/<num> --jq '{title, author: .user.login, body}'
```

## 2. Diagnose CI (suggest fixes; user approves edits)

Check out the PR branch with full history (`fetch-depth: 0`) so `tdiff` can compare to `main`.

Run in order:

```bash
moon run tokens:validateDesignData
moon run tokens:verifyDesignDataSnapshot
cd packages/tokens && pnpm ava
```

Or full graph: `moon ci` (same as GitHub Actions).

### Failure map (what to suggest)

| Symptom                                        | Likely cause                                                                                                | Suggestion                                                                                                                                                                                                                                                                                                                                                                                              |       |                 |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | --------------- |
| `checkComponentProps` lists token names        | Missing or wrong `component` on entries in `color-component.json`, `layout-component.json`, or `icons.json` | Set `component` to match token name prefix (see [`packages/tokens/test/checkComponentProps.js`](../../../packages/tokens/test/checkComponentProps.js)).                                                                                                                                                                                                                                                 |       |                 |
| Schema / `color-set` errors                    | `sets` missing `light`, `dark`, or **`wireframe`**                                                          | Align with [`schemas/token-types/color-set.json`](../../../packages/tokens/schemas/token-types/color-set.json).                                                                                                                                                                                                                                                                                         |       |                 |
| `verifyDesignDataSnapshot` / snapshot mismatch | Validation report changed vs golden file                                                                    | Paths in the snapshot are relative to `packages/tokens/`. After `moon run sdk:build`, run **`migrate snapshot` from `packages/tokens/`** so paths match `moon run tokens:verifyDesignDataSnapshot`: `cd packages/tokens && ../../sdk/target/debug/design-data migrate snapshot ./src --output ./snapshots/validation-snapshot.json --schema-path ./schemas --exceptions-path ./naming-exceptions.json`. |       |                 |
| Token file / `$schema` / `uuid`                | Invalid token shape                                                                                         | Fix per [`token-file.json`](../../../packages/tokens/schemas/token-file.json) and failing AVA tests.                                                                                                                                                                                                                                                                                                    |       |                 |
| Alias / renamed / manifest                     | Broken refs or manifest drift                                                                               | Fix aliases; run `moon run tokens:buildManifest`.                                                                                                                                                                                                                                                                                                                                                       |       |                 |
| Changeset lint on PR                           | Bad frontmatter                                                                                             | Valid `---` / \`"[**@adobe/spectrum-tokens**](https://github.com/adobe/spectrum-tokens)": patch                                                                                                                                                                                                                                                                                                         | minor | major\` / body. |

Re-run targeted tasks after each fix until green.

## 3. PR title and body

* **Title:** One conventional prefix. Strip a leading `feat:` / `Feat:` (and similar) from the **source** title, then use `feat: <clean title>` (avoid `feat: Feat: …`).
* **Body template:**

```markdown
## Token updates from Spectrum Tokens Studio Data

**Original implementer:** @<github-login>

**Source PR:** [#<n> <title>](<url>)

**Automated sync via:** [GitHub Actions run](<run-url>)

### Source description

<paste or summarize source PR body / motivation>

---

<keep existing automated footer if present>
```

Use `gh pr edit <N> --repo adobe/spectrum-design-data --title "..." --body-file body.md`.

## 4. Changeset + git attribution

Generate changeset (requires `GITHUB_TOKEN` for API rate limits):

```bash
cd tools/token-changeset-generator && pnpm install --frozen-lockfile
GITHUB_TOKEN=... node src/cli.js generate \
  --tokens-studio-pr 'https://github.com/adobe/spectrum-tokens-studio-data/pull/<num>' \
  --spectrum-tokens-pr 'https://github.com/adobe/spectrum-design-data/pull/<N>' \
  --source-author '<login>'
```

Bump type is inferred from diff (e.g. deletions → major, additions → minor).

Commit using the **source implementer’s** git identity so changelog “Thanks @…” matches design work:

```bash
git config user.email '<email>'
git config user.name '<display name>'
git add .changeset/*.md
git commit -m "chore: add changeset for <short summary>" -m "Co-authored-by: <name> <email>"
```

If the commit author is already the implementer, `Co-authored-by` is optional but harmless.

## 5. Verify

```bash
moon run tokens:validateDesignData
moon run tokens:verifyDesignDataSnapshot
cd packages/tokens && pnpm ava
pnpm changeset-lint check .changeset/*.md
```

Push the branch; confirm CI and changeset-bot on the PR.

## Reference: prior manual PRs

Well-formed examples: merged sync PRs with `token-changeset-generator`-style changesets and enriched bodies (e.g. [#615](https://github.com/adobe/spectrum-design-data/issues/615), [#593](https://github.com/adobe/spectrum-design-data/issues/593)). Early PRs used hand-written “Design motivation” + “Token diff” in the changeset body — the generator now standardizes that shape.
