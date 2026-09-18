Copyright 2026 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.

# Articles

Each file here is one post on the [Articles page](/spectrum-design-data/articles/).
Shared frontmatter (layout, tags, permalink) comes from `articles.11tydata.js` —
per-post frontmatter only needs `title`, `date`, `author`, `category`, and
`description`. The Articles page derives its filter pills and badges directly
from whatever `category` values exist across these files, so using one of the
categories below (exact spelling) keeps the filter list consistent instead of
spawning near-duplicate categories.

## Categories

- **Concepts** — technical explainers and deep dives (e.g. companion pieces to
  spectrum.adobe.com pages, format/spec walkthroughs). The only category in
  use so far.
- **Release notes** — periodic, curated summaries of what shipped, written
  for humans rather than a raw changelog dump. Source material: the repo's
  `Version Packages` changeset PRs and package changelogs.
- **Roadmap** — what the team is working on or considering next. Source
  material: open epics tracked in `bd` (beads).
- **Decisions** — the reasoning behind a specific design or architecture
  choice, written after the fact so the "why" isn't lost. No posts yet — this
  is a new practice, not a backfill of existing docs.

## Adding a post

```yaml
---
title: "Post title"
date: 2026-01-01T12:00:00Z # noon UTC avoids local-timezone date rollback in the `date` liquid filter
author: Spectrum Design Data
category: Concepts # or: Release notes | Roadmap | Decisions
description: >-
  One or two sentence summary shown on the Articles index card.
---
```
