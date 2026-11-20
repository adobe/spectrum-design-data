// Copyright 2026 Adobe. All rights reserved.
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  TOKEN_PLACEMENT_RULE_VERSION,
  TOKEN_TIERS,
  placeTokens,
  type PlacementToken,
  type TokenTier,
} from "../src/features/design-data/tokenFilePlacement";
import type { PracticeCopySummary } from "../src/features/design-data/comparison";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Folders and files copied from packages/design-data. */
export const COPIED_ENTRIES = [
  "dataset.json",
  "naming-exceptions.json",
  "components",
  "fields",
  "guidelines",
  "icons",
  "mode-sets",
  "registry",
  "relationships",
  "tokens",
  "visuals",
] as const;

/** Dataset folders left out of the copy, with the reason. */
export const OMITTED_ENTRIES: Record<string, string> = {
  changelog:
    "Release history generated from git by `design-data changelog`; authoring never edits it.",
};

/** Mode contexts whose resolved values must match between source and copy. */
const RESOLUTION_CONTEXTS: string[][] = [
  [],
  ["--color-scheme", "dark"],
  ["--scale", "mobile"],
  ["--contrast", "high"],
];

export interface DesignDataCopyPaths {
  root: string;
  source: string;
  copy: string;
  record: string;
  sdk: string;
  schemas: string;
}

export function designDataCopyPaths(
  root = resolve(appRoot, "../.."),
  studio = appRoot,
): DesignDataCopyPaths {
  return {
    root,
    source: join(root, "packages/design-data"),
    copy: join(studio, "data/design-data"),
    record: join(studio, "data/design-data.source.json"),
    sdk: join(root, "sdk/target/debug/design-data"),
    schemas: join(root, "packages/design-data-spec/schemas"),
  };
}

export interface DesignDataSourceRecord {
  source: string;
  commit: string;
  sourceDirty: boolean | null;
  sdk: string;
  placementRule: number;
  omitted: Record<string, string>;
  /** SHA-256 of every copied source file, keyed by its path in the source. */
  files: Record<string, string>;
  tokens: {
    rows: number;
    concepts: number;
    tiers: Record<TokenTier, number>;
    files: Record<string, number>;
  };
}

export type DesignDataCopyStatus = "current" | "refresh-available" | "missing";

export interface DesignDataCopyFreshness {
  status: DesignDataCopyStatus;
  recordedCommit?: string;
  changed: string[];
  added: string[];
  removed: string[];
}

const sha256 = (data: Buffer | string) =>
  createHash("sha256").update(data).digest("hex");

function filesUnder(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && !entry.name.startsWith("."))
    .map((entry) =>
      relative(directory, join(entry.parentPath, entry.name))
        .split("\\")
        .join("/"),
    )
    .sort();
}

const isTokenFile = (file: string) =>
  file.startsWith("tokens/") && file.endsWith(".tokens.json");

/** Every copied file in the source package, as sorted relative paths. */
export function sourceDatasetFiles(source: string): string[] {
  return filesUnder(source)
    .filter((file) =>
      COPIED_ENTRIES.some(
        (entry) => file === entry || file.startsWith(`${entry}/`),
      ),
    )
    .sort();
}

/**
 * The exact text of each item in a JSON array file. Moving a token keeps its
 * original formatting, so the copy reads like a hand-edited upstream file.
 */
export function topLevelArrayItems(text: string): string[] {
  const items: string[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      if (depth === 1) throw new Error("Token files must hold only objects.");
      inString = true;
    } else if (char === "{" || char === "[") {
      if (depth === 0 && char !== "[")
        throw new Error("Token files must be JSON arrays.");
      if (depth === 1) {
        if (char !== "{")
          throw new Error("Token files must hold only objects.");
        start = index;
      }
      depth++;
    } else if (char === "}" || char === "]") {
      depth--;
      if (depth === 1 && start >= 0) {
        items.push(text.slice(start, index + 1));
        start = -1;
      }
    }
  }
  if (depth !== 0) throw new Error("Token file is not balanced JSON.");
  return items;
}

/** A token file built from the original item texts, in upstream style. */
export function serializeTokenFile(items: readonly string[]): string {
  return items.length ? `[\n  ${items.join(",\n  ")}\n]\n` : "[]\n";
}

interface TokenRow {
  file: string;
  token: PlacementToken;
  text: string;
}

