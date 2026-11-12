// Copyright 2026 Adobe. All rights reserved.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

export const scopes = [
  "docs/spectrum-studio",
  "packages/design-data",
  "packages/design-data-spec",
  "sdk",
  "tools/design-data",
];
const excluded = new Set([
  "node_modules",
  ".pnpm",
  ".git",
  "target",
  "vendor",
  ".cache",
  ".vite",
  "dist",
  "build",
  "coverage",
  "reports",
  "test-results",
  "playwright-report",
  "storybook-static",
  ".DS_Store",
  "Cargo.lock",
  "pnpm-lock.yaml",
  "__pycache__",
  ".pytest_cache",
]);
const sourceExtension = /\.(?:[cm]?[jt]sx?)$/;
const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const posix = (path) => path.split(sep).join("/");
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const fileId = (path) => `file:${path}`;
const within = (path, root) => {
  const part = relative(root, path);
  return (
    part === "" ||
    (!isAbsolute(part) && part !== ".." && !part.startsWith(`..${sep}`))
  );
};

export function inventory(root, selectedScopes = scopes) {
  root = realpathSync(root);
  const files = [];
  const skipped = [];
  function visit(path) {
    for (const entry of readdirSync(path, { withFileTypes: true }).sort(
      (a, b) => a.name.localeCompare(b.name, "en"),
    )) {
      const absolute = join(path, entry.name);
      const name = posix(relative(root, absolute));
      if (
        entry.isSymbolicLink() ||
        excluded.has(entry.name) ||
        /^\.env(?:\.|$)|\.(?:pem|key|p12|pfx)$/.test(entry.name)
      ) {
        skipped.push({
          path: name,
          reason: entry.isSymbolicLink() ? "symlink" : "excluded",
        });
      } else if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile()) {
        const bytes = readFileSync(absolute);
        files.push({ path: name, sha256: hash(bytes), bytes: bytes.length });
      }
    }
  }
  for (const scope of selectedScopes) {
    const path = resolve(root, scope);
    if (!within(path, root) || !existsSync(path) || realpathSync(path) !== path)
      throw new Error(
        `Scope must be an existing physical directory inside the root: ${scope}`,
      );
    visit(path);
  }
  return { files, skipped };
}

export function createGraph() {
  const nodes = new Map();
  const edges = [];
  const diagnostics = [];
  return {
    nodes,
    edges,
    diagnostics,
    node(id, attributes) {
      if (!nodes.has(id)) nodes.set(id, { id, ...attributes });
      return id;
    },
    edge(source, target, kind, evidence, attributes = {}) {
      edges.push({ source, target, kind, evidence, ...attributes });
    },
  };
}

export function moduleCycles(graph) {
  const adjacent = new Map();
  for (const edge of graph.edges) {
    if (
      !["import", "reexport"].includes(edge.kind) ||
      edge.phase !== "value" ||
      edge.status !== "resolved"
    )
      continue;
    if (!adjacent.has(edge.source)) adjacent.set(edge.source, new Set());
    adjacent.get(edge.source).add(edge.target);
  }
  const indices = new Map();
  const low = new Map();
  const stack = [];
  const active = new Set();
  const components = [];
  function visit(node) {
    indices.set(node, indices.size);
    low.set(node, indices.get(node));
    stack.push(node);
    active.add(node);
    for (const next of adjacent.get(node) ?? []) {
      if (!indices.has(next)) {
        visit(next);
        low.set(node, Math.min(low.get(node), low.get(next)));
      } else if (active.has(next))
        low.set(node, Math.min(low.get(node), indices.get(next)));
    }
    if (low.get(node) === indices.get(node)) {
      const members = [];
      let next;
      do {
        next = stack.pop();
        active.delete(next);
        members.push(next);
      } while (next !== node);
      if (members.length > 1 || adjacent.get(node)?.has(node)) {
        members.sort();
        const memberSet = new Set(members);
        components.push({
          members,
          edges: graph.edges.filter(
            (edge) =>
              ["import", "reexport"].includes(edge.kind) &&
              edge.phase === "value" &&
              edge.status === "resolved" &&
              memberSet.has(edge.source) &&
              memberSet.has(edge.target),
          ),
        });
      }
    }
  }
  for (const node of adjacent.keys()) if (!indices.has(node)) visit(node);
  return components.sort(
    (a, b) =>
      b.members.length - a.members.length ||
      a.members[0].localeCompare(b.members[0]),
  );
}

