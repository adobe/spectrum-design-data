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
import tokenDiff from ".";
import fileImport from "./file-import";

async function getReleaseLine() {
  // theoretically:
  // whenever a changeset happens, runs tokenDiff via fileImport, and turns that JSON result into markdown
  // i just am not sure how to return the markdown???

  // i'm also not sure how to get the changesets' version
  // i assume i use github api to get previous version
  // get previous version name, set it to originalVersion, set branches to main
  const [originalSchema, updatedSchema] = await Promise.all([
    fileImport("", originalVersion, originalBranch),
    fileImport("", updatedVersion, updatedBranch),
  ]);
  const report = tokenDiff(originalSchema, updatedSchema);
  return markdownFormatter(report);
}

async function getDependencyReleaseLine() {}

module.exports = {
  getReleaseLine,
  getDependencyReleaseLine,
};

function markdownFormatter(report) {
  // somehow format the report
}
