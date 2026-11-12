// Copyright 2026 Adobe. All rights reserved.
import { dirname, resolve } from "node:path";
import { existsSync, watch, type FSWatcher } from "node:fs";
import { loadEnv, type Plugin } from "vite";
import {
  appRoot,
  loadReferenceInput,
  referenceRoot,
} from "./design-data-loader";
import type { AnalysisInput } from "../src/features/design-data/comparison";
import { packagedAnalysisReference } from "./packaged-analysis-reference";
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
        resolve(appRoot, "src/features"),
        resolve(appRoot, "scripts"),
      ];
      const documents = [
        resolve(appRoot, "docs/design-data-target-contract.md"),
        resolve(appRoot, "docs/design-data-pr-1454-review.md"),
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
            const input = await attachReferenceAssessment(await cached, root);
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
