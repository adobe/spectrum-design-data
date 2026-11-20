// Copyright 2026 Adobe. All rights reserved.
import { dirname, resolve } from "node:path";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { existsSync, statSync, watch, type FSWatcher } from "node:fs";
import { loadEnv, type Plugin } from "vite";
import {
  appRoot,
  loadReferenceInput,
  referenceRoot,
} from "./design-data-loader";
import type { AnalysisInput } from "../src/features/design-data/comparison";
import { packagedAnalysisReference } from "./packaged-analysis-reference";
import { designDataCopyPaths, practiceCopySummary } from "./designDataCopy";
import {
  assessmentGitWatchPaths,
  attachReferenceAssessment,
} from "./design-data-assessment";

export const analysisWatchEvents = [
  "change",
  "add",
  "unlink",
  "addDir",
  "unlinkDir",
] as const;

export function analysisInputInvalidator(
  roots: readonly string[],
  documents: readonly string[],
  invalidate: () => void,
): (path: string) => void {
  return (path) => {
    const file = resolve(path);
    if (
      !file.includes("/node_modules/") &&
      (roots.some(
        (directory) => file === directory || file.startsWith(`${directory}/`),
      ) ||
        documents.includes(file))
    )
      invalidate();
  };
}

export function designDataAnalysisPlugin(): Plugin {
  return {
    name: "design-data-analysis",
    apply: "serve",
    async configureServer(server) {
      const root = referenceRoot(server.config.mode);
      const sdk = loadEnv(
        server.config.mode,
        appRoot,
        "DESIGN_DATA_",
      ).DESIGN_DATA_SDK;
      const datasetRoots = [
        resolve(root, "packages/design-data"),
        resolve(root, "packages/design-data-spec"),
      ];
      const roots = [
        ...datasetRoots,
        resolve(appRoot, "src/data"),
        resolve(appRoot, "data/studio"),
        resolve(appRoot, "src/features"),
        resolve(appRoot, "scripts"),
      ];
      const documents = [
        resolve(appRoot, "docs/design-data-target-contract.md"),
        resolve(appRoot, "docs/design-data-pr-1454-review.md"),
        resolve(appRoot, "data/design-data.source.json"),
      ];
      let cached: Promise<AnalysisInput> | undefined;
      let revision = 0;
      let timer: ReturnType<typeof setTimeout> | undefined;
      let gitWatchers: FSWatcher[] = [];
      let closed = false;
      const notify = () => {
        clearTimeout(timer);
        revision += 1;
        timer = setTimeout(
          () =>
            server.ws.send({
              type: "custom",
              event: "analysis:changed",
              data: { revision },
            }),
          200,
        );
      };
      const invalidate = analysisInputInvalidator(roots, documents, () => {
        notify();
      });
      const invalidateDataset = analysisInputInvalidator(
        datasetRoots,
        [],
        () => {
          cached = undefined;
        },
      );
      const gitFiles = await assessmentGitWatchPaths(root);
      const bindGitWatchers = () => {
        gitWatchers.forEach((watcher) => watcher.close());
        gitWatchers = [];
        if (closed) return;
        for (const file of gitFiles) {
          let directory = dirname(file);
          while (!existsSync(directory) && directory !== dirname(directory))
            directory = dirname(directory);
          try {
            const watcher = watch(directory, (_event, filename) => {
              if (!filename) {
                cached = undefined;
                notify();
                return;
              }
              const changed = resolve(directory, filename.toString());
              if (changed === file || file.startsWith(`${changed}/`)) {
                cached = undefined;
                notify();
                bindGitWatchers();
              }
            });
            watcher.on("error", () => watcher.close());
            gitWatchers.push(watcher);
          } catch {
            /* Metadata is still rechecked on manual refresh when filesystem watching is unavailable. */
          }
        }
      };
      bindGitWatchers();
      server.watcher.add([...roots, ...documents]);
      for (const event of analysisWatchEvents) {
        server.watcher.on(event, invalidateDataset);
        server.watcher.on(event, invalidate);
      }
      server.httpServer?.once("close", () => {
        closed = true;
        gitWatchers.forEach((watcher) => watcher.close());
        clearTimeout(timer);
        for (const event of analysisWatchEvents) {
          server.watcher.off(event, invalidateDataset);
          server.watcher.off(event, invalidate);
        }
      });
      server.middlewares.use(
        "/__design-data/reference",
        async (request, response) => {
          if (
            request.method !== "GET" ||
            (request.url !== "/" && request.url !== "")
          ) {
            response.statusCode = 400;
            response.end(
              "Only the configured reference endpoint is available.",
            );
            return;
          }
          try {
            cached ??= loadReferenceInput(root, sdk);
            // Assessment hashes/refs are checked on every request; a manual refresh
            // never reuses stale reviewed metadata just because dataset bytes are cached.
            const assessed = await attachReferenceAssessment(
              await cached,
              root,
            );
            // Checked per request (cheap hashing) so a refreshed copy shows at once.
            const input: AnalysisInput = {
              ...assessed,
              source: {
                ...assessed.source,
                practiceCopy: practiceCopySummary(
                  designDataCopyPaths(root, appRoot),
                ),
              },
            };
            response.setHeader("Content-Type", "application/json");
            response.setHeader("Cache-Control", "no-store");
            response.end(JSON.stringify(input));
          } catch (error) {
            response.statusCode = 500;
            response.end(
              error instanceof Error ? error.message : String(error),
            );
          }
        },
      );
    },
  };
}

