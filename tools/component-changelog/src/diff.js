// Copyright 2026 Adobe. All rights reserved.

// Semantic diff of one component's relationships and the tokens they reference, between two
// dataset snapshots (spec/diff.md: tokens match by uuid; formatting and key order are ignored).

const canon = (v) =>
  v && typeof v === "object"
    ? Array.isArray(v)
      ? `[${v.map(canon).join(",")}]`
      : `{${Object.keys(v)
          .sort()
          .map((k) => `${JSON.stringify(k)}:${canon(v[k])}`)
          .join(",")}}`
    : JSON.stringify(v);

const same = (a, b) => canon(a) === canon(b);

/** Leaf-level property changes between two records, as dot paths (spec/diff.md). */
export function propertyChanges(a = {}, b = {}, path = "") {
  const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
  if (isObj(a) && isObj(b)) {
    return [...new Set([...Object.keys(a), ...Object.keys(b)])]
      .sort()
      .flatMap((k) => propertyChanges(a[k], b[k], path ? `${path}.${k}` : k));
  }
  return same(a, b) ? [] : [{ path, before: a, after: b }];
}

const DOC_FIELDS = new Set([
  "description",
  "deprecatedComment",
  "comment",
  "note",
  "rationale",
]);

/** visual/behavior | API | documentation | metadata, from the changed property path. */
export function classify(path) {
  const [head, second] = path.split(".");
  if (head === "context") return "documentation";
  if (DOC_FIELDS.has(second) || DOC_FIELDS.has(head)) return "documentation";
  if (head === "value" || head === "$ref") return "visual";
  if (head === "scope") return second === "options" ? "behavior" : "API";
  if (
    head === "name" ||
    head === "legacyKey" ||
    head === "lifecycle" ||
    head === "private"
  ) {
    return "API";
  }
  return "metadata";
}

const canonicalScope = (r) => canon(r.scope);

/** Identity of a relationship record: scope plus the token it binds (uuid when it has one). */
const relKey = (r) =>
  r.uuid ??
  `${canonicalScope(r)}#${r.context ?? ""}#${r.$ref ?? canon(r.value)}`;

/**
 * Pair relationships by uuid, else by scope + `$ref`. A leftover old and new record with the
 * same scope and no other candidates is the same binding re-pointed at another token.
 */
export function pairRelationships(oldRels, newRels) {
  const oldBy = new Map(oldRels.map((r) => [relKey(r), r]));
  const newBy = new Map(newRels.map((r) => [relKey(r), r]));
  const pairs = [];
  const lonelyOld = [];
  for (const [k, o] of oldBy) {
    if (newBy.has(k)) {
      pairs.push([o, newBy.get(k)]);
      newBy.delete(k);
    } else lonelyOld.push(o);
  }
  const lonelyNew = [...newBy.values()];
  const group = (list) => {
    const m = new Map();
    for (const r of list)
      m.set(canonicalScope(r), [...(m.get(canonicalScope(r)) ?? []), r]);
    return m;
  };
  const gOld = group(lonelyOld);
  const gNew = group(lonelyNew);
  const added = [];
  const removed = [];
  for (const [s, news] of gNew) {
    const olds = gOld.get(s) ?? [];
    if (olds.length === news.length) {
      olds.forEach((o, i) => pairs.push([o, news[i]]));
      gOld.delete(s);
    } else added.push(...news);
  }
  for (const olds of gOld.values()) removed.push(...olds);
  return { pairs, added, removed };
}

/** Terminal value of a token, following `$ref` aliases through `tokens` (uuid → record). */
export function resolveValue(uuid, tokens, seen = new Set()) {
  const t = tokens.get(uuid);
  if (!t || seen.has(uuid)) return { value: undefined, chain: [uuid] };
  if (t.$ref === undefined) return { value: t.value, chain: [uuid] };
  seen.add(uuid);
  const next = resolveValue(t.$ref, tokens, seen);
  return { value: next.value, chain: [uuid, ...next.chain] };
}

