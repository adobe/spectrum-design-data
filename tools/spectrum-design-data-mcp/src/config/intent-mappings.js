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

/** Maps user-facing intent names to semantic token name substrings */
export const INTENT_SEMANTIC_MAPPINGS = {
  error: ["negative"],
  success: ["positive"],
  warning: ["notice"],
};

/** Maps use case keywords to token categories to search */
export const USE_CASE_PATTERNS = {
  background: ["color-component", "semantic-color-palette", "color-palette"],
  text: ["color-component", "semantic-color-palette", "typography"],
  border: ["color-component", "semantic-color-palette"],
  spacing: ["layout", "layout-component"],
  padding: ["layout", "layout-component"],
  margin: ["layout", "layout-component"],
  font: ["typography"],
  icon: ["icons", "layout"],
  error: ["semantic-color-palette", "color-component"],
  success: ["semantic-color-palette", "color-component"],
  warning: ["semantic-color-palette", "color-component"],
  accent: ["semantic-color-palette", "color-component"],
  button: ["color-component", "layout-component"],
  input: ["color-component", "layout-component"],
  card: ["color-component", "layout-component"],
};

/** Maps variant names to semantic token name substrings */
export const VARIANT_MAPPINGS = {
  accent: ["accent"],
  negative: ["negative"],
};
