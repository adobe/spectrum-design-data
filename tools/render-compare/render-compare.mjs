#!/usr/bin/env node
// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

// BASE vs PR render comparison. See README.md.

import { spawn, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { cpus, tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import {
  matrixFor,
  pairCoverage,
  readComponent,
  renderArgs,
  sample,
  spread,
} from "./matrix.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const NORMALIZE = join(HERE, "../cli-minimum-gate/normalize.jq");
const BINDING_WARNING = /no relationship|does not resolve|not resolve/i;

const { values: opt } = parseArgs({
  options: {
    "base-ref": { type: "string" },
    "no-fetch": { type: "boolean", default: false },
    "base-root": { type: "string" },
    "base-cli": { type: "string" },
    "pr-root": { type: "string" },
    "pr-cli": { type: "string" },
    "same-cli": { type: "boolean", default: false },
    data: { type: "string", default: "packages/design-data" },
    components: { type: "string" },
    changed: { type: "boolean", default: false },
    sample: { type: "string", default: "1" },
    seed: { type: "string", default: "0" },
    "png-sample": { type: "string", default: "20" },
    "no-spec-sheet": { type: "boolean", default: false },
    "no-collections": { type: "boolean", default: false },
    "collections-only": { type: "boolean", default: false },
    jobs: {
      type: "string",
      default: String(Math.max(1, Math.min(4, cpus().length - 1))),
    },
    examples: { type: "string", default: "5" },
    out: { type: "string" },
    report: { type: "string" },
    keep: { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
});

if (opt.help) {
  console.log(readFileSync(join(HERE, "README.md"), "utf8").split("\n## ")[0]);
  process.exit(0);
}

const setup = (msg) => {
  console.error(`render-compare: ${msg}`);
  process.exit(2);
};
const num = (name) => {
  const n = Number(opt[name]);
  if (!Number.isInteger(n) || n < 0) setup(`--${name} must be a whole number`);
  return n;
};
const STEP = Math.max(1, num("sample"));
const SEED = num("seed");
const PNG_N = num("png-sample");
const JOBS = Math.max(1, num("jobs"));
const EXAMPLES = num("examples");

const run = (cmd, args, o = {}) =>
  new Promise((res) => {
    const p = spawn(cmd, args, {
      cwd: o.cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const out = [];
    const err = [];
    p.stdout.on("data", (d) => out.push(d));
    p.stderr.on("data", (d) => err.push(d));
    p.on("error", (e) =>
      res({ code: 127, stdout: Buffer.alloc(0), stderr: String(e) }),
    );
    p.on("close", (code) =>
      res({
        code,
        stdout: Buffer.concat(out),
        stderr: Buffer.concat(err).toString(),
      }),
    );
  });

const pool = async (items, n, fn) => {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) {
        const k = i++;
        out[k] = await fn(items[k], k);
      }
    }),
  );
  return out;
};

const sha = (s) => createHash("sha1").update(s).digest("hex");

/** Gradient ids hash the label text: number them by first use so a changed label does not show as a diff. */
function numberGradients(text) {
  const seen = new Map();
  return text.replace(/gradient-[0-9a-f]{16}/g, (m) => {
    if (!seen.has(m)) seen.set(m, `gradient-${seen.size}`);
    return seen.get(m);
  });
}
const normSvg = (s) =>
  numberGradients(s).replace(/data-tokens="[^"]*"/g, 'data-tokens=""');

// ---- setup: roots, CLIs, layout ---------------------------------------------------------

const prRoot = resolve(
  opt["pr-root"] ??
    execFileSync("git", ["rev-parse", "--show-toplevel"]).toString().trim(),
);
const DATA = opt.data;
const prCli = resolve(
  opt["pr-cli"] ?? join(prRoot, "sdk/target/debug/design-data"),
);
if (!existsSync(prCli))
  setup(
    `no PR CLI at ${prCli}; build it (cd sdk && cargo build -p design-data-cli) or pass --pr-cli.`,
  );

// BASE is origin/main, or its merge base with the PR when the PR is behind: main's own newer
// changes are not the PR's. An explicit --base-ref wins.
let baseRef = opt["base-ref"];
const notes = [];
if (!baseRef) {
  baseRef = "origin/main";
  const git = (...a) =>
    execFileSync("git", a, { cwd: prRoot, stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  try {
    if (!opt["no-fetch"]) git("fetch", "-q", "origin", "main");
    const tip = git("rev-parse", "origin/main");
    const mb = git("merge-base", "origin/main", "HEAD");
    if (mb !== tip) {
      baseRef = mb;
      notes.push(
        `PR is ${git("rev-list", "--count", "HEAD..origin/main")} commit(s) behind origin/main: BASE is the merge base ${mb.slice(0, 12)}, not the main tip, so main's own changes do not show as PR diffs.`,
      );
    }
  } catch {
    notes.push(
      "could not fetch or resolve origin/main in the PR root; using the local origin/main ref as is.",
    );
  }
}
let baseRoot = opt["base-root"] && resolve(opt["base-root"]);
let baseCli = opt["base-cli"] && resolve(opt["base-cli"]);
let baseSha = null;
if (!baseRoot || (!baseCli && !opt["same-cli"])) {
  const sub = opt["same-cli"] ? "src" : "ensure";
  console.error(`render-compare: base-cli.sh ${sub} ${baseRef}`);
  const r = await run(join(HERE, "base-cli.sh"), [sub, baseRef], {
    cwd: prRoot,
  });
  process.stderr.write(r.stderr);
  if (r.code !== 0)
    setup("could not get the BASE CLI (see base-cli output above).");
  const dir = r.stdout.toString().trim().split("\n").pop();
  baseRoot ??= join(dir, "src");
  baseCli ??= join(dir, "bin/design-data");
  baseSha = readFileSync(join(dir, "COMMIT"), "utf8").trim();
}
if (opt["same-cli"]) baseCli = prCli;
if (!existsSync(baseCli)) setup(`no BASE CLI at ${baseCli}`);

/** Both trees must be a full repo root: the CLI run from a package directory loads no relationships and every binding fails silently. */
function checkLayout(label, root) {
  const d = join(root, DATA);
  const problems = [];
  if (!existsSync(join(d, "dataset.json")))
    problems.push(`${d}/dataset.json is missing`);
  if (!existsSync(join(root, "packages/design-data-spec/schemas/token-types")))
    problems.push(
      `${root}/packages/design-data-spec/schemas/token-types is missing: without it the CLI does not see a repo and silently uses its embedded dataset instead of this tree`,
    );
  for (const sub of ["visuals", "components", "relationships"]) {
    const p = join(d, sub);
    if (!existsSync(p) || readdirSync(p).length === 0)
      problems.push(`${p} is missing or empty`);
  }
  if (problems.length)
    setup(
      `${label} root ${root} is not a repo-root layout (<root>/${DATA}):\n  ${problems.join("\n  ")}\n` +
        "  Run from the repository root; from inside packages/design-data the CLI loads no relationships and every binding fails.",
    );
}
checkLayout("BASE", baseRoot);
checkLayout("PR", prRoot);

const warnings = [];
if (baseSha) {
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", baseSha, "HEAD"], {
      cwd: prRoot,
      stdio: "ignore",
    });
  } catch {
    warnings.push(
      `PR HEAD does not contain BASE commit ${baseSha}: diffs may come from main, not from the PR. Merge origin/main first.`,
    );
  }
}

// ---- components ------------------------------------------------------------------------

const names = (root, sub) =>
  new Set(
    readdirSync(join(root, DATA, sub))
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.slice(0, -5)),
  );
