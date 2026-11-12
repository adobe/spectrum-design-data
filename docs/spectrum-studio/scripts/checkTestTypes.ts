// Copyright 2026 Adobe. All rights reserved.
import { resolve } from "node:path";
import ts from "typescript";
import { studioRoot } from "./checkInventory";

const args = process.argv.slice(2);
const focused = args[0] === "--focused";
const files = focused ? args.slice(1) : args;
if (!files.length || files.length > 16)
  throw new Error(
    "Provide between one and sixteen test files per type-check process.",
  );
for (const file of files)
  if (
    !(
      focused
        ? /^(?:scripts|src|tests)\/(?!.*(?:^|\/)\.\.\/)[a-zA-Z0-9_./-]+\.(?:ts|tsx)$/
        : /^tests\/[^/]+\.(?:ts|tsx)$/
    ).test(file)
  )
    throw new Error(`Not a supported check input: ${file}`);
const config = ts.readConfigFile(
  resolve(studioRoot, "tsconfig.app.json"),
  ts.sys.readFile,
);
if (config.error)
  throw new Error(
    ts.flattenDiagnosticMessageText(config.error.messageText, "\n"),
  );
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, studioRoot);
const program = ts.createProgram(
  [
    ...files.map((file) => resolve(studioRoot, file)),
    ...parsed.fileNames.filter((file) => file.endsWith(".d.ts")),
  ],
  {
    ...parsed.options,
    noEmit: true,
    incremental: false,
    tsBuildInfoFile: undefined,
  },
);
const diagnostics = [...parsed.errors, ...ts.getPreEmitDiagnostics(program)];
console.log(
  ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: (file) => file,
    getCurrentDirectory: () => studioRoot,
    getNewLine: () => "\n",
  }),
);
console.log(
  `${files.length} selected roots and their imports: ${diagnostics.length} type diagnostics. This is not a whole-app type check.`,
);
process.exitCode = diagnostics.length ? 1 : 0;
