/*
Copyright 2024 Adobe. All rights reserved.
Prepare tokens dir from @adobe/spectrum-tokens for the viewer.
*/
import { cpSync, mkdirSync, readdirSync, rmSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const tokensDir = join(root, "tokens");
const src = join(root, "node_modules/@adobe/spectrum-tokens/src");
const pkgPath = join(root, "node_modules/@adobe/spectrum-tokens/package.json");

mkdirSync(tokensDir, { recursive: true });
for (const name of readdirSync(tokensDir)) {
  rmSync(join(tokensDir, name), { recursive: true });
}
for (const name of readdirSync(src)) {
  cpSync(join(src, name), join(tokensDir, name), { recursive: true });
}
cpSync(pkgPath, join(tokensDir, "package.json"));
