// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0

// Fails on British spellings. Only listed forms are flagged, so `cancelled`,
// `grey-300` token ids, `minimist` and ARIA `labelledby` pass. Generated release
// history (packages/design-data/changelog/*.json) is skipped: it quotes old before/after text verbatim.
// Usage: node scripts/check-us-spelling.mjs [files...]
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const BRITISH = new RegExp(
  "\\b\\w*(?:behaviour|colour|centre|centred|centring|neighbour|honour|artefact|licence|labelled(?!by)|labelling" +
    "|(?:initial|normal|serial|recogn|general|stabil|organ|material|custom|optim|summar|util|visual|categor|priorit|local|capital|standard|author|final)is(?:e|ed|es|ing|ation|ations|able))\\w*\\b",
  "i",
);
const SKIP = /(^|\/)(packages\/design-data\/changelog\/[^/]+\.json|pnpm-lock\.yaml|Cargo\.lock|CHANGELOG\.md|node_modules\/|scripts\/check-us-spelling\.mjs$)/;

const files = (
  process.argv.length > 2
    ? process.argv.slice(2)
    : execFileSync("git", ["ls-files"], { encoding: "utf8", maxBuffer: 1 << 28 }).split("\n")
).filter((f) => f && !SKIP.test(f));

let bad = 0;
for (const file of files) {
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  if (text.includes("\0")) continue;
  text.split("\n").forEach((line, i) => {
    const m = line.match(BRITISH);
    if (m) {
      bad++;
      console.error(`${file}:${i + 1}: British spelling "${m[0]}"`);
    }
  });
}
if (bad) {
  console.error(`\n${bad} British spelling(s) found. Use US English (color, behavior, center, license, ...).`);
  process.exit(1);
}
