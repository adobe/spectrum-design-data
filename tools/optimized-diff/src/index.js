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

/**
 * @adobe/optimized-diff
 *
 * High-performance deep object diff algorithm with significant performance improvements
 * over generic diff libraries.
 *
 * Provides 60-80% performance improvements while maintaining full API compatibility
 * with popular diff libraries like deep-object-diff.
 */

export {
  diff,
  addedDiff,
  deletedDiff,
  updatedDiff,
  detailedDiff,
  OptimizedDiffEngine,
} from "./engine.js";

export { isObject, isString, isBoolean, isNumber, assert } from "./helpers.js";

// Default export is the complete engine
export { OptimizedDiffEngine as default } from "./engine.js";
