# Copyright 2026 Adobe. All rights reserved.
import json
d = json.load(open('clean-metrics.json'))
out = {w: {"adv": [round(d[w]["adv"][str(c)]) for c in range(32, 127)], "kern": d[w]["kern"]} for w in d}
json.dump(out, open('../../core/src/text_metrics_proto.json', 'w'), separators=(',', ':'))
