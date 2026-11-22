// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

// Decomposes fused `scope.property` names on live relationship records (`component-height-75`,
// `component-edge-to-text-100`) into a real property term plus structure: a size pin, a part,
// a `between`. This is the identity migration of proposal 012 / 018 (level 2 of `design-data
// status`). Rules, in order:
//   edge    a generic `edge` endpoint in `between` becomes axis endpoints (D1b): `start/end` ->
//           start-edge, end-edge; `top/bottom` -> top-edge, bottom-edge. The record is split in
//           two (the first keeps its uuid, the second gets a deterministic v5 uuid).
//   spacing a fused name on a record with `between` becomes `space-between` (D1b).
//   size    a 50/75/100/200/300 (or small/medium/large/extra-large) suffix becomes `options.size` xs/s/m/l/xl when the component
//           declares that size, else it is dropped (50 is always judgement). The referenced
//           token's size must agree.
//   modifier a name modifier (-pill-, -quiet, -visual-only, -compact, -spacious, -editable,
//           -side, horizontal-, vertical-) becomes an option pin only if the component has
//           that option; otherwise the record is refused (judgement).
//   constraint the context keyword picks minimum-/maximum-width/height; else the name base,
//           else the referenced token's property, when it is a registered term.
//   color   `color` without `attribute` gets background / border / shadow from its role.
//           "Background and border" becomes two records (background, border) sharing the
//           $ref; the first keeps its uuid, the second gets a v5 uuid (decision A114).
//           `background-color` and `border-color` records are held for PR 1454 and never touched.
//   tie     records that would share one identity and differ only by $ref get `options.size`
//           from the referenced token's size word, when the component declares that size and
//           every record of the group has a different token size (never for script tokens, type
//           styles, or desktop/mobile pairs). Only groups with a record decomposed in this run or with a
//           `between` are pinned, so a run does not rewrite unrelated records.
// Skipped: deprecated records, `legacyKey` records (unless --legacy-key), recipes.
// Anything the rules cannot settle is reported as judgement and never written.
//
// Usage: node scripts/decompose-fused-properties.mjs [--report|--write|--check]
//          [--family a,b] [--totals] [--legacy-key] [--hold-color-split] [<design-data dir>]
// --report (default) prints the old -> new table and totals; --write applies the mechanical
// changes; --check exits 1 if any mechanical change is pending. Run prettier on written files.

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { uuidV5 } from "./backfill-relationship-uuid.mjs";

const here = fileURLToPath(new URL(".", import.meta.url));

const SIZE = {
  50: "xs",
  75: "s",
  100: "m",
  200: "l",
  300: "xl",
  small: "s",
  medium: "m",
  large: "l",
  "extra-large": "xl",
};
const HELD = new Set(["background-color", "border-color"]);
const MODIFIERS = [
  { re: /(^|-)pill(-|$)/, option: "shape", value: "pill" },
  { re: /(^|-)quiet(-|$)/, option: "isQuiet", value: true },
  { re: /(^|-)visual-only(-|$)/, option: "isIconOnly", value: true },
  { re: /(^|-)compact(-|$)/, option: "density", value: "compact" },
  { re: /(^|-)spacious(-|$)/, option: "density", value: "spacious" },
  { re: /(^|-)editable(-|$)/, option: "isEditable", value: true },
  { re: /(^|-)side(-|$)/, option: "labelPosition", value: "side" },
  { re: /^horizontal(-|$)/, option: "orientation", value: "horizontal" },
  { re: /^vertical(-|$)/, option: "orientation", value: "vertical" },
];
const AXES = {
  "start/end": ["start-edge", "end-edge"],
  "top/bottom": ["top-edge", "bottom-edge"],
};
/** The axis of a generic `edge`: the context words, else the token's padding property. */
function edgeAxis(label, token) {
  if (/\b(start|end)\b/.test(label)) return AXES["start/end"];
  if (/\b(top|bottom)\b/.test(label)) return AXES["top/bottom"];
  const p = token?.name?.property;
  if (p === "padding-horizontal") return AXES["start/end"];
  if (p === "padding-vertical") return AXES["top/bottom"];
  return null;
}
const SPACING = /(^|-)(to|padding|spacing|gap|space|between)(-|$)/;

/** The property of a record whose `$ref` is a typography composite (SPEC-105). */
const TYPE_STYLE = "type-style";
const isTypographyComposite = (t) =>
  Boolean(t?.["$schema"]?.endsWith("token-types/typography.json"));

