---
name: implement-design-data-rfc
description: Implements one Spectrum Studio RFC, or one named part of it (such as rule XW-018), as a design-data change. Agrees an exact implementation brief with the user through a question-and-answer session, creates a branch from main in a separate worktree, makes only the briefed changes, validates, writes a changeset, commits and opens a draft pull request with a clear, human-friendly description. Use when asked to implement, apply or upstream a Studio RFC or crosswalk rule in design-data.
---

<!-- Copyright 2026 Adobe. All rights reserved. -->

# Implementing a Studio RFC in design-data

Studio RFCs live in `docs/spectrum-studio/docs/rfcs/` on the Studio branch.
They describe changes design-data needs so Studio can drop a workaround.
This skill turns one RFC, or one named part of it, into a single draft pull
request against `main`.

The user's Studio checkout is never changed, except for the brief write-back
in step 2. All design-data work happens in a separate worktree.

## Ground rules

* Do exactly what the confirmed brief says. No extra fixes, renames or
  refactors. If something the brief doesn't cover is needed, stop and ask.
* Ask one question at a time with the `ask_user` tool, with choices where
  possible. Use plain English.
* Never commit to `main`, force push, stash, reset or rebase the user's
  checkout. Never mix Studio changes into the pull request.
* Follow the root `AGENTS.md` rules and the
  [design-data corpus](../../rules/design-data-corpus.md),
  [changesets](../../rules/changesets.md) and
  [relationship-map](../../rules/relationship-map.md) rules.

## 1. Identify the request

1. Get the RFC file and, if given, the part to implement (a section, rule id
   such as `XW-018`, or gap id such as `LTAX-021`). If unclear, ask.
2. Read, from the Studio checkout:
   * The RFC itself.
   * [design-data-handoff.md](../../../docs/spectrum-studio/docs/rfcs/design-data-handoff.md),
     which sorts crosswalk rules into "design-data changes", "Studio
     changes" and "Needs a decision".
   * The matching entries in
     [the gap register](../../../docs/spectrum-studio/docs/design-data-gap-register.md).
3. Check the scope:
   * "Studio changes" items are not design-data work. Say so and stop.
   * "Needs a decision" items need a decision first. Explain the open choice
     and stop, unless the user records a decision during the step 2 Q\&A.
   * If the request spans several independent changes, ask whether to make
     one pull request or several.

## 2. Agree the implementation brief

**If the RFC has an "Agent implementation brief" section** that covers the
request, restate it in plain English. Ask the user to confirm it is still
correct, and resolve anything it leaves open, such as "unless reviewers
choose others".

**If it has no brief**, draft one from the RFC's proposal, then hold a
question-and-answer session with the user. Ask one question at a time until
you both agree on every item below:

* **Goal**: the problem being solved, in one or two sentences.
* **Files**: every file to add or change, with exact paths.
* **Exact content**: field names, values, schema properties, serialization
  positions and defaults. No "TBD".
* **Must not change**: for example token UUIDs, names, values and
  serialization positions.
* **Tests**: what new or changed behavior needs tests, and where.
* **Validation**: the commands to run (see step 5).
* **Changeset**: packages and bump level (`patch`, `minor` or `major`).
* **Future use**: who will read the new data, what it enables, and what Studio
  removes after the merge (for example a crosswalk rule id).
* **Non-goals**: related work this pull request will not do.
* **Branch name**: from the rule in step 3.

Show the full brief and ask for explicit approval. Don't change any files
before the user approves.

**Write-back.** When the brief is new or changed, add it to the RFC file in the
Studio checkout under a `## Agent implementation brief: <topic>` heading, in
the style of the existing briefs. Leave it uncommitted and tell the user.

## 3. Prepare an isolated branch

Run from the repository root:

```bash
git remote get-url origin   # must be adobe/spectrum-design-data
git fetch --no-tags origin 'refs/heads/main:refs/remotes/origin/main'
git worktree add ../spectrum-design-data-rfc-<slug> -b feat/rfc-<slug> origin/main
```

Then install dependencies inside the new worktree with
`pnpm install --frozen-lockfile`.

* Name the branch `feat/rfc-<slug>`, and use the same `<slug>` for the
  worktree folder and changeset file:
  * `<slug>` is two to four plain words describing the change, from the
    brief's heading or the RFC title, in lower-case kebab case. For example,
    `scale-index-tiers` gives `feat/rfc-scale-index-tiers`.
  * Don't put internal Studio ids (crosswalk rule or gap ids such as
    `XW-018` or `LTAX-021`) in the branch name; they mean nothing outside
    this project.
  * Tell the user the branch name in the brief, so they approve it with the
    brief.
* If `origin` is a different repository, the branch already exists or the
  worktree path is taken, stop and ask.
* Do all remaining steps inside the worktree. RFC files don't exist on `main`;
  rely on what you read in steps 1 and 2.

## 4. Implement the brief

* Make only the briefed changes. New files start with the copyright line in
  the right comment style.
* Before changing a schema, field or registry entry, check its immediate
  dependents in source and tests (SDK codegen, validators, exporters). Report
  any unexpected coupling to the user instead of widening scope.
* Add the tests named in the brief.

## 5. Validate

Run the commands from the brief, plus these defaults for each area touched:

| Touched                                | Commands                                                                              |
| -------------------------------------- | ------------------------------------------------------------------------------------- |
| `packages/design-data/**`              | `moon run design-data:validate`, `moon run sdk:codegen`, `moon run sdk:codegen-check` |
| `packages/design-data-spec/schemas/**` | `moon run design-data-spec:sync-token-schemas`, `moon run design-data-spec:check`     |
| `sdk/**`                               | `moon run sdk:test`, `moon run sdk:lint`                                              |
| A JS package                           | `pnpm --filter <package> test`                                                        |

