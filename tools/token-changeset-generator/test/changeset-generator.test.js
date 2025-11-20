/*
Copyright 2024 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import test from "ava";
import {
  createChangesetContent,
  generateChangesetFileName,
} from "../src/changeset-generator.js";

test("generateChangesetFileName should create valid file names", (t) => {
  const fileName = generateChangesetFileName();

  // Should match pattern: YYYYMMDD-{8-char-uuid}.md
  t.regex(fileName, /^\d{8}-[a-f0-9]{8}\.md$/);
});

test("createChangesetContent should create proper changeset format", (t) => {
  const motivation = "This is the design motivation";
  const tokenDiff = "## Token Changes\n- Updated token-name";
  const tokensStudioPR =
    "https://github.com/adobe/spectrum-design-data-studio-data/pull/275";
  const spectrumTokensPR =
    "https://github.com/adobe/spectrum-design-data/pull/559";

  const result = createChangesetContent(
    "minor",
    motivation,
    tokenDiff,
    tokensStudioPR,
    spectrumTokensPR,
  );

  // Check YAML front matter
  t.true(result.includes('---\n"@adobe/spectrum-tokens": minor\n---'));

  // Check design motivation section
  t.true(
    result.includes("### Design motivation\n\nThis is the design motivation"),
  );

  // Check token changes section
  t.true(
    result.includes(
      "### Token changes\n\n## Token Changes\n- Updated token-name",
    ),
  );

  // Check references section
  t.true(
    result.includes(
      "### References\n\n- Tokens Studio PR: https://github.com/adobe/spectrum-design-data-studio-data/pull/275",
    ),
  );
  t.true(
    result.includes(
      "- Spectrum Tokens PR: https://github.com/adobe/spectrum-design-data/pull/559",
    ),
  );
});

test("createChangesetContent should handle empty motivation", (t) => {
  const tokenDiff = "## Token Changes\n- Updated token-name";
  const tokensStudioPR =
    "https://github.com/adobe/spectrum-design-data-studio-data/pull/275";
  const spectrumTokensPR =
    "https://github.com/adobe/spectrum-design-data/pull/559";

  const result = createChangesetContent(
    "patch",
    "",
    tokenDiff,
    tokensStudioPR,
    spectrumTokensPR,
  );

  // Should not include design motivation section when empty
  t.false(result.includes("### Design motivation"));

  // Should still include other sections
  t.true(result.includes("### Token changes"));
  t.true(result.includes("### References"));
});

test("createChangesetContent should handle different bump types", (t) => {
  const tokenDiff = "## Token Changes";
  const tokensStudioPR =
    "https://github.com/adobe/spectrum-design-data-studio-data/pull/275";
  const spectrumTokensPR =
    "https://github.com/adobe/spectrum-design-data/pull/559";

  const majorResult = createChangesetContent(
    "major",
    "",
    tokenDiff,
    tokensStudioPR,
    spectrumTokensPR,
  );
  const minorResult = createChangesetContent(
    "minor",
    "",
    tokenDiff,
    tokensStudioPR,
    spectrumTokensPR,
  );
  const patchResult = createChangesetContent(
    "patch",
    "",
    tokenDiff,
    tokensStudioPR,
    spectrumTokensPR,
  );

  t.true(majorResult.includes('"@adobe/spectrum-tokens": major'));
  t.true(minorResult.includes('"@adobe/spectrum-tokens": minor'));
  t.true(patchResult.includes('"@adobe/spectrum-tokens": patch'));
});