const available = new Set([
  ...names(baseRoot, "visuals"),
  ...names(prRoot, "visuals"),
]);
let comps;
let selection = "all";
if (opt.components) {
  comps = opt.components
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const bad = comps.filter((c) => !available.has(c));
  if (bad.length) setup(`no visual recipe for: ${bad.join(", ")}`);
  selection = "--components";
} else if (opt.changed) {
  const ref = baseSha ?? baseRef;
  const base = execFileSync("git", ["merge-base", ref, "HEAD"], { cwd: prRoot })
    .toString()
    .trim();
  const files = execFileSync("git", ["diff", "--name-only", base], {
    cwd: prRoot,
  })
    .toString()
    .split("\n")
    .filter(Boolean);
  files.push(
    ...execFileSync("git", ["ls-files", "--others", "--exclude-standard"], {
      cwd: prRoot,
    })
      .toString()
      .split("\n")
      .filter(Boolean),
  );
  const picked = new Set();
  let unmapped = 0;
  for (const f of files) {
    const m = f.match(
      new RegExp(`^${DATA}/(components|visuals|relationships)/([^/]+)\\.json$`),
    );
    if (m) picked.add(m[2]);
    else if (
      (f.startsWith(`${DATA}/`) || f.startsWith("sdk/")) &&
      !/(^|\/)tests?\/|\.md$|\/(behaviors|guidelines|changelog)\//.test(f)
    )
      unmapped++;
  }
  if (unmapped) {
    comps = [...available];
    selection = `--changed: ${unmapped} changed file(s) under ${DATA}/ or sdk/ are not per-component (tokens, registry, engine), so every component runs`;
  } else {
    comps = [...picked].filter((c) => available.has(c));
    selection = `--changed: ${files.length} changed file(s), ${comps.length} component(s)`;
  }
} else comps = [...available];
comps.sort();

