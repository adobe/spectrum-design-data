// Copyright 2026 Adobe. All rights reserved.

// Removes exact duplicate relationship records: two records in the same file with equal
// scope, context and `$ref` (or inline value). The first copy is kept. A copy whose `uuid`
// is referenced anywhere else in the repo is kept instead of (or as well as) the first, so
// no reference is orphaned. Re-running on deduplicated data changes nothing.
//
// Usage: node scripts/dedupe-relationship-records.mjs [--check] [<dir>]
// --check exits 1 if any duplicate remains. Run prettier on the changed files after.

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g;

const canon = (v) =>
  v && typeof v === "object"
    ? Array.isArray(v)
      ? `[${v.map(canon).join(",")}]`
      : `{${Object.keys(v)
          .sort()
          .map((k) => `${JSON.stringify(k)}:${canon(v[k])}`)
          .join(",")}}`
    : JSON.stringify(v);

const identity = (r) =>
  `${canon(r.scope)}|${r.context ?? ""}|${r.$ref ?? canon(r.value)}`;

/** Indexes of duplicate records to drop. `referenced(uuid)` marks a copy that must stay. */
export function duplicates(records, referenced = () => false) {
  const groups = new Map();
  records.forEach((r, i) => {
    const k = identity(r);
    groups.set(k, [...(groups.get(k) ?? []), i]);
  });
  const drop = new Set();
  for (const idx of groups.values()) {
    if (idx.length < 2) continue;
    const keep = idx.filter((i) => referenced(records[i].uuid));
    if (!keep.length) keep.push(idx[0]);
    for (const i of idx) if (!keep.includes(i)) drop.add(i);
  }
  return drop;
}

/** Counts of every uuid-shaped string across tracked text files. */
function uuidCounts(root) {
  const counts = new Map();
  const files = execFileSync("git", ["ls-files", "-z"], {
    cwd: root,
    maxBuffer: 1 << 28,
  })
    .toString()
    .split("\0")
    .filter(
      (f) => f && !/(lock|\.lock|\.wasm|\.png|\.svg|\.cast|\.gif)$/.test(f),
    );
  for (const f of files) {
    let text;
    try {
      if (statSync(join(root, f)).size > 20e6) continue;
      text = readFileSync(join(root, f), "utf8");
    } catch {
      continue;
    }
    for (const m of text.match(UUID) ?? [])
      counts.set(m, (counts.get(m) ?? 0) + 1);
  }
  return counts;
}

function main() {
  const args = process.argv.slice(2);
  const check = args.includes("--check");
  const dir = resolve(
    args.find((a) => !a.startsWith("--")) ?? join(here, "../relationships"),
  );
  const root = execFileSync("git", ["rev-parse", "--show-toplevel"], {
    cwd: dir,
  })
    .toString()
    .trim();
  const counts = uuidCounts(root);
  // A record's own `"uuid"` line is one occurrence; any more is a reference.
  const referenced = (u) => u && (counts.get(u) ?? 0) > 1;
  let total = 0;
  for (const f of readdirSync(dir)
    .filter((n) => n.endsWith(".json"))
    .sort()) {
    const path = join(dir, f);
    const records = JSON.parse(readFileSync(path, "utf8"));
    const drop = duplicates(records, referenced);
    total += drop.size;
    if (drop.size && !check) {
      writeFileSync(
        path,
        `${JSON.stringify(
          records.filter((_, i) => !drop.has(i)),
          null,
          2,
        )}\n`,
      );
    }
  }
  console.log(
    `${check ? "found" : "removed"} ${total} duplicate relationship records`,
  );
  if (check && total) process.exit(1);
}

// Self-check: first copy kept, referenced copy kept instead, distinct records untouched.
function selfCheck() {
  const rec = (uuid, over = {}) => ({
    scope: { component: "a", property: "p" },
    $ref: "t",
    uuid,
    ...over,
  });
  const eq = (a, b) => {
    if (JSON.stringify([...a]) !== JSON.stringify(b))
      throw new Error(`${[...a]} != ${b}`);
  };
  eq(duplicates([rec("1"), rec("2"), rec("3")]), [1, 2]);
  eq(
    duplicates([rec("1"), rec("2")], (u) => u === "2"),
    [0],
  );
  eq(
    duplicates([rec("1"), rec("2"), rec("3")], (u) => u !== "2"),
    [1],
  );
  eq(
    duplicates([rec("1"), rec("2", { context: "x" }), rec("3", { $ref: "u" })]),
    [],
  );
  eq(
    duplicates([
      { scope: {}, value: 1 },
      { scope: {}, value: 1 },
      { scope: {}, value: 2 },
    ]),
    [1],
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  selfCheck();
  main();
}
