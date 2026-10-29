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
import {
  assessmentGitWatchPaths,
  attachReferenceAssessment,
} from "./design-data-assessment";

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
      const roots = [
        resolve(root, "packages/design-data"),
        resolve(root, "packages/design-data-spec"),
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
      const invalidate = (path: string) => {
        const file = resolve(path);
        if (
          (!roots.some((directory) => file.startsWith(`${directory}/`)) &&
            !documents.includes(file)) ||
          file.includes("/node_modules/")
        )
          return;
        cached = undefined;
        notify();
      };
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
      server.watcher
        .on("change", invalidate)
        .on("add", invalidate)
        .on("unlink", invalidate);
      server.httpServer?.once("close", () => {
        closed = true;
        gitWatchers.forEach((watcher) => watcher.close());
        clearTimeout(timer);
        server.watcher
          .off("change", invalidate)
          .off("add", invalidate)
          .off("unlink", invalidate);
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