/** Script-specific (CJK) tokens are never pinned by size: they would outrank their unpinned latin siblings. */
const isScriptToken = (t) =>
  Boolean(t?.name?.script || t?.name?.legacyKey?.startsWith("cjk-"));

const canon = (v) =>
  v && typeof v === "object"
    ? Array.isArray(v)
      ? `[${v.map(canon).join(",")}]`
      : `{${Object.keys(v)
          .sort()
          .map((k) => `${JSON.stringify(k)}:${canon(v[k])}`)
          .join(",")}}`
    : JSON.stringify(v);

/** The `status.rs` structure test: `-to-`, a trailing number, or a part name as a whole segment. */
export function hasStructure(property, parts = []) {
  const padded = `-${property}-`;
  return (
    padded.includes("-to-") ||
    /^\d+$/.test(property.split("-").pop()) ||
    parts.some((p) => padded.includes(`-${p}-`))
  );
}

/** Same convention as backfill-relationship-uuid.mjs: the n-th occurrence of an identity. */
function newUuid(record, ctx) {
  const identity = `${ctx.file}|${canon(record.scope)}|${record.$ref ?? canon(record.value)}|${record.context ?? ""}`;
  let n = 0;
  let id;
  while (ctx.used.has((id = uuidV5(`${identity}|${n}`)))) n++;
  ctx.used.add(id);
  return id;
}

export const isLive = (r) => !r.lifecycle?.deprecatedIn;

function optionHas(component, option, value) {
  const o = component.options?.[option];
  if (!o) return false;
  if (o.type === "boolean") return typeof value === "boolean";
  return (o.values ?? []).some((v) => (v.value ?? v) === value);
}

/**
 * Plans one record. `ctx`: { component, tokens (uuid -> token), terms:Set, attributes:Set,
 * legacyKey:boolean }. Returns { status, rule, notes, next: [record...] }, where status is
 * ok | mechanical | judgement | held | skipped, and `next` replaces the record when mechanical.
 */