const describeScope = (r) => ({
  property: r.scope?.property,
  options: r.scope?.options,
});

/**
 * Entries for one revision step. `old`/`new` are snapshots `{ rels, tokens }` where `rels` are
 * the component's relationship records and `tokens` maps uuid → record (tokens and inline CTRs).
 */
export function diffSnapshots(oldSnap, newSnap) {
  const entries = [];
  const { pairs, added, removed } = pairRelationships(
    oldSnap.rels,
    newSnap.rels,
  );
  const contextsOf = (snap, uuid) => [
    ...new Set(
      snap.rels
        .filter((r) => r.$ref === uuid || r.uuid === uuid)
        .map((r) => r.context?.trim())
        .filter(Boolean),
    ),
  ];

  for (const r of added) {
    entries.push({
      kind: "relationship",
      change: "added",
      class: "visual",
      indirect: false,
      contexts: [r.context?.trim()].filter(Boolean),
      scope: describeScope(r),
      after: r.$ref ?? r.value,
    });
  }
  for (const r of removed) {
    entries.push({
      kind: "relationship",
      change: "removed",
      class: "visual",
      indirect: false,
      contexts: [r.context?.trim()].filter(Boolean),
      scope: describeScope(r),
      before: r.$ref ?? r.value,
    });
  }
  for (const [o, n] of pairs) {
    for (const c of propertyChanges(o, n)) {
      // An inline CTR is also a token: its value change is reported on the token below.
      if (n.uuid && (c.path === "value" || c.path.startsWith("lifecycle")))
        continue;
      entries.push({
        kind: "relationship",
        change: "updated",
        class: classify(c.path),
        indirect: false,
        contexts: [n.context?.trim()].filter(Boolean),
        scope: describeScope(n),
        path: c.path,
        before: c.before,
        after: c.after,
      });
    }
  }

  // Tokens the component's relationships reference, before or after, and their alias chains.
  const reach = (snap) => {
    const out = new Set();
    for (const r of snap.rels) {
      for (const id of [r.$ref, r.uuid]) {
        if (id) resolveValue(id, snap.tokens).chain.forEach((c) => out.add(c));
      }
    }
    return out;
  };
  const involved = new Set([...reach(oldSnap), ...reach(newSnap)]);
  const direct = new Set();
  for (const id of involved) {
    const o = oldSnap.tokens.get(id);
    const n = newSnap.tokens.get(id);
    const ctx = [
      ...new Set([...contextsOf(oldSnap, id), ...contextsOf(newSnap, id)]),
    ];
    if (!o || !n) continue; // added or removed tokens reach the sheet through their relationship entry
    for (const c of propertyChanges(o, n)) {
      direct.add(id);
      entries.push({
        kind: "token",
        change: "updated",
        class: classify(c.path),
        indirect: false,
        contexts: ctx,
        token: id,
        path: c.path,
        before: c.before,
        after: c.after,
      });
    }
  }
  // Indirect: a bound token whose own record is untouched but whose resolved value moved.
  const bound = new Set(
    [...oldSnap.rels, ...newSnap.rels]
      .map((r) => r.$ref ?? r.uuid)
      .filter(Boolean),
  );
  for (const id of bound) {
    if (direct.has(id)) continue;
    const o = resolveValue(id, oldSnap.tokens);
    const n = resolveValue(id, newSnap.tokens);
    if (
      o.value === undefined ||
      n.value === undefined ||
      same(o.value, n.value)
    )
      continue;
    if (!oldSnap.tokens.has(id) || !newSnap.tokens.has(id)) continue;
    entries.push({
      kind: "token",
      change: "updated",
      class: "visual",
      indirect: true,
      contexts: [
        ...new Set([...contextsOf(oldSnap, id), ...contextsOf(newSnap, id)]),
      ],
      token: id,
      via: n.chain.filter((c) => direct.has(c)),
      path: "value",
      before: o.value,
      after: n.value,
    });
  }
  return entries;
}
