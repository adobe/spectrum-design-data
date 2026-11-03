// Copyright 2026 Adobe. All rights reserved.

import { diffSnapshots } from "./diff.js";
import {
  datasetRevision,
  resolveCommit,
  revisions,
  snapshotAt,
  sourceOf,
} from "./git.js";

export {
  classify,
  diffSnapshots,
  pairRelationships,
  propertyChanges,
  resolveValue,
} from "./diff.js";
export { sourceOf } from "./git.js";

/** Build the draft changelog for one component between two git refs. */
export function generateChangelog({
  component,
  from,
  to = "HEAD",
  cwd = process.cwd(),
}) {
  const root = "packages/design-data";
  const base = resolveCommit(from, cwd);
  const head = resolveCommit(to, cwd);
  let prev = snapshotAt(base, component, { cwd, root });
  const out = [];
  for (const rev of revisions(base, head, { cwd, root })) {
    const next = snapshotAt(rev.sha, component, { cwd, root });
    const changes = diffSnapshots(prev, next);
    prev = next;
    if (!changes.length) continue;
    const source = sourceOf(rev);
    out.push({
      commit: rev.sha,
      date: rev.date,
      source,
      entries: changes.map((c, i) => ({
        id: `${rev.sha.slice(0, 8)}-${i}`,
        ...c,
      })),
    });
  }
  return {
    component,
    datasetRevision: datasetRevision(head, { cwd, root }),
    from: { ref: from, commit: base },
    to: { ref: to, commit: head },
    revisions: out,
  };
}
