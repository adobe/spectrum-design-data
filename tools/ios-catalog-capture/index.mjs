// Copyright 2026 Adobe. All rights reserved.
// Licensed under the Apache License, Version 2.0.

// Builds states.json (component -> variant -> state -> light/dark file) from a capture directory.
// usage: node index.mjs <shotsDir> > states.json
import { readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.argv[2];
const index = {};
for (const comp of readdirSync(root)) {
  for (const variant of readdirSync(join(root, comp))) {
    const states = {};
    for (const f of readdirSync(join(root, comp, variant)).sort()) {
      const m = f.match(/^(.+)\.(light|dark)\.png$/);
      if (m) (states[m[1]] ??= {})[m[2]] = `${comp}/${variant}/${f}`;
    }
    (index[comp] ??= {})[variant] = states;
  }
}
console.log(JSON.stringify(index, null, 2));
