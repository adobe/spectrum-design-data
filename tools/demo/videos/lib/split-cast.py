# Copyright 2026 Adobe. All rights reserved.
# This file is licensed to you under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License. You may obtain a copy
# of the License at http://www.apache.org/licenses/LICENSE-2.0
#
# split-cast.py — Convert an asciinema cast to per-beat MP4 clips.
#
# Usage:
#   python3 tools/demo/videos/lib/split-cast.py CAST_FILE SLUG OUT_DIR BEAT_ID...
#
# Steps:
#   1. agg CAST_FILE → OUT_DIR/SLUG-full.gif   (full terminal animation)
#   2. ffmpeg gif   → OUT_DIR/SLUG-full.mp4    (silent full-length video)
#   3. For each BEAT_ID[i]: ffmpeg split boundaries[i]..boundaries[i+1]
#                         → OUT_DIR/SLUG-BEAT_ID.mp4
#
# Boundaries come from the cast's marker events (type "m"), sorted by time.
# The full-video intermediate ensures correct terminal state at each split point
# (unlike sub-cast extraction which starts from a blank terminal).
#
# Requires: agg, ffmpeg on PATH.

import sys, json, subprocess, os

cast_file = sys.argv[1]
slug      = sys.argv[2]
out_dir   = sys.argv[3]
beat_ids  = sys.argv[4:]

if not beat_ids:
    print("Usage: split-cast.py CAST_FILE SLUG OUT_DIR BEAT_ID...", file=sys.stderr)
    sys.exit(1)

os.makedirs(out_dir, exist_ok=True)

with open(cast_file) as f:
    json.loads(f.readline())           # header (not needed)
    events = [json.loads(l) for l in f if l.strip()]

markers  = sorted([(e[0], e[2]) for e in events if e[1] == "m"])
duration = max(e[0] for e in events)

if len(markers) < len(beat_ids) - 1:
    print(
        f"WARNING: cast has {len(markers)} markers but {len(beat_ids)} beat IDs — "
        "some beats may span the full remaining duration.",
        file=sys.stderr,
    )

# Time boundaries: [0, marker1, marker2, ..., duration+0.5]
# beat_ids[0] → [0 .. marker1]
# beat_ids[1] → [marker1 .. marker2]
# ...
# beat_ids[-1] → [last_marker .. end]
boundaries = [0.0] + [t for t, _ in markers] + [duration + 0.5]

# ── Step 1: render full GIF via agg ──────────────────────────────────────────
full_gif = os.path.join(out_dir, f"{slug}-full.gif")
full_mp4 = os.path.join(out_dir, f"{slug}-full.mp4")

print(f"  agg → {full_gif}", flush=True)
subprocess.run(
    ["agg", cast_file, full_gif, "--cols", "120", "--rows", "36"],
    check=True,
)

# ── Step 2: GIF → MP4 ────────────────────────────────────────────────────────
print(f"  ffmpeg gif → {full_mp4}", flush=True)
# scale filter: round width and height down to even numbers (H.264 requirement).
subprocess.run(
    ["ffmpeg", "-y", "-i", full_gif,
     "-vf", "fps=12,scale=trunc(iw/2)*2:trunc(ih/2)*2",
     full_mp4],
    check=True,
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL,
)

# ── Step 3: split at marker boundaries ───────────────────────────────────────
for i, beat_id in enumerate(beat_ids):
    start = boundaries[i]
    end   = boundaries[i + 1] if i + 1 < len(boundaries) else duration + 0.5
    out_clip = os.path.join(out_dir, f"{slug}-{beat_id}.mp4")

    cmd = [
        "ffmpeg", "-y",
        "-i", full_mp4,
        "-ss", str(start),
        "-to", str(end),
        out_clip,
    ]
    print(f"  split t={start:.1f}s..{end:.1f}s → {out_clip}", flush=True)
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

print(f"  done: {len(beat_ids)} clips in {out_dir}/")