export function plan(record, ctx) {
  const scope = record.scope ?? {};
  const property = scope.property ?? "";
  const parts = (ctx.component.anatomy ?? []).map((p) => p.name);
  const out = (status, rule, notes = [], next = null) => ({
    status,
    rule,
    notes,
    next,
  });
  const judgement = (rule, ...notes) => out("judgement", rule, notes);

  if (HELD.has(property)) return out("held", "held for 1454");

  if (
    isTypographyComposite(ctx.tokens.get(record.$ref)) &&
    property !== TYPE_STYLE &&
    record.value === undefined &&
    !(record.legacyKey && !ctx.legacyKey)
  ) {
    return out(
      "mechanical",
      "type-style",
      [
        `${property || "(none)"} -> ${TYPE_STYLE}: the $ref is a typography composite`,
      ],
      [{ ...record, scope: { ...scope, property: TYPE_STYLE } }],
    );
  }

  const color = property === "color" && !scope.attribute;
  const genericEdge =
    scope.between?.from === "edge" || scope.between?.to === "edge";
  const fused = hasStructure(property, parts);
  if (!color && !fused && !genericEdge) {
    return out("ok", "", ctx.terms.has(property) ? [] : ["non-term property"]);
  }
  if (record.legacyKey && !ctx.legacyKey) return out("skipped", "legacyKey");
  if (record.value !== undefined && record.$ref === undefined)
    return out("skipped", "own value");

  const label =
    `${record.context ?? ""} ${(record.contextRole ?? []).join(" ")}`.toLowerCase();

  if (color) {
    if (/background (and|&|\/) border/.test(label)) {
      if (!ctx.attributes.has("background") || !ctx.attributes.has("border"))
        return judgement("color split", "background/border are not attributes");
      if (ctx.holdColorSplit)
        return judgement(
          "color split",
          "held (--hold-color-split): splitting an ambiguous group raises the same-pin-set baseline",
        );
      const border = {
        ...structuredClone(record),
        scope: { ...scope, attribute: "border" },
      };
      border.uuid = newUuid(border, ctx);
      return out(
        "mechanical",
        "color split",
        [],
        [{ ...record, scope: { ...scope, attribute: "background" } }, border],
      );
    }
    const attribute = /\bbackground\b/.test(label)
      ? "background"
      : /\bborder\b/.test(label)
        ? "border"
        : /\bshadow\b/.test(label)
          ? "shadow"
          : null;
    if (!attribute || !ctx.attributes.has(attribute)) {
      return out("ok", "", ["color without box role: no attribute needed"]);
    }
    return out(
      "mechanical",
      "color attribute",
      [],
      [{ ...record, scope: { ...scope, attribute } }],
    );
  }

  const next = structuredClone(record);
  const s = next.scope;
  const notes = [];
  let rule = [];
  let base = property;
  let twinBetween = null;

  const sizeMatch = base.match(
    /^(.*?)-(50|75|100|200|300|small|medium|large|extra-large)$/,
  );
  let size = null;
  if (sizeMatch) {
    base = sizeMatch[1];
    size = SIZE[sizeMatch[2]];
    const token = ctx.tokens.get(record.$ref);
    if (isScriptToken(token)) {
      return judgement(
        "script token",
        `${token.name.legacyKey ?? token.name.property}: a script-specific token is never pinned by size (it would outrank its unpinned latin siblings)`,
      );
    }
    const tokenSize = token?.name?.size;
    if (tokenSize && tokenSize !== size) {
      return judgement(
        "size",
        `suffix ${sizeMatch[2]} is ${size}, token size is ${tokenSize}`,
      );
    }
    if (!optionHas(ctx.component, "size", size)) {
      if (sizeMatch[2] === "50") {
        return judgement(
          "size",
          `-50 (${size}) and the component has no ${size}; proposed: drop the suffix (no pin)`,
        );
      }
      notes.push(`size ${size} not declared: suffix dropped`);
      size = null;
    }
    if (size) {
      if (s.options?.size !== undefined && s.options.size !== size) {
        return judgement("size", `already pins size ${s.options.size}`);
      }
      s.options = { ...s.options, size };
      rule.push("size");
    } else rule.push("size dropped");
  }

  for (const m of MODIFIERS) {
    if (!m.re.test(base)) continue;
    if (!optionHas(ctx.component, m.option, m.value)) {
      return judgement(
        "modifier",
        `${m.option}=${m.value} is not an option of ${ctx.component.name}`,
      );
    }
    if (
      s.options?.[m.option] !== undefined &&
      s.options[m.option] !== m.value
    ) {
      return judgement(
        "modifier",
        `already pins ${m.option}=${s.options[m.option]}`,
      );
    }
    s.options = { ...s.options, [m.option]: m.value };
    rule.push("modifier");
  }

  if (genericEdge) {
    const axis = edgeAxis(label, ctx.tokens.get(record.$ref));
    if (!axis)
      return judgement(
        "edge",
        "no start/end or top/bottom in the context, and the token is not padding-horizontal/vertical",
      );
    const [first, second] = axis;
    const other =
      scope.between.from === "edge" ? scope.between.to : scope.between.from;
    if (!other || other === "edge")
      return judgement("edge", "both endpoints are edge");
    s.between = { from: first, to: other };
    twinBetween = { from: other, to: second };
    rule.push("edge split");
  }

  if (fused) {
    let newProperty;
    if (s.between) {
      if (!SPACING.test(base))
        return judgement(
          "spacing",
          `${property} has between but is not a spacing name`,
        );
      newProperty = "space-between";
      rule.push("spacing");
    } else if (/(^|-)to-/.test(base) || /-to-/.test(base)) {
      return judgement(
        "between",
        `${property}: X-to-Y without between; endpoints to be resolved by hand`,
      );
    } else {
      const kw =
        /\bmin(imum)?[ -](width|height)\b/.exec(label) ??
        /\bmax(imum)?[ -](width|height)\b/.exec(label);
      const stripped = base.replace(/^component-/, "");
      const tokenProperty = ctx.tokens.get(record.$ref)?.name?.property;
      if (kw) {
        newProperty = `${kw[0].startsWith("min") ? "minimum" : "maximum"}-${kw[kw.length - 1]}`;
        rule.push("constraint");
      } else if (ctx.terms.has(stripped)) {
        newProperty = stripped;
        rule.push("name base");
      } else if (tokenProperty && ctx.terms.has(tokenProperty)) {
        newProperty = tokenProperty;
        rule.push("token property");
      } else
        return judgement(
          "property",
          `${property}: base is not a registered term`,
        );
    }
    if (!ctx.terms.has(newProperty))
      return judgement("property", `${newProperty} is not a registered term`);
    const roles = (record.contextRole ?? []).filter((r) => !parts.includes(r));
    const agree = (r) =>
      r === newProperty ||
      (newProperty === "space-between" &&
        ["spacing", "padding", "gap", "icon"].includes(r)) ||
      newProperty.endsWith(r) ||
      (newProperty === "size" && r === "icon");
    if (roles.length && !roles.some(agree)) {
      return judgement(
        "role",
        `contextRole ${roles.join("/")} disagrees with ${newProperty}`,
      );
    }
    s.property = newProperty;
    if (!s.part) {
      const role = (record.contextRole ?? []).find((r) => parts.includes(r));
      if (!role) return judgement("part", `${property}: no part`);
      s.part = role;
      rule.push("part");
    }
  }
  const result = [next];
  if (twinBetween) {
    const twin = structuredClone(next);
    twin.scope.between = twinBetween;
    twin.uuid = newUuid(twin, ctx);
    result.push(twin);
  }
  return out("mechanical", rule.join(" + "), notes, result);
}