// A component whose recipe exists only in the PR has nothing on BASE to compare against: neutral,
// not vacuous. A recipe BASE has and the PR lacks (deleted, renamed) stays in the run and fails.
const baseVisuals = names(baseRoot, "visuals");
const newRecipes = comps.filter((c) => !baseVisuals.has(c));
comps = comps.filter((c) => baseVisuals.has(c));
const neutralLine = newRecipes.length
  ? `NEUTRAL: new recipe(s) ${newRecipes.join(", ")} have no BASE recipe`
  : "";

// ---- matrix ----------------------------------------------------------------------------

const out = resolve(opt.out ?? mkdtempSync(join(tmpdir(), "render-compare-")));
mkdirSync(out, { recursive: true });
const plans = comps.map((name) => {
  const {
    cases: all,
    params,
    collection,
  } = matrixFor(
    name,
    [
      readComponent(join(baseRoot, DATA), name),
      readComponent(join(prRoot, DATA), name),
    ],
    !opt["no-collections"],
  );
  const cases = sample(
    opt["collections-only"] ? all.filter((c) => collection.has(c.id)) : all,
    STEP,
    SEED,
  );
  return {
    name,
    total: all.length,
    collection: collection.size,
    cases,
    params,
    pairsAll: pairCoverage(params, all),
    pairs: pairCoverage(params, cases),
  };
});
const pairTotal = plans.reduce((n, p) => n + p.pairs.total, 0);
const pairCovered = plans.reduce((n, p) => n + p.pairs.covered, 0);
const totalCases = plans.reduce((n, p) => n + p.total, 0);
const sampled = plans.reduce((n, p) => n + p.cases.length, 0);
console.log(
  `render-compare: BASE ${baseCli}\n                 root ${baseRoot}${baseSha ? ` (${baseSha})` : ""}`,
);
console.log(
  `                PR   ${prCli}\n                 root ${prRoot}${opt["same-cli"] ? " (same CLI for both)" : ""}`,
);
console.log(`components: ${comps.length} (${selection})`);
const collectionTotal = plans.reduce((n, p) => n + p.collection, 0);
console.log(
  `collections: ${collectionTotal} cases (items selected, unselected, disabled, mixed x selection options) in ${
    plans
      .filter((p) => p.collection)
      .map((p) => `${p.name} ${p.collection}`)
      .join(", ") || "no component"
  }`,
);
console.log(
  `matrix: ${totalCases} cases total, ${sampled} run${STEP > 1 ? ` (--sample ${STEP}, seed ${SEED})` : ""}; option-pair cover: ${pairCovered} of ${pairTotal} value pairs covered by the cases run`,
);
for (const n of notes) console.log(`NOTE: ${n}`);
for (const w of warnings) console.log(`WARNING: ${w}`);
if (sampled === 0) {
  if (newRecipes.length) {
    console.log(`\n${neutralLine}`);
    console.log(`\nrender-compare: ${neutralLine}`);
    if (opt.report)
      writeFileSync(
        resolve(opt.report),
        JSON.stringify({ result: "NEUTRAL", newRecipes }, null, 2),
      );
    process.exit(0);
  }
  if (opt.changed && !opt.components) {
    console.log(
      "render-compare: --changed found no changed component, nothing to compare.",
    );
    process.exit(0);
  }
  setup("the matrix is empty: nothing to compare.");
}

// ---- render both sides -----------------------------------------------------------------

