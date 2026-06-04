#!/usr/bin/env bash
# Copyright 2026 Adobe. All rights reserved.
# This file is licensed to you under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License. You may obtain a copy
# of the License at http://www.apache.org/licenses/LICENSE-2.0
#
# Claude Code PostToolUse / PostToolUseFailure hook for Demo D recording.
#
# Called by Claude Code with the hook event JSON on stdin.
# Appends one TSV line to ${DEMO_BEATS_DIR}/beats.log:
#   <epoch_seconds_float>\t<tool_name>[\tFAILURE]
#
# DEMO_BEATS_DIR is exported by auto-demo.sh before launching claude.
# Falls back to /tmp/demo-d if unset.
#
# Exit 0 with no stdout: no effect on Claude's behavior (pure side-effect).

BEATS_DIR="${DEMO_BEATS_DIR:-/tmp/demo-d}"
mkdir -p "$BEATS_DIR"
BEATS_LOG="$BEATS_DIR/beats.log"

FAILURE_FLAG=""
if [[ "${1:-}" == "--failure" ]]; then
  FAILURE_FLAG="FAILURE"
fi

# Read the hook JSON payload from stdin into a variable BEFORE invoking python3.
# If we used a heredoc (python3 - <<'PYEOF'), the heredoc replaces stdin and
# json.load(sys.stdin) would see EOF.  Passing via env var avoids this.
HOOK_JSON="$(cat)"

HOOK_JSON="$HOOK_JSON" BEATS_LOG="$BEATS_LOG" FAILURE_FLAG="$FAILURE_FLAG" \
  python3 -c '
import os, json, time

hook_json   = os.environ.get("HOOK_JSON", "")
beats_log   = os.environ.get("BEATS_LOG", "/tmp/demo-d/beats.log")
failure_tag = os.environ.get("FAILURE_FLAG", "")

try:
    payload = json.loads(hook_json)
    tool_name = payload.get("tool_name", "unknown")
except Exception:
    tool_name = "unknown"

epoch = time.time()
suffix = f"\t{failure_tag}" if failure_tag else ""

with open(beats_log, "a") as f:
    f.write(f"{epoch:.6f}\t{tool_name}{suffix}\n")
'

exit 0
