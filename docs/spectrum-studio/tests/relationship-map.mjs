// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  assertFresh, graphForFiles, inventory, moduleCycles, prepareOutput, queryGraph, verifyGraph,
} from "../scripts/relationshipMap.mjs";

const root = mkdtempSync(join(tmpdir(), "studio-relationship-map-"));
function file(path, text) {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), typeof text === "string" ? text : JSON.stringify(text));
}
try {
  file("studio/tsconfig.json", { compilerOptions: { moduleResolution: "bundler", module: "ESNext", baseUrl: ".", paths: { "@/*": ["src/*"] } } });
  file("studio/src/first/model.ts", "export interface Model { value: number }\nexport const first = 1;");
  file("studio/src/second/model.ts", "export const second = 2;");
  file("studio/src/a.ts", "import { b } from './b';\nexport const a = b;");
  file("studio/src/b.ts", "import { a } from './a';\nexport const b = () => a;");
  file("studio/src/types.ts", "import type { Model } from './first/model';");
  file("studio/src/alias.ts", "import { first, type Model } from '@/first/model';");
  file("studio/src/types-query.ts", "export type M = import('./first/model').Model;");
  file("studio/src/reexport.ts", "export { type Model, first } from './first/model';");
  file("studio/src/component.tsx", "export const Component = () => <div />;");
  file("studio/src/broken.ts", "export function broken( {");
  file("studio/src/dynamic.ts", "export const load = () => import('./first/model');\nexport const unknown = (path: string) => import(path);");
  file("studio/src/worker.ts", "const worker = new Worker(new URL('./component.tsx', import.meta.url));");
  file("studio/src/missing.ts", "import './absent';\nimport path from 'node:path';");
  file("studio/src/type-a.ts", "import type { B } from './type-b'; export interface A { b: B }");
  file("studio/src/type-b.ts", "import type { A } from './type-a'; export interface B { a: A }");
  file("studio/src/tokens/state.ts", "export const state = 1;");
  file("studio/node_modules/ignored.js", "throw Error('must not read');");
  file("studio/.env.local", "SHOULD_NOT_APPEAR");
  symlinkSync(join(root, "studio/src/first/model.ts"), join(root, "studio/symlink.ts"));
  const first = "11111111-1111-4111-8111-111111111111";
  const alias = "22222222-2222-4222-8222-222222222222";
  file("packages/design-data/tokens/tokens.json", [
    { uuid: first, conceptId: first, name: { colorScheme: "light" }, value: 1 },
    { uuid: alias, conceptId: alias, $ref: first, $schema: "https://example.test/token.json" },
  ]);
  file("packages/design-data/mode-sets/color.json", { name: "colorScheme", modes: ["light"] });
  file("packages/design-data/components/button.json", { name: "button" });
  file("packages/design-data/relationships/button.json", [{ uuid: "33333333-3333-4333-8333-333333333333", scope: { component: "button" }, $ref: first }]);
  file("packages/design-data/package.json", { name: "@test/data" });
  file("packages/design-data-spec/token.json", { $id: "https://example.test/token.json", $defs: { token: { type: "object" } }, $ref: "#/$defs/token" });
  file("packages/design-data-spec/bad-ref.json", { $ref: "./token.json#/$defs/missing" });
  file("studio/package.json", { name: "@test/studio", dependencies: { "@test/data": "workspace:*" }, exports: { ".": "./src/a.ts", "./missing": "./src/missing-export.js" } });
  const selected = ["studio", "packages/design-data", "packages/design-data-spec"];
  const before = inventory(root, selected);
  const { graph, modules, data } = graphForFiles(root, before.files);
  assert.ok(graph.nodes.has("file:studio/src/first/model.ts"));
  assert.ok(graph.nodes.has("file:studio/src/second/model.ts"));
  assert.ok(graph.nodes.has("file:studio/src/tokens/state.ts"));
  assert.ok(!before.files.some((entry) => /node_modules|\.env|symlink/.test(entry.path)));
  assert.equal(modules.parseFailures, 1);
  assert.ok(!graph.diagnostics.some((entry) => entry.file === "studio/src/component.tsx"));
  const aliasEdges = graph.edges.filter((edge) => edge.source === "file:studio/src/alias.ts");
  assert.deepEqual(aliasEdges.map((edge) => edge.phase), ["value", "type"]);
  assert.ok(aliasEdges.every((edge) => edge.target === "file:studio/src/first/model.ts" && edge.status === "resolved"));
  assert.equal(graph.edges.find((edge) => edge.source === "file:studio/src/types-query.ts").phase, "type");
  assert.deepEqual(graph.edges.filter((edge) => edge.source === "file:studio/src/reexport.ts").map((edge) => edge.phase), ["value", "type"]);
  assert.equal(modules.nonliteral, 1);
  assert.equal(graph.edges.find((edge) => edge.kind === "url_asset").target, "file:studio/src/component.tsx");
  assert.equal(graph.edges.find((edge) => edge.specifier === "./absent").status, "unresolved");
  assert.equal(graph.edges.find((edge) => edge.specifier === "node:path").status, "external");
  const cycles = moduleCycles(graph);
  assert.equal(cycles.length, 1);
  assert.deepEqual(cycles[0].members, ["file:studio/src/a.ts", "file:studio/src/b.ts"]);
  assert.equal(cycles[0].edges.length, 2);
  assert.equal(data.duplicateIdentities, 0);
  assert.equal(graph.edges.find((edge) => edge.kind === "uuid_reference").target, "record:packages/design-data/tokens/tokens.json#/0");
  assert.equal(graph.edges.find((edge) => edge.kind === "explicit_mode").target, "mode:colorScheme:light");
  assert.equal(graph.edges.find((edge) => edge.kind === "component_scope").target, "file:packages/design-data/components/button.json");
  assert.equal(graph.edges.find((edge) => edge.kind === "package_dependency").target, "file:packages/design-data/package.json");
  assert.ok(graph.edges.some((edge) => edge.kind === "schema_reference" && edge.value === "#/$defs/token" && edge.status === "resolved"));
  assert.equal(graph.edges.find((edge) => edge.value === "./token.json#/$defs/missing").status, "unresolved");
  assert.equal(graph.edges.find((edge) => edge.kind === "package_export" && edge.value === "./src/missing-export.js").status, "unresolved");
  for (const edge of graph.edges) {
    assert.ok(graph.nodes.has(edge.source), edge.source);
    assert.ok(graph.nodes.has(edge.target), edge.target);
  }
  const exported = { nodes: [...graph.nodes.values()], edges: graph.edges };
  assert.equal(verifyGraph(root, before, exported, selected).inventoriedFiles, before.files.length);
  const dependencies = queryGraph(exported, { node: "studio/src/a.ts", kinds: ["import"], phase: "value", depth: 2 });
  assert.equal(dependencies.edges.length, 2);
  assert.equal(dependencies.truncated, false);
  const dependents = queryGraph(exported, { node: "studio/src/first/model.ts", direction: "dependents" });
  assert.ok(dependents.edges.some((edge) => edge.source === "file:studio/src/alias.ts"));
  assert.equal(queryGraph(exported, { node: "studio/src/first/model.ts", direction: "dependents", maxEdges: 1 }).truncated, true);
  assert.throws(() => queryGraph(exported, { node: "missing" }), /Unknown query node/);
  assert.throws(() => queryGraph(exported, { node: "studio/src/a.ts", depth: 0 }), /Query direction/);
  assert.throws(() => verifyGraph(root, before, { nodes: exported.nodes, edges: [...exported.edges, { source: "absent", target: "absent" }] }), /Dangling/);
  assertFresh(root, before, selected);
  file("studio/src/a.ts", "export const changed = 1;");
  assert.throws(() => assertFresh(root, before, selected), /Source changed/);
  file("packages/design-data/tokens/duplicate.json", [{ uuid: first, value: 2 }]);
  const duplicate = graphForFiles(root, inventory(root, selected).files);
  assert.equal(duplicate.data.duplicateIdentities, 1);
  assert.equal(duplicate.graph.edges.find((edge) => edge.kind === "uuid_reference").status, "unresolved");
  assert.throws(() => prepareOutput(root, join(root, "packages/design-data/new-output")), /outside source/);
  assert.equal(existsSync(join(root, "packages/design-data/new-output")), false);
  prepareOutput(root, join(root, "safe-output"));
  const listing = (selection = []) => execFileSync("pnpm", [
    "check:list", ...selection,
  ], { cwd: new URL("..", import.meta.url), encoding: "utf8" });
  assert.ok(!listing().includes('"id": "relationship-map-extract"'));
  assert.ok(listing(["--only", "relationship-map-extract"]).includes('"id": "relationship-map-extract"'));
  console.log("Relationship map: discovery, TS/TSX resolution, direction, types, diagnostics, data references, exports and freshness passed.");
} finally {
  rmSync(root, { recursive: true, force: true });
}
