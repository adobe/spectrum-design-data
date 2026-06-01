# Demo Materials

Self-contained demo assets. Print `scenarios.md`, keep it next to the laptop, copy-paste from `demo-commands.sh`.

| File                               | Purpose                                                                                                                                                                                                             |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scenarios.md`                     | The narration. Both demo flows with the exact commands and what to say at each step.                                                                                                                                |
| `demo-commands.sh`                 | Copy-paste cheat sheet. Each command preceded by what to say. Not auto-executable — run commands one at a time so the audience can read the output.                                                                 |
| `verify-demo.sh`                   | Auto-runnable preflight check. Builds the CLI, then exercises every shell command in the demo and asserts expected output. Run via `moon run demo:verify` before walking into the room.                             |
| `clean-component-example.json`     | A minimal valid component declaration. Used to show the spec contract at its smallest: identity, anatomy, states (with accessibility-aware fields), top-level accessibility role + WCAG citations, document blocks. |
| `broken-token-example.tokens.json` | A token file with a dangling alias `$ref` — triggers SPEC-001 (`alias-target-exists`). Used for the "validator catches mistakes live" moment.                                                                       |
| `agent-questions.md`               | The prepared Claude Code question, exact wording, expected answer shape.                                                                                                                                            |

Originally prepared for the May 15 2026 design director review; retained as general demo assets.

## Verifying before a demo

Run from the repo root:

```bash
moon run demo:verify
```

This builds the CLI in release mode and runs every automatable demo command (A2, A3, B2, B3, and the full-dataset bonus check). Manual steps — the S2 visualizer (A1), the Claude Code agent question (A4), and opening `clean-component-example.json` (B1) — are out of scope for the script; see `scenarios.md` for those.

## Narrated demo videos (`videos/`)

`videos/` is a small pipeline that turns a demo manifest into a **narrated MP4** (your
voiceover synced to the terminal) plus **silent GIF/WebM** assets for docs. It uses
[VHS](https://github.com/charmbracelet/vhs) to record the terminal and `ffmpeg` to sync
and stitch. Output lands in `videos/out/` (gitignored).

### How it works

A *manifest* (e.g. `videos/cli-quickstart.demo.mjs`) describes the demo as ordered
**beats**. Each beat pairs VHS tape actions (what happens on screen) with one line of
narration (what you say). Because recorded narration timing varies, the beat is the unit
of sync: each beat is rendered as its own silent clip, recorded as its own audio clip,
then the video's last frame is frozen to match the audio length. This guarantees the
video never outpaces your voice, and any single beat can be re-recorded on its own.

```
manifest ─▶ render.mjs ─▶ silent beat clips + full GIF/WebM
manifest ─▶ record.mjs ─▶ one .wav per beat (teleprompter + mic)
            build.mjs  ─▶ pad video to audio, mux, concat ─▶ <slug>.narrated.mp4 + .srt/.vtt
```

### Prerequisites

```bash
brew install vhs        # ffmpeg/ffprobe are also required (brew install ffmpeg)
```

### Three-step workflow

```bash
# 1. Render silent terminal clips + doc GIF/WebM (runs the manifest's prebuild, e.g. cargo build)
moon run demo:videos-render
#    or, for another manifest:
node tools/demo/videos/render.mjs tools/demo/videos/<name>.demo.mjs

# 2. Record your voiceover, one beat at a time (teleprompter shows each line)
node tools/demo/videos/record.mjs            # mic; --list-devices to pick an input
#    quick test without a mic (macOS synthesized voice — NOT your voice):
node tools/demo/videos/record.mjs --say

# 3. Sync audio to video and assemble the narrated MP4 + captions
moon run demo:videos-build
node tools/demo/videos/build.mjs --burn      # also burns captions into the video
```

Re-record a single beat: `node tools/demo/videos/record.mjs --beat <id> --force`, then
re-run `build.mjs`. You can also skip `record.mjs` entirely and drop your own
`out/<slug>-<beat>.wav` files in place.

### Outputs (in `videos/out/`)

| File                       | Purpose                                          |
| -------------------------- | ------------------------------------------------ |
| `<slug>.narrated.mp4`      | Final narrated video (voiceover synced to video) |
| `<slug>.gif`/`.webm`       | Silent full-tape assets for README/docs          |
| `<slug>.srt`/`.vtt`        | Caption tracks (sidecar; `--burn` to burn in)    |
| `<slug>-<beat>.mp4`/`.wav` | Per-beat intermediates (re-buildable)            |

See `videos/cli-quickstart.demo.mjs` for an annotated manifest and `videos/lib/tape.mjs`
for the full manifest schema.

## Live presentation deck (`presentation/`)

`presentation/` is a [Slidev](https://sli.dev) deck for presenting the demos **live
while screen-sharing**. Unlike `videos/` (silent doc GIFs + narrated MP4s), the deck
embeds interactive [asciinema](https://asciinema.org) casts that **auto-pause at every
beat marker** — you narrate each beat in person, then resume. All four movements are
terminal casts, including the agent beat (Claude Code + design-data MCP).

```
record-casts.sh A/B/C/D ─▶ public/casts/*.cast ─▶ slides.md (Asciinema, pauseOnMarkers)
                                                  └─▶ pnpm dev (present) / pnpm build (static)
```

It is a **standalone** project (intentionally not in the pnpm workspace, to keep the
root lockfile clean). Install its dependencies once with `--ignore-workspace` so it gets
its own isolated `node_modules`/lockfile:

```bash
pnpm install --ignore-workspace --dir tools/demo/presentation
```

### Workflow

```bash
# 1. Record the four terminal casts (drops a marker per beat). See RECORDING.md.
tools/demo/presentation/record-casts.sh A   # find & inspect (TUI)
tools/demo/presentation/record-casts.sh B   # name a new token (TUI)
tools/demo/presentation/record-casts.sh C   # deterministic suggest companion (CLI)
tools/demo/presentation/record-casts.sh D   # agent workflow (Claude Code + design-data MCP)

# 2. Present (screen-share the dev server) or build a static deck.
moon run demo:present          # live dev server, narrate each beat
moon run demo:present-build    # static export to presentation/dist/
```

The committed `*.cast` files are **placeholders** so the deck renders out of the box;
re-record them with `record-casts.sh` to capture the real sessions. Full operator
cheat-sheet: [`presentation/RECORDING.md`](presentation/RECORDING.md).