const sides = [
  { key: "base", root: baseRoot, cli: baseCli },
  { key: "pr", root: prRoot, cli: prCli },
];
const timings = {};
const t0 = Date.now();
const renders = {};
await pool(
  plans.flatMap((p) => sides.map((s) => ({ p, s }))),
  JOBS,
  async ({ p, s }) => {
    const dir = join(out, s.key, p.name);
    const cases = join(out, "cases", `${p.name}.json`);
    mkdirSync(dirname(cases), { recursive: true });
    writeFileSync(cases, JSON.stringify({ states: p.cases }));
    const r = await run(
      s.cli,
      ["render", "--batch", cases, "--out", dir, "--path", DATA],
      { cwd: s.root },
    );
    let index = null;
    try {
      index = JSON.parse(readFileSync(join(dir, "index.json"), "utf8")).states;
    } catch {
      /* no index: reported as a failed run below */
    }
    renders[`${s.key}/${p.name}`] = {
      code: r.code,
      stderr: r.stderr.split(join(out, s.key)).join("<out>/side"),
      index,
      dir,
    };
  },
);
timings.render = (Date.now() - t0) / 1000;

// ---- jq-normalized scenes and spec sheets ----------------------------------------------

const jqBody = readFileSync(NORMALIZE, "utf8");
async function jqHashes(program, files, onLine) {
  for (let i = 0; i < files.length; i += 400) {
    const r = await run("jq", [
      "-c",
      "-S",
      program,
      ...files.slice(i, i + 400),
    ]);
    if (r.code !== 0) setup(`jq failed: ${r.stderr.slice(0, 300)}`);
    for (const line of r.stdout.toString().split("\n")) if (line) onLine(line);
  }
}
const sceneProgram = `input_filename as $p | ($p | split("/") | last) as $f | [$f, (${jqBody}\n)]`;
async function sceneHashes(dir, ids) {
  const m = new Map();
  await jqHashes(
    sceneProgram,
    ids.map((id) => join(dir, `${id}.scene.json`)),
    (line) => {
      const cut = line.indexOf('",');
      m.set(
        line.slice(2, cut).replace(/\.scene\.json$/, ""),
        sha(numberGradients(line.slice(cut + 2))),
      );
    },
  );
  return m;
}

// ---- compare ---------------------------------------------------------------------------

const t1 = Date.now();
const rep = { components: {}, examples: [], vacuous: [], totals: {} };
const distinct = { base: new Set(), pr: new Set() };
const okCount = { base: 0, pr: 0 };
const bindWarn = { base: 0, pr: 0 };
const T = {
  cases: 0,
  identical: 0,
  labelOnly: 0,
  svgDiff: 0,
  sceneDiff: 0,
  errorDiff: 0,
  diagDiff: 0,
  stderrDiff: 0,
  exitDiff: 0,
  failedBoth: 0,
};
const example = (kind, comp, c, detail) => {
  if (rep.examples.length < EXAMPLES)
    rep.examples.push({ kind, component: comp, id: c.id, case: c, detail });
};
const sceneDiffText = (a, b) => {
  try {
    return execFileSync(
      "bash",
      [
        "-c",
        'diff <(jq -S -f "$3" "$1") <(jq -S -f "$3" "$2") | head -n 12',
        "_",
        a,
        b,
        NORMALIZE,
      ],
      { encoding: "utf8" },
    );
  } catch (e) {
    return String(e.stdout ?? e.message);
  }
};

