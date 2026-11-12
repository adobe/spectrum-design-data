// Copyright 2026 Adobe. All rights reserved.
import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import {
  extractRepository,
  inventory,
  moduleCycles,
  scopes,
  verifyGraph,
} from "./relationshipMap.mjs";

const studio = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repository = resolve(studio, "../..");
const formatVersion = 1;
const pythonVersion = "3.12.12";
const rootInputs = [
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "tsconfig.json",
  "tsconfig.base.json",
];
export const artifactFiles = [
  "graph.json",
  "files.json",
  "summary.json",
  "cycles.json",
  "architecture.json",
  "validation.json",
  "diagnostics.json",
  "unresolved.json",
  "resolution-configurations.json",
  "rust.json",
];
const generationPattern = /^[a-f0-9]{64}-[a-f0-9-]{36}$/;
const digest = (value) => createHash("sha256").update(value).digest("hex");
const read = (path) => JSON.parse(readFileSync(path, "utf8"));
const write = (path, value) =>
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
const normalize = (path) => path.split(sep).join("/");
export const contextBudget = 8192;
export const cacheRoot = (root) =>
  join(realpathSync(root), ".cache/relationship-map");
const pythonPath = (root) =>
  join(
    cacheRoot(root),
    "venv",
    process.platform === "win32" ? "Scripts/python.exe" : "bin/python",
  );

function ownedDirectory(path) {
  mkdirSync(path, { recursive: true });
  if (realpathSync(path) !== resolve(path))
    throw new Error(
      `Relationship-map storage must not traverse symlinks: ${path}`,
    );
  return path;
}

export function generationDirectory(root, id) {
  if (!generationPattern.test(id))
    throw new Error("Invalid relationship-map generation ID.");
  const directory = join(cacheRoot(root), "generations", id);
  if (existsSync(directory) && realpathSync(directory) !== directory)
    throw new Error("Relationship-map generation must not be a symlink.");
  return directory;
}

export function captureInputs(root, provenance, selectedScopes = scopes) {
  root = realpathSync(root);
  const sources = inventory(root, selectedScopes);
  const configuration = rootInputs.map((path) => ({
    path,
    sha256: existsSync(join(root, path))
      ? digest(readFileSync(join(root, path)))
      : null,
  }));
  const inputs = {
    formatVersion,
    root,
    scopes: selectedScopes,
    sources,
    configuration,
    provenance,
  };
  return { ...inputs, fingerprint: digest(JSON.stringify(inputs)) };
}

class InvalidCache extends Error {}

function cacheJson(path) {
  try {
    return read(path);
  } catch (error) {
    if (error.code === "ENOENT" || error instanceof SyntaxError)
      throw new InvalidCache(
        `Missing or unreadable cache JSON: ${path}: ${error.message}`,
      );
    throw error;
  }
}

function loadGeneration(root, id) {
  const directory = generationDirectory(root, id);
  const manifest = cacheJson(join(directory, "manifest.json"));
  const { fingerprint, ...recordedInputs } = manifest?.inputs ?? {};
  if (
    manifest?.formatVersion !== formatVersion ||
    manifest.id !== id ||
    manifest.inputs?.root !== realpathSync(root) ||
    !Array.isArray(manifest.inputs?.sources?.files) ||
    digest(JSON.stringify(recordedInputs)) !== fingerprint ||
    !id.startsWith(`${fingerprint}-`)
  )
    throw new InvalidCache(
      "Graph metadata belongs to another checkout or format.",
    );
  for (const name of artifactFiles) {
    const path = join(directory, name);
    if (
      !existsSync(path) ||
      digest(readFileSync(path)) !== manifest.artifacts?.[name]
    )
      throw new InvalidCache(`Unverified or changed graph artifact: ${name}`);
  }
  return { id, directory, manifest };
}

