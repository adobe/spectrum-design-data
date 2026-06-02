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
 * Demo manifest — agent workflow: Claude Code + design-data MCP.
 *
 * Source: tools/demo/presentation/public/casts/D-agent.cast
 * Markers (cast timestamps, from hook epochs):
 *   D1=5.5s  (prompt submitted — ~5s before first tool call)
 *   D2=10.5s (mcp__design-data__describe_component completed)
 *   D3=17.0s (mcp__design-data__resolve_token first attempt)
 *   D4=96.8s (Stop hook — Claude finished full response)
 *   total=100s
 *
 * This cast is non-deterministic (live Claude Code + MCP session). VHS can't
 * script it. The prebuild splits the recorded cast into per-beat clips using
 * agg (cast → GIF) and ffmpeg (GIF → MP4, split at marker timestamps).
 *
 * To re-record: bash tools/demo/auto/auto-demo.sh D --record (plain terminal only).
 */

const CAST = "tools/demo/presentation/public/casts/D-agent.cast";
const SPLIT = "python3 tools/demo/videos/lib/split-cast.py";
const OUT   = "tools/demo/videos/out";

/** @type {import("./lib/tape.mjs").DemoManifest} */
export default {
  title: "design-data — agent workflow (Claude Code + MCP)",
  slug: "D-agent",

  prebuild: [
    `${SPLIT} ${CAST} D-agent ${OUT} D1 D2 D3 D4`,
  ],

  beats: [
    {
      id: "D1",
      prerendered: true,
      narration:
        "The agent receives the prompt: look up the button component — " +
        "accessibility role, keyboard intents, states, and the dark-mode " +
        "background color token — with citations from the spec, not a guess. " +
        "It immediately calls the design-data MCP.",
    },
    {
      id: "D2",
      prerendered: true,
      narration:
        "Agent calls describe-component for button and reads the spec directly: " +
        "role is button ARIA, keyboard intent is activate, states are hover, " +
        "focus, and disabled. It quotes these with citations — not inferred, read.",
    },
    {
      id: "D3",
      prerendered: true,
      narration:
        "Agent calls resolve-token for the dark-scheme background. The first attempt " +
        "fails — wrong property name — so it queries for the right one and resolves again. " +
        "This is the agent reasoning through the problem, same as an engineer would, " +
        "but in seconds.",
    },
    {
      id: "D4",
      prerendered: true,
      narration:
        "The complete answer: role, intents, states, and the resolved alias with a " +
        "cascade citation. The same answers are available deterministically from the " +
        "CLI for teams watching their context budget. The MCP adds authoring tools " +
        "on top — the CLI is always read-only and always available.",
    },
  ],
};
