// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { build } from "vite";

const root = fileURLToPath(new URL("../", import.meta.url));
const paths = [
  "features/edit-session/recordPreparation.worker.ts",
  "features/edit-session/referenceWitness.worker.ts",
  "features/design-data/tshirt.worker.ts",
];
const input = "virtual:studio-authoring-worker-check";
const result = await build({
  root,
  configFile: false,
  publicDir: false,
  logLevel: "warn",
  plugins: [
    {
      name: "studio-authoring-worker-check",
      resolveId(id) {
        if (id === input) return `\0${input}`;
      },
      load(id) {
        if (id === `\0${input}`)
          return `export const createWorkers = () => [${paths
            .map(
              (path) =>
                `new Worker(new URL('/src/${path}', import.meta.url), { type: 'module' })`,
            )
            .join(",")}];`;
      },
    },
  ],
  build: {
    write: false,
    sourcemap: true,
    rolldownOptions: { input },
  },
});
const outputs = Array.isArray(result) ? result : [result];
const files = outputs.flatMap((output) => {
  assert("output" in output);
  return output.output;
});
for (const path of paths) {
  const name = path.split("/").at(-1).replace(/\.ts$/, "");
  const file = files.find(
    (output) =>
      output.fileName.includes(name) && output.fileName.endsWith(".js"),
  );
  assert(file, `${path}: worker entry must be emitted.`);
  const code =
    file.type === "chunk"
      ? file.code
      : typeof file.source === "string"
        ? file.source
        : new TextDecoder().decode(file.source);
  assert(code.includes("onmessage"), `${path}: message handler is bundled.`);
  assert(code.includes("postMessage"), `${path}: replies are bundled.`);
  assert(
    /\btype\s*:\s*(["'`])ready\1/.test(code),
    `${path}: ready replies remain.`,
  );
  assert(
    /\btype\s*:\s*(["'`])error\1/.test(code),
    `${path}: error replies remain.`,
  );
}
console.log("Authoring workers: all three production entry points bundle.");