for (const p of plans) {
  const b = renders[`base/${p.name}`];
  const r = renders[`pr/${p.name}`];
  const c = {
    cases: p.cases.length,
    svgDiff: 0,
    sceneDiff: 0,
    labelOnly: 0,
    errorDiff: 0,
    diagDiff: 0,
    stderrDiff: 0,
    exitDiff: false,
    notes: [],
  };
  rep.components[p.name] = c;
  T.cases += c.cases;
  if (!b.index || !r.index) {
    c.notes.push(
      `no index.json from ${!b.index ? "BASE" : "PR"}: the batch did not run (exit ${b.index ? r.code : b.code})`,
    );
    rep.vacuous.push(`${p.name}: ${c.notes[0]}`);
    T.errorDiff += c.cases;
    c.errorDiff = c.cases;
    continue;
  }
  if (b.code !== r.code) {
    c.exitDiff = true;
    T.exitDiff++;
    example(
      "exit code",
      p.name,
      { id: p.name },
      `BASE exit ${b.code}, PR exit ${r.code}`,
    );
  }
  if (b.stderr !== r.stderr) {
    c.stderrDiff = 1;
    T.stderrDiff++;
    const bl = new Set(b.stderr.split("\n"));
    const only = r.stderr
      .split("\n")
      .filter((l) => !bl.has(l))
      .slice(0, 3)
      .join(" | ");
    example(
      "stderr",
      p.name,
      { id: p.name },
      `stderr differs; first PR-only lines: ${only || "(BASE-only lines)"}`,
    );
  }
  const bi = new Map(b.index.map((e) => [e.id, e]));
  const ri = new Map(r.index.map((e) => [e.id, e]));
  const both = [];
  for (const cs of p.cases) {
    const x = bi.get(cs.id);
    const y = ri.get(cs.id);
    const side = (k, e) => {
      if (e && !e.error) {
        okCount[k]++;
        if (
          (e.diagnostics ?? []).some((d) =>
            BINDING_WARNING.test(JSON.stringify(d)),
          )
        )
          bindWarn[k]++;
      }
    };
    side("base", x);
    side("pr", y);
    if (!x || !y) {
      c.errorDiff++;
      continue;
    }
    if (x.error || y.error) {
      if (x.error && y.error && x.error === y.error) T.failedBoth++;
      else {
        c.errorDiff++;
        example(
          "render outcome",
          p.name,
          cs,
          `BASE: ${x.error ?? "ok"} | PR: ${y.error ?? "ok"}`,
        );
      }
      continue;
    }
    if (
      JSON.stringify(x.diagnostics ?? []) !==
      JSON.stringify(y.diagnostics ?? [])
    ) {
      c.diagDiff++;
      example(
        "diagnostics",
        p.name,
        cs,
        `BASE ${JSON.stringify(x.diagnostics).slice(0, 200)} | PR ${JSON.stringify(y.diagnostics).slice(0, 200)}`,
      );
    }
    both.push(cs);
  }
  const ids = both.map((cs) => cs.id);
  const [bs, rs] = await Promise.all([
    sceneHashes(b.dir, ids),
    sceneHashes(r.dir, ids),
  ]);
  for (const cs of both) {
    const sb = readFileSync(join(b.dir, `${cs.id}.svg`), "utf8");
    const sr = readFileSync(join(r.dir, `${cs.id}.svg`), "utf8");
    const nb = normSvg(sb);
    const nr = normSvg(sr);
    distinct.base.add(sha(nb));
    distinct.pr.add(sha(nr));
    let kind = null;
    if (nb !== nr) {
      c.svgDiff++;
      kind = "svg";
      let i = 0;
      while (nb[i] === nr[i]) i++;
      example(
        "svg",
        p.name,
        cs,
        `first difference at char ${i}: BASE …${nb.slice(Math.max(0, i - 40), i + 60)}… | PR …${nr.slice(Math.max(0, i - 40), i + 60)}…`,
      );
    } else if (sb !== sr) c.labelOnly++;
    if (bs.get(cs.id) !== rs.get(cs.id)) {
      c.sceneDiff++;
      kind ??= "scene";
      example(
        "scene",
        p.name,
        cs,
        sceneDiffText(
          join(b.dir, `${cs.id}.scene.json`),
          join(r.dir, `${cs.id}.scene.json`),
        ).trim(),
      );
    }
    if (!kind && sb === sr) T.identical++;
  }
  T.svgDiff += c.svgDiff;
  T.sceneDiff += c.sceneDiff;
  T.labelOnly += c.labelOnly;
  T.errorDiff += c.errorDiff;
  T.diagDiff += c.diagDiff;
}

// vacuous-run detection
for (const k of ["base", "pr"]) {
  const label = k.toUpperCase();
  if (okCount[k] === 0)
    rep.vacuous.push(`${label} rendered nothing: no case succeeded.`);
  else {
    if (T.cases > 1 && distinct[k].size <= 1)
      rep.vacuous.push(
        `${label}: all ${okCount[k]} rendered cases give one identical SVG.`,
      );
    if (bindWarn[k] / okCount[k] >= 0.5)
      rep.vacuous.push(
        `${label}: ${bindWarn[k]} of ${okCount[k]} cases carry a binding-does-not-resolve warning (wrong layout or missing relationships?).`,
      );
  }
}
timings.compare = (Date.now() - t1) / 1000;

// ---- PNG sample ------------------------------------------------------------------------

