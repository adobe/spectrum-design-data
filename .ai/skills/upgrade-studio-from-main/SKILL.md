---
name: upgrade-studio-from-main
description: Upgrade Spectrum Studio from adobe/spectrum-design-data main when the user requests it. Review upstream impact before rebasing, preserve Studio behavior and rules, test bounded compatibility fixes, and request native plan approval for migrations or risky changes. Not a startup rebase or a general monorepo upgrade.
---

<!-- Copyright 2026 Adobe. All rights reserved. -->

# Upgrading Spectrum Studio from main

Use only when the user requests this workflow for Spectrum Studio. A startup
check reporting that the branch is behind is not an upgrade request.
This skill guides an active agent; it does not install an automation or Git hook.

## 1. Check safety and record the starting point

Read these current instructions before making changes:

* Root `AGENTS.md` and `docs/spectrum-studio/AGENTS.md`.
* [Studio startup rule](../../rules/spectrum-studio-upgrades.md).
* `docs/spectrum-studio/docs/ROADMAP.md`, including purpose, guiding principles
  and relevant open decisions.
* `docs/spectrum-studio/.agents/skills/verify-change/SKILL.md`, and the matching
  domain skills, rules and known-debt entries for the incoming changes.

Run Git commands from the repository root. Check the live branch, status
(including untracked files), operation state, configured remotes and whether
history is complete. Use `git status` and `git rev-parse --git-path` to locate
operation markers when necessary; do not recursively inspect `.git`.

Stop before rebasing if any of these applies:

* Uncommitted work anywhere in the checkout, including outside Studio.
* Detached HEAD, an active merge/rebase/cherry-pick/revert sequence, missing or
  ambiguous target, incomplete history, or no common ancestor.
* The working branch is `main` or the requested operation would switch branches.
* Branch-local merge commits need a choice of rebase strategy.

Explain the blocker and use `ask_user` for the decision. Never stash, commit,
discard files, switch branches, deepen history, or create another checkout to
work around it automatically.

Refresh `origin/main` using the startup rule. Record the original branch name,
original HEAD SHA, fetched main SHA, and merge-base SHA in the session workspace.
Use these pinned commits throughout the review. Also record the original
branch-only commit list and any applicable published upstream ref for comparison.
If there are no missing main commits, report that and stop; do not replay history
or invent upgrade work.

Determine whether the branch is published/shared using its configured upstream
and relevant remote-branch/PR evidence. Absence of an upstream does not prove a
branch is private. If sharing is uncertain, ask. For a published/shared branch,
explain that rebase rewrites branch history and obtain explicit consent unless
the user already acknowledged that risk. A request to update does not authorize
a force push.

## 2. Review incoming changes before rebasing

Review both commit messages and actual diffs. In the examples below,
`<base-sha>`, `<original-sha>` and `<target-sha>` mean the recorded commits;
substitute their verified values rather than executing the placeholders.

Use the incoming range `<base-sha>..<target-sha>` to identify main's changes;
do not use a branch-tip diff as a substitute. Inspect the local range
`<base-sha>..<original-sha>` as well to identify overlapping work and local intent.
Include renames, deletions and changes that affect Studio indirectly:

| Incoming change                                                                  | Studio impact to check                                                                                    |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `docs/spectrum-studio/**`                                                        | Changed behavior, local feature overlap, tests and documented decisions                                   |
| `packages/design-data/**`, `packages/design-data-spec/**`                        | Reference loading, schema/vocabulary, identities, projections, generated output and alignment diagnostics |
| Consumed packages, manifests, `pnpm-lock.yaml`, toolchain or build configuration | API compatibility, runtime/tool versions and build behavior                                               |
| Instructions, skills and relevant docs                                           | Conflicts with Studio's purpose, local rules or unresolved decisions                                      |

Keep source discovery inside Studio and relevant `packages/`. For root
configuration or instructions, read explicitly identified files from the Git
diff; this is not permission for a broad repository or dependency-tree search.
Do not read generated legacy tokens as canonical input or recursively inspect
dependency, cache, build or report directories.

Summarize what main changed, what may affect Studio, and which checks cover
those effects. Keep the summary in the session context; do not add a repository
report file. Record the current requirements and any proposed instruction
changes before rebasing so that imported rules are not silently treated as
approval to override Studio's existing requirements.

When authored data, relationships, naming, formulas, rules, generators or
output may change, apply
[parametric-systems-design](../parametric-systems-design/SKILL.md). Identify the
data owner, shared derivation path and affected consumers. Read Studio's
`authoring-lifecycle` and `design-data-contract` skills when applicable.
Preserve Changes parity, shared generation paths and visible/revertible
overrides. Design-data differences remain diagnostics; never add a load/edit
gate or change canonical values to work around an app/tooling limitation.

## 3. Decide whether approval is needed

The simple path needs no separate migration plan: a clean rebase, followed if
necessary by small compatibility fixes whose intended behavior is unchanged
and whose regression checks are known. Examples include adapting an import or
an API call to an equivalent signature. Classify by meaning, not by line count.

Stop and use section 6 before an identified risky step:

