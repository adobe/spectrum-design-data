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
 * record.mjs — record one voiceover clip per beat with a teleprompter.
 *
 *   node tools/demo/videos/record.mjs [manifest] [options]
 *
 * Writes tools/demo/videos/out/<slug>-<beat>.wav (48kHz mono), one per beat.
 * Each beat is recorded independently, so re-recording a single beat is cheap.
 * You can also skip this script entirely and drop your own <slug>-<beat>.wav
 * files into the out/ directory by hand.
 *
 * Options:
 *   --list-devices   list avfoundation audio inputs and exit
 *   --device <idx>   avfoundation audio device index (default 0)
 *   --beat <id>      record only the named beat (repeatable)
 *   --force          overwrite an existing recording
 *   --say            synthesize narration with macOS `say` instead of the mic
 *                    (for testing the pipeline / quick previews — not your voice)
 *   --voice <name>   voice for --say (default: system default)
 */

import { mkdirSync, existsSync } from "node:fs";
import { relative } from "node:path";
import { spawn } from "node:child_process";
import readline from "node:readline";
import { loadManifest } from "./lib/tape.mjs";
import {
  repoRoot,
  outDir,
  runInherit,
  runCapture,
  log,
  colors,
} from "./lib/run.mjs";
import { probeDuration, toWav } from "./lib/ffmpeg.mjs";

const DEFAULT_MANIFEST = "tools/demo/videos/cli-quickstart.demo.mjs";
const RESET = "\u001b[0m";

function parseArgs(argv) {
  const opts = {
    manifest: undefined,
    beats: [],
    device: "0",
    force: false,
    say: false,
    voice: undefined,
    listDevices: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--beat") opts.beats.push(argv[++i]);
    else if (a === "--device") opts.device = argv[++i];
    else if (a === "--force") opts.force = true;
    else if (a === "--say") opts.say = true;
    else if (a === "--voice") opts.voice = argv[++i];
    else if (a === "--list-devices") opts.listDevices = true;
    else if (!a.startsWith("--")) opts.manifest = a;
  }
  return opts;
}

function wrap(text, width = 76) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > width) {
      lines.push(line.trim());
      line = w;
    } else {
      line = `${line} ${w}`;
    }
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}

function teleprompter(index, total, beat) {
  console.error(
    `\n${colors.bold}Beat ${index + 1}/${total}: ${beat.id}${RESET}`,
  );
  console.error(`${colors.dim}${"\u2500".repeat(78)}${RESET}`);
  for (const l of wrap(beat.narration)) console.error(`  ${l}`);
  console.error(`${colors.dim}${"\u2500".repeat(78)}${RESET}`);
}

function listDevices() {
  // avfoundation prints the device list to stderr and exits non-zero by design.
  const res = runCapture("ffmpeg", [
    "-f",
    "avfoundation",
    "-list_devices",
    "true",
    "-i",
    "",
  ]);
  process.stderr.write(res.stderr ?? "");
}

/** Record a single beat from the mic. Resolves when recording stops. */
function recordBeat(rl, wavPath, device) {
  return new Promise((resolve, reject) => {
    const ff = spawn(
      "ffmpeg",
      [
        "-y",
        "-f",
        "avfoundation",
        "-i",
        `:${device}`,
        "-ar",
        "48000",
        "-ac",
        "1",
        wavPath,
      ],
      { cwd: repoRoot, stdio: ["pipe", "ignore", "ignore"] },
    );
    ff.on("error", reject);
    ff.on("close", (code) => {
      // ffmpeg returns 255 when stopped via 'q'; that's a normal stop here.
      if (code === 0 || code === 255) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}`));
    });
    console.error(
      `${colors.green}  ● recording…${RESET} press ${colors.bold}Enter${RESET} to stop.`,
    );
    rl.question("", () => {
      ff.stdin.write("q");
      ff.stdin.end();
    });
  });
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.listDevices) {
    listDevices();
    return;
  }

  const manifest = await loadManifest(opts.manifest ?? DEFAULT_MANIFEST);
  mkdirSync(outDir, { recursive: true });
  const rel = (p) => relative(repoRoot, p);

  const selected = opts.beats.length
    ? manifest.beats.filter((b) => opts.beats.includes(b.id))
    : manifest.beats;

  if (opts.say) {
    log.step(
      `synthesizing narration with macOS 'say' (${selected.length} beat(s))`,
    );
    for (const beat of selected) {
      const wavPath = `${outDir}/${manifest.slug}-${beat.id}.wav`;
      const aiff = `${outDir}/${manifest.slug}-${beat.id}.aiff`;
      const sayArgs = ["-o", aiff];
      if (opts.voice) sayArgs.push("-v", opts.voice);
      sayArgs.push(beat.narration);
      runInherit("say", sayArgs);
      toWav(aiff, wavPath);
      log.ok(`${rel(wavPath)} (${probeDuration(wavPath).toFixed(2)}s)`);
    }
    log.step("done — review with build.mjs");
    return;
  }

  console.error(
    `${colors.bold}Voiceover recording${RESET} — device :${opts.device} (use --list-devices to choose another)`,
  );
  console.error(
    `${colors.dim}Read each beat aloud. Press Enter to start, Enter again to stop. Ctrl-C aborts.${RESET}`,
  );

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stderr,
  });
  try {
    for (let i = 0; i < selected.length; i++) {
      const beat = selected[i];
      const wavPath = `${outDir}/${manifest.slug}-${beat.id}.wav`;
      if (existsSync(wavPath) && !opts.force) {
        log.info(
          `skipping '${beat.id}' (recording exists; use --force to overwrite)`,
        );
        continue;
      }
      teleprompter(i, selected.length, beat);
      await new Promise((r) =>
        rl.question(`  ${colors.bold}Enter${RESET} to start… `, r),
      );
      await recordBeat(rl, wavPath, opts.device);
      log.ok(`${rel(wavPath)} (${probeDuration(wavPath).toFixed(2)}s)`);
    }
  } finally {
    rl.close();
  }
  log.step("recording complete — run build.mjs to assemble the narrated video");
}

main().catch((err) => {
  console.error(`\n${colors.red}record failed:${RESET} ${err.message}`);
  process.exit(1);
});
