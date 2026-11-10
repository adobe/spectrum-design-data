// Copyright 2026 Adobe. All rights reserved.
import { resolve } from "node:path";
import ts from "typescript";
import { studioRoot } from "./checkInventory";

const files = process.argv.slice(2);
if (!files.length || files.length > 16)
  throw new Error(
    "Provide between one and sixteen test files per type-check process.",
  );
for (const file of files)
  if (!/^tests\/[^/]+\.(?:ts|tsx)$/.test(file))
    throw new Error(`Not a top-level non-browser test: ${file}`);
const config = ts.readConfigFile(
  resolve(studioRoot, "tsconfig.app.json"),
  ts.sys.readFile,
);
if (config.error)
  throw new Error(
    ts.flattenDiagnosticMessageText(config.error.messageText, "\n"),
  );
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, studioRoot);
const toolingConfig = ts.readConfigFile(
  resolve(studioRoot, "tsconfig.node.json"),
  ts.sys.readFile,
);
if (toolingConfig.error)
  throw new Error(
    ts.flattenDiagnosticMessageText(toolingConfig.error.messageText, "\n"),
  );
const tooling = ts.parseJsonConfigFileContent(
  toolingConfig.config,
  ts.sys,
  studioRoot,
);
const program = ts.createProgram(
  [
    ...files.map((file) => resolve(studioRoot, file)),
    ...tooling.fileNames,
    ...parsed.fileNames.filter((file) => file.endsWith(".d.ts")),
  ],
  {
    ...parsed.options,
    noEmit: true,
    incremental: false,
    tsBuildInfoFile: undefined,
  },
);
const diagnostics = [
  ...parsed.errors,
  ...tooling.errors,
  ...ts.getPreEmitDiagnostics(program),
];
console.log(
  ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: (file) => file,
    getCurrentDirectory: () => studioRoot,
    getNewLine: () => "\n",
  }),
);
console.log(
  `${files.length} non-browser tests: ${diagnostics.length} type diagnostics.`,
);
process.exitCode = diagnostics.length ? 1 : 0;
