// Copyright 2026 Adobe. All rights reserved.
import { execFile } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import type { PluginHandlerContext } from "@getpaseo/plugin/server";
import type { PluginSettings } from "@getpaseo/plugin/server";
import { buildRoadmap, type discussEpic } from "../shared/roadmap";
import type { preferences } from "../shared/settings";
import type { RpcInput } from "@getpaseo/plugin";

const run = promisify(execFile);

export async function handleProjects(_input: object, { paseo }: PluginHandlerContext) {
  const { projects } = await paseo.projects.list();
  const seen = new Map<string, string>();
  for (const p of projects ?? []) {
    const dir = p.projectRootPath;
    if (dir && existsSync(path.join(dir, ".beads"))) seen.set(dir, p.projectDisplayName || path.basename(dir));
  }
  return { projects: [...seen].map(([p, name]) => ({ path: p, name })) };
}

export async function handleLoad({ path: dir }: { path: string }, { paseo }: PluginHandlerContext) {
  // Only run bd inside a project Paseo already knows about.
  const { projects } = await paseo.projects.list();
  if (!(projects ?? []).some((p) => p.projectRootPath === dir)) throw new Error(`Unknown project: ${dir}`);
  const { stdout } = await run("bd", ["list", "--all", "--limit=0", "--json"], {
    cwd: dir,
    maxBuffer: 1 << 28,
    timeout: 60_000,
    env: { ...process.env, NO_COLOR: "1" },
  });
  return buildRoadmap(JSON.parse(stdout));
}

const POLL_MS = 1000;

/** Newest mtime of the dolt journal and manifest under every database in `.beads/dolt`. */
function dbStamp(root: string): number {
  let newest = 0;
  for (const db of readdirSync(root)) {
    for (const f of ["vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv", "manifest"]) {
      try {
        newest = Math.max(newest, statSync(path.join(root, db, ".dolt", "noms", f)).mtimeMs);
      } catch {}
    }
  }
  return newest;
}

/** Tell the screen when the beads database under `dir` changes. */
export async function handleWatch(
  { path: dir }: { path: string },
  { paseo, push, signal }: PluginHandlerContext & { push: (event: { type: "changed" }) => void; signal: AbortSignal },
) {
  const { projects } = await paseo.projects.list();
  if (!(projects ?? []).some((p) => p.projectRootPath === dir)) throw new Error(`Unknown project: ${dir}`);
  const root = path.join(dir, ".beads", "dolt");
  if (!existsSync(root)) throw new Error(`No beads database in ${dir}`);
  // shortcut: dolt writes its journal in place, which fs.watch does not report on macOS, so stat it once a second (two cheap stats).
  let last = dbStamp(root);
  const timer = setInterval(() => {
    const now = dbStamp(root);
    if (now !== last) {
      last = now;
      void push({ type: "changed" });
    }
  }, POLL_MS);
  signal.addEventListener("abort", () => clearInterval(timer), { once: true });
}

export async function handleDiscuss(
  i: RpcInput<typeof discussEpic>,
  { paseo }: PluginHandlerContext,
  settings: PluginSettings<(typeof preferences)["schema"]>,
) {
  const state = await settings.read();
  let id = state.status === "ready" ? state.values.orchestratorAgentId.trim() : "";
  let label = id;
  if (!id) {
    const { entries } = await paseo.agents.list();
    const found = entries
      .map((e) => e.agent)
      .filter((a) => !a.archivedAt && (a.title ?? "").startsWith("Orchestrator"))
      .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))[0];
    if (!found) throw new Error('No agent titled "Orchestrator…" found. Set its id in Settings → Plugins → Roadmap.');
    id = found.id;
    label = found.title ?? id;
  }
  const lines = [
    `Garth, from the Roadmap screen, about epic ${i.epicId}: ${i.title}`,
    `Now: P${i.priority}, ${i.total - i.done} left (${i.done}/${i.total} closed, ${i.inProgress} in progress)${i.blockedBy.length ? `, waiting on ${i.blockedBy.join("; ")}` : ""}.`,
    i.suggestedPriority !== null ? `Suggested priority: P${i.suggestedPriority}.` : "",
    i.note.trim() ? `Note: ${i.note.trim()}` : "",
    "Answer in chat. If a plan or priority changes, record it in beads (bd update --priority, bd dep add) before replying.",
  ].filter(Boolean);
  await paseo.agents.ref(id).send(lines.join("\n"));
  return { sentTo: label };
}
