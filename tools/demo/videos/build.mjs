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
 * build.mjs — sync recorded voiceover to rendered beats and assemble the video.
 *
 *   node tools/demo/videos/build.mjs [manifest] [options]
 *
 * For each beat it reads the silent clip (<slug>-<beat>.mp4, from render.mjs) and
 * the voiceover (<slug>-<beat>.wav, from record.mjs), then makes them the same
 * length by freezing the video's last frame to match the audio (plus a short tail
 * of breathing room). The padded beats are muxed and concatenated into:
 *
 *   <slug>.narrated.mp4   the final narrated video
 *   <slug>.srt / .vtt     caption tracks
 *   <slug>.captioned.mp4  (only with --burn) captions burned in
 *
 * Options:
 *   --tail <seconds>   silence held after each beat's narration (default 0.5)
 *   --burn             also emit <slug>.captioned.mp4 with burned-in subtitles
 */

import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { relative } from "node:path";
import { loadManifest } from "./lib/tape.mjs";
import { repoRoot, outDir, runInherit, log, colors } from "./lib/run.mjs";
import {
  probeDuration,
  freezeExtendVideo,
  padAudioTo,
  mux,
  concat,
} from "./lib/ffmpeg.mjs";
import { cuesFromBeats, toSrt, toVtt } from "./lib/captions.mjs";

const DEFAULT_MANIFEST = "tools/demo/videos/cli-quickstart.demo.mjs";
const RESET = "\u001b[0m";

function parseArgs(argv) {
  const opts = { manifest: undefined, tail: 0.5, burn: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--tail") opts.tail = Number.parseFloat(argv[++i]);
    else if (a === "--burn") opts.burn = true;
    else if (!a.startsWith("--")) opts.manifest = a;
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const manifest = await loadManifest(opts.manifest ?? DEFAULT_MANIFEST);
  mkdirSync(outDir, { recursive: true });
  const rel = (p) => relative(repoRoot, p);
  const base = `${outDir}/${manifest.slug}`;

  const avClips = [];
  const timedBeats = [];

  for (const beat of manifest.beats) {
    const video = `${base}-${beat.id}.mp4`;
    const audio = `${base}-${beat.id}.wav`;
    if (!existsSync(video))
      throw new Error(
        `Missing rendered clip ${rel(video)} — run render.mjs first.`,
      );
    if (!existsSync(audio))
      throw new Error(
        `Missing voiceover ${rel(audio)} — run record.mjs (or drop a wav in place).`,
      );

    const vDur = probeDuration(video);
    const aDur = probeDuration(audio);
    const target = Math.max(vDur, aDur + opts.tail);

    log.step(
      `sync beat '${beat.id}': video ${vDur.toFixed(2)}s · audio ${aDur.toFixed(2)}s -> ${target.toFixed(2)}s`,
    );

    const paddedVideo = `${base}-${beat.id}.v.mp4`;
    const paddedAudio = `${base}-${beat.id}.a.wav`;
    const beatAv = `${base}-${beat.id}.av.mp4`;

    freezeExtendVideo(video, paddedVideo, target - vDur);
    padAudioTo(audio, paddedAudio, target);
    mux(paddedVideo, paddedAudio, beatAv);
    log.ok();

    avClips.push(beatAv);
    timedBeats.push({ narration: beat.narration, duration: target });
  }

  log.step(`concat ${avClips.length} beats -> ${rel(`${base}.narrated.mp4`)}`);
  concat(avClips, `${base}-concat.txt`, `${base}.narrated.mp4`);
  log.ok();

  const cues = cuesFromBeats(timedBeats);
  writeFileSync(`${base}.srt`, toSrt(cues));
  writeFileSync(`${base}.vtt`, toVtt(cues));
  log.info(`captions: ${rel(`${base}.srt`)}, ${rel(`${base}.vtt`)}`);

  if (opts.burn) {
    log.step(`burn captions -> ${rel(`${base}.captioned.mp4`)}`);
    runInherit("ffmpeg", [
      "-y",
      "-i",
      `${base}.narrated.mp4`,
      "-vf",
      `subtitles='${base}.srt'`,
      "-c:a",
      "copy",
      `${base}.captioned.mp4`,
    ]);
    log.ok();
  }

  const total = timedBeats.reduce((s, b) => s + b.duration, 0);
  log.step("build complete");
  console.error(
    `${colors.green}    ${rel(`${base}.narrated.mp4`)}${RESET} (${total.toFixed(1)}s, ${manifest.beats.length} beats)`,
  );
}

main().catch((err) => {
  console.error(`\n${colors.red}build failed:${RESET} ${err.message}`);
  process.exit(1);
});
