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
 * Demo manifest — design-data CLI: deterministic suggest + primer.
 *
 * Source: tools/demo/presentation/public/casts/C-suggest.cast
 * Markers (cast timestamps): C1=3.1s, C2=5.3s, total=7s
 *
 *   C1  design-data suggest "primary background color"
 *       deterministic lexical Jaccard ranking — not a model
 *   C2  design-data primer packages/design-data/tokens
 *       structural overview the agent reads at session start
 *
 * Honest framing: everything in this cast is deterministic. The only model
 * layer in the demo suite is Demo D (Claude Code + MCP).
 */

const CAST = "tools/demo/presentation/public/casts/C-suggest.cast";
const SPLIT = "python3 tools/demo/videos/lib/split-cast.py";
const OUT   = "tools/demo/videos/out";

/** @type {import("./lib/tape.mjs").DemoManifest} */
export default {
  title: "design-data CLI — suggest & primer",
  slug: "C-suggest",

  prebuild: [
    `${SPLIT} ${CAST} C-suggest ${OUT} C1 C2`,
  ],

  beats: [
    {
      id: "C1",
      prerendered: true,
      narration:
        "design-data suggest returns ranked token candidates for a natural-language " +
        "intent — deterministic lexical Jaccard ranking, not a model. " +
        "Same answer every time.",
    },
    {
      id: "C2",
      prerendered: true,
      narration:
        "design-data primer emits the structural overview the agent reads at session " +
        "start: token count, mode sets, component list, conformance scope. " +
        "This is what grounds the agent in the actual dataset before it answers anything.",
    },
  ],
};