function compilerOptions(root, path, cache) {
  let directory = dirname(path);
  while (within(directory, root)) {
    const inSource = within(path, join(directory, "src"));
    const candidates = [
      ...(inSource ? ["tsconfig.app.json"] : ["tsconfig.node.json"]),
      "tsconfig.json",
    ];
    for (const candidate of candidates) {
      const config = join(directory, candidate);
      if (!existsSync(config)) continue;
      if (!cache.has(config)) {
        const read = ts.readConfigFile(config, ts.sys.readFile);
        if (read.error)
          throw new Error(
            ts.flattenDiagnosticMessageText(read.error.messageText, "\n"),
          );
        const parsed = ts.parseJsonConfigFileContent(
          read.config,
          {
            ...ts.sys,
            readDirectory: () => [],
          },
          directory,
          undefined,
          config,
        );
        const errors = parsed.errors.filter(
          (error) => ![18002, 18003].includes(error.code),
        );
        if (errors.length)
          throw new Error(
            errors
              .map((error) =>
                ts.flattenDiagnosticMessageText(error.messageText, "\n"),
              )
              .join("\n"),
          );
        cache.set(config, {
          ...parsed.options,
          allowJs: true,
          resolveJsonModule: true,
        });
      }
      return {
        options: cache.get(config),
        config: posix(relative(root, config)),
      };
    }
    if (directory === root) break;
    directory = dirname(directory);
  }
  return {
    options: {
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      module: ts.ModuleKind.ESNext,
      allowJs: true,
      resolveJsonModule: true,
    },
    config: null,
  };
}