const png = { n: 0, diff: 0, examples: [] };
if (PNG_N > 0) {
  const pool_ = plans.flatMap((p) => {
    const ok = new Set(
      (renders[`base/${p.name}`].index ?? [])
        .filter((e) => !e.error)
        .map((e) => e.id),
    );
    return p.cases.filter((cs) => ok.has(cs.id));
  });
  const picked = spread(pool_, PNG_N);
  const t2 = Date.now();
  await pool(picked, JOBS, async (cs) => {
    const fs = {};
    for (const s of sides) {
      const f = join(out, s.key, `${cs.id}.png`);
      const r = await run(
        s.cli,
        [
          "render",
          ...renderArgs(cs),
          "--path",
          DATA,
          "--format",
          "png",
          "--output",
          f,
        ],
        { cwd: s.root },
      );
      fs[s.key] = {
        code: r.code,
        bytes: existsSync(f) ? readFileSync(f) : null,
      };
    }
    png.n++;
    const same =
      fs.base.code === fs.pr.code &&
      fs.base.bytes &&
      fs.pr.bytes &&
      fs.base.bytes.equals(fs.pr.bytes);
    if (!same) {
      png.diff++;
      if (png.examples.length < EXAMPLES)
        png.examples.push({ id: cs.id, base: fs.base.code, pr: fs.pr.code });
    }
  });
  timings.png = (Date.now() - t2) / 1000;
}

// ---- spec sheets -----------------------------------------------------------------------

const blockText = (v) => numberGradients(JSON.stringify(v));
/** Leaf paths that differ between two block JSON strings; nodes are keyed by part name. Geometry first. */
function leafDiff(a, b) {
  const flat = (v, path, out) => {
    if (Array.isArray(v))
      v.forEach((e, i) => {
        const part =
          e && typeof e === "object" && typeof e.part === "string" ? e.part : i;
        flat(e, `${path}[${part}]`, out);
      });
    else if (v && typeof v === "object")
      for (const [k, e] of Object.entries(v))
        flat(e, path ? `${path}.${k}` : k, out);
    else out.set(path, JSON.stringify(v));
    return out;
  };
  const x = flat(JSON.parse(a), "", new Map());
  const y = flat(JSON.parse(b), "", new Map());
  const d = [];
  for (const k of new Set([...x.keys(), ...y.keys()]))
    if (x.get(k) !== y.get(k))
      d.push(`${k}: ${x.get(k) ?? "(absent)"} -> ${y.get(k) ?? "(absent)"}`);
  const geo = (l) =>
    /(^|\.)(x|y|w|h|width|height)(:|$)/.test(l.split(": ")[0]) ? 0 : 1;
  d.sort((p, q) => geo(p) - geo(q));
  return d.length > 4
    ? [...d.slice(0, 4), `... ${d.length - 4} more leaf differences`]
    : d;
}

