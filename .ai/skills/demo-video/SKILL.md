---
name: demo-video
description: >-
  Creates narrated terminal demo videos for the design-data CLI and TUI using VHS
  (terminal recording) plus ffmpeg (audio sync), AND live presentation decks using
  asciinema casts embedded in Slidev with pause-on-marker pacing. For videos: authors a
  beat-based manifest, renders silent clips, guides the user through recording their own
  voiceover, then syncs and stitches a narrated MP4 with captions and silent GIF/WebM doc
  assets. For presentations: records asciinema casts with per-beat markers and embeds them
  in a Slidev deck that auto-pauses so the presenter narrates live while screen-sharing.
  Use when asked to make a demo video, screencast, narrated recording, or a live
  presentation/slide deck of a CLI/TUI, or to edit assets under tools/demo/videos/ or
  tools/demo/presentation/.
---

# Demo video pipeline (VHS + recorded voiceover)

Turn a demo script into a narrated MP4 (the user's voiceover synced to a terminal
recording) plus silent GIF/WebM assets for docs. The pipeline lives in
[`tools/demo/videos/`](../../../tools/demo/videos) and is driven by a single manifest.

## Core idea — the beat is the unit of sync

VHS has no audio, and human narration timing varies per take. So each demo is split into
**beats**: a chunk of on-screen action + one line of narration. Each beat is rendered to
its own silent clip and recorded to its own audio clip; at build time the video's last
frame is **frozen** to match the audio length (plus a short tail). This guarantees the
video never outpaces the voice and lets any single beat be re-recorded independently.

```
manifest ─▶ render.mjs ─▶ silent beat clips + full GIF/WebM
manifest ─▶ record.mjs ─▶ one .wav per beat (teleprompter + mic)
            build.mjs  ─▶ pad video→audio, mux, concat ─▶ <slug>.narrated.mp4 + .srt/.vtt
```

## Prerequisites

* `vhs` (`brew install vhs`) and `ffmpeg`/`ffprobe` (`brew install ffmpeg`) on PATH.
* For CLI/TUI demos the binary must build; the manifest's `prebuild` handles this
  (mirrors `tools/demo/verify-demo.sh`).

## 1. Author or edit a manifest

Manifests are zero-dependency ES modules: `tools/demo/videos/<slug>.demo.mjs`. Start from
[`cli-quickstart.demo.mjs`](../../../tools/demo/videos/cli-quickstart.demo.mjs). The full
schema is documented in [`lib/tape.mjs`](../../../tools/demo/videos/lib/tape.mjs):

```js
export default {
  title: "design-data CLI — quickstart",
  slug: "cli-quickstart",            // filename-safe basename for all outputs
  width: 1280, height: 720, fontSize: 22,
  theme: "Catppuccin Mocha", typingSpeed: "60ms",
  prebuild: ["cargo build --release --manifest-path sdk/Cargo.toml --bin design-data"],
  setup: ['export PATH="$PWD/sdk/target/release:$PATH"', "clear"], // hidden per beat
  beats: [
    {
      id: "component",                // stable slug → <slug>-component.mp4/.wav
      narration: "One sentence spoken over this beat.",
      tape: `Type "design-data component button --components-dir packages/design-data/components"
Enter
Wait
Sleep 3s`,
    },
  ],
};
```

Authoring guidance:

* **Source the script.** For the CLI use [`tools/demo/scenarios.md`](../../../tools/demo/scenarios.md)
  (commands + "Say:" lines). For the TUI use [`sdk/tui/DEMO.md`](../../../sdk/tui/DEMO.md)
  (keystroke tables → VHS `Type`/`Enter`/`Tab`/arrow commands; `:` opens the palette).
* **One idea per beat.** Keep narration to \~1–2 sentences; the build pads the clip to fit.
* **Keep the punchline on screen.** If a command floods the terminal (e.g. `validate`
  prints the whole corpus), filter it so the key line stays visible:
  `... 2>&1 | grep -A1 SPEC-001`.
