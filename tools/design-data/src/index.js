// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

/**
 * @adobe/design-data
 *
 * Node.js glue layer over @adobe/design-data-wasm:
 *
 * - `loadDataset(dir)` — walk *.tokens.json from a directory → Dataset
 * - `loadDatasetSync(dir, wasm)` — synchronous variant for pre-loaded wasm modules
 * - `writeProductContext(opts)` — write/update product-context.json
 * - `writeToken(key, token, opts)` — write a token into a target JSON file
 * - `buildTokenFromWizard(opts)` — build a token object from authoring-session state
 * - `startSession / stepClassification / stepValues / commitSession / cancelSession / getSession / listSessions`
 *   — on-disk authoring-session state machine (JS port of sdk/core/src/authoring/session.rs)
 */

export { loadDataset, loadDatasetSync } from "./load.js";
export {
  writeProductContext,
  writeToken,
  buildTokenFromWizard,
} from "./write.js";
export {
  startSession,
  getSession,
  listSessions,
  stepClassification,
  stepValues,
  commitSession,
  cancelSession,
} from "./session.js";
export {
  validateDataset,
  validateTokenAgainstSchema,
  resolveSchemaDir,
  loadSchemaValidator,
} from "./validate.js";
