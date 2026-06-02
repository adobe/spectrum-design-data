/*
 * Copyright 2026 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

/**
 * Demo manifest — design-data TUI: name a new token.
 *
 * Source: tools/demo/presentation/public/casts/B-name.cast
 * Markers (cast timestamps): B1=4.2s, B2=8.7s, total=16s
 *
 *   B1  :new accent background → Tab (alias path) → Esc
 *       reuse-first: one Tab skips to Confirm diff — a reference, not a new value
 *   B2  :new custom brand overlay → Screens 2/3/4 → Esc
 *       four-screen wizard: Classification → Values → Confirm (live diff, sets block)
 */

const CAST = "tools/demo/presentation/public/casts/B-name.cast";
const SPLIT = "python3 tools/demo/videos/lib/split-cast.py";
const OUT   = "tools/demo/videos/out";

/** @type {import("./lib/tape.mjs").DemoManifest} */
export default {
  title: "design-data TUI — name a new token",
  slug: "B-name",

  prebuild: [
    `${SPLIT} ${CAST} B-name ${OUT} B1 B2`,
  ],

  beats: [
    {
      id: "B1",
      prerendered: true,
      narration:
        "Reuse-first authoring: the wizard surfaces existing matches before letting " +
        "you create a new token. For accent background, a high-confidence match exists. " +
        "One Tab takes the alias path straight to Confirm — a reference, not a duplicate value.",
    },
    {
      id: "B2",
      prerendered: true,
      narration:
        "A novel intent gets the full four-screen wizard: Intent, Classification — " +
        "layer, property, name fields with a live preview — Values with one row per " +
        "mode combination, and Confirm where a rationale is required and the diff " +
        "shows every mode-combo row as a sets block. Same token shape as the MCP session.",
    },
  ],
};
