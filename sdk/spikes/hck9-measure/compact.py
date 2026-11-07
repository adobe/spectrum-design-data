# Copyright 2026 Adobe. All rights reserved.
# Usage: python3 compact.py <metrics.json> <out.json>
# Defaults write the git-ignored Adobe Clean table (from kern.mjs); pass ss3-metrics.json and
# ../../core/src/text_metrics_proto.json to rebuild the committed OFL table.
import json, sys
src = sys.argv[1] if len(sys.argv) > 1 else 'clean-metrics.json'
dst = sys.argv[2] if len(sys.argv) > 2 else '../../core/src/text_metrics_clean.json'
d = json.load(open(src))
out = {w: {"adv": [round(d[w]["adv"][str(c)]) for c in range(32, 127)], "kern": d[w]["kern"]} for w in d}
json.dump(out, open(dst, 'w'), separators=(',', ':'))
