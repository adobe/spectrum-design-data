---
"@adobe/spectrum-design-data": minor
---

feat(design-data): per-component changelogs, versioned from the changes (hzje.8)

The package ships `changelog/<component>.json`: for every component, each release's changes
by commit (what changed, which relationship context, class, PR or commit) and a component
version derived from them, starting at 1.0.0. Backfilled from 2.1.0; changes after 3.7.1 sit
under `unreleased` until the next release takes them over. `changeset version` now appends the
release being versioned (`design-data:version`), so new entries land in the Version Packages PR.
