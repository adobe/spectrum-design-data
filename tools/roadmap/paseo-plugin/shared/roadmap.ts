// Copyright 2026 Adobe. All rights reserved.
import { defineRpc, defineSubscription } from "@getpaseo/plugin";
import { z } from "zod";

export const leafSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.string(),
  layer: z.number(),
});

export const epicSchema = z.object({
  id: z.string(),
  title: z.string(),
  depth: z.number(),
  start: z.number(),
  end: z.number(),
  done: z.number(),
  total: z.number(),
  leaves: z.array(leafSchema),
  parentTitle: z.string().nullable(),
  blockedBy: z.array(z.string()),
  dependents: z.number(),
  inProgress: z.number(),
  priority: z.number(),
  group: z.enum(["now", "next", "later", "independent"]),
});

export type Epic = z.infer<typeof epicSchema>;

export const listProjects = defineRpc({
  name: "roadmap.projects",
  input: z.object({}),
  output: z.object({ projects: z.array(z.object({ path: z.string(), name: z.string() })) }),
});

export const loadRoadmap = defineRpc({
  name: "roadmap.load",
  input: z.object({ path: z.string() }),
  output: z.object({ epics: z.array(epicSchema), columns: z.number() }),
});

export const watchRoadmap = defineSubscription({
  name: "roadmap.watch",
  input: z.object({ path: z.string() }),
  event: z.object({ type: z.literal("changed") }),
});

export const discussEpic = defineRpc({
  name: "roadmap.discuss",
  input: z.object({
    epicId: z.string(),
    title: z.string(),
    priority: z.number(),
    blockedBy: z.array(z.string()),
    done: z.number(),
    total: z.number(),
    inProgress: z.number(),
    note: z.string(),
    suggestedPriority: z.number().int().min(0).max(4).nullable(),
  }),
  output: z.object({ sentTo: z.string() }),
});

interface Raw {
  id: string;
  title?: string;
  status?: string;
  issue_type?: string;
  priority?: number;
  dependencies?: { depends_on_id: string; type: string }[] | null;
}

/** Order open epics by dependency. Column = 1 + last column of everything blocking it (or an ancestor). */
export function buildRoadmap(issues: Raw[]): { epics: Epic[]; columns: number } {
  const by = new Map(issues.map((i) => [i.id, i]));
  const kids = new Map<string, string[]>();
  const parent = new Map<string, string>();
  const blockers = new Map<string, string[]>();
  for (const i of issues) {
    for (const d of i.dependencies ?? []) {
      if (!by.has(d.depends_on_id)) continue;
      if (d.type === "parent-child") {
        kids.set(d.depends_on_id, [...(kids.get(d.depends_on_id) ?? []), i.id]);
        parent.set(i.id, d.depends_on_id);
      } else if (d.type === "blocks") {
        blockers.set(i.id, [...(blockers.get(i.id) ?? []), d.depends_on_id]);
      }
    }
  }
  const live = (id: string) => by.get(id)?.status !== "closed";
  const isEpic = (id: string) => by.get(id)?.issue_type === "epic" && (kids.get(id)?.length ?? 0) > 0;
  const memo = new Map<string, [number, number] | null>();
  const busy = new Set<string>();

  function range(id: string): [number, number] | null {
    if (memo.has(id)) return memo.get(id)!;
    if (busy.has(id)) return null;
    busy.add(id);
    let lo = 0;
    for (let p: string | undefined = id; p; p = parent.get(p)) {
      for (const b of blockers.get(p) ?? []) {
        const r = live(b) ? range(b) : null;
        if (r) lo = Math.max(lo, r[1] + 1);
      }
    }
    let res: [number, number] | null;
    if (isEpic(id)) {
      const sub = (kids.get(id) ?? []).filter(live).map(range).filter((r): r is [number, number] => !!r);
      res = sub.length
        ? [Math.max(lo, Math.min(...sub.map((r) => r[0]))), Math.max(lo, ...sub.map((r) => r[1]))]
        : null;
    } else res = [lo, lo];
    busy.delete(id);
    memo.set(id, res);
    return res;
  }

  const subtree = (id: string): string[] => [id, ...(kids.get(id) ?? []).flatMap(subtree)];
  const ancestors = (id: string): string[] => {
    const a: string[] = [];
    for (let p = parent.get(id); p; p = parent.get(p)) a.push(p);
    return a;
  };
  // The epic that owns an issue (itself if it is an epic), used to name what blocks an epic.
  const owner = (id: string): string | undefined => (isEpic(id) ? id : parent.get(id));
  const dependentsOf = new Map<string, Set<string>>();
  for (const [blocked, bs] of blockers) {
    const ob = owner(blocked);
    for (const b of bs) {
      const o = owner(b);
      if (!o || !ob || o === ob || subtree(o).includes(ob) || subtree(ob).includes(o)) continue;
      for (const a of [o, ...ancestors(o)]) dependentsOf.set(a, (dependentsOf.get(a) ?? new Set()).add(ob));
    }
  }

  const leavesOf = (id: string): string[] =>
    (kids.get(id) ?? []).flatMap((c) => (isEpic(c) ? leavesOf(c) : [c]));

  const epics: Epic[] = [];
  const depthOf = (id: string) => {
    let d = 0;
    for (let p = parent.get(id); p; p = parent.get(p)) d++;
    return d;
  };
  function visit(id: string) {
    const r = live(id) ? range(id) : null;
    if (!r) return;
    const leaves = leavesOf(id);
    const sub = subtree(id);
    const nodes = [...sub, ...ancestors(id)];
    const blockedBy = [...new Set(nodes.flatMap((n) => blockers.get(n) ?? []).filter(live).map(owner).filter((o): o is string => !!o && !sub.includes(o) && !ancestors(id).includes(o)))].map((o) => by.get(o)!.title ?? o);
    const dependents = [...(dependentsOf.get(id) ?? [])].length;
    const inProgress = leaves.filter((l) => by.get(l)!.status === "in_progress").length;
    const linked = blockedBy.length > 0 || dependents > 0;
    const group = inProgress > 0 || (linked && blockedBy.length === 0) ? "now" : !linked ? "independent" : r[0] <= 1 ? "next" : "later";
    epics.push({
      parentTitle: parent.has(id) ? (by.get(parent.get(id)!)?.title ?? null) : null,
      blockedBy,
      dependents,
      inProgress,
      priority: by.get(id)!.priority ?? 2,
      group,
      id,
      title: by.get(id)!.title ?? id,
      depth: depthOf(id),
      start: r[0],
      end: r[1],
      total: leaves.length,
      done: leaves.filter((l) => !live(l)).length,
      leaves: leaves
        .filter(live)
        .map((l) => ({ id: l, title: by.get(l)!.title ?? l, status: by.get(l)!.status ?? "open", layer: range(l)?.[0] ?? 0 }))
        .sort((a, b) => a.layer - b.layer),
    });
    (kids.get(id) ?? [])
      .filter(isEpic)
      .sort((a, b) => (range(a)?.[0] ?? 1e9) - (range(b)?.[0] ?? 1e9))
      .forEach(visit);
  }
  issues
    .filter((i) => !parent.has(i.id) && isEpic(i.id))
    .sort((a, b) => (range(a.id)?.[0] ?? 1e9) - (range(b.id)?.[0] ?? 1e9))
    .forEach((i) => visit(i.id));
  return { epics, columns: Math.max(0, ...epics.map((e) => e.end)) + 1 };
}
