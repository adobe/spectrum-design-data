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

/** Build SRT / WebVTT caption tracks from timed narration cues. */

/**
 * @typedef {Object} Cue
 * @property {string} text
 * @property {number} start  seconds
 * @property {number} end    seconds
 */

function pad(n, width = 2) {
  return String(n).padStart(width, "0");
}

function stamp(seconds, msSep) {
  const ms = Math.round((seconds - Math.floor(seconds)) * 1000);
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}${msSep}${pad(ms, 3)}`;
}

/** @param {Cue[]} cues */
export function toSrt(cues) {
  return (
    cues
      .map(
        (c, i) =>
          `${i + 1}\n${stamp(c.start, ",")} --> ${stamp(c.end, ",")}\n${c.text}`,
      )
      .join("\n\n") + "\n"
  );
}

/** @param {Cue[]} cues */
export function toVtt(cues) {
  return (
    "WEBVTT\n\n" +
    cues
      .map((c) => `${stamp(c.start, ".")} --> ${stamp(c.end, ".")}\n${c.text}`)
      .join("\n\n") +
    "\n"
  );
}

/**
 * Turn ordered beat durations into back-to-back cues.
 * @param {{narration: string, duration: number}[]} beats
 * @returns {Cue[]}
 */
export function cuesFromBeats(beats) {
  const cues = [];
  let t = 0;
  for (const b of beats) {
    cues.push({ text: b.narration, start: t, end: t + b.duration });
    t += b.duration;
  }
  return cues;
}
