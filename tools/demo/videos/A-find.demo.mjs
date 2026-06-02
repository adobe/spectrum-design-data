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
 * Demo manifest — design-data TUI: find & inspect a token.
 *
 * Source: tools/demo/presentation/public/casts/A-find.cast
 * Markers (cast timestamps): A2=4.2s, A3=5.8s, A4=7.4s, total=10s
 *
 *   A2  :resolve property=accent-background-color,colorScheme=dark
 *       cascade winner (★), Spec specificity column, alias in foundation layer
 *   A3  :describe button
 *       component schema — anatomy, states, role, keyboard intents, token bindings
 *   A4  /accentbg (live fuzzy-find)
 *       fzf-style subsequence match, re-ranks per keystroke, : vs / distinction
 *
 * The prebuild splits the existing asciinema cast into per-beat MP4 clips using
 * agg (cast → GIF) and ffmpeg (GIF → MP4, then split at marker timestamps).
 * No VHS recording needed — the real TUI session is already captured.
 */

const CAST = "tools/demo/presentation/public/casts/A-find.cast";
const SPLIT = "python3 tools/demo/videos/lib/split-cast.py";
const OUT   = "tools/demo/videos/out";

/** @type {import("./lib/tape.mjs").DemoManifest} */
export default {
  title: "design-data TUI — find & inspect",
  slug: "A-find",

  prebuild: [
    `${SPLIT} ${CAST} A-find ${OUT} A2 A3 A4`,
  ],

  beats: [
    {
      id: "A2",
      prerendered: true,
      narration:
        "The cascade winner is marked with a star. The Spec column shows specificity — " +
        "same idea as CSS but deterministic and auditable. In dark mode, " +
        "accent-background-color resolves to the accent-color-800 alias " +
        "in the foundation layer.",
    },
    {
      id: "A3",
      prerendered: true,
      narration:
        "Describe button pulls the component schema straight from the spec bundle: " +
        "anatomy, states, accessibility role, keyboard intents, and exactly which " +
        "tokens it binds. The agent reads this. The build reads this. One source.",
    },
    {
      id: "A4",
      prerendered: true,
      narration:
        "Slash opens live fuzzy-find — the table re-ranks on every keystroke with " +
        "fzf-style subsequence matching. The header reads Fuzzy colon slash accentbg. " +
        "Enter keeps the filtered results; Escape restores the prior view. " +
        "Colon is the structured palette; slash is incremental name search.",
    },
  ],
};
