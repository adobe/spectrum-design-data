// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = fileURLToPath(new URL("../src/", import.meta.url));
const hub = resolve(root, "features/edit-session/state.ts");

function resolveImport(from: string, specifier: string) {
  if (!specifier.startsWith(".")) return undefined;
  const base = resolve(dirname(from), specifier.split("?")[0]);
  return [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find(
    (path) => /\.[a-z]+$/.test(path) && existsSync(path),
  );
}

function valueImports(file: string) {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
  );
  const specifiers: string[] = [];
  const visit = (node: ts.Node) => {
    if (
      ts.isImportDeclaration(node) &&
      !node.importClause?.isTypeOnly &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      specifiers.push(node.moduleSpecifier.text);
    } else if (
      ts.isExportDeclaration(node) &&
      !node.isTypeOnly &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      specifiers.push(node.moduleSpecifier.text);
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      specifiers.push(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return specifiers;
}

// Follows runtime imports without entering the hub, and lists every module
// that would pull the hub into the worker.
function moduleGraph(entry: string, blocked?: string) {
  const seen = new Set([entry]);
  const hubImporters = new Set<string>();
  const queue = [entry];
  for (const file of queue) {
    if (!/\.tsx?$/.test(file)) continue;
    for (const specifier of valueImports(file)) {
      const target = resolveImport(file, specifier);
      if (!target) continue;
      if (target === blocked) {
        hubImporters.add(relative(root, file));
        continue;
      }
      if (seen.has(target)) continue;
      seen.add(target);
      queue.push(target);
    }
  }
  return { size: seen.size, hubImporters: [...hubImporters].sort() };
}

const workers = readdirSync(root, { recursive: true })
  .map(String)
  .filter((path) => path.endsWith(".worker.ts"))
  .sort();
for (const worker of workers) {
  const entry = resolve(root, worker);
  const all = moduleGraph(entry);
  const { size, hubImporters } = moduleGraph(entry, hub);
  console.log(
    `${worker}: ${all.size} modules; without hub ${size}; hub importers:`,
    hubImporters,
  );
}
assert(workers.length > 0);
