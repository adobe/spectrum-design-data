# Pull Request Closure Recommendations
**Date:** February 5, 2026  
**Reviewer:** Cloud Agent

## Executive Summary
After reviewing all 8 open pull requests, I recommend closing 4 stale PRs that have merge conflicts and failing CI checks. These PRs range from 4-20 months old without recent meaningful activity.

---

## PRs Recommended for Closure

### 1. PR #352 - Adding code coverage reporting to Spectrum Tokens

**Details:**
- **Author:** @GarthDB
- **Age:** ~20 months (created June 6, 2024)
- **Last Commit:** June 6, 2024
- **Status:** Merge conflicts, no CI checks running
- **URL:** https://github.com/adobe/spectrum-design-data/pull/352

**Recommended Closing Comment:**
```
Closing this PR as it has been open for ~20 months without activity since June 2024 and now has merge conflicts.

If code coverage reporting is still needed, please consider opening a fresh PR with an updated implementation that can be cleanly merged. The codebase has evolved significantly since this PR was created, so a new approach would be beneficial.

CC: @GarthDB
```

---

### 2. PR #481 - feat: diff-generator frontend

**Details:**
- **Author:** @mrcjhicks
- **Age:** ~11 months (created March 18, 2025)
- **Last Commit:** March 18, 2025
- **Status:** Draft, merge conflicts, CI failing
- **URL:** https://github.com/adobe/spectrum-design-data/pull/481

**Recommended Closing Comment:**
```
Closing this draft PR as it has been open for ~11 months without activity since March 2025 and now has merge conflicts with failing CI checks.

If the diff-generator frontend work is still needed, please consider opening a fresh PR with an updated implementation. @mrcjhicks feel free to reopen or create a new PR if you'd like to continue this work.
```

---

### 3. PR #619 - fix(schemas): make gallery variant inherit baseCard properties

**Details:**
- **Author:** @GarthDB
- **Age:** ~4 months (created September 29, 2025)
- **Last Commit:** September 29, 2025
- **Status:** Merge conflicts, CI failing
- **URL:** https://github.com/adobe/spectrum-design-data/pull/619

**Recommended Closing Comment:**
```
Closing this PR as it has been open for 4+ months since September 2025 with merge conflicts and failing CI checks. This PR is related to the cards schema work in PR #620, which is also being closed.

If the cards gallery variant inheritance fix is still needed, please consider opening a fresh PR with an updated approach that addresses both the schema structure and can be cleanly merged.

CC: @GarthDB
```

---

### 4. PR #620 - Simplify cards json

**Details:**
- **Author:** @AmunMRa
- **Age:** ~4 months (created September 30, 2025)
- **Last Commit:** October 1, 2025
- **Status:** Merge conflicts, CI failing (lint, tests)
- **URL:** https://github.com/adobe/spectrum-design-data/pull/620

**Recommended Closing Comment:**
```
Closing this PR as it has been open for 4+ months since September 2025 with merge conflicts and multiple failing CI checks (lint, tests). This PR is related to the cards schema work in PR #619, which is also being closed.

If the cards schema simplification work is still needed, please consider opening a fresh PR with an updated approach. @AmunMRa feel free to coordinate with the team on the best path forward for cards schema updates.
```

---

## PRs to Keep Open

### Active/Recent PRs ✅

#### PR #692 - RFC SDS-15500 layout tokens
- **Status:** Very active, CI passing ✅
- **Created:** February 3, 2026 (2 days ago)
- **Keep Open:** Yes - actively being worked on

#### PR #691 - feat: Add schema converter library and GitHub PR workflow
- **Status:** Recent, CI has lint failure ⚠️
- **Created:** January 24, 2026 (12 days ago)
- **Keep Open:** Yes - needs lint fixes but recent work

#### PR #667 - fix(workflows): correct deploy-docs push trigger branch name
- **Status:** CI passing, mergeable ✅
- **Created:** January 13, 2026 (23 days ago)
- **Keep Open:** Yes - could potentially be merged

#### PR #644 - feat(tokens): Add structured token parser and comprehensive schema system
- **Status:** Draft, CI passing, has RFC ✅
- **Created:** December 16, 2025 (51 days ago)
- **Keep Open:** Yes - important foundational work with RFC

---

## Action Items

### Immediate Actions
1. ✅ Close PR #352 (20 months old, merge conflicts)
2. ✅ Close PR #481 (11 months old, draft, merge conflicts)
3. ✅ Close PR #619 (4 months old, merge conflicts, CI failing)
4. ✅ Close PR #620 (4 months old, merge conflicts, CI failing)

### Follow-up Considerations
1. **Cards Schema Work (#619, #620):** Determine if this work is still needed. If so, coordinate a fresh approach with @GarthDB and @AmunMRa
2. **Code Coverage (#352):** Verify if code coverage functionality is already implemented elsewhere
3. **Diff Generator Frontend (#481):** Check with @mrcjhicks if this work should be resumed
4. **PR #667:** Consider merging if ready (simple workflow fix)
5. **PR #691:** Needs lint fixes to pass CI

---

## Commands to Execute

To close the PRs, run these commands:

```bash
# Close PR #352
gh pr close 352 --comment "Closing this PR as it has been open for ~20 months without activity since June 2024 and now has merge conflicts. If code coverage reporting is still needed, please consider opening a fresh PR with an updated implementation. CC: @GarthDB"

# Close PR #481
gh pr close 481 --comment "Closing this draft PR as it has been open for ~11 months without activity since March 2025 and now has merge conflicts with failing CI checks. If the work is still needed, please consider opening a fresh PR. @mrcjhicks feel free to reopen or create a new PR if you'd like to continue this work."

# Close PR #619
gh pr close 619 --comment "Closing this PR as it has been open for 4+ months since September 2025 with merge conflicts and failing CI checks. Related to PR #620. If the cards gallery variant inheritance fix is still needed, please consider opening a fresh PR. CC: @GarthDB"

# Close PR #620
gh pr close 620 --comment "Closing this PR as it has been open for 4+ months since September 2025 with merge conflicts and multiple failing CI checks. Related to PR #619. If the cards schema simplification work is still needed, please consider opening a fresh PR. @AmunMRa feel free to coordinate with the team."
```

---

## Statistics

- **Total Open PRs:** 8
- **Recommended to Close:** 4 (50%)
- **Oldest PR:** #352 (20 months old)
- **PRs with Merge Conflicts:** 4 (#352, #481, #619, #620)
- **PRs with CI Failures:** 3 (#481, #619, #620)
- **Draft PRs:** 4 (#692, #691, #644, #481)

---

## Rationale

The closure recommendations are based on:
1. **Age:** PRs older than 4 months with no recent activity
2. **Merge Conflicts:** All recommended closures have merge conflicts
3. **CI Status:** Most have failing CI checks
4. **Activity:** No meaningful commits in months
5. **Maintainability:** Would require significant rebase work to salvage

Fresh PRs with current main branch would be easier to review and merge than trying to salvage these stale branches.
