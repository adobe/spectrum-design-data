// Copyright 2026 Adobe. All rights reserved.

import { execFileSync } from "node:child_process";

const git = (args, cwd) =>
  execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 1 << 28,
  }).trim();

const blobCache = new Map();
const readBlob = (sha, cwd) => {
  if (!blobCache.has(sha))
    blobCache.set(sha, JSON.parse(git(["cat-file", "blob", sha], cwd)));
  return blobCache.get(sha);
};

/** The dataset slice of one commit: the component's relationships and all tokens by uuid. */
export function snapshotAt(
  commit,
  component,
  { cwd, root = "packages/design-data" },
) {
  const files = git(
    ["ls-tree", "-r", commit, "--", `${root}/tokens`, `${root}/relationships`],
    cwd,
  )
    .split("\n")
    .filter(Boolean)
    .map((l) => {
      const [meta, path] = l.split("\t");
      return { sha: meta.split(" ")[2], path };
    });
  const tokens = new Map();
  const rels = [];
  for (const f of files) {
    if (!f.path.endsWith(".json")) continue;
    const data = readBlob(f.sha, cwd);
    if (!Array.isArray(data)) continue;
    if (f.path.startsWith(`${root}/relationships/`)) {
      rels.push(...data.filter((r) => r?.scope?.component === component));
    }
    if (
      f.path.startsWith(`${root}/tokens/`) ||
      f.path.startsWith(`${root}/relationships/`)
    ) {
      for (const t of data) if (t?.uuid) tokens.set(t.uuid, t);
    }
  }
  return { rels, tokens };
}

/** First-parent commits after `from` that touch the dataset, oldest first. */
export function revisions(from, to, { cwd, root = "packages/design-data" }) {
  const out = git(
    [
      "log",
      "--first-parent",
      "--reverse",
      "--format=%H%x1f%cs%x1f%s",
      `${from}..${to}`,
      "--",
      root,
    ],
    cwd,
  );
  return out
    .split("\n")
    .filter(Boolean)
    .map((l) => {
      const [sha, date, subject] = l.split("\x1f");
      return { sha, date, subject };
    });
}

/** The last commit at or before `ref` that touched the dataset: its revision, stable across unrelated commits. */
export const datasetRevision = (ref, { cwd, root = "packages/design-data" }) =>
  git(["log", "-1", "--format=%H", ref, "--", root], cwd);

export const resolveCommit = (ref, cwd) =>
  git(["rev-parse", `${ref}^{commit}`], cwd);

/** Squash subjects end with `(#123)`; otherwise the commit itself is the source. */
export function sourceOf({ sha, subject }) {
  const m = subject.match(/\(#(\d+)\)\s*$/);
  return m
    ? {
        type: "pr",
        number: Number(m[1]),
        title: subject.replace(/\s*\(#\d+\)\s*$/, ""),
        url: `https://github.com/adobe/spectrum-design-data/pull/${m[1]}`,
      }
    : { type: "commit", sha, subject };
}