export function inspectCache(root, inputs) {
  if (!existsSync(join(cacheRoot(root), "current.json")))
    return { state: "missing" };
  try {
    const pointer = cacheJson(join(cacheRoot(root), "current.json"));
    if (!generationPattern.test(pointer?.id))
      throw new InvalidCache("Invalid current generation pointer.");
    const generation = loadGeneration(root, pointer.id);
    return {
      state:
        generation.manifest.inputs.fingerprint === inputs.fingerprint
          ? "fresh"
          : "stale",
      ...generation,
    };
  } catch (error) {
    if (error instanceof InvalidCache)
      return { state: "invalid", reason: error.message };
    throw error;
  }
}

export function publishGeneration(root, inputs, directory) {
  const id = directory.split(sep).at(-1);
  if (generationDirectory(root, id) !== resolve(directory))
    throw new Error(
      "Candidate generation is outside its checkout-local cache.",
    );
  const graph = read(join(directory, "graph.json"));
  const summary = read(join(directory, "summary.json"));
  if (
    summary.sourceHash !== digest(JSON.stringify(inputs.sources.files)) ||
    JSON.stringify(summary.scopes) !== JSON.stringify(inputs.scopes) ||
    summary.modules?.parseFailures !== 0 ||
    summary.rust?.parse_errors !== 0 ||
    summary.data?.duplicateIdentities !== 0
  )
    throw new Error(
      "Candidate extraction has invalid coverage, parse failures or duplicate canonical identities.",
    );
  if (JSON.stringify(summary.provenance) !== JSON.stringify(inputs.provenance))
    throw new Error("Extractor provenance differs from the cache inputs.");
  const validation = verifyGraph(root, inputs.sources, graph, inputs.scopes);
  const after = captureInputs(root, inputs.provenance, inputs.scopes);
  if (after.fingerprint !== inputs.fingerprint)
    throw new Error(
      "Source/configuration changed during refresh; candidate was not published. Stop before retrying.",
    );
  write(join(directory, "validation.json"), validation);
  const artifacts = Object.fromEntries(
    artifactFiles.map((name) => [
      name,
      digest(readFileSync(join(directory, name))),
    ]),
  );
  write(join(directory, "manifest.json"), {
    formatVersion,
    id,
    inputs,
    artifacts,
  });
  const temporary = join(cacheRoot(root), `current-${randomUUID()}.json`);
  write(temporary, { id });
  renameSync(temporary, join(cacheRoot(root), "current.json"));
  return { id, directory, manifest: { formatVersion, id, inputs, artifacts } };
}

export function runtimeVersions(root) {
  const python = pythonPath(root);
  if (!existsSync(python))
    throw new Error(
      "Relationship-map runtime missing. Run the explicitly selected relationship-map-setup check; queries never install dependencies.",
    );
  const versions = JSON.parse(
    execFileSync(
      python,
      [
        "-B",
        "-c",
        "import json,platform,importlib.metadata; print(json.dumps({'python':platform.python_version(),'tree-sitter':importlib.metadata.version('tree-sitter'),'tree-sitter-rust':importlib.metadata.version('tree-sitter-rust')}))",
      ],
      { encoding: "utf8" },
    ),
  );
  if (
    versions.python !== pythonVersion ||
    versions["tree-sitter"] !== "0.26.1" ||
    versions["tree-sitter-rust"] !== "0.24.2"
  )
    throw new Error(
      "Relationship-map runtime versions differ from the pinned setup. Run relationship-map-setup explicitly.",
    );
  return { node: process.version, typescript: ts.version, ...versions };
}

function setup(root, uv) {
  const cache = ownedDirectory(cacheRoot(root));
  for (const name of ["python", "downloads", "venv"])
    ownedDirectory(join(cache, name));
  const env = {
    ...process.env,
    UV_PYTHON_INSTALL_DIR: join(cache, "python"),
    UV_CACHE_DIR: join(cache, "downloads"),
    UV_PYTHON_PREFERENCE: "only-managed",
  };
  const run = (args) => execFileSync(uv, args, { env, stdio: "inherit" });
  run(["python", "install", pythonVersion]);
  run([
    "venv",
    "--allow-existing",
    "--python",
    pythonVersion,
    join(cache, "venv"),
  ]);
  run([
    "pip",
    "install",
    "--python",
    pythonPath(root),
    "--requirement",
    join(studio, "scripts/relationship-map-requirements.txt"),
  ]);
  console.log(
    JSON.stringify({
      setup: "ready",
      provenance: runtimeVersions(root),
      cache,
    }),
  );
}

