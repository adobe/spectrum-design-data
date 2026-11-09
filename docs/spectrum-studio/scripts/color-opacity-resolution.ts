// Copyright 2026 Adobe. All rights reserved.
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import type { AnalysisInput } from "../src/features/design-data/comparison";
import { canonicalJson } from "../src/features/design-data/canonicalJson";
import {
  resolutionRequests,
  VALUE_CONTEXT_POLICY,
  type ResolvedModeValue,
} from "../src/features/design-data/colorOpacityAssessment";

export async function resolveColorOpacityValues(
  input: AnalysisInput,
  root: string,
  sdk?: string,
  reference?: AnalysisInput,
): Promise<AnalysisInput> {
  const executable = sdk ?? join(root, "sdk/target/debug/design-data");
  try {
    const binary = await stat(executable);
    async function checkSources(directory: string): Promise<void> {
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) await checkSources(path);
        else if (
          entry.name.endsWith(".rs") &&
          (await stat(path)).mtimeMs > binary.mtimeMs
        )
          throw new Error(
            "The SDK binary predates resolver sources; run moon run sdk:build.",
          );
      }
    }
    await Promise.all(
      ["core", "cli"].map((crate) =>
        checkSources(join(root, "sdk", crate, "src")),
      ),
    );
    const engine = createHash("sha256")
      .update(await readFile(executable))
      .digest("hex");
    const requests = resolutionRequests(input, reference);
    const raw = await new Promise<string>((resolve, reject) => {
      const child = spawn(executable, ["resolve-values"], {
        stdio: ["pipe", "pipe", "pipe"],
      });
      let stdout = "",
        stderr = "";
      const timer = setTimeout(() => {
        child.kill();
        reject(new Error("Token resolution timed out."));
      }, 30000);
      child.on("error", reject);
      child.stdout.setEncoding("utf8").on("data", (chunk: string) => {
        stdout += chunk;
      });
      child.stderr.setEncoding("utf8").on("data", (chunk: string) => {
        stderr += chunk;
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        if (code === 0) resolve(stdout);
        else
          reject(
            new Error(
              `Canonical value resolver failed (${code}): ${stderr.trim()}`,
            ),
          );
      });
      child.stdin.on("error", reject);
      child.stdin.end(canonicalJson(requests));
    });
    const rows: unknown = JSON.parse(raw);
    if (
      !Array.isArray(rows) ||
      rows.length !== requests.queries.length ||
      rows.some((row: unknown, index: number) => {
        if (!row || typeof row !== "object") return true;
        const entry = row as Record<string, unknown>;
        return (
          entry.id !== requests.queries[index].id ||
          canonicalJson(entry.context) !==
            canonicalJson(requests.queries[index].context) ||
          !Array.isArray(entry.chain) ||
          entry.chain.some((hop: unknown) => typeof hop !== "string") ||
          !(entry.issue === null || typeof entry.issue === "string")
        );
      })
    )
      throw new Error("Canonical value resolver returned an invalid batch.");
    return {
      ...input,
      resolvedValues: rows as ResolvedModeValue[],
      valueResolution: {
        datasetHash: input.source.hash,
        referenceHash: reference?.source.hash,
        engine,
        contextPolicy: VALUE_CONTEXT_POLICY,
      },
    };
  } catch (error) {
    const message = `Token resolution unavailable: ${error instanceof Error ? error.message : String(error)}`;
    return {
      ...input,
      resolvedValues: undefined,
      valueResolution: {
        datasetHash: input.source.hash,
        engine: "unavailable",
        contextPolicy: VALUE_CONTEXT_POLICY,
        error: message,
      },
      limitations: [...input.limitations, message],
    };
  }
}
