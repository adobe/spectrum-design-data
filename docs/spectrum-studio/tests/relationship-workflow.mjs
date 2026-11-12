// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { graphForFiles, scopes } from "../scripts/relationshipMap.mjs";
import {
  artifactFiles,
  cacheRoot,
  captureInputs,
  compactPacket,
  compareGraphs,
  contextBudget,
  contextPacket,
  generationDirectory,
  inspectCache,
  normalizeFocus,
  prepareGraph,
  publishGeneration,
  runtimeVersions,
} from "../scripts/relationshipWorkflow.mjs";
import { admitTool } from "../scripts/agentAdmission.mjs";

const root = realpathSync(
  mkdtempSync(join(tmpdir(), "studio-relationship-workflow-")),
);
const other = realpathSync(
  mkdtempSync(join(tmpdir(), "studio-relationship-other-")),
);
const digest = (value) => createHash("sha256").update(value).digest("hex");
const provenance = {
  node: process.version,
  typescript: ts.version,
  python: "3.12.12",
  "tree-sitter": "0.26.1",
  "tree-sitter-rust": "0.24.2",
};
const file = (path, value) => {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(
    join(root, path),
    typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`,
  );
};
const a = "docs/spectrum-studio/src/a.ts";
const b = "docs/spectrum-studio/src/b.ts";
function candidate(
  inputs,
  directory = generationDirectory(
    root,
    `${inputs.fingerprint}-${randomUUID()}`,
  ),
) {
  mkdirSync(directory, { recursive: true });
  const extracted = graphForFiles(root, inputs.sources.files);
  const graph = {
    nodes: [...extracted.graph.nodes.values()],
    edges: extracted.graph.edges,
  };
  const summary = {
    sourceHash: digest(JSON.stringify(inputs.sources.files)),
    scopes,
    provenance: inputs.provenance,
    modules: extracted.modules,
    data: extracted.data,
    rust: { parse_errors: 0 },
    relationshipCoverage: { import: { resolved: extracted.modules.imports } },
    limits: ["No complete call graph or runtime-subscription coverage."],
  };
  for (const name of artifactFiles)
    writeFileSync(join(directory, name), "{}\n");
  writeFileSync(
    join(directory, "graph.json"),
    `${JSON.stringify(graph, null, 2)}\n`,
  );
  writeFileSync(
    join(directory, "summary.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
  );
  return { directory, graph, summary };
}
try {
  for (const scope of scopes) mkdirSync(join(root, scope), { recursive: true });
  file("package.json", { private: true });
  file("pnpm-lock.yaml", "lockfileVersion: '9.0'\n");
  file(a, "import { b } from './b'; export const a = b;");
  file(b, "export const b = 1;");
  file("packages/design-data/tokens.json", [
    { uuid: "11111111-1111-4111-8111-111111111111", value: 1 },
    {
      uuid: "22222222-2222-4222-8222-222222222222",
      $ref: "11111111-1111-4111-8111-111111111111",
    },
  ]);
  file("packages/design-data-spec/token.json", { type: "object" });
  file("sdk/core/src/lib.rs", "pub fn example() {}");
  file("tools/design-data/package.json", {
    name: "@test/tools",
    exports: { ".": "./index.js" },
  });
  file("tools/design-data/index.js", "export const example = 1;");
  assert.throws(() => runtimeVersions(root), /runtime missing/);
  assert.throws(() => generationDirectory(root, "../../src"), /Invalid/);
  assert.throws(() => normalizeFocus(root, ["../"]), /outside/);
  assert.deepEqual(normalizeFocus(root, [a]), [a]);
  const inputs = captureInputs(root, provenance);
  assert.equal(inspectCache(root, inputs).state, "missing");
  const initial = candidate(inputs);
  const baseline = publishGeneration(root, inputs, initial.directory);
  assert.equal(inspectCache(root, inputs).state, "fresh");
  let calls = 0;
  assert.equal(
    prepareGraph(root, inputs, () => {
      calls++;
    }).reused,
    true,
  );
  assert.equal(calls, 0, "fresh queries do not extract");

  // Empty commits belong only to this temporary fixture, never the user's checkout.
  const git = (...args) =>
    execFileSync(
      "git",
      [
        "-c",
        `core.hooksPath=${join(root, "no-hooks")}`,
        "-c",
        "commit.gpgsign=false",
        "-c",
        "user.name=Relationship map fixture",
        "-c",
        "user.email=fixture@example.invalid",
        ...args,
      ],
      {
        cwd: root,
        encoding: "utf8",
        env: {
          ...process.env,
          GIT_DIR: join(root, ".git"),
          GIT_WORK_TREE: root,
          GIT_CONFIG_NOSYSTEM: "1",
          GIT_CONFIG_COUNT: "0",
          GIT_CONFIG_GLOBAL: process.platform === "win32" ? "NUL" : "/dev/null",
        },
      },
    );
  git("init", "--quiet");
  git("commit", "--allow-empty", "--quiet", "-m", "fixture baseline");
  const firstCommit = git("rev-parse", "HEAD");
  git("commit", "--allow-empty", "--quiet", "-m", "fixture metadata only");
  assert.notEqual(git("rev-parse", "HEAD"), firstCommit);
  assert.equal(captureInputs(root, provenance).fingerprint, inputs.fingerprint);
  assert.equal(
    prepareGraph(root, captureInputs(root, provenance), () => {
      calls++;
    }).reused,
    true,
  );
  assert.equal(calls, 0);
  const locked = readFileSync(join(root, "pnpm-lock.yaml"), "utf8");
  file("pnpm-lock.yaml", `${locked}# changed resolution\n`);
  assert.equal(
    inspectCache(root, captureInputs(root, provenance)).state,
    "stale",
  );
  file("pnpm-lock.yaml", locked);
  assert.equal(
    inspectCache(
      root,
      captureInputs(root, { ...provenance, typescript: "different" }),
    ).state,
    "stale",
  );
  file("docs/spectrum-studio/src/new.ts", "export const added = true;");
  assert.equal(
    inspectCache(root, captureInputs(root, provenance)).state,
    "stale",
  );
  rmSync(join(root, "docs/spectrum-studio/src/new.ts"));
  assert.equal(
    inspectCache(root, captureInputs(root, provenance)).state,
    "fresh",
  );
  rmSync(join(root, b));
  assert.equal(
    inspectCache(root, captureInputs(root, provenance)).state,
    "stale",
  );
  file(b, "export const b = 1;");

  for (const scope of scopes) {
    const packet = compactPacket(
      contextPacket(initial.graph, initial.summary, [scope]),
    );
    assert.ok(packet.edges && packet.limits.length);
    assert.ok(
      Buffer.byteLength(`${JSON.stringify(packet)}\n`) <= contextBudget,
    );
  }
  assert.throws(
    () => contextPacket(initial.graph, initial.summary, ["absent"]),
    /No mapped nodes/,
  );
  assert.equal(
    compactPacket(
      contextPacket(initial.graph, initial.summary, [
        "packages/design-data/tokens.json",
      ]),
    ).edges[0].kind,
    "uuid_reference",
  );
  const reference = initial.graph.edges.find(
    (edge) => edge.kind === "uuid_reference",
  );
  const schemaFlood = {
    ...initial.graph,
    edges: [
      ...Array.from({ length: 300 }, () => ({
        ...reference,
        kind: "schema_reference",
        target: "file:packages/design-data-spec/token.json",
      })),
      ...initial.graph.edges,
    ],
  };
  const varied = compactPacket(
    contextPacket(
      schemaFlood,
      {
        ...initial.summary,
        limits: Array.from(
          { length: 13 },
          (_, index) => `Known limit ${index}`,
        ),
      },
      ["packages/design-data/tokens.json"],
    ),
  );
  assert.ok(varied.edges.some((edge) => edge.kind === "uuid_reference"));
  assert.ok(varied.edges.some((edge) => edge.kind === "schema_reference"));
  assert.equal(varied.limits.length, 13);
  const changedLines = structuredClone(initial.graph);
  for (const edge of changedLines.edges) edge.evidence.line += 10;
  assert.equal(
    compareGraphs(initial.graph, changedLines, scopes).added.length,
    0,
  );
  const addedType = {
    source: `file:${b}`,
    target: `file:${a}`,
    kind: "import",
    phase: "type",
    status: "resolved",
    evidence: { file: b, line: 1 },
  };
  const typeGraph = {
    ...initial.graph,
    edges: [...initial.graph.edges, addedType],
  };
  assert.equal(compareGraphs(initial.graph, typeGraph, scopes).cyclesAfter, 0);
  const cycleGraph = {
    ...initial.graph,
    edges: [...initial.graph.edges, { ...addedType, phase: "value" }],
  };
  const difference = compareGraphs(initial.graph, cycleGraph, [a]);
  assert.equal(difference.added.length, 1);
  assert.equal(difference.cyclicGroupsWithAddedLinks.length, 1);
  const noisy = {
    ...cycleGraph,
    edges: [
      ...Array.from({ length: 200 }, (_, index) => ({
        ...addedType,
        source: `file:docs/spectrum-studio/tests/story-${index}.ts`,
      })),
      ...cycleGraph.edges,
    ],
  };
  const prioritized = compactPacket(contextPacket(noisy, initial.summary, [a]));
  assert.equal(prioritized.edges[0].phase, "value");
  assert.ok(prioritized.edges.some((edge) => edge.source === `file:${a}`));
  assert.ok(
    prioritized.edges.some(
      (edge) => edge.target === `file:${a}` && edge.phase === "value",
    ),
  );
  assert.equal(
    compareGraphs(cycleGraph, initial.graph, scopes).removed.length,
    1,
  );
  const duplicated = {
    ...initial.graph,
    edges: [...initial.graph.edges, initial.graph.edges[0]],
  };
  assert.equal(
    compareGraphs(initial.graph, duplicated, scopes).added.length,
    1,
  );
  const large = compactPacket({
    edges: Array.from({ length: 300 }, () => ({
      ...addedType,
      specifier: "x".repeat(300),
    })),
    cycles: [
      {
        members: Array(500).fill("a-very-long-module-path"),
        relationshipCount: 500,
      },
    ],
  });
  assert.equal(large.truncated, true);
  assert.equal(large.cycles[0].omittedMembers, 494);
  assert.ok(large.omitted.edges > 0);
  assert.ok(Buffer.byteLength(`${JSON.stringify(large)}\n`) <= contextBudget);
  assert.throws(() => compactPacket({ focus: ["x".repeat(9000)] }), /Narrow/);

  const graphPath = join(initial.directory, "graph.json");
  const graphBytes = readFileSync(graphPath);
  writeFileSync(graphPath, "{}");
  assert.equal(inspectCache(root, inputs).state, "invalid");
  writeFileSync(graphPath, graphBytes);
  const manifestPath = join(initial.directory, "manifest.json");
  const manifestBytes = readFileSync(manifestPath);
  writeFileSync(manifestPath, "{bad");
  assert.equal(inspectCache(root, inputs).state, "invalid");
  rmSync(manifestPath);
  assert.equal(inspectCache(root, inputs).state, "invalid");
  writeFileSync(manifestPath, manifestBytes);
  const pointer = join(cacheRoot(root), "current.json");
  const pointerBytes = readFileSync(pointer);
  writeFileSync(pointer, '{"id":"../../source"}');
  assert.equal(inspectCache(root, inputs).state, "invalid");
  writeFileSync(pointer, pointerBytes);
  const corrupt = JSON.parse(manifestBytes);
  corrupt.inputs.configuration = [];
  writeFileSync(manifestPath, JSON.stringify(corrupt));
  assert.equal(inspectCache(root, inputs).state, "invalid");
  writeFileSync(manifestPath, manifestBytes);

  const bad = candidate(inputs);
  bad.summary.modules.parseFailures = 1;
  writeFileSync(
    join(bad.directory, "summary.json"),
    JSON.stringify(bad.summary),
  );
  assert.throws(
    () => publishGeneration(root, inputs, bad.directory),
    /parse failures/,
  );
  assert.deepEqual(readFileSync(pointer), pointerBytes);
  const moving = candidate(inputs);
  file(b, "export const b = 2;");
  assert.throws(
    () => publishGeneration(root, inputs, moving.directory),
    /Source\/configuration changed/,
  );
  assert.deepEqual(readFileSync(pointer), pointerBytes);
  const changed = captureInputs(root, provenance);
  let attempts = 0;
  assert.throws(
    () => prepareGraph(root, changed, () => { attempts++; }),
    /no extraction was started/,
  );
  assert.equal(attempts, 0, "A stale context query never rebuilds the graph.");
  assert.throws(
    () =>
      prepareGraph(root, changed, () => {
        attempts++;
        throw new Error("Refresh failed; do not retry.");
      }, true),
    /do not retry/,
  );
  assert.equal(attempts, 1);
  assert.deepEqual(readFileSync(pointer), pointerBytes);
  const refreshed = prepareGraph(root, changed, (_root, _python, output) =>
    candidate(changed, output), true,
  );
  assert.equal(refreshed.reused, false);
  assert.equal(inspectCache(root, changed).state, "fresh");
  assert.notEqual(refreshed.id, baseline.id);
  assert.ok(readFileSync(join(baseline.directory, "manifest.json")).length);
  mkdirSync(join(other, ".cache"));
  symlinkSync(cacheRoot(root), join(other, ".cache/relationship-map"), "dir");
  assert.throws(
    () => generationDirectory(other, baseline.id),
    /symlink|Invalid/,
  );

  const cwd = new URL("..", import.meta.url);
  const list = JSON.parse(
    execFileSync(
      "pnpm",
      [
        "--silent",
        "check:list",
        "--only",
        "relationship-map-context",
        "--graph-focus",
        a,
        "--graph-baseline",
        baseline.id,
      ],
      { cwd, encoding: "utf8" },
    ),
  );
  assert.equal(list[0].kind, "performance");
  assert.ok(list[0].args.includes("--focus"));
  assert.ok(list[0].args.includes(baseline.id));
  assert.deepEqual(
    admitTool({
      cwd: fileURLToPath(cwd),
      toolName: "bash",
      toolArgs: {
        command: `pnpm check:focused --profile performance --only relationship-map-context --graph-focus ${a}`,
      },
    }),
    {},
  );
  const repository = new URL("../../..", import.meta.url);
  for (const path of ["AGENTS.md", "docs/spectrum-studio/AGENTS.md"])
    assert.match(
      readFileSync(new URL(path, repository), "utf8"),
      /relationship-map\/SKILL\.md/,
    );
  const rule = readFileSync(
    new URL(".ai/rules/relationship-map.md", repository),
    "utf8",
  );
  for (const scope of scopes) assert.ok(rule.includes(`${scope}/**`));
  const skill = readFileSync(
    new URL(".ai/skills/relationship-map/SKILL.md", repository),
    "utf8",
  );
  assert.match(skill, /name: relationship-map/);
  assert.ok(
    !skill.includes("/Users/"),
    "instructions contain no original-session paths",
  );
  console.log(
    "Relationship workflow: cache integrity/reuse, invalidation, atomic publication, failures, focused context, edge/cycle review, budgets and agent routing passed.",
  );
} finally {
  rmSync(root, { recursive: true, force: true });
  rmSync(other, { recursive: true, force: true });
}