export function extractModules(root, files, graph) {
  const known = new Set(files.map((file) => file.path));
  const configs = new Map();
  const resolutionCaches = new Map();
  const statistics = {
    files: 0,
    imports: 0,
    nonliteral: 0,
    parseFailures: 0,
    configurations: {},
  };
  for (const file of files.filter((entry) =>
    sourceExtension.test(entry.path),
  )) {
    const absolute = join(root, file.path);
    const source = ts.createSourceFile(
      absolute,
      readFileSync(absolute, "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    const policy = compilerOptions(root, absolute, configs);
    if (!resolutionCaches.has(policy.config))
      resolutionCaches.set(
        policy.config,
        ts.createModuleResolutionCache(
          root,
          (path) =>
            ts.sys.useCaseSensitiveFileNames ? path : path.toLowerCase(),
          policy.options,
        ),
      );
    statistics.configurations[file.path] = policy.config;
    statistics.files++;
    const evidence = (node) => {
      const position = source.getLineAndCharacterOfPosition(
        node.getStart(source),
      );
      return {
        file: file.path,
        line: position.line + 1,
        column: position.character + 1,
        extractor: "typescript",
      };
    };
    for (const error of source.parseDiagnostics) {
      statistics.parseFailures++;
      graph.diagnostics.push({
        kind: "parse_error",
        file: file.path,
        line: source.getLineAndCharacterOfPosition(error.start ?? 0).line + 1,
        message: ts.flattenDiagnosticMessageText(error.messageText, "\n"),
      });
    }
    function dependency(literal, kind, phase) {
      if (!literal || !ts.isStringLiteralLike(literal)) {
        statistics.nonliteral++;
        const location = evidence(literal ?? source);
        const id = graph.node(
          `unknown:${file.path}:${location.line}:${location.column}`,
          { kind: "unknown", reason: "nonliteral dependency" },
        );
        graph.edge(fileId(file.path), id, kind, location, {
          phase,
          status: "unresolved",
        });
        return;
      }
      const specifier = literal.text;
      const result = ts.resolveModuleName(
        specifier,
        absolute,
        policy.options,
        ts.sys,
        resolutionCaches.get(policy.config),
      ).resolvedModule;
      const resolved = result
        ? posix(relative(root, result.resolvedFileName))
        : null;
      const builtin = specifier.startsWith("node:");
      const external =
        builtin || (result?.isExternalLibraryImport && !known.has(resolved));
      const status = known.has(resolved)
        ? "resolved"
        : external
          ? "external"
          : "unresolved";
      const target =
        status === "resolved"
          ? fileId(resolved)
          : graph.node(
              `${status}:${status === "external" ? specifier : `${file.path}:${specifier}`}`,
              {
                kind: status,
                specifier,
                ...(resolved && !resolved.includes("node_modules")
                  ? { candidate: resolved }
                  : {}),
              },
            );
      graph.edge(fileId(file.path), target, kind, evidence(literal), {
        specifier,
        phase,
        status,
      });
      statistics.imports++;
    }
    function visit(node) {
      if (ts.isImportDeclaration(node)) {
        const clause = node.importClause;
        const bindings = clause?.namedBindings;
        const named =
          bindings && ts.isNamedImports(bindings) ? bindings.elements : [];
        const onlyTypes = source.isDeclarationFile || clause?.isTypeOnly;
        if (
          onlyTypes ||
          (!clause?.name &&
            named.length &&
            named.every((binding) => binding.isTypeOnly))
        )
          dependency(node.moduleSpecifier, "import", "type");
        else {
          dependency(node.moduleSpecifier, "import", "value");
          if (named.some((binding) => binding.isTypeOnly))
            dependency(node.moduleSpecifier, "import", "type");
        }
      } else if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
        const named =
          node.exportClause && ts.isNamedExports(node.exportClause)
            ? node.exportClause.elements
            : [];
        const onlyTypes =
          source.isDeclarationFile ||
          node.isTypeOnly ||
          (named.length && named.every((binding) => binding.isTypeOnly));
        dependency(
          node.moduleSpecifier,
          "reexport",
          onlyTypes ? "type" : "value",
        );
        if (!onlyTypes && named.some((binding) => binding.isTypeOnly))
          dependency(node.moduleSpecifier, "reexport", "type");
      } else if (ts.isImportTypeNode(node)) {
        dependency(
          ts.isLiteralTypeNode(node.argument)
            ? node.argument.literal
            : node.argument,
          "import",
          "type",
        );
      } else if (
        ts.isImportEqualsDeclaration(node) &&
        ts.isExternalModuleReference(node.moduleReference)
      ) {
        dependency(
          node.moduleReference.expression,
          "require",
          node.isTypeOnly ? "type" : "value",
        );
      } else if (ts.isCallExpression(node)) {
        if (node.expression.kind === ts.SyntaxKind.ImportKeyword)
          dependency(node.arguments[0], "dynamic_import", "value");
        else if (
          ts.isIdentifier(node.expression) &&
          node.expression.text === "require"
        )
          dependency(node.arguments[0], "require", "value");
        else if (
          ts.isPropertyAccessExpression(node.expression) &&
          node.expression.name.text === "glob" &&
          node.expression.expression.getText(source) === "import.meta"
        ) {
          statistics.nonliteral++;
          graph.diagnostics.push({
            kind: "glob_not_expanded",
            ...evidence(node),
            expression: node.getText(source).slice(0, 250),
          });
        }
      } else if (
        ts.isNewExpression(node) &&
        node.expression.getText(source) === "URL" &&
        node.arguments?.length === 2 &&
        node.arguments[1].getText(source) === "import.meta.url" &&
        ts.isStringLiteralLike(node.arguments[0])
      ) {
        const specifier = node.arguments[0].text;
        const candidate = posix(
          relative(root, resolve(dirname(absolute), specifier)),
        );
        const status = known.has(candidate) ? "resolved" : "unresolved";
        const target =
          status === "resolved"
            ? fileId(candidate)
            : graph.node(`unresolved:${file.path}:${specifier}`, {
                kind: "unresolved",
                specifier,
                candidate,
              });
        graph.edge(fileId(file.path), target, "url_asset", evidence(node), {
          status,
          specifier,
          phase: "value",
        });
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  return statistics;
}

function jsonPointer(value, pointer) {
  if (!pointer) return true;
  if (!pointer.startsWith("/")) return false;
  for (const key of pointer
    .slice(1)
    .split("/")
    .map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"))) {
    if (!value || typeof value !== "object" || !Object.hasOwn(value, key))
      return false;
    value = value[key];
  }
  return true;
}

export function extractData(root, files, graph) {
  const documents = new Map();
  const identities = new Map();
  const schemaIds = new Map();
  const references = [];
  const modes = new Map();
  const packages = new Map();
  const components = new Map();
  const statistics = {
    files: 0,
    records: 0,
    references: 0,
    duplicateIdentities: 0,
  };
  for (const file of files.filter(
    (entry) =>
      entry.path.endsWith(".json") &&
      !/(?:^|\/)tsconfig[^/]*\.json$/.test(entry.path),
  )) {
    const text = readFileSync(join(root, file.path), "utf8");
    let value;
    try {
      value = JSON.parse(text);
    } catch (error) {
      graph.diagnostics.push({
        kind: "json_parse_error",
        file: file.path,
        message: error.message,
      });
      continue;
    }
    statistics.files++;
    documents.set(file.path, value);
    if (file.path.endsWith("/package.json") && value.name)
      packages.set(value.name, file.path);
    if (file.path.startsWith("packages/design-data/components/") && value.name)
      components.set(value.name, file.path);
    const source = ts.parseJsonText(file.path, text);
    const canonical = file.path.startsWith("packages/design-data/");
    if (
      file.path.startsWith("packages/design-data/mode-sets/") &&
      value.name &&
      Array.isArray(value.modes)
    ) {
      for (const mode of value.modes) {
        const id = graph.node(`mode:${value.name}:${mode}`, {
          kind: "mode",
          name: value.name,
          value: mode,
          file: file.path,
        });
        modes.set(`${value.name}:${mode}`, id);
        graph.edge(
          fileId(file.path),
          id,
          "declares_mode",
          { file: file.path, pointer: "/modes", extractor: "json" },
          { status: "resolved" },
        );
      }
    }
    function walk(node, pointer, owner) {
      if (ts.isObjectLiteralExpression(node)) {
        const properties = node.properties.filter(ts.isPropertyAssignment);
        const property = (name) =>
          properties.find((entry) => entry.name.text === name)?.initializer;
        const id = property("uuid");
        const schema = property("$id");
        if (id && ts.isStringLiteralLike(id)) {
          owner = graph.node(`record:${file.path}#${pointer}`, {
            kind: "record",
            file: file.path,
            pointer,
            uuid: id.text,
          });
          graph.edge(
            fileId(file.path),
            owner,
            "contains_record",
            { file: file.path, pointer, extractor: "json" },
            { status: "resolved" },
          );
          statistics.records++;
          if (canonical) {
            if (!identities.has(id.text)) identities.set(id.text, []);
            identities.get(id.text).push(owner);
          }
          const concept = property("conceptId");
          if (concept && ts.isStringLiteralLike(concept)) {
            const target = graph.node(
              `concept:${canonical ? "" : `${file.path}:`}${concept.text}`,
              { kind: "concept", uuid: concept.text },
            );
            graph.edge(
              owner,
              target,
              "concept_membership",
              {
                file: file.path,
                pointer: `${pointer}/conceptId`,
                extractor: "json",
              },
              { status: "resolved" },
            );
          }
        }
        if (schema && ts.isStringLiteralLike(schema)) {
          const target = pointer
            ? graph.node(`schema:${file.path}#${pointer}`, {
                kind: "schema",
                file: file.path,
                pointer,
              })
            : fileId(file.path);
          if (!schemaIds.has(schema.text)) schemaIds.set(schema.text, []);
          schemaIds.get(schema.text).push({ target, file: file.path, pointer });
        }
        for (const entry of properties) {
          const key = entry.name.text;
          const childPointer = `${pointer}/${key.replaceAll("~", "~0").replaceAll("/", "~1")}`;
          if (
            ts.isStringLiteralLike(entry.initializer) &&
            (["$ref", "$schema", "set_schema", "replacedBy"].includes(key) ||
              (canonical &&
                key === "component" &&
                childPointer.endsWith("/scope/component")))
          ) {
            references.push({
              source: owner,
              file: file.path,
              pointer: childPointer,
              line:
                source.getLineAndCharacterOfPosition(
                  entry.initializer.getStart(source),
                ).line + 1,
              key,
              value: entry.initializer.text,
              canonical,
              base: value.$id,
            });
          }
          walk(entry.initializer, childPointer, owner);
        }
      } else if (ts.isArrayLiteralExpression(node)) {
        node.elements.forEach((child, index) =>
          walk(child, `${pointer}/${index}`, owner),
        );
      }
    }
    if (source.statements[0])
      walk(source.statements[0].expression, "", fileId(file.path));
  }
  for (const [identity, targets] of identities) {
    if (targets.length > 1) {
      statistics.duplicateIdentities++;
      graph.diagnostics.push({
        kind: "duplicate_canonical_uuid",
        uuid: identity,
        targets,
      });
    }
  }
  for (const reference of references) {
    const { source, file, pointer, line, key, value, canonical, base } =
      reference;
    const kind =
      key === "component"
        ? "component_scope"
        : key === "replacedBy"
          ? "lifecycle_replacement"
          : key === "$ref" && uuid.test(value)
            ? "uuid_reference"
            : "schema_reference";
    let targets = [];
    let status = "unresolved";
    if (key === "component") {
      targets = components.has(value) ? [fileId(components.get(value))] : [];
      status = targets.length === 1 ? "resolved" : "unresolved";
    } else if (uuid.test(value)) {
      targets = canonical ? (identities.get(value) ?? []) : [];
      status = targets.length === 1 ? "resolved" : "unresolved";
    } else {
      const [address, fragment = ""] = value.split("#");
      let locations = address
        ? (schemaIds.get(address) ?? [])
        : [{ file, target: fileId(file), pointer: "" }];
      if (
        !locations.length &&
        address &&
        !/^[a-z][a-z\d+.-]*:/i.test(address)
      ) {
        if (base && /^https?:\/\//.test(base))
          locations = schemaIds.get(new URL(address, base).href) ?? [];
        if (!locations.length) {
          const local = posix(
            relative(root, resolve(dirname(join(root, file)), address)),
          );
          if (documents.has(local))
            locations = [{ file: local, target: fileId(local), pointer: "" }];
        }
      }
      targets = locations
        .filter((location) =>
          jsonPointer(
            documents.get(location.file),
            `${location.pointer}${fragment}`,
          ),
        )
        .map((location) => location.target);
      status =
        targets.length === 1
          ? "resolved"
          : /^(?:https?:)/.test(value) && !locations.length
            ? "external"
            : "unresolved";
    }
    const target =
      status === "resolved"
        ? targets[0]
        : graph.node(`${status}:json:${file}#${pointer}`, {
            kind: status,
            value,
            candidates: targets,
          });
    graph.edge(
      source,
      target,
      kind,
      { file, pointer, line, extractor: "json" },
      { status, value },
    );
    statistics.references++;
  }
  for (const [file, value] of documents) {
    if (
      file.startsWith("packages/design-data/tokens/") &&
      Array.isArray(value)
    ) {
      value.forEach((record, index) => {
        for (const [name, mode] of Object.entries(record.name ?? {})) {
          const target = modes.get(`${name}:${mode}`);
          const owner = graph.nodes.has(`record:${file}#/${index}`)
            ? `record:${file}#/${index}`
            : fileId(file);
          if (target)
            graph.edge(
              owner,
              target,
              "explicit_mode",
              { file, pointer: `/${index}/name/${name}`, extractor: "json" },
              { status: "resolved" },
            );
        }
      });
    }
    if (!file.endsWith("/package.json")) continue;
    for (const section of [
      "dependencies",
      "devDependencies",
      "peerDependencies",
      "optionalDependencies",
    ]) {
      for (const [name, version] of Object.entries(value[section] ?? {})) {
        const status = packages.has(name) ? "resolved" : "external";
        const target =
          status === "resolved"
            ? fileId(packages.get(name))
            : graph.node(`external:package:${name}`, {
                kind: "external",
                name,
              });
        graph.edge(
          fileId(file),
          target,
          "package_dependency",
          {
            file,
            pointer: `/${section}/${name.replaceAll("/", "~1")}`,
            extractor: "json",
          },
          { status, section, version },
        );
      }
    }
    function exports(entry, pointer) {
      if (typeof entry === "string") {
        if (entry.includes("*")) {
          graph.diagnostics.push({
            kind: "export_pattern_not_expanded",
            file,
            pointer,
            value: entry,
          });
          return;
        }
        const path = posix(
          relative(root, resolve(dirname(join(root, file)), entry)),
        );
        const status = files.some((candidate) => candidate.path === path)
          ? "resolved"
          : "unresolved";
        const target =
          status === "resolved"
            ? fileId(path)
            : graph.node(`unresolved:export:${file}:${entry}`, {
                kind: "unresolved",
                candidate: path,
              });
        graph.edge(
          fileId(file),
          target,
          "package_export",
          { file, pointer, extractor: "json" },
          { status, value: entry },
        );
      } else if (entry && typeof entry === "object") {
        for (const [key, child] of Object.entries(entry))
          exports(
            child,
            `${pointer}/${key.replaceAll("~", "~0").replaceAll("/", "~1")}`,
          );
      }
    }
    if (value.exports) exports(value.exports, "/exports");
  }
  return statistics;
}

export function graphForFiles(root, files) {
  const graph = createGraph();
  for (const file of files)
    graph.node(fileId(file.path), { kind: "file", ...file });
  const modules = extractModules(root, files, graph);
  const data = extractData(root, files, graph);
  return { graph, modules, data };
}

export function assertFresh(root, before, selectedScopes = scopes) {
  const after = inventory(root, selectedScopes);
  const hashes = new Map(after.files.map((file) => [file.path, file.sha256]));
  const changed = before.files
    .filter((file) => hashes.get(file.path) !== file.sha256)
    .map((file) => file.path);
  const previous = new Set(before.files.map((file) => file.path));
  changed.push(
    ...after.files
      .filter((file) => !previous.has(file.path))
      .map((file) => file.path),
  );
  if (
    changed.length ||
    JSON.stringify(before.skipped) !== JSON.stringify(after.skipped)
  )
    throw new Error(
      `Source changed during extraction; discard this run and seek approval before rerunning: ${changed.join(", ")}`,
    );
}

export function prepareOutput(root, output) {
  let existing = resolve(output);
  while (!existsSync(existing)) existing = dirname(existing);
  const physical = resolve(
    realpathSync(existing),
    relative(existing, resolve(output)),
  );
  if (
    [...scopes, ".git"].some((scope) =>
      within(physical, join(realpathSync(root), scope)),
    )
  )
    throw new Error(
      "Relationship-map outputs must be outside source and Git metadata.",
    );
  mkdirSync(output, { recursive: true });
}

export function queryGraph(graph, request) {
  const {
    direction = "dependencies",
    depth = 1,
    maxEdges = 100,
    kinds,
    phase,
  } = request;
  if (
    !["dependencies", "dependents"].includes(direction) ||
    !Number.isInteger(depth) ||
    depth < 1 ||
    depth > 5 ||
    !Number.isInteger(maxEdges) ||
    maxEdges < 1 ||
    maxEdges > 500
  )
    throw new Error(
      "Query direction must be dependencies/dependents; depth 1-5 and maxEdges 1-500.",
    );
  if (
    kinds !== undefined &&
    (!Array.isArray(kinds) || kinds.some((kind) => typeof kind !== "string"))
  )
    throw new Error("Query kinds must be an array of relationship names.");
  if (phase !== undefined && !["value", "type"].includes(phase))
    throw new Error("Query phase must be value or type.");
  const node = graph.nodes.some((entry) => entry.id === request.node)
    ? request.node
    : fileId(request.node);
  if (!graph.nodes.some((entry) => entry.id === node))
    throw new Error(`Unknown query node: ${request.node}`);
  const selected = new Set([node]);
  const output = new Set();
  let frontier = [node];
  let truncated = false;
  for (let level = 0; level < depth && frontier.length; level++) {
    const next = [];
    for (const edge of graph.edges) {
      if (kinds && !kinds.includes(edge.kind)) continue;
      if (phase && edge.phase !== phase) continue;
      if (
        !frontier.includes(
          direction === "dependencies" ? edge.source : edge.target,
        ) ||
        output.has(edge)
      )
        continue;
      if (output.size === maxEdges) {
        truncated = true;
        continue;
      }
      output.add(edge);
      const target = direction === "dependencies" ? edge.target : edge.source;
      if (!selected.has(target)) {
        selected.add(target);
        next.push(target);
      }
    }
    frontier = next;
  }
  return {
    request,
    node,
    truncated,
    nodes: graph.nodes.filter((entry) => selected.has(entry.id)),
    edges: [...output],
  };
}

export function verifyGraph(root, baseline, graph, selectedScopes = scopes) {
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
  if (nodes.size !== graph.nodes.length)
    throw new Error("Duplicate graph node IDs.");
  for (const file of baseline.files)
    if (!nodes.has(fileId(file.path)))
      throw new Error(`Missing inventoried file: ${file.path}`);
  const sources = new Map();
  let checkedModuleReferences = 0;
  let checkedUuidReferences = 0;
  for (const edge of graph.edges) {
    if (!nodes.has(edge.source) || !nodes.has(edge.target))
      throw new Error("Dangling graph edge.");
    if (
      edge.specifier &&
      ["import", "reexport", "dynamic_import", "require"].includes(edge.kind)
    ) {
      const file = edge.evidence.file;
      if (!sources.has(file)) {
        const source = ts.createSourceFile(
          file,
          readFileSync(join(root, file), "utf8"),
          ts.ScriptTarget.Latest,
          true,
        );
        const literals = new Map();
        function visit(node) {
          if (ts.isStringLiteralLike(node)) {
            const position = source.getLineAndCharacterOfPosition(
              node.getStart(source),
            );
            literals.set(
              `${position.line + 1}:${position.character + 1}`,
              node.text,
            );
          }
          ts.forEachChild(node, visit);
        }
        visit(source);
        sources.set(file, literals);
      }
      if (
        sources
          .get(file)
          .get(`${edge.evidence.line}:${edge.evidence.column}`) !==
        edge.specifier
      )
        throw new Error(
          `Module evidence no longer matches source: ${file}:${edge.evidence.line}`,
        );
      checkedModuleReferences++;
    }
    if (edge.kind === "uuid_reference" && edge.status === "resolved") {
      if (nodes.get(edge.target).uuid !== edge.value)
        throw new Error("UUID reference target identity mismatch.");
      checkedUuidReferences++;
    }
  }
  assertFresh(root, baseline, selectedScopes);
  return {
    inventoriedFiles: baseline.files.length,
    edges: graph.edges.length,
    checkedModuleReferences,
    checkedUuidReferences,
  };
}

function main(args) {
  const parameters = new Map();
  for (let index = 0; index < args.length; index += 2) {
    if (
      ![
        "--config",
        "--output",
        "--test-rust",
        "--check-freshness",
        "--query",
        "--request",
        "--verify",
      ].includes(args[index]) ||
      !args[index + 1]
    )
      throw new Error(
        "Expected --config <json> and --output <directory>, or --test-rust <json>.",
      );
    parameters.set(args[index], args[index + 1]);
  }
  const studio = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const root = resolve(studio, "../..");
  if (parameters.has("--query")) {
    const directory = parameters.get("--query");
    const graph = JSON.parse(
      readFileSync(join(directory, "graph.json"), "utf8"),
    );
    const input = JSON.parse(readFileSync(parameters.get("--request"), "utf8"));
    const requests = input.requests ?? [input];
    if (!Array.isArray(requests) || requests.length < 1 || requests.length > 10)
      throw new Error("Supply 1-10 graph queries.");
    const result = requests.map((request) => queryGraph(graph, request));
    const output = join(directory, "query-results.json");
    writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
    console.log(
      `Saved ${result.length} queries to ${output}; truncated queries: ${result.filter((entry) => entry.truncated).length}. Run freshness separately before relying on current-source claims.`,
    );
    return;
  }
  if (parameters.has("--verify")) {
    const directory = parameters.get("--verify");
    const baseline = JSON.parse(
      readFileSync(join(directory, "files.json"), "utf8"),
    );
    const graph = JSON.parse(
      readFileSync(join(directory, "graph.json"), "utf8"),
    );
    const result = verifyGraph(root, baseline, graph);
    writeFileSync(
      join(directory, "validation.json"),
      `${JSON.stringify(result, null, 2)}\n`,
    );
    console.log(JSON.stringify(result));
    return;
  }
  if (parameters.has("--check-freshness")) {
    const directory = parameters.get("--check-freshness");
    const baseline = JSON.parse(
      readFileSync(join(directory, "files.json"), "utf8"),
    );
    const summary = JSON.parse(
      readFileSync(join(directory, "summary.json"), "utf8"),
    );
    assertFresh(root, baseline);
    if (
      execFileSync("git", ["rev-parse", "HEAD"], {
        cwd: root,
        encoding: "utf8",
      }).trim() !== summary.revision
    )
      throw new Error("Graph HEAD no longer matches the checkout.");
    console.log(
      `Graph freshness passed: ${baseline.files.length} file hashes, scope inventory and HEAD match.`,
    );
    return;
  }
  const configuration = JSON.parse(
    readFileSync(
      parameters.get("--config") ?? parameters.get("--test-rust"),
      "utf8",
    ),
  );
  if (!configuration.python || !isAbsolute(configuration.python))
    throw new Error(
      "Configuration must name an absolute Python >=3.11 executable with tree-sitter and tree-sitter-rust.",
    );
  if (parameters.has("--test-rust")) {
    execFileSync(
      configuration.python,
      ["-B", join(studio, "tests/relationship-map-rust.py")],
      { stdio: "inherit" },
    );
    return;
  }
  const output = parameters.get("--output");
  if (!output || !isAbsolute(output))
    throw new Error("An absolute output directory is required.");
  const summary = extractRepository(root, configuration.python, output);
  console.log(
    JSON.stringify({
      files: summary.files,
      nodes: summary.nodes,
      edges: summary.edges,
      status: summary.edgeStatus,
      cycleComponents: summary.moduleCycleComponents.length,
      summary: join(output, "summary.json"),
    }),
  );
}

export function extractRepository(
  root,
  python,
  output,
  selectedScopes = scopes,
) {
  const studio = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  prepareOutput(root, output);
  const write = (name, value) =>
    writeFileSync(join(output, name), `${JSON.stringify(value, null, 2)}\n`);
  const baseline = inventory(root, selectedScopes);
  const revision = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).trim();
  write("files.json", baseline);
  const { graph, modules, data } = graphForFiles(root, baseline.files);
  execFileSync(
    python,
    [
      "-B",
      join(studio, "scripts/relationshipMapRust.py"),
      "--root",
      root,
      "--inventory",
      join(output, "files.json"),
      "--output",
      join(output, "rust.json"),
    ],
    { stdio: "inherit" },
  );
  const rust = JSON.parse(readFileSync(join(output, "rust.json"), "utf8"));
  for (const node of rust.nodes) graph.node(node.id, node);
  graph.edges.push(...rust.edges);
  graph.diagnostics.push(...rust.diagnostics);
  for (const edge of graph.edges) {
    if (!graph.nodes.has(edge.source) || !graph.nodes.has(edge.target))
      throw new Error(`Dangling graph edge: ${edge.source} -> ${edge.target}`);
  }
  const cycles = moduleCycles(graph);
  const studioSource = "file:docs/spectrum-studio/src/";
  const sourceEdges = graph.edges.filter(
    (edge) =>
      ["import", "reexport"].includes(edge.kind) &&
      edge.phase === "value" &&
      edge.status === "resolved" &&
      edge.source.startsWith(studioSource) &&
      edge.target.startsWith(studioSource),
  );
  const sourceCycles = moduleCycles({ edges: sourceEdges });
  const coupling = [...graph.nodes.keys()]
    .filter((id) => id.startsWith(studioSource))
    .map((id) => ({
      file: id.slice(5),
      importers: [
        ...new Set(
          sourceEdges
            .filter((edge) => edge.target === id)
            .map((edge) => edge.source.slice(5)),
        ),
      ].sort(),
      dependencies: [
        ...new Set(
          sourceEdges
            .filter((edge) => edge.source === id)
            .map((edge) => edge.target.slice(5)),
        ),
      ].sort(),
    }));
  const counts = (key) =>
    Object.fromEntries(
      [...new Set(graph.edges.map((edge) => edge[key]))]
        .filter((value) => value !== undefined)
        .sort()
        .map((value) => [
          value,
          graph.edges.filter((edge) => edge[key] === value).length,
        ]),
    );
  const sourceHash = hash(JSON.stringify(baseline.files));
  const summary = {
    formatVersion: 1,
    generatedAt: new Date().toISOString(),
    revision,
    sourceHash,
    scopes: selectedScopes,
    provenance: {
      node: process.version,
      typescript: ts.version,
      ...rust.provenance,
    },
    files: baseline.files.length,
    nodes: graph.nodes.size,
    edges: graph.edges.length,
    edgeKinds: counts("kind"),
    edgeStatus: counts("status"),
    modules: { ...modules, configurations: undefined },
    data,
    rust: rust.statistics,
    relationshipCoverage: Object.fromEntries(
      [...new Set(graph.edges.map((edge) => edge.kind))]
        .sort()
        .map((kind) => [
          kind,
          Object.fromEntries(
            ["resolved", "external", "unresolved"].map((status) => [
              status,
              graph.edges.filter(
                (edge) => edge.kind === kind && edge.status === status,
              ).length,
            ]),
          ),
        ]),
    ),
    moduleCycleComponents: cycles.map((cycle) => cycle.members),
    diagnostics: graph.diagnostics.length,
    freshness:
      "all included hashes and inventory rechecked before finalization",
    limits: [
      "Import edges describe source declarations, not executed or emitted behavior; cycles are runtime-eligible syntax SCCs.",
      "Rust module/use/include edges are tree-sitter syntax evidence; Cargo cfg, macro expansion, traits and symbol resolution are not evaluated.",
      "Function calls, Jotai read/write subscriptions and runtime data propagation are not comprehensively mapped.",
      "Dynamic imports without literal arguments and import.meta.glob are not resolved or expanded.",
      "Bare imports without a compiler resolution remain unresolved, not assumed external.",
      "Schema anchors, nested $id base scopes and registry-name semantics are not fully resolved.",
      "Explicit canonical mode assignments are mapped; fallback/cascade behavior is not executed.",
      "CLI subprocess and computed filesystem/generator paths need reviewed cross-language evidence.",
      "Data-flow, semantic duplication, behavior equivalence and performance require source/tests beyond this graph.",
      "No dependency sources, excluded outputs, external services, browser scenarios or whole-monorepo coverage.",
      "Content hashes identify dirty inputs; they do not archive source bytes or guarantee future freshness.",
      "Module resolution uses installed dependency metadata; the source fingerprint is not a hermetic environment snapshot.",
      "Moon task YAML, registry-name semantics and full filesystem/CLI data flow are not extracted.",
    ],
  };
  write("graph.json", { nodes: [...graph.nodes.values()], edges: graph.edges });
  write("cycles.json", cycles);
  write("architecture.json", {
    studioSourceCycles: sourceCycles,
    mostImported: [...coupling]
      .sort((a, b) => b.importers.length - a.importers.length)
      .slice(0, 20),
    mostDependencies: [...coupling]
      .sort((a, b) => b.dependencies.length - a.dependencies.length)
      .slice(0, 20),
    unresolvedExports: graph.edges.filter(
      (edge) => edge.kind === "package_export" && edge.status === "unresolved",
    ),
    crossScopeImports: graph.edges.filter(
      (edge) =>
        edge.source.startsWith("file:docs/spectrum-studio/") &&
        edge.target.startsWith("file:") &&
        !edge.target.startsWith("file:docs/spectrum-studio/"),
    ),
  });
  write("diagnostics.json", graph.diagnostics);
  write(
    "unresolved.json",
    graph.edges.filter((edge) => edge.status === "unresolved"),
  );
  write("resolution-configurations.json", modules.configurations);
  assertFresh(root, baseline, selectedScopes);
  if (
    execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: root,
      encoding: "utf8",
    }).trim() !== revision
  )
    throw new Error(
      "HEAD changed during extraction; this run is not finalized.",
    );
  write("summary.json", summary);
  return summary;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main(process.argv.slice(2));