function loadContext(dir) {
  const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
  const list = (d) =>
    readdirSync(join(dir, d))
      .filter((f) => f.endsWith(".json"))
      .sort();
  const components = new Map(
    list("components").map((f) => [
      f.slice(0, -5),
      readJson(join(dir, "components", f)),
    ]),
  );
  const tokens = new Map();
  for (const f of list("tokens"))
    for (const t of readJson(join(dir, "tokens", f))) tokens.set(t.uuid, t);
  const ids = (f) =>
    new Set(readJson(join(dir, "registry", f)).values.map((v) => v.id));
  return {
    components,
    tokens,
    terms: ids("property-terms.json"),
    attributes: ids("attributes.json"),
    files: list("relationships"),
  };
}

const sizeOf = (r, ctx) => {
  const token = ctx.tokens.get(r.$ref);
  const size = token?.name?.size;
  return !isScriptToken(token) && optionHas(ctx.component, "size", size)
    ? size
    : null;
};

/** Pins options.size from the token on records that would otherwise share one identity. */
function pinTies(records, results, ctx) {
  const groups = new Map();
  results.forEach((res, i) => {
    if (res.status !== "ok" && res.status !== "mechanical") return;
    for (const r of res.next ?? [records[i]]) {
      const sc = r.scope;
      if (
        r.value !== undefined ||
        sc.options?.size !== undefined ||
        sc.property === TYPE_STYLE
      )
        continue;
      const k = canon({ ...sc, component: undefined });
      groups.set(k, [
        ...(groups.get(k) ?? []),
        { i, r, changed: res.status === "mechanical" },
      ]);
    }
  });
  for (const members of groups.values()) {
    const sizes = members.map(({ r }) => sizeOf(r, ctx));
    // One record per size: desktop/mobile pairs are told apart by the token's scale already.
    if (
      members.length < 2 ||
      sizes.some((z) => !z) ||
      new Set(sizes).size < members.length ||
      !members.some(({ r, changed }) => changed || r.scope.between)
    )
      continue;
    members.forEach(({ i, r }, j) => {
      const res = results[i];
      if (res.status === "ok") {
        res.next = [structuredClone(records[i])];
        res.status = "mechanical";
        res.rule = "size from token";
        res.notes = [];
        r = res.next[0];
      } else if (!res.rule.includes("size from token")) {
        res.rule += " + size from token";
      }
      r.scope.options = { ...r.scope.options, size: sizes[j] };
    });
  }
}

/** Plans a whole file; marks records that become exact duplicates of another live record. */
export function planFile(
  records,
  name,
  base,
  legacyKey = false,
  holdColorSplit = false,
) {
  const component = base.components.get(name) ?? { name };
  const used = new Set(records.map((r) => r.uuid));
  const ctx = {
    ...base,
    component,
    file: `${name}.json`,
    legacyKey,
    holdColorSplit,
    used,
  };
  const results = records.map((r) =>
    isLive(r)
      ? plan(r, ctx)
      : { status: "deprecated", rule: "", notes: [], next: null },
  );
  pinTies(records, results, ctx);
  const after = new Map();
  results.forEach((res, i) => {
    for (const r of res.next ?? (isLive(records[i]) ? [records[i]] : [])) {
      const k = `${canon(r.scope)}|${r.context ?? ""}|${r.$ref ?? canon(r.value)}`;
      after.set(k, [...(after.get(k) ?? []), i]);
    }
  });
  for (const idx of after.values()) {
    if (idx.length < 2) continue;
    for (const i of new Set(idx.slice(1))) {
      if (results[i].status === "mechanical")
        results[i].notes.push(
          "duplicate after decomposition: run dedupe-relationship-records.mjs",
        );
    }
  }
  return results;
}