const sheets = {
  run: false,
  components: 0,
  restDiff: [],
  sceneBlocks: [],
  lost: 0,
  gained: 0,
  regrouped: 0,
  lostComponents: [],
  gainedComponents: [],
  examples: [],
  failed: [],
};
if (!opt["no-spec-sheet"]) {
  const t3 = Date.now();
  sheets.run = true;
  const dirs = {};
  const res = await Promise.all(
    sides.map(async (s) => {
      dirs[s.key] = join(out, s.key, "_spec-sheet");
      return run(
        s.cli,
        ["spec-sheet", "--all", "--path", DATA, "-o", dirs[s.key]],
        { cwd: s.root },
      );
    }),
  );
  res.forEach(
    (r, i) =>
      r.code !== 0 &&
      sheets.failed.push(
        `${sides[i].key.toUpperCase()} spec-sheet --all exited ${r.code}: ${r.stderr.slice(0, 200)}`,
      ),
  );
  const list = (d) =>
    existsSync(d)
      ? readdirSync(d).filter((f) => f.endsWith(".json") && f !== "index.json")
      : [];
  const bl = new Set(list(dirs.base));
  const rl = new Set(list(dirs.pr));
  sheets.lostComponents = [...bl]
    .filter((f) => !rl.has(f))
    .map((f) => f.slice(0, -5));
  sheets.gainedComponents = [...rl]
    .filter((f) => !bl.has(f) && !newRecipes.includes(f.slice(0, -5)))
    .map((f) => f.slice(0, -5));
  const common = [...bl].filter((f) => rl.has(f)).sort();
  const wanted =
    opt.components || opt.changed
      ? new Set(comps.map((c) => `${c}.json`))
      : null;
  const files = wanted ? common.filter((f) => wanted.has(f)) : common;
  sheets.components = files.length;
  const program = `input_filename as $p | ($p | split("/") | last) as $f | (${jqBody}\n) | [$f, {rest: del(.pages[]?.blocks[]?.rows), blocks: [.pages[]?.blocks[]? | {b: .id, v: del(.rows)}], rows: [.pages[]?.blocks[]? | {b: .id, r: (.rows // [])}]}]`;
  const load = async (dir) => {
    const m = new Map();
    await jqHashes(
      program,
      files.map((f) => join(dir, f)),
      (line) => {
        const cut = line.indexOf('",');
        m.set(line.slice(2, cut), JSON.parse(line.slice(cut + 2, -1)));
      },
    );
    return m;
  };
  const [bm, rm] = await Promise.all([load(dirs.base), load(dirs.pr)]);
  for (const f of files) {
    const x = bm.get(f);
    const y = rm.get(f);
    const restChanged =
      sha(numberGradients(JSON.stringify(x.rest))) !==
      sha(numberGradients(JSON.stringify(y.rest)));
    if (restChanged)
      sheets.restDiff.push(
        `${f.slice(0, -5)} (${[...new Set([...Object.keys(x.rest), ...Object.keys(y.rest)])].filter((k) => JSON.stringify(x.rest[k]) !== JSON.stringify(y.rest[k])).join("/")})`,
      );
    if (restChanged) {
      const yb = new Map(y.blocks.map((blk) => [blk.b, blk.v]));
      const xb = new Map(x.blocks.map((blk) => [blk.b, blk.v]));
      for (const [id, v] of xb) {
        const w = yb.get(id);
        const diffs = w ? leafDiff(blockText(v), blockText(w)) : ["block lost"];
        if (diffs.length)
          sheets.sceneBlocks.push({
            component: f.slice(0, -5),
            block: id,
            diffs,
          });
      }
      for (const id of yb.keys())
        if (!xb.has(id))
          sheets.sceneBlocks.push({
            component: f.slice(0, -5),
            block: id,
            diffs: ["block gained"],
          });
    }
    const occ = (m) => {
      const o = new Map();
      for (const blk of m.rows)
        for (const row of blk.r) {
          const k = JSON.stringify(row);
          if (!o.has(k)) o.set(k, []);
          o.get(k).push(blk.b);
        }
      return o;
    };
    const ox = occ(x);
    const oy = occ(y);
    for (const k of new Set([...ox.keys(), ...oy.keys()])) {
      const a = ox.get(k) ?? [];
      const bb = oy.get(k) ?? [];
      const lost = Math.max(0, a.length - bb.length);
      const gained = Math.max(0, bb.length - a.length);
      sheets.lost += lost;
      sheets.gained += gained;
      if (lost && sheets.examples.length < EXAMPLES)
        sheets.examples.push({
          component: f.slice(0, -5),
          kind: "lost",
          row: k.slice(0, 160),
        });
      if (gained && sheets.examples.length < EXAMPLES)
        sheets.examples.push({
          component: f.slice(0, -5),
          kind: "gained",
          row: k.slice(0, 160),
        });
      if (
        a.length &&
        bb.length &&
        JSON.stringify([...a].sort()) !== JSON.stringify([...bb].sort())
      )
        sheets.regrouped += Math.min(a.length, bb.length);
    }
  }
  timings.specSheet = (Date.now() - t3) / 1000;
}

// ---- report ----------------------------------------------------------------------------

const sheetFail =
  sheets.run &&
  (sheets.failed.length ||
    sheets.restDiff.length ||
    sheets.lost ||
    sheets.gained ||
    sheets.regrouped ||
    sheets.lostComponents.length ||
    sheets.gainedComponents.length);
const diffs =
  T.svgDiff +
  T.sceneDiff +
  T.errorDiff +
  T.diagDiff +
  T.stderrDiff +
  T.exitDiff +
  png.diff;
const fail = rep.vacuous.length > 0 || diffs > 0 || sheetFail;

const pad = (s, n) => String(s).padEnd(n);
console.log(
  "\ncomponent".padEnd(32) + "cases  svg  scene  label-only  error  diag",
);
for (const [name, c] of Object.entries(rep.components))
  console.log(
    `${pad(name, 31)} ${pad(c.cases, 6)} ${pad(c.svgDiff, 4)} ${pad(c.sceneDiff, 6)} ${pad(c.labelOnly, 11)} ${pad(c.errorDiff, 6)} ${c.diagDiff}`,
  );
