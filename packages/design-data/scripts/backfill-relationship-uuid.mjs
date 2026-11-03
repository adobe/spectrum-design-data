// Copyright 2026 Adobe. All rights reserved.

// Gives every relationship record without a `uuid` a deterministic one (UUIDv5).
// Existing uuids are never changed. The id derives from the record's identity: its
// file, canonical scope, `$ref` (or value), context and the n-th occurrence of that
// identity in the file, so re-running the script on the same data changes nothing.
//
// Usage: node scripts/backfill-relationship-uuid.mjs [--check] <dir>...
// --check exits 1 if any record lacks a uuid. Run prettier on the changed files after.

import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

// Fixed namespace for design-data relationship ids; never change it.
const NAMESPACE = "7c9d5f0e-52a1-4b8e-9d57-3f1c6a2e8b40";

const canon = (v) =>
  v && typeof v === "object"
    ? Array.isArray(v)
      ? `[${v.map(canon).join(",")}]`
      : `{${Object.keys(v)
          .sort()
          .map((k) => `${JSON.stringify(k)}:${canon(v[k])}`)
          .join(",")}}`
    : JSON.stringify(v);

export function uuidV5(name, namespace = NAMESPACE) {
  const ns = Buffer.from(namespace.replaceAll("-", ""), "hex");
  const h = createHash("sha1").update(ns).update(name).digest();
  h[6] = (h[6] & 0x0f) | 0x50;
  h[8] = (h[8] & 0x3f) | 0x80;
  const x = h.subarray(0, 16).toString("hex");
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
}

/** Adds a uuid to each record lacking one; returns the number added. */
export function backfill(records, file) {
  const seen = new Map();
  let added = 0;
  for (const r of records) {
    if (r.uuid) continue;
    const identity = `${file}|${canon(r.scope)}|${r.$ref ?? canon(r.value)}|${r.context ?? ""}`;
    const n = seen.get(identity) ?? 0;
    seen.set(identity, n + 1);
    r.uuid = uuidV5(`${identity}|${n}`);
    added++;
  }
  return added;
}

function main() {
  const args = process.argv.slice(2);
  const check = args.includes("--check");
  let total = 0;
  for (const dir of args.filter((a) => a !== "--check")) {
    for (const f of readdirSync(dir).filter((n) => n.endsWith(".json")).sort()) {
      const path = join(dir, f);
      const records = JSON.parse(readFileSync(path, "utf8"));
      const added = backfill(records, basename(f));
      total += added;
      if (added && !check) writeFileSync(path, `${JSON.stringify(records, null, 2)}\n`);
    }
  }
  console.log(`${check ? "missing" : "added"} ${total} relationship uuids`);
  if (check && total) process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
