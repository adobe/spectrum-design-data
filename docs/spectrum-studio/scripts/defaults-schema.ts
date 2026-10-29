// Copyright 2026 Adobe. All rights reserved.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import ts from "typescript";
import { generateSchema, getProgramFromFiles } from "typescript-json-schema";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const configPath = resolve(root, "tsconfig.app.json");
const config = ts.readConfigFile(configPath, ts.sys.readFile);
if (config.error)
  throw new Error(
    ts.flattenDiagnosticMessageText(config.error.messageText, "\n"),
  );
const program = getProgramFromFiles(
  [resolve(root, "src/features/design-data/model.ts")],
  config.config.compilerOptions,
  root,
);
const schema = generateSchema(program, "CanonicalAuthoringDataset", {
  required: true,
  noExtraProps: true,
  strictNullChecks: true,
});
if (!schema)
  throw new Error("Could not generate the authoring dataset schema.");
const output = `${JSON.stringify(schema, null, 2)}\n`;
const schemaPath = resolve(root, "src/data/design-system.schema.json");

if (process.argv.includes("--check")) {
  if (readFileSync(schemaPath, "utf8") !== output) {
    throw new Error(
      "Authoring dataset schema is stale. Run pnpm schema:defaults.",
    );
  }
  console.log("Authoring dataset schema matches the TypeScript contract.");
} else {
  writeFileSync(schemaPath, output);
  console.log("Generated the authoring dataset schema.");
}