/** Hash of the Studio source that shapes Analysis results (cache version). */
export async function analysisCodeVersion(
  entries = [resolve(appRoot, "src/features/design-data/analysis.worker.ts")],
) {
  const hash = createHash("sha256");
  for (const file of await analysisCodeFiles(entries))
    hash.update(file.slice(appRoot.length)).update(await readFile(file));
  return hash.digest("hex").slice(0, 16);
}

const relativeImport =
  /\bfrom\s*["'](\.{1,2}\/[^"'?]+)[^"']*["']|\bimport\s*\(?\s*["'](\.{1,2}\/[^"'?]+)[^"']*["']/g;

/**
 * Local files the entries load at runtime, following relative imports.
 * Type-only imports are skipped; package imports are covered by the
 * reference and engine parts of the cache key.
 */
export async function analysisCodeFiles(entries: readonly string[]) {
  const found = new Set<string>();
  const pending = [...entries];
  while (pending.length) {
    const file = pending.pop()!;
    if (found.has(file)) continue;
    found.add(file);
    if (!/\.[cm]?[jt]sx?$/.test(file)) continue;
    const source = await readFile(file, "utf8");
    for (const match of source.matchAll(relativeImport)) {
      const start = Math.max(
        source.lastIndexOf("import", match.index),
        source.lastIndexOf("export", match.index),
      );
      if (/^(?:import|export)\s+type\b/.test(source.slice(start, match.index)))
        continue;
      const target = resolve(dirname(file), match[1] ?? match[2]);
      const resolved = [
        target,
        `${target}.ts`,
        `${target}.tsx`,
        `${target}.js`,
        `${target}/index.ts`,
      ].find(
        (candidate) => existsSync(candidate) && statSync(candidate).isFile(),
      );
      if (resolved && !found.has(resolved)) pending.push(resolved);
    }
  }
  return [...found].sort();
}

export function analysisCodeVersionPlugin(): Plugin {
  const id = "\0virtual:analysis-code-version";
  const roots = [
    resolve(appRoot, "src/features"),
    resolve(appRoot, "src/data"),
    resolve(appRoot, "data/studio"),
  ];
  return {
    name: "analysis-code-version",
    resolveId(source) {
      if (source === "virtual:analysis-code-version") return id;
    },
    async load(source) {
      if (source !== id) return;
      return `export default ${JSON.stringify(await analysisCodeVersion())};`;
    },
    configureServer(server) {
      const invalidate = analysisInputInvalidator(roots, [], () => {
        const module = server.moduleGraph.getModuleById(id);
        if (module) server.moduleGraph.invalidateModule(module);
      });
      for (const event of analysisWatchEvents)
        server.watcher.on(event, invalidate);
    },
  };
}

export function packagedAnalysisPlugin(): Plugin {
  const id = "\0virtual:analysis-reference";
  let production = false;
  return {
    name: "packaged-analysis-reference",
    configResolved(config) {
      production = config.command === "build";
    },
    resolveId(source) {
      if (source === "virtual:analysis-reference") return id;
    },
    async load(source) {
      if (source !== id) return;
      if (!production) return 'export default "/__design-data/reference";';
      const snapshot = await packagedAnalysisReference(
        resolve(appRoot, "../.."),
      );
      const reference = this.emitFile({
        type: "asset",
        name: "analysis-reference.json",
        source: snapshot,
      });
      return `export default import.meta.ROLLUP_FILE_URL_${reference};`;
    },
  };
}
