#!/usr/bin/env bash
# Copyright 2026 Adobe. All rights reserved.
# This file is licensed to you under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License. You may obtain a copy
# of the License at http://www.apache.org/licenses/LICENSE-2.0
#
# Claude Code Stop hook for Demo D recording.
#
# Called by Claude Code after it finishes responding to the turn.
# Touches ${DEMO_BEATS_DIR}/done — the beat manifest polls for this file
# instead of using wait_quiet (which exits early under asciinema buffering).
#
# Also records the Stop epoch in beats.log so D4 has a precise time anchor.
#
# DEMO_BEATS_DIR is exported by auto-demo.sh before launching claude.
# Falls back to /tmp/demo-d if unset.
#
# Exit 0 with no stdout: no effect on Claude's behavior (pure side-effect).

BEATS_DIR="${DEMO_BEATS_DIR:-/tmp/demo-d}"
mkdir -p "$BEATS_DIR"

# Drain stdin (Claude Code sends the Stop payload; we don't need its contents).
cat > /dev/null

# Record Stop epoch in beats.log.
BEATS_LOG="$BEATS_DIR/beats.log" python3 -c '
import os, time
beats_log = os.environ.get("BEATS_LOG", "/tmp/demo-d/beats.log")
epoch = time.time()
with open(beats_log, "a") as f:
    f.write(f"{epoch:.6f}\tSTOP\n")
'

# Touch the done sentinel — the beat manifest's wait_for_file will unblock.
touch "$BEATS_DIR/done"

exit 0
