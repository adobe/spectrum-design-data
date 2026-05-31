// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

export const config = {
  bin: process.env.DESIGN_DATA_BIN ?? "design-data",
  dataPath: process.env.DESIGN_DATA_PATH ?? ".",
  schemaPath: process.env.DESIGN_DATA_SCHEMAS ?? null,
  exceptionsPath: process.env.DESIGN_DATA_EXCEPTIONS ?? null,
  componentsDir: process.env.DESIGN_DATA_COMPONENTS ?? null,
  fieldsDir: process.env.DESIGN_DATA_FIELDS ?? null,
  dimensionsDir: process.env.DESIGN_DATA_DIMENSIONS ?? null,
};
