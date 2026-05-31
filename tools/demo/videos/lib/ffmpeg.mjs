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

/** ffmpeg / ffprobe wrappers used by the demo-video sync + mux pipeline. */

import { writeFileSync } from "node:fs";
import { runCapture, runInherit } from "./run.mjs";

/** Shared encode params so every clip concatenates cleanly. */
const VIDEO_FPS = 50;
const VIDEO_ARGS = [
  "-c:v",
  "libx264",
  "-preset",
  "medium",
  "-pix_fmt",
  "yuv420p",
  "-r",
  String(VIDEO_FPS),
];
const AUDIO_ARGS = ["-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2"];

/** Probe a media file's duration in seconds (float). */
export function probeDuration(path) {
  const res = runCapture("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "json",
    path,
  ]);
  if (res.status !== 0) {
    throw new Error(`ffprobe failed for ${path}: ${res.stderr}`);
  }
  const dur = JSON.parse(res.stdout)?.format?.duration;
  const n = Number.parseFloat(dur);
  if (!Number.isFinite(n))
    throw new Error(`Could not read duration from ${path}`);
  return n;
}

/**
 * Extend a video by freezing its last frame for `extraSeconds`.
 * No-op copy when extraSeconds is ~0.
 */
export function freezeExtendVideo(inPath, outPath, extraSeconds) {
  if (extraSeconds <= 0.02) {
    runInherit("ffmpeg", ["-y", "-i", inPath, ...VIDEO_ARGS, "-an", outPath]);
    return;
  }
  runInherit("ffmpeg", [
    "-y",
    "-i",
    inPath,
    "-vf",
    `tpad=stop_mode=clone:stop_duration=${extraSeconds.toFixed(3)}`,
    ...VIDEO_ARGS,
    "-an",
    outPath,
  ]);
}

/**
 * Pad an audio clip with trailing silence so its total length is `targetSeconds`.
 * Stays PCM (the .wav stays a real wav); AAC encoding happens later at mux time.
 */
export function padAudioTo(inPath, outPath, targetSeconds) {
  runInherit("ffmpeg", [
    "-y",
    "-i",
    inPath,
    "-af",
    `apad=whole_dur=${targetSeconds.toFixed(3)}`,
    "-c:a",
    "pcm_s16le",
    "-ar",
    "48000",
    "-ac",
    "2",
    outPath,
  ]);
}

/** Mux a (silent) video and an audio track into one file. */
export function mux(videoPath, audioPath, outPath) {
  runInherit("ffmpeg", [
    "-y",
    "-i",
    videoPath,
    "-i",
    audioPath,
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
    "-c:v",
    "copy",
    ...AUDIO_ARGS,
    "-shortest",
    outPath,
  ]);
}

/** Concatenate uniformly-encoded clips via the concat demuxer (stream copy). */
export function concat(clipPaths, listFilePath, outPath) {
  const list = clipPaths
    .map((p) => `file '${p.replace(/'/g, "'\\''")}'`)
    .join("\n");
  writeFileSync(listFilePath, `${list}\n`);
  runInherit("ffmpeg", [
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    listFilePath,
    "-c",
    "copy",
    outPath,
  ]);
}

/** Convert an arbitrary audio file (aiff/mp3/m4a/...) to mono 48k wav. */
export function toWav(inPath, outPath) {
  runInherit("ffmpeg", [
    "-y",
    "-i",
    inPath,
    "-ar",
    "48000",
    "-ac",
    "1",
    outPath,
  ]);
}
