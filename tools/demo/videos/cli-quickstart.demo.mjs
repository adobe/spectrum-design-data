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
 * Demo manifest — `design-data` CLI quickstart.
 *
 * A manifest describes a narrated terminal demo as an ordered list of "beats".
 * Each beat pairs a chunk of VHS tape actions (what happens on screen) with one
 * line of narration (what you say over it). The build pipeline renders each beat
 * as a silent clip, syncs it to a per-beat audio recording, and stitches the
 * beats into a narrated MP4 — plus a silent GIF/WebM of the whole tape for docs.
 *
 * See ./README section in tools/demo/README.md and lib/tape.mjs for the schema.
 */

/** @type {import("./lib/tape.mjs").DemoManifest} */
export default {
  // Used for window title, output file basenames, and caption metadata.
  title: "design-data CLI — quickstart",
  slug: "cli-quickstart",

  // VHS terminal geometry + theme. Truecolor theme keeps the Spectrum palette crisp.
  width: 1280,
  height: 720,
  fontSize: 22,
  theme: "Catppuccin Mocha",
  // Typing speed for `Type` commands (VHS default is 50ms). Slower reads better on video.
  typingSpeed: "60ms",

  // Shell commands run once (outside VHS) before any beat is rendered. Use this to
  // build binaries so compile time never leaks into the recording. Mirrors verify-demo.sh.
  prebuild: [
    "cargo build --release --manifest-path sdk/Cargo.toml --bin design-data",
  ],

  // Lines executed inside a hidden VHS block at the start of EVERY beat (each beat
  // renders in a fresh terminal). Put the freshly built CLI on PATH and clear the screen.
  setup: ['export PATH="$PWD/sdk/target/release:$PATH"', "clear"],

  beats: [
    {
      id: "component",
      narration:
        "The component declaration is the contract. Anatomy, states, accessibility " +
        "intent, and exactly which tokens it binds. The agent reads this, the build " +
        "reads this, the visualizer reads this — one source.",
      tape: `Type "design-data component button --components-dir packages/design-data/components"
Enter
Wait
Sleep 3s`,
    },
    {
      id: "query",
      narration:
        "A designer asks: what tokens does the button use? This used to be a " +
        "code-archaeology task. Now it's one CLI call — the same answer for the engineer.",
      tape: `Type "design-data query packages/design-data/tokens --filter 'component=button'"
Enter
Wait
Sleep 3s`,
    },
    {
      id: "validate",
      narration:
        "And a token that aliases something that doesn't exist is easy to miss in " +
        "review. The validator catches it before it ships — SPEC-001, alias target not " +
        "found. There are forty-two more rules like this one.",
      tape: `Type "design-data validate tools/demo/broken-token-example.tokens.json 2>&1 | grep -A1 SPEC-001"
Enter
Wait
Sleep 3s`,
    },
  ],
};