export function normalizeFocus(root, focus, selectedScopes = scopes) {
  return focus.map((path) => {
    const normalized = normalize(
      relative(realpathSync(root), resolve(root, path)),
    );
    if (
      !selectedScopes.some(
        (scope) => normalized === scope || normalized.startsWith(`${scope}/`),
      )
    )
      throw new Error(`Graph focus is outside the five mapped areas: ${path}`);
    return normalized;
  });
}

function focused(id, focus) {
  const path = id.replace(/^(?:file|record|crate):/, "").split("#")[0];
  return focus.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

const edgeIdentity = (edge) =>
  JSON.stringify([
    edge.source,
    edge.target,
    edge.kind,
    edge.phase,
    edge.status,
    edge.specifier,
    edge.value,
    edge.name,
    edge.pointer,
  ]);

function subtractEdges(left, right) {
  const counts = new Map();
  for (const edge of right)
    counts.set(edgeIdentity(edge), (counts.get(edgeIdentity(edge)) ?? 0) + 1);
  return left.filter((edge) => {
    const key = edgeIdentity(edge);
    const count = counts.get(key) ?? 0;
    if (count) {
      counts.set(key, count - 1);
      return false;
    }
    return true;
  });
}

export function compareGraphs(before, after, focus) {
  const relevant = (edge) =>
    focused(edge.source, focus) || focused(edge.target, focus);
  const added = subtractEdges(after.edges, before.edges).filter(relevant);
  const removed = subtractEdges(before.edges, after.edges).filter(relevant);
  const addedKeys = new Set(added.map(edgeIdentity));
  return {
    added,
    removed,
    addedCount: added.length,
    removedCount: removed.length,
    cyclesBefore: moduleCycles(before).length,
    cyclesAfter: moduleCycles(after).length,
    cyclicGroupsWithAddedLinks: moduleCycles(after)
      .filter((cycle) =>
        cycle.edges.some((edge) => addedKeys.has(edgeIdentity(edge))),
      )
      .map((cycle) => ({
        members: cycle.members,
        edges: cycle.edges.filter((edge) => addedKeys.has(edgeIdentity(edge))),
      })),
    attribution:
      "Differences cover the shared checkout, not necessarily this task alone. Confirm ownership in source.",
  };
}

export function compactPacket(packet) {
  const result = structuredClone(packet);
  result.omitted = {};
  for (const key of ["cycles", "cyclicGroupsWithAddedLinks"]) {
    for (const cycle of result[key] ?? []) {
      cycle.omittedMembers = Math.max(0, cycle.members.length - 6);
      cycle.members = cycle.members.slice(0, 6);
      if (cycle.edges) {
        cycle.omittedEdges = Math.max(0, cycle.edges.length - 3);
        cycle.edges = cycle.edges.slice(0, 3);
      }
      result.omitted.cycleDetails =
        (result.omitted.cycleDetails ?? 0) +
        cycle.omittedMembers +
        (cycle.omittedEdges ?? 0);
    }
  }
  const arrays = [
    "edges",
    "added",
    "removed",
    "cycles",
    "cyclicGroupsWithAddedLinks",
    "changedFiles",
    "limits",
  ];
  for (const key of arrays) {
    if (!Array.isArray(result[key])) continue;
    const maximum = key === "changedFiles" ? 20 : 50;
    result.omitted[key] = Math.max(0, result[key].length - maximum);
    result[key] = result[key].slice(0, maximum);
  }
  const encode = () => `${JSON.stringify(result)}\n`;
  while (Buffer.byteLength(encode()) > contextBudget) {
    const key = arrays.find((name) => result[name]?.length);
    if (!key)
      throw new Error(
        "Context metadata exceeds 8 KiB. Narrow the requested focus.",
      );
    result[key].pop();
    result.omitted[key]++;
  }
  result.truncated = Object.values(result.omitted).some((count) => count > 0);
  // Reserve space for the final truncation marker as part of the same budget.
  if (Buffer.byteLength(encode()) > contextBudget) {
    const key = arrays.find((name) => result[name]?.length);
    if (!key)
      throw new Error(
        "Context metadata exceeds 8 KiB. Narrow the requested focus.",
      );
    result[key].pop();
    result.omitted[key]++;
  }
  return result;
}

export function contextPacket(graph, summary, focus) {
  if (!graph.nodes.some((node) => focused(node.id, focus)))
    throw new Error(
      "No mapped nodes match the focus. Use an existing area prefix.",
    );
  const relevant = (edge) =>
    focused(edge.source, focus) || focused(edge.target, focus);
  const cycles = moduleCycles(graph);
  const cyclicEdges = new Set(
    cycles.flatMap((cycle) => cycle.edges.map(edgeIdentity)),
  );
  const score = (edge) => {
    const area = (id) => scopes.find((scope) => focused(id, [scope]));
    return (
      (cyclicEdges.has(edgeIdentity(edge)) ? 30 : 0) +
      (focus.some((path) => edge.source === `file:${path}`) ? 15 : 0) +
      (edge.phase === "value" ? 5 : 0) +
      ([
        "uuid_reference",
        "lifecycle_replacement",
        "schema_reference",
        "component_scope",
        "explicit_mode",
        "cargo_dependency",
        "rust_module",
        "rust_include",
      ].includes(edge.kind)
        ? 15
        : 0) +
      (["contains_record", "directory_member"].includes(edge.kind) ? -30 : 0) +
      (/\/(?:tests|scripts)\//.test(edge.evidence?.file ?? "") ||
      /\.stories\./.test(edge.evidence?.file ?? "")
        ? -10
        : 0) +
      (["package_dependency", "package_export"].includes(edge.kind) ? 20 : 0) +
      (["import", "reexport", "url_asset"].includes(edge.kind) ? 5 : 0) +
      (area(edge.source) &&
      area(edge.target) &&
      area(edge.source) !== area(edge.target)
        ? 10
        : 0)
    );
  };
  const ranked = graph.edges
    .filter(relevant)
    .sort((a, b) => score(b) - score(a));
  const buckets = new Map();
  for (const edge of ranked) {
    const direction = focused(edge.source, focus) ? "dependency" : "dependent";
    const key = `${edge.kind}:${edge.phase}:${edge.status}:${direction}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(edge);
  }
  const edges = [];
  for (let index = 0; edges.length < ranked.length; index++)
    for (const bucket of buckets.values())
      if (index < bucket.length) edges.push(bucket[index]);
  const coverage = {};
  for (const edge of edges) {
    const counts = (coverage[edge.kind] ??= {
      resolved: 0,
      external: 0,
      unresolved: 0,
    });
    counts[edge.status]++;
  }
  return {
    focus,
    coverage,
    coverageScope:
      "Relationships touching the requested focus, not the whole map.",
    limits: summary.limits,
    edgeCount: edges.length,
    edges,
    cycles: cycles
      .filter((cycle) => cycle.members.some((id) => focused(id, focus)))
      .map((cycle) => ({
        members: cycle.members,
        relationshipCount: cycle.edges.length,
      })),
    orientation:
      "Use existing package metadata and Studio AGENTS.md domain map for ownership. Imports do not prove execution or equivalent behavior.",
  };
}

export function prepareGraph(root, inputs, extractor = extractRepository, allowRefresh = false) {
  const current = inspectCache(root, inputs);
  if (current.state === "fresh") return { ...current, reused: true };
  if (!allowRefresh)
    throw new Error(
      `Relationship map is ${current.state}; no extraction was started. Use focused source/test evidence, or request an explicit relationship-map-refresh.`,
    );
  console.error(
    `Relationship map ${current.state}; performing one supervised refresh.${current.reason ? ` ${current.reason}` : ""}`,
  );
  const id = `${inputs.fingerprint}-${randomUUID()}`;
  const directory = ownedDirectory(generationDirectory(root, id));
  extractor(root, pythonPath(root), directory);
  return { ...publishGeneration(root, inputs, directory), reused: false };
}

function main(args) {
  const options = { focus: [] };
  for (let index = 0; index < args.length; index += 2) {
    const [key, value] = [args[index], args[index + 1]];
    if (!value) throw new Error(`Missing value for ${key}`);
    if (key === "--focus") options.focus.push(value);
    else if (["--operation", "--run-dir", "--baseline", "--uv"].includes(key))
      options[key.slice(2)] = value;
    else throw new Error(`Unknown relationship workflow argument: ${key}`);
  }
  if (
    ![
      "setup",
      "refresh",
      "status",
      "context",
      "compare",
      "freshness",
      "verify",
      "rust-tests",
    ].includes(options.operation)
  )
    throw new Error(
      "Choose relationship-map setup, refresh, status, context, compare, freshness, verify or rust-tests.",
    );
  if (options.operation === "setup") {
    setup(repository, options.uv ?? "uv");
    return;
  }
  if (!options["run-dir"])
    throw new Error("A supervised run directory is required.");
  const root = realpathSync(repository);
  const provenance = runtimeVersions(root);
  if (options.operation === "rust-tests") {
    execFileSync(
      pythonPath(root),
      ["-B", join(studio, "tests/relationship-map-rust.py")],
      { stdio: "inherit" },
    );
    return;
  }
  const inputs = captureInputs(root, provenance);
  if (["status", "freshness", "verify"].includes(options.operation)) {
    const status = inspectCache(root, inputs);
    if (options.operation !== "status" && status.state !== "fresh")
      throw new Error(
        `Relationship map is ${status.state}. Prepare current context before verification. ${status.reason ?? ""}`,
      );
    if (options.operation === "verify") {
      const result = verifyGraph(
        root,
        inputs.sources,
        read(join(status.directory, "graph.json")),
      );
      console.log(
        JSON.stringify({ state: "verified", generation: status.id, ...result }),
      );
      return;
    }
    console.log(
      JSON.stringify({
        state: status.state,
        generation: status.id,
        reason: status.reason,
        fingerprint: inputs.fingerprint,
      }),
    );
    return;
  }
  const focus = normalizeFocus(
    root,
    options.focus.length ? options.focus : scopes,
  );
  // Validate a requested baseline before any refresh; an invalid ID must not start work.
  const baseline =
    options.operation === "compare"
      ? loadGeneration(root, options.baseline ?? "")
      : undefined;
  const generation = prepareGraph(root, inputs, extractRepository, options.operation === "refresh");
  const graph = read(join(generation.directory, "graph.json"));
  const summary = read(join(generation.directory, "summary.json"));
  const revision = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).trim();
  const packet = {
    state: "fresh",
    generation: generation.id,
    reused: generation.reused,
    fingerprint: inputs.fingerprint,
    builtRevision: summary.revision,
    currentRevision: revision,
    ...contextPacket(graph, summary, focus),
  };
  if (baseline) {
    Object.assign(
      packet,
      compareGraphs(read(join(baseline.directory, "graph.json")), graph, focus),
    );
    packet.baseline = baseline.id;
    const previous = new Map(
      baseline.manifest.inputs.sources.files.map((file) => [
        file.path,
        file.sha256,
      ]),
    );
    const current = new Map(
      inputs.sources.files.map((file) => [file.path, file.sha256]),
    );
    packet.changedFiles = [
      ...new Set([...previous.keys(), ...current.keys()]),
    ].filter((path) => previous.get(path) !== current.get(path));
  }
  if (
    captureInputs(root, runtimeVersions(root)).fingerprint !==
    inputs.fingerprint
  )
    throw new Error(
      "Inputs changed during context preparation; stop before retrying. No current-source context was delivered.",
    );
  const resultPath = join(
    ownedDirectory(resolve(options["run-dir"])),
    `relationship-map-${options.operation}-${randomUUID()}.json`,
  );
  write(resultPath, packet);
  console.log(JSON.stringify(compactPacket({ ...packet, detail: resultPath })));
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main(process.argv.slice(2));
