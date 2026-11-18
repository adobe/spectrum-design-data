// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

export default {
  files: ["test/**/*.test.js"],
  verbose: true,
  // Run test files one at a time. Several test files (bundle-smoke, bundle-contents,
  // generate-mcpb) all invoke or depend on generate-mcpb.mjs, which writes to the
  // shared dist/design-data-mcp-bundle staging dir. Running them concurrently causes
  // EEXIST races; serial execution avoids this without needing a lockfile.
  concurrency: 1,
  // AVA's default 10s without a finished test fails the run. design-data.test.js has one
  // synchronous wasm loop (every alias value ...) that takes 20-45s when CI is loaded, so the
  // other tests cannot finish meanwhile.
  timeout: "2m",
  environmentVariables: {
    NODE_ENV: "test",
  },
};
