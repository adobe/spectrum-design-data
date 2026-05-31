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
 * VHS `.tape` assembly from a demo manifest.
 *
 * @typedef {Object} DemoBeat
 * @property {string} id          Stable slug for the beat (used in filenames).
 * @property {string} narration   One line of voiceover spoken over this beat.
 * @property {string} tape        VHS tape commands for the on-screen actions.
 *
 * @typedef {Object} DemoManifest
 * @property {string} title       Human title (window + caption metadata).
 * @property {string} slug        Filename-safe basename for outputs.
 * @property {number} [width]     Terminal width in px (default 1280).
 * @property {number} [height]    Terminal height in px (default 720).
 * @property {number} [fontSize]  Font size in px (default 22).
 * @property {string} [theme]     VHS theme name (default "Catppuccin Mocha").
 * @property {string} [typingSpeed] VHS TypingSpeed, e.g. "60ms" (default "50ms").
 * @property {string[]} [prebuild]  Shell commands run once before rendering (e.g. cargo build).
 * @property {string[]} [setup]     Shell commands run hidden at the start of each beat.
 * @property {DemoBeat[]} beats
 */

import { resolve, isAbsolute } from "node:path";
import { pathToFileURL } from "node:url";
import { repoRoot } from "./run.mjs";

const DEFAULTS = {
  width: 1280,
  height: 720,
  fontSize: 22,
  theme: "Catppuccin Mocha",
  typingSpeed: "50ms",
};

/** Quote a string for a VHS `Type` command, avoiding delimiter collisions. */
export function vhsQuote(str) {
  if (!str.includes('"')) return `"${str}"`;
  if (!str.includes("'")) return `'${str}'`;
  // Contains both quote styles: fall back to backticks (VHS accepts them).
  return `\`${str}\``;
}

/** Resolve and import a manifest module, returning its default export. */
export async function loadManifest(manifestPath) {
  const abs = isAbsolute(manifestPath)
    ? manifestPath
    : resolve(repoRoot, manifestPath);
  const mod = await import(pathToFileURL(abs).href);
  const manifest = mod.default;
  if (
    !manifest ||
    !Array.isArray(manifest.beats) ||
    manifest.beats.length === 0
  ) {
    throw new Error(
      `Manifest ${manifestPath} must export a default object with a non-empty 'beats' array.`,
    );
  }
  if (!manifest.slug) {
    throw new Error(`Manifest ${manifestPath} is missing required 'slug'.`);
  }
  return { ...DEFAULTS, ...manifest };
}

/** VHS `Set` + first `Output` header lines shared by every tape. */
function headerLines(manifest, outputs) {
  const lines = [];
  for (const out of outputs) lines.push(`Output ${out}`);
  lines.push(`Set Shell "bash"`);
  lines.push(`Set Width ${manifest.width}`);
  lines.push(`Set Height ${manifest.height}`);
  lines.push(`Set FontSize ${manifest.fontSize}`);
  lines.push(`Set Theme ${vhsQuote(manifest.theme)}`);
  lines.push(`Set TypingSpeed ${manifest.typingSpeed}`);
  return lines;
}

/** A hidden block running the manifest `setup` shell lines, then `Show`. */
function hiddenSetupLines(manifest) {
  const setup = manifest.setup ?? [];
  if (setup.length === 0) return [];
  const lines = ["Hide"];
  for (const cmd of setup) {
    lines.push(`Type ${vhsQuote(cmd)}`);
    lines.push("Enter");
  }
  // Settle the prompt before recording resumes.
  lines.push("Sleep 500ms");
  lines.push("Show");
  return lines;
}

/**
 * Build the tape for a single beat, rendered to its own silent video.
 * @param {DemoManifest} manifest
 * @param {DemoBeat} beat
 * @param {string} outputPath  Path (relative to repo root) for the beat video.
 */
export function assembleBeatTape(manifest, beat, outputPath) {
  return [
    ...headerLines(manifest, [outputPath]),
    ...hiddenSetupLines(manifest),
    beat.tape.trimEnd(),
    "",
  ].join("\n");
}

/**
 * Build one continuous tape across all beats for silent doc assets.
 * @param {DemoManifest} manifest
 * @param {string[]} outputPaths  e.g. ["out/cli-quickstart.gif", "out/cli-quickstart.webm"]
 */
export function assembleFullTape(manifest, outputPaths) {
  const lines = [
    ...headerLines(manifest, outputPaths),
    ...hiddenSetupLines(manifest),
  ];
  for (const beat of manifest.beats) {
    lines.push(`# beat: ${beat.id}`);
    lines.push(beat.tape.trimEnd());
  }
  lines.push("");
  return lines.join("\n");
}
