/**
 * Copyright 2025 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import test from "ava";
import { writeFileSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { lintChangeset, LINT_RULES } from "../src/index.js";

// Test directory setup
const testDir = "./test-changesets";

test.beforeEach(() => {
  mkdirSync(testDir, { recursive: true });
});

test.afterEach(() => {
  rmSync(testDir, { recursive: true, force: true });
});

test("lintChangeset - validates a good concise changeset", (t) => {
  const content = `---
"@adobe/example-package": minor
---

feat(example): add new feature

- Add new API endpoint
- Improve error handling
- Update documentation

This change is non-breaking.`;

  const filePath = join(testDir, "good-changeset.md");
  writeFileSync(filePath, content);

  const result = lintChangeset(filePath);

  t.true(result.isValid);
  t.is(result.errors.length, 0);
  t.is(result.warnings.length, 0);
});

test("lintChangeset - warns about verbose changeset", (t) => {
  const verboseContent = `---
"@adobe/example-package": minor
---

feat(example): add comprehensive feature suite

## 🚀 Key Improvements

### ✅ Amazing New Features
- Feature 1 with extensive description
- Feature 2 with business justification  
- Feature 3 with technical implementation details

### ✅ Business Impact
This change will revolutionize our workflow and provide significant value.

### ✅ Technical Details
The implementation uses advanced algorithms and optimized data structures.

## Performance Metrics
- 50% faster execution
- 30% reduced memory usage
- 99.9% uptime improvement

## Testing Coverage
- Unit tests: 100%
- Integration tests: 95%
- E2E tests: 90%`;

  const filePath = join(testDir, "verbose-changeset.md");
  writeFileSync(filePath, verboseContent);

  const result = lintChangeset(filePath);

  t.true(result.isValid); // Still valid, just warnings
  t.is(result.errors.length, 0);
  t.true(result.warnings.length > 0);

  // Should warn about length
  t.true(result.warnings.some((w) => w.includes("too long")));

  // Should warn about emoji sections
  t.true(result.warnings.some((w) => w.includes("emoji sections")));

  // Should warn about business/technical details
  t.true(result.warnings.some((w) => w.includes("Business/technical details")));
});

test("lintChangeset - allows diff-generated content", (t) => {
  const diffContent = `---
"@adobe/spectrum-tokens": minor
---

feat(tokens): sync from Spectrum Tokens Studio

## Tokens Changed (45)

**Original Branch:** main
**New Branch:** tokens-sync/feature-update

**Added (12)**
- button-primary-background-color
- button-primary-border-color
- button-secondary-background-color

**Updated (30)**
### Updated Properties (30)
- color-red-500: value changed from #ff0000 to #ee0000
- spacing-100: value changed from 4px to 8px

**Deleted (3)**
- deprecated-old-color
- deprecated-old-spacing

This is a very long changeset with lots of technical details about tokens,
but it should be allowed because it's auto-generated diff content from
the tokens synchronization process.`;

  const filePath = join(testDir, "diff-changeset.md");
  writeFileSync(filePath, diffContent);

  const result = lintChangeset(filePath);

  t.true(result.isValid);
  t.is(result.errors.length, 0);
  // Should have minimal or no warnings because it's diff-generated
  t.true(result.warnings.length <= 1); // Maybe line length, but not verbose structure
});

test("lintChangeset - errors on missing frontmatter", (t) => {
  const content = `feat(example): add new feature

This changeset is missing frontmatter delimiters.`;

  const filePath = join(testDir, "no-frontmatter.md");
  writeFileSync(filePath, content);

  const result = lintChangeset(filePath);

  t.false(result.isValid);
  t.true(result.errors.length > 0);
  t.true(result.errors.some((e) => e.includes("frontmatter")));
});

test("lintChangeset - errors on missing package changes", (t) => {
  const content = `---
# Missing package version specifications
---

feat(example): add new feature

This changeset doesn't specify which packages are changing.`;

  const filePath = join(testDir, "no-packages.md");
  writeFileSync(filePath, content);

  const result = lintChangeset(filePath);

  t.false(result.isValid);
  t.true(result.errors.length > 0);
  t.true(result.errors.some((e) => e.includes("package version")));
});

test("lintChangeset - warns about excessive line length", (t) => {
  const content = `---
"@adobe/example-package": minor
---

feat(example): add feature

This line is intentionally very long to test the line length validation rule that should trigger a warning when lines exceed the maximum allowed character count which is set to 100 characters by default in the linting configuration.`;

  const filePath = join(testDir, "long-lines.md");
  writeFileSync(filePath, content);

  const result = lintChangeset(filePath);

  t.true(result.isValid);
  t.is(result.errors.length, 0);
  t.true(result.warnings.length > 0);
  t.true(result.warnings.some((w) => w.includes("too long")));
});

test("LINT_RULES configuration", (t) => {
  t.is(typeof LINT_RULES.maxLines, "number");
  t.is(typeof LINT_RULES.maxLineLength, "number");
  t.true(Array.isArray(LINT_RULES.diffSectionPatterns));
  t.true(Array.isArray(LINT_RULES.discouragedPatterns));
  t.true(Array.isArray(LINT_RULES.requiredPatterns));

  // Test that diff patterns work
  t.true(
    LINT_RULES.diffSectionPatterns.some((p) => p.test("## Tokens Changed (5)")),
  );
  t.true(
    LINT_RULES.diffSectionPatterns.some((p) =>
      p.test("**Original Branch:** main"),
    ),
  );
});
