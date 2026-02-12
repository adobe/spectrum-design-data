/*
Copyright 2024 Adobe. All rights reserved.
Copy generated markdown from docs/markdown into src for 11ty.
*/
import { readdirSync, copyFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const src = join(root, "../../markdown");
const dest = join(root, "src");

for (const dir of ["components", "tokens", "registry"]) {
  const from = join(src, dir);
  const to = join(dest, dir);
  if (!existsSync(from)) continue;
  for (const f of readdirSync(from)) {
    if (f.endsWith(".md")) {
      copyFileSync(join(from, f), join(to, f));
    }
  }
}
