<!-- Copyright 2026 Adobe. All rights reserved. -->

# [**@adobe/component-changelog**](https://github.com/adobe/component-changelog)

Draft per-component changelog generator that diffs design-data revisions.

* **Audience:** maintainer. **Lifecycle:** incubating. **npm:** not published.
* Repository-wide rules are in [the root AGENTS.md](../../AGENTS.md). The [repository index](../../docs/repo-index.md) lists every project.

## Commands

```bash
pnpm --filter @adobe/component-changelog test
node tools/component-changelog/src/cli.js action-button --out changelog.json
```

## Notes

Diffs one component's relationships and the tokens they reference per first-parent commit (relationships and tokens match by uuid, else scope plus `$ref`). Reads canonical data in `packages/design-data` through `git`, never `packages/tokens`. Part of epic hzje (spec sheets and changelog).