function readTokenRows(directory: string): TokenRow[] {
  const rows: TokenRow[] = [];
  for (const file of filesUnder(directory).filter(isTokenFile)) {
    const text = readFileSync(join(directory, file), "utf8");
    const parsed: unknown = JSON.parse(text);
    const items = topLevelArrayItems(text);
    if (!Array.isArray(parsed) || parsed.length !== items.length)
      throw new Error(`${file} could not be split into tokens.`);
    items.forEach((item, index) => {
      const token = JSON.parse(item) as PlacementToken;
      if (JSON.stringify(token) !== JSON.stringify(parsed[index]))
        throw new Error(`${file} item ${index} did not split cleanly.`);
      rows.push({ file, token, text: item });
    });
  }
  return rows;
}

function runSdk(paths: DesignDataCopyPaths, args: string[]) {
  const result = spawnSync(paths.sdk, args, {
    encoding: "utf8",
    timeout: 120_000,
    maxBuffer: 512 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  return result;
}

function sdkOutput(paths: DesignDataCopyPaths, args: string[]): string {
  const result = runSdk(paths, args);
  if (result.status !== 0)
    throw new Error(
      `design-data ${args[0]} failed: ${result.stderr.trim() || result.status}`,
    );
  return result.stdout;
}

/** The official tier of every token row, as reported by the SDK. */
export function sdkTokenTiers(
  paths: DesignDataCopyPaths,
  dataset: string,
): Map<string, TokenTier> {
  const tiers = new Map<string, TokenTier>();
  for (const tier of TOKEN_TIERS) {
    const rows = JSON.parse(
      sdkOutput(paths, [
        "query",
        "--filter",
        `tier=${tier}`,
        "--format",
        "json",
        join(dataset, "tokens"),
      ]),
    ) as { uuid: string }[];
    for (const row of rows) {
      if (tiers.has(row.uuid))
        throw new Error(`SDK reported two tiers for ${row.uuid}.`);
      tiers.set(row.uuid, tier);
    }
  }
  return tiers;
}

function placeRows(rows: TokenRow[], tiers: ReadonlyMap<string, TokenTier>) {
  if (tiers.size !== rows.length)
    throw new Error(
      `SDK reported tiers for ${tiers.size} tokens, but the files hold ${rows.length}.`,
    );
  return placeTokens(
    rows.map((row) => row.token),
    (token) => tiers.get(token.uuid),
  );
}

function gitProvenance(paths: DesignDataCopyPaths) {
  try {
    const commit = execFileSync(
      "git",
      ["-C", paths.root, "rev-parse", "HEAD"],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    ).trim();
    const status = execFileSync(
      "git",
      [
        "-C",
        paths.root,
        "status",
        "--porcelain",
        "--",
        relative(paths.root, paths.source),
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    return { commit, sourceDirty: Boolean(status.trim()) };
  } catch {
    return { commit: "unavailable", sourceDirty: null };
  }
}

/** Every file the copy should hold, keyed by its path inside the copy. */
export function buildDesignDataCopy(paths: DesignDataCopyPaths): {
  outputs: Map<string, Buffer | string>;
  record: DesignDataSourceRecord;
} {
  const files = sourceDatasetFiles(paths.source);
  const outputs = new Map<string, Buffer | string>();
  const hashes: Record<string, string> = {};
  for (const file of files) {
    const data = readFileSync(join(paths.source, file));
    hashes[file] = sha256(data);
    if (!isTokenFile(file)) outputs.set(file, data);
  }
  const rows = readTokenRows(paths.source);
  const tiers = sdkTokenTiers(paths, paths.source);
  const { files: placed } = placeRows(rows, tiers);
  const textOf = new Map(rows.map((row) => [row.token, row.text]));
  const tokenFiles: Record<string, number> = {};
  for (const [file, tokens] of [...placed].sort(([left], [right]) =>
    left < right ? -1 : 1,
  )) {
    outputs.set(
      `tokens/${file}`,
      serializeTokenFile(tokens.map((token) => textOf.get(token)!)),
    );
    tokenFiles[file] = tokens.length;
  }
  const tierCounts = Object.fromEntries(
    TOKEN_TIERS.map((tier) => [
      tier,
      [...tiers.values()].filter((value) => value === tier).length,
    ]),
  ) as Record<TokenTier, number>;
  const version = sdkOutput(paths, ["--version"]).trim();
  return {
    outputs,
    record: {
      source: relative(paths.root, paths.source).split("\\").join("/"),
      ...gitProvenance(paths),
      sdk: version,
      placementRule: TOKEN_PLACEMENT_RULE_VERSION,
      omitted: OMITTED_ENTRIES,
      files: hashes,
      tokens: {
        rows: rows.length,
        concepts: new Set(
          rows.map((row) => row.token.conceptId ?? row.token.uuid),
        ).size,
        tiers: tierCounts,
        files: tokenFiles,
      },
    },
  };
}

export function readDesignDataSourceRecord(
  paths: DesignDataCopyPaths,
): DesignDataSourceRecord | undefined {
  if (!existsSync(paths.record)) return undefined;
  return JSON.parse(
    readFileSync(paths.record, "utf8"),
  ) as DesignDataSourceRecord;
}

/**
 * Whether the live package still matches the commit the copy was taken from.
 * Cheap enough for the Analysis view: it only hashes the copied source files.
 */
export function designDataCopyFreshness(
  paths: DesignDataCopyPaths,
): DesignDataCopyFreshness {
  const record = readDesignDataSourceRecord(paths);
  if (!record || !existsSync(paths.copy))
    return { status: "missing", changed: [], added: [], removed: [] };
  const live = Object.fromEntries(
    sourceDatasetFiles(paths.source).map((file) => [
      file,
      sha256(readFileSync(join(paths.source, file))),
    ]),
  );
  const changed = Object.keys(live).filter(
    (file) => file in record.files && record.files[file] !== live[file],
  );
  const added = Object.keys(live).filter((file) => !(file in record.files));
  const removed = Object.keys(record.files).filter((file) => !(file in live));
  return {
    status:
      changed.length || added.length || removed.length
        ? "refresh-available"
        : "current",
    recordedCommit: record.commit,
    changed,
    added,
    removed,
  };
}

/**
 * The freshness summary shown on the Analysis view. Never throws: a broken
 * copy is reported, not a reason to stop the comparison.
 */
export function practiceCopySummary(
  paths: DesignDataCopyPaths,
): PracticeCopySummary {
  try {
    const freshness = designDataCopyFreshness(paths);
    return {
      status: freshness.status,
      ...(freshness.recordedCommit
        ? { recordedCommit: freshness.recordedCommit }
        : {}),
      changedFiles:
        freshness.changed.length +
        freshness.added.length +
        freshness.removed.length,
    };
  } catch (error) {
    return {
      status: "unavailable",
      changedFiles: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/** Copy files that differ from the outputs, plus files the outputs no longer use. */
export function staleDesignDataCopy(
  paths: DesignDataCopyPaths,
  outputs: ReadonlyMap<string, Buffer | string>,
): string[] {
  const stale = [...outputs]
    .filter(([file, data]) => {
      const path = join(paths.copy, file);
      return (
        !existsSync(path) ||
        !readFileSync(path).equals(
          typeof data === "string" ? Buffer.from(data) : data,
        )
      );
    })
    .map(([file]) => file);
  for (const file of filesUnder(paths.copy))
    if (!outputs.has(file)) stale.push(file);
  return stale.sort();
}

/** Refreshes the copy and its source record; returns the copy files it changed. */
export function writeDesignDataCopy(paths: DesignDataCopyPaths): string[] {
  const { outputs, record } = buildDesignDataCopy(paths);
  const changed = staleDesignDataCopy(paths, outputs);
  for (const file of changed) {
    const path = join(paths.copy, file);
    const data = outputs.get(file);
    if (data === undefined) rmSync(path);
    else {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, data);
    }
  }
  writeFileSync(paths.record, `${JSON.stringify(record, null, 2)}\n`);
  return changed;
}

const byUuid = (rows: TokenRow[]) =>
  new Map(rows.map((row) => [row.token.uuid, JSON.stringify(row.token)]));

function exportDataset(
  paths: DesignDataCopyPaths,
  dataset: string,
  context: string[],
): string {
  return sdkOutput(paths, [
    "export",
    join(dataset, "tokens"),
    "--mode-sets-path",
    join(dataset, "mode-sets"),
    "--format",
    "json",
    ...context,
  ]);
}

/**
 * Tokens whose resolved record differs between two `export --format json`
 * outputs. The SDK lists tokens in no fixed order, so records are matched by
 * their `uuid` (or their name when there is none).
 */
export function exportDifferences(source: string, copy: string): string[] {
  const keyed = (text: string) => {
    const records = JSON.parse(text) as Record<string, unknown>[];
    if (!Array.isArray(records))
      throw new Error("The SDK export was not a list.");
    return new Map(
      records.map((record) => [
        typeof record.uuid === "string"
          ? record.uuid
          : JSON.stringify(record.name),
        JSON.stringify(record),
      ]),
    );
  };
  const before = keyed(source);
  const after = keyed(copy);
  const keys = new Set([...before.keys(), ...after.keys()]);
  return [...keys].filter((key) => before.get(key) !== after.get(key)).sort();
}

/**
 * The proof check. While the live package is unchanged since the recorded
 * commit, the copy must be exactly what the live package and placement rule
 * produce. Once the package moves on, the difference is reported as
 * information and the copy is only checked against itself.
 */
export function checkDesignDataCopy(paths: DesignDataCopyPaths): {
  errors: string[];
  notes: string[];
} {
  const errors: string[] = [];
  const notes: string[] = [];
  const record = readDesignDataSourceRecord(paths);
  if (!record || !existsSync(paths.copy))
    return {
      errors: ["The practice copy is missing. Run the snapshot with --write."],
      notes,
    };
  if (record.placementRule !== TOKEN_PLACEMENT_RULE_VERSION)
    errors.push(
      `The copy uses placement rule ${record.placementRule}, but the current rule is ${TOKEN_PLACEMENT_RULE_VERSION}. Run the snapshot with --write.`,
    );
  const copyRows = readTokenRows(paths.copy);
  const freshness = designDataCopyFreshness(paths);
  if (freshness.status === "current") {
    const { outputs } = buildDesignDataCopy(paths);
    for (const file of staleDesignDataCopy(paths, outputs))
      errors.push(
        `${file} differs from what the live package and placement rule produce.`,
      );
    const source = byUuid(readTokenRows(paths.source));
    const copy = byUuid(copyRows);
    for (const [uuid, text] of source)
      if (copy.get(uuid) !== text)
        errors.push(`Token ${uuid} is missing or different in the copy.`);
    for (const uuid of copy.keys())
      if (!source.has(uuid)) errors.push(`Token ${uuid} is not in the source.`);
    const diff = JSON.parse(
      sdkOutput(paths, [
        "diff",
        join(paths.source, "tokens"),
        join(paths.copy, "tokens"),
        "--format",
        "json",
      ]),
    ) as Record<string, unknown[]>;
    for (const [kind, entries] of Object.entries(diff))
      if (Array.isArray(entries) && entries.length)
        errors.push(`SDK diff reports ${entries.length} ${kind} token(s).`);
    for (const context of RESOLUTION_CONTEXTS) {
      const label = context.join(" ") || "default modes";
      const differences = exportDifferences(
        exportDataset(paths, paths.source, context),
        exportDataset(paths, paths.copy, context),
      );
      if (differences.length)
        errors.push(
          `Resolved values differ (${label}) for ${differences.length} token(s), such as ${differences.slice(0, 3).join(", ")}.`,
        );
    }
  } else {
    const list = (label: string, files: string[]) =>
      files.length
        ? [
            `${label}: ${files.slice(0, 10).join(", ")}${files.length > 10 ? `, and ${files.length - 10} more` : ""}`,
          ]
        : [];
    notes.push(
      `Refresh available: packages/design-data changed since ${record.commit}.`,
      ...list("Changed", freshness.changed),
      ...list("Added", freshness.added),
      ...list("Removed", freshness.removed),
    );
    const { placements } = placeRows(
      copyRows,
      sdkTokenTiers(paths, paths.copy),
    );
    for (const row of copyRows) {
      const expected = `tokens/${placements.get(row.token.uuid)!.file}`;
      if (row.file !== expected)
        errors.push(
          `Token ${row.token.uuid} is in ${row.file}, not ${expected}.`,
        );
    }
    for (const [file, hash] of Object.entries(record.files)) {
      if (isTokenFile(file)) continue;
      const path = join(paths.copy, file);
      if (!existsSync(path) || sha256(readFileSync(path)) !== hash)
        errors.push(`${file} no longer matches the recorded source file.`);
    }
  }
  const validation = runSdk(paths, [
    "validate-dataset",
    paths.copy,
    "--format",
    "json",
    "--spec-schemas",
    paths.schemas,
  ]);
  try {
    const report = JSON.parse(validation.stdout) as {
      valid: boolean;
      errors: { file: string; message: string; instance_path?: string }[];
    };
    for (const error of report.errors)
      errors.push(
        `SDK validation: ${relative(paths.copy, error.file)}${error.instance_path ?? ""}: ${error.message}`,
      );
    if (!report.valid && !report.errors.length)
      errors.push("SDK validation failed without diagnostics.");
  } catch {
    errors.push(
      `SDK validation did not return a report: ${validation.stderr.trim()}`,
    );
  }
  notes.push(
    `${copyRows.length} token rows in ${new Set(copyRows.map((row) => row.file)).size} files; tiers ${TOKEN_TIERS.map((tier) => `${tier} ${record.tokens.tiers[tier]}`).join(", ")}.`,
  );
  return { errors, notes };
}