export function totals(rows) {
  const t = {};
  for (const r of rows) {
    const k =
      r.status === "mechanical"
        ? "mechanical"
        : r.status === "judgement"
          ? "judgement"
          : r.status === "held"
            ? "held (1454)"
            : r.status === "skipped"
              ? `skipped (${r.rule})`
              : null;
    if (k) t[k] = (t[k] ?? 0) + 1;
    if (r.status === "mechanical")
      for (const rule of r.rule.split(" + "))
        t[`  rule: ${rule}`] = (t[`  rule: ${rule}`] ?? 0) + 1;
    if (r.status === "judgement")
      t[`  judgement: ${r.rule}`] = (t[`  judgement: ${r.rule}`] ?? 0) + 1;
    if (r.notes.some((n) => n === "non-term property"))
      t["non-term property (not changed)"] =
        (t["non-term property (not changed)"] ?? 0) + 1;
    if (r.notes.some((n) => n.startsWith("duplicate")))
      t["duplicate after decomposition"] =
        (t["duplicate after decomposition"] ?? 0) + 1;
  }
  return t;
}

function main() {
  const args = process.argv.slice(2);
  const flag = (f) => args.includes(f);
  const family = args.includes("--family")
    ? args[args.indexOf("--family") + 1].split(",")
    : null;
  const dir = resolve(
    args.filter(
      (a, i) => !a.startsWith("--") && args[i - 1] !== "--family",
    )[0] ?? join(here, ".."),
  );
  const write = flag("--write");
  const check = flag("--check");
  const base = loadContext(dir);
  const all = [];
  let pending = 0;
  for (const f of base.files) {
    const name = f.slice(0, -5);
    if (family && !family.includes(name)) continue;
    const path = join(dir, "relationships", f);
    const records = JSON.parse(readFileSync(path, "utf8"));
    const results = planFile(
      records,
      name,
      base,
      flag("--legacy-key"),
      flag("--hold-color-split"),
    );
    const rows = results.map((res, i) => ({
      name,
      record: records[i],
      ...res,
    }));
    all.push(...rows);
    pending += rows.filter((r) => r.status === "mechanical").length;
    if (write && rows.some((r) => r.status === "mechanical")) {
      const next = rows.flatMap((r) =>
        r.status === "mechanical" ? r.next : [r.record],
      );
      writeFileSync(path, `${JSON.stringify(next, null, 2)}\n`);
    }
  }
  if (!flag("--totals") && !check) {
    console.log(
      "| family | uuid | old | new | rule |\n| --- | --- | --- | --- | --- |",
    );
    for (const r of all.filter(
      (x) =>
        ["mechanical", "judgement", "held", "skipped"].includes(x.status) &&
        x.rule,
    )) {
      const sc = r.record.scope;
      const old = `${sc.property}${sc.between ? ` {${sc.between.from},${sc.between.to}}` : ""}${sc.attribute ? ` [${sc.attribute}]` : ""}`;
      const nw = (r.next ?? [])
        .map(
          (n) =>
            `${n.scope.property}${n.scope.between ? ` {${n.scope.between.from},${n.scope.between.to}}` : ""}${n.scope.attribute ? ` [${n.scope.attribute}]` : ""}${n.scope.options ? ` ${JSON.stringify(n.scope.options)}` : ""}`,
        )
        .join(" + ");
      console.log(
        `| ${r.name} | ${r.record.uuid?.slice(0, 8)} | ${old} | ${r.status === "mechanical" ? nw : `**${r.status}**`} | ${r.rule}${r.notes.length ? ` (${r.notes.join("; ")})` : ""} |`,
      );
    }
  }
  console.log(
    `\nTotals${family ? ` (${family.join(", ")})` : " (all families)"}:`,
  );
  for (const [k, v] of Object.entries(totals(all)).sort())
    console.log(`  ${k}: ${v}`);
  console.log(
    write ? `wrote ${pending} records` : `${pending} records to change`,
  );
  if (check && pending) process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