console.log(
  `\ncases run: ${T.cases}; identical (byte): ${T.identical}; label/gradient-id only: ${T.labelOnly}; failed identically on both: ${T.failedBoth}`,
);
console.log(
  `distinct SVG outputs: BASE ${distinct.base.size}, PR ${distinct.pr.size}; rendered ok: BASE ${okCount.base}, PR ${okCount.pr}; binding warnings: BASE ${bindWarn.base}, PR ${bindWarn.pr}`,
);
console.log(
  `diffs: svg ${T.svgDiff}, scene ${T.sceneDiff}, outcome ${T.errorDiff}, diagnostics ${T.diagDiff}, stderr ${T.stderrDiff} component(s), exit code ${T.exitDiff} component(s)`,
);
if (PNG_N > 0) console.log(`png sample: ${png.n} compared, ${png.diff} differ`);
if (sheets.run) {
  console.log(
    `spec-sheet --all: ${sheets.components} components compared; rows lost ${sheets.lost}, gained ${sheets.gained}, regrouped ${sheets.regrouped}; sheets differing outside rows ${sheets.restDiff.length}`,
  );
  if (sheets.restDiff.length)
    console.log(
      `  outside-rows diff: ${sheets.restDiff.slice(0, 10).join(", ")}`,
    );
  if (sheets.lostComponents.length)
    console.log(`  sheets lost: ${sheets.lostComponents.join(", ")}`);
  if (sheets.gainedComponents.length)
    console.log(`  sheets gained: ${sheets.gainedComponents.join(", ")}`);
  for (const f of sheets.failed) console.log(`  ${f}`);
  if (sheets.sceneBlocks.length)
    console.log(
      `  spec-sheet scenes differ in ${sheets.sceneBlocks.length} block(s):`,
    );
  for (const e of sheets.sceneBlocks.slice(0, EXAMPLES))
    console.log(
      `    ${e.component} / ${e.block}\n      ${e.diffs.join("\n      ")}`,
    );
  for (const e of sheets.examples)
    console.log(`  ${e.kind} row in ${e.component}: ${e.row}`);
}
for (const e of rep.examples)
  console.log(
    `\nexample [${e.kind}] ${e.component} ${e.id}${e.case?.options ? " " + JSON.stringify({ size: e.case.size, states: e.case.states, options: e.case.options, mode: [e.case.colorScheme, e.case.scale], label: e.case.label, icon: e.case.icon }) : ""}\n  ${String(e.detail).split("\n").join("\n  ")}`,
  );
for (const v of rep.vacuous) console.log(`\nVACUOUS RUN: ${v}`);
if (neutralLine) console.log(`\n${neutralLine}`);

const total =
  timings.render +
  timings.compare +
  (timings.png ?? 0) +
  (timings.specSheet ?? 0);
console.log(
  `\ntimings (s): render ${timings.render.toFixed(1)}, compare ${timings.compare.toFixed(1)}${PNG_N ? `, png ${timings.png?.toFixed(1)}` : ""}${sheets.run ? `, spec-sheet ${timings.specSheet.toFixed(1)}` : ""}, total ${total.toFixed(1)}`,
);
console.log(
  `\nrender-compare: ${rep.vacuous.length ? "VACUOUS (exit 2)" : fail ? "FAIL" : newRecipes.length ? `PASS (${neutralLine}; the other components compared)` : "PASS"}`,
);

const summary = {
  result: rep.vacuous.length ? "VACUOUS" : fail ? "FAIL" : "PASS",
  newRecipes,
  baseSha,
  totals: T,
  distinct: { base: distinct.base.size, pr: distinct.pr.size },
  png,
  sheets,
  vacuous: rep.vacuous,
  warnings,
  components: rep.components,
  examples: rep.examples,
  timings,
  matrix: { total: totalCases, run: sampled },
};
if (opt.report)
  writeFileSync(resolve(opt.report), JSON.stringify(summary, null, 2));
if (!fail && !opt.keep && !opt.out)
  rmSync(out, { recursive: true, force: true });
else console.log(`outputs kept in ${out}`);
process.exit(rep.vacuous.length ? 2 : fail ? 1 : 0);