* Any Git conflict, even if it looks mechanical.
* Migration of stored/authored data, schema, stable identity or token naming.
* Changes to generated values, exports, mode semantics or documented behavior.
* Breaking dependency changes or security-sensitive behavior.
* Changes to rules, purpose, architecture, or unresolved roadmap decisions.
* Unclear compatibility, unexpected commit loss, or a failure whose cause or
  baseline is uncertain.

Discovering a risk before rebase means plan before rebase. Discovering it
afterward means pause there; do not automatically reset the completed rebase.
Do not broaden this workflow into optional feature work or known-debt cleanup.

## 4. Rebase onto the reviewed commit

Immediately before rebasing, confirm the branch and HEAD still match the
recorded starting point, the whole checkout remains clean, and no Git
operation has started. If anything changed, stop and reassess; do not overwrite
concurrent work. If the fetched main ref moved, keep the reviewed target pinned
or review the new target before choosing it.

For the approved linear-history path, use
`git rebase --no-fork-point --no-autostash --no-update-refs <target-sha>`.
Do not enable autosquash, force a rebase, or rewrite additional branch refs.
If a repository hook or Git configuration prevents the operation, report it;
do not bypass it.

On a conflict or any other rebase stop, report the operation state and affected
files and ask how to proceed. Do not choose "ours"/"theirs," resolve conflicts,
skip commits, continue, abort, or reset without the relevant user decision.
Use `ask_user` for this immediate choice; use section 6 as well if a resolution
requires migrations or implementation decisions. Do not run checks against a
half-rebased tree or report the upgrade as complete.

## 5. Fix bounded incompatibilities and verify

Only make fixes directly caused by this upgrade that satisfy the simple-path
criteria. Read the relevant domain skill first. Add regression tests for new
or changed code; reuse established check runners instead of adding tooling.
Do not fix unrelated failures.

Follow `verify-change`: state what changed and why a named check covers it;
run the narrowest affected non-browser check first, then typecheck when types,
exports or schemas changed. Escalate to domain, lint or build checks only for
their documented triggers. Canonical-data edits, if separately approved, also
require their root validation/codegen tasks and changeset.

Use inexpensive pre-rebase evidence for the affected checks when needed to
distinguish baseline failures. Compare later failures against the original
commit, not just against the imported main commit. Ask before expensive
baseline work or another repository copy. Never use stash, checkout or reset
to obtain a baseline. If a failure was pre-existing, report and ask before
investigating or fixing it. If its cause/baseline is uncertain, pause and report
the uncertainty rather than guessing.

Never weaken tests, suppress errors, or update snapshots, fingerprints or pins
just to make a check pass. Dependency restoration is appropriate only after
manifest changes or a missing-dependency failure; use the repository's pinned
pnpm and documented tasks.

Run only one resource-heavy job at a time. Browser checks are not automatic:
ask for explicit permission before browser testing, prefer an isolated
Storybook scenario, explain why any app-page check cannot be covered in a
story, and run only the approved scope with `--workers=1` and page-error
collection. Without permission, skip and disclose the verification gap.

After rebase, verify `git merge-base --is-ancestor <target-sha> HEAD` succeeds.
Review the old and new branch-local commit ranges, using
`git range-diff <base-sha>..<original-sha> <target-sha>..HEAD` where appropriate
and checking any dropped/equivalent commits and the resulting diff. Account
for the original local work; successful replay alone does not prove it survived
unchanged. Check that the branch name is unchanged and that remaining working
changes are only the expected compatibility fixes. Unexpected changes or
unclear preservation require a pause.

## 6. Propose a plan and obtain native approval

Ask unresolved questions with `ask_user`. Write the migration or remediation
plan to the current session's `plan.md`, not the repository. Preserve an
unrelated existing plan rather than silently replacing it.

Include:

* The pinned upstream changes and the specific compatibility problem.
* Affected files, data owners, shared derivation paths and consumers.
* Required updates, with optional additions clearly separate.
* Authored/stored-data compatibility, Changes/Impact parity and any user-visible
  effects; migrations must not silently drop authored work or reset user data.
* Regression checks, known baseline failures and unverified behavior.
* Risks, decisions and recovery options tied to the recorded original commit.
* Whether rebase has not started, is paused on a conflict, or already completed.

Present the plan with `exit_plan_mode`, which provides Copilot's native approval
prompt. Do not substitute a chat question for plan approval, and do not infer
approval from autopilot mode, silence, or the original upgrade request.
Resume only the approved steps. If native approval is unavailable, state that
limitation and stop; never invent an approval result.

## 7. Report without publishing automatically

Report imported changes, bounded fixes, checks run with results, relevant
checks skipped with reasons, and pending decisions or verification gaps.
Distinguish a completed rebase from a verified-compatible upgrade.

Keep the recorded original commit and reviewed target available for recovery.
Never automatically reset or perform a destructive rollback.
This workflow does not authorize commits, pushes, force pushes or PR creation,
including through generic session-completion instructions. Leave any
compatibility edits visible for review; obtain explicit authorization for
publishing operations.