* **Pacing (VHS 3-2-1 rule).** End each beat's actions with `Wait` then `Sleep` (≈3s after
  a key result, 2s between actions). `Type@30ms "..."` overrides typing speed inline.
* **Setup stays hidden.** Put build/PATH/`clear` in `prebuild` (run once, outside VHS) and
  `setup` (run in a hidden block at the start of every beat).

## 2. Render the silent assets

```bash
node tools/demo/videos/render.mjs [tools/demo/videos/<slug>.demo.mjs]
#  --beat <id>     render only one beat (repeatable)   --no-prebuild   skip cargo build
#  --no-full       skip the GIF/WebM doc render
```

Produces `out/<slug>-<beat>.mp4` (per beat) and `out/<slug>.gif` + `out/<slug>.webm`.
Verify a frame before recording: `ffmpeg -sseof -1 -i out/<slug>-<beat>.mp4 -frames:v 1 /tmp/f.png`.

## 3. Record the voiceover (the user, not TTS)

This step is interactive and belongs to the user. Tell them to run:

```bash
node tools/demo/videos/record.mjs [<manifest>]   # teleprompter; Enter to start/stop a beat
#  --list-devices   list mic inputs        --device <idx>   choose input
#  --beat <id> --force   re-record one beat
```

For pipeline testing only (do NOT ship as the user's voice), you may synthesize placeholder
audio: `node tools/demo/videos/record.mjs --say`. The user can also hand-drop their own
`out/<slug>-<beat>.wav` files instead of using the recorder.

## 4. Build the narrated video

```bash
node tools/demo/videos/build.mjs [<manifest>]
#  --tail <seconds>   silence held after each beat (default 0.5)
#  --burn             also emit <slug>.captioned.mp4 with burned-in subtitles
```

Outputs `out/<slug>.narrated.mp4` plus `out/<slug>.srt` and `out/<slug>.vtt`. To re-record
one beat: rerun `record.mjs --beat <id> --force`, then `build.mjs` again.

## Moon tasks

`moon run demo:videos-render`, `demo:videos-record`, `demo:videos-build` wrap the scripts
(see [`tools/demo/moon.yml`](../../../tools/demo/moon.yml)). Pass a manifest with `-- <path>`.

## Conventions

* New `.mjs` files need the Adobe Apache-2.0 header with the **current year** (see existing
  files in `tools/demo/videos/`).
* Outputs in `tools/demo/videos/out/` are gitignored (re-buildable). Commit only curated,
  published assets, and only if explicitly asked.
* This is the video workflow; the asciinema notes in `sdk/tui/DEMO.md` predate it. VHS is
  preferred here because it outputs MP4 directly for muxing.

## Gotchas

* VHS can fail with `could not open ttyd … ERR_CONNECTION_REFUSED` on a cold start right
  after a long build — `render.mjs` already retries; just re-run if it slips through.
* Keep audio as PCM until mux; `padAudioTo` writes `pcm_s16le` wav, and `mux` encodes AAC.
* Output paths in VHS `Output` are relative to the working directory (repo root here).

***

# Live presentation deck (asciinema casts + Slidev)

When the goal is a **live demo while screen-sharing** (not a pre-narrated MP4), use the
Slidev deck under [`tools/demo/presentation/`](../../../tools/demo/presentation) instead
of the VHS pipeline. The presenter narrates each beat in person; the embedded terminal
**pauses at every beat marker** and resumes on click.

## Core idea — markers drive the pauses

asciinema records the full TUI (alternate screen) losslessly into a tiny text `.cast`.
Drop a **marker** at each beat boundary while recording (`Ctrl+\`, or `Ctrl+i` on older
builds). [`slidev-addon-asciinema`](https://github.com/murilo-cunha/slidev-addon-asciinema)
embeds a cast as `<Asciinema src="casts/x.cast" :playerProps="{ pauseOnMarkers: true }"/>`;
`pauseOnMarkers` makes the player stop at each marker so the presenter talks, then resumes.

```
record-casts.sh A/B/C/D ─▶ public/casts/*.cast ─▶ slides.md (Asciinema, pauseOnMarkers)
                                                 └─▶ pnpm dev (present) / pnpm build (static)
```

## Prerequisites

* `asciinema` (`brew install asciinema`); optional `agg` (`brew install agg`) to preview a
  cast as GIF. Pre-build the CLI so compile time never leaks into a recording.
* The deck is a **standalone** project (deliberately not in the pnpm workspace, to keep the
  root lockfile clean): `pnpm install --ignore-workspace --dir tools/demo/presentation` once
  (the `--ignore-workspace` flag is required — otherwise pnpm resolves to the monorepo root).

## 1. Record the casts (the user drives the terminal live)

This is interactive and belongs to the user. Tell them to run, dropping a marker at each
beat boundary (see [`presentation/RECORDING.md`](../../../tools/demo/presentation/RECORDING.md)
for the per-beat keystroke cheat-sheet and the clean-env checklist):

```bash
tools/demo/presentation/record-casts.sh A   # find & inspect (TUI)  → public/casts/A-find.cast
tools/demo/presentation/record-casts.sh B   # name a new token (TUI) → public/casts/B-name.cast
tools/demo/presentation/record-casts.sh C   # deterministic suggest (CLI) → public/casts/C-suggest.cast
```

Committed `*.cast` files are placeholders so the deck renders out of the box — re-record to
replace them. If recording markers live is awkward, record straight through and post-edit
the `.cast` to insert `[t, "m", "label"]` lines, or pass `markers` timestamps in `playerProps`.

## 2. Record the agent cast (Claude Code + design-data MCP)

The agent beat (Demo D) is now an asciinema cast like A/B/C — all four movements are
terminal recordings:

```bash
tools/demo/presentation/record-casts.sh D   # → public/casts/D-agent.cast
```

Before recording: add the `design-data` MCP server to `.mcp.json`, pre-warm with
`npx -y @adobe/design-data-agent-mcp --help`, then launch Claude Code once to approve the
connection. See [`presentation/RECORDING.md`](../../../tools/demo/presentation/RECORDING.md)
(Demo D section) for the full checklist, D1–D4 beat table, and non-determinism guidance.
The verbatim prompt is in [`tools/demo/agent-questions.md`](../../../tools/demo/agent-questions.md).

`.mcp.json` config to add:

```json
"design-data": {
  "command": "npx",
  "args": ["-y", "@adobe/design-data-agent-mcp"],
  "env": {
    "DESIGN_DATA_BIN": "${PWD}/sdk/target/release/design-data",
    "DESIGN_DATA_PATH": "packages/design-data/tokens",
    "DESIGN_DATA_COMPONENTS": "packages/design-data/components"
  }
}
```

## 3. Author / edit the deck and present

Edit [`slides.md`](../../../tools/demo/presentation/slides.md): one section per demo
(find → name → AI), each beat slide embeds a cast with `pauseOnMarkers: true` and pins
`cols: 120, rows: 36`; narration goes in `<!-- ... -->` presenter notes.

```bash
moon run demo:present          # live dev server — screen-share and narrate
moon run demo:present-build    # static export to presentation/dist/
```

## Presentation gotchas

* `pauseOnMarkers` needs markers actually present in the cast — verify with playback.
* Slidev PDF/PPTX export bakes video as a poster frame; present from the live dev server or
  the static build, not a PDF.
* Be honest on screen: `query`/`resolve`/`describe`/`validate` and `suggest` are
  **deterministic** (Jaccard ranking), not a model. The agent in the recorded video is the
  only model layer. `sdk/cli/README.md` overstates `suggest` as "AI" — don't repeat that.
* The TUI `/` fuzzy-find palette is not wired up yet — drive search with `:query` / `:find`.
