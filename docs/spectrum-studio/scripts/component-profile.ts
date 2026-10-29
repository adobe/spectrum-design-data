// Copyright 2026 Adobe. All rights reserved.
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const input = process.argv[2];
if (!input)
  throw new Error("Pass the verified component CTR handoff artifact path.");
const bytes = readFileSync(input);
const hash = createHash("sha256").update(bytes).digest("hex");
if (hash !== "d135d8b44818bfca5e9d298d243642a975a727000792a70e80b2a430bf663d53")
  throw new Error("The reference handoff does not match its reviewed hash.");
const bundle = JSON.parse(bytes.toString("utf8"));
const target = resolve("src/data/design-data-component-profile");
mkdirSync(target, { recursive: true });
writeFileSync(
  resolve(target, "bundle.json"),
  `${JSON.stringify(bundle, null, 2)}\n`,
);
console.log(
  "Installed the pinned offline component profile without changing the reference repository.",
);
