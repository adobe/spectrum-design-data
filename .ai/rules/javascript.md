---
description: JavaScript and TypeScript conventions for this ESM monorepo
globs: **/*.js, **/*.mjs, **/*.cjs, **/*.ts
---

<!-- Copyright 2026 Adobe. All rights reserved. -->

# JavaScript and TypeScript

* ESM throughout (`"type": "module"`); Node.js 22.12 toolchain (packages support >=20.12).
* 2-space indentation and trailing commas in multiline objects and arrays; Prettier enforces formatting on commit.
* Prefer `const`; never `var`.
* Use `async`/`await` over `.then()` chains.
* Use template literals for interpolation.
* Tests use AVA under `test/**/*.test.js`; each package has its own `ava.config.js`. Run one package with `pnpm --filter <package-name> test`.
* New files start with `Copyright YYYY Adobe. All rights reserved.` using the current year and `//` comments.
* Use `pnpm` for installs and scripts, and `moon run <task>` for defined tasks. Never use npm or yarn.
* Commit messages follow conventional commits (`type(scope): description`), enforced by commitlint.