Record each exact command and whether it passed. Fix failures only when the
fix is inside the brief. Otherwise stop and report.

## 6. Write the changeset

Write `.changeset/<slug>.md` directly (don't use the interactive wizard),
following the [changesets rule](../../rules/changesets.md). Example:

```md
---
"@adobe/design-data-spec": minor
"@adobe/spectrum-design-data": minor
---

Record which token tiers a field allows, so tools can offer it only where it applies.

- **packages/design-data-spec/schemas/field.schema.json**: adds optional `allowedTokenTiers`.
- **packages/design-data/fields/scaleIndex.json**: allows `scaleIndex` on primitive and semantic tokens.
```

* Bump level: `patch` for fixes, `minor` for additions or validation-behavior
  changes, `major` for breaking changes.
* At most 20 lines: one intro sentence, then one bullet per changed artifact.
  Rationale goes in the pull request, not here.
* Check it: `node tools/changeset-linter/src/cli.js check --fail-on-warnings`.

## 7. Commit

* Conventional commits: `type(scope): description`, lower case, imperative,
  no trailing period. Use `!` and a `BREAKING CHANGE:` footer for breaking
  changes. Usually `feat(design-data): …` or `feat(design-data-spec): …`.
* Commit body: one or two sentences on why, plus the RFC path and rule ids.
* End with the trailer
  `Co-authored-by: Copilot App <223556219+Copilot@users.noreply.github.com>`
  unless the user says otherwise.
* Show `git --no-pager diff --stat origin/main` before committing. Commitlint
  runs on commit; fix the message rather than bypassing the hook.

## Credit the requesting user

The pull request must show a real person to ask, not only an agent.

* Before committing, check the commit author is the user:
  `git config user.name`, `git config user.email` and
  `gh api user --jq .login`. If the git identity is missing or isn't
  the user's, ask the user which name and email to use. Never invent one.
* The agent appears only through the `Co-authored-by` trailer, so the user
  is the main author.
* Assign the pull request to the user (`--assignee @me`).
* End the body with a `Contact` line naming the user's GitHub login (see the
  example body).

## 8. Draft the pull request and get approval

Title: the same conventional-commit line as the main commit.

The body must work for a person skimming it and for an agent acting on it:

* Open with a two-to-three sentence plain-English summary that anyone on the
  team can follow. Explain any needed term once.
* Then fill every section of
  [the pull request template](../../../.github/PULL_REQUEST_TEMPLATE.md), in
  order. Keep its headings and checklist. Use short bullets, exact file paths,
  rule and gap ids, and links.
* Describe future use with concrete examples, not "may be useful".
* Testing lists each exact command with its result.
* Tick only checklist boxes that are true. Leave the CLA box for the user.
* No filler, repeated content or reasoning logs.

Show the title and body to the user and wait for approval before pushing.

### Example body

```md
Studio needs to know which kinds of tokens may use the Scale index field.
This adds an optional "allowed tiers" list to field definitions and sets it on
Scale index. Existing tokens and names don't change.

## Description

- `packages/design-data-spec/schemas/field.schema.json`: adds optional
  `allowedTokenTiers` (list of `primitive`, `semantic`, `component`).
  Leaving it out means every tier is allowed.
- `packages/design-data/fields/scaleIndex.json`: sets
  `"allowedTokenTiers": ["primitive", "semantic"]`.

**How it will be used**

- Studio's token editor offers Scale index only on primitive and semantic
  tokens, reading this list instead of its own copy of the rule.
- After merge, Studio deletes crosswalk rule XW-018.
- Other tools can use the same list to warn when a field is used on the wrong tier.

## Related Issue

- RFC: `docs/spectrum-studio/docs/rfcs/token-tiers-and-category-scope.md`
  on the Studio branch ("Agent implementation brief: scale index tiers").
- Crosswalk rule XW-018, gap LTAX-021.

## Motivation and Context

design-data can't say that a field belongs only to some token tiers, so
Studio keeps that rule privately. Recording it in design-data makes it shared,
validated data.

## How Has This Been Tested?

- `moon run design-data:validate`: passed
- `moon run sdk:codegen` and `moon run sdk:codegen-check`: passed
- `node tools/changeset-linter/src/cli.js check --fail-on-warnings`: passed

…remaining template sections and checklist…

**Contact:** @<user-login> requested this change and can answer questions
about it. Prepared with help from an AI agent.
```

## 9. Push and open the draft pull request

After approval, from the worktree:

```bash
git push -u origin feat/rfc-<slug>
gh pr create --draft --base main --head feat/rfc-<slug> --assignee @me \
  --title "<title>" --body-file <body file outside the repository>
```

## 10. Report back

Tell the user, briefly:

* The draft pull request link and branch.
* The worktree path, and that it can be removed after merge with
  `git worktree remove ../spectrum-design-data-rfc-<slug>`.
* Whether the RFC brief was written back (uncommitted) in the Studio checkout.
* The Studio follow-up after merge, for example: update `designDataRevision`
  in `docs/spectrum-studio/src/data/taxonomy-crosswalk.json`, delete the
  retired rules, run
  `pnpm --dir docs/spectrum-studio check:focused --only taxonomy-crosswalk`
  and regenerate the handoff with
  `pnpm --dir docs/spectrum-studio crosswalk:handoff`. Report these steps;
  don't do them.
