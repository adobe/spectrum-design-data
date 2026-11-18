// Copyright 2026 Adobe. All rights reserved.
// Renders button-ios states with `design-data render --platform ios` and writes the data the
// drawing template needs (sizes, tokens, colors, icons) to data.json.
// Usage: node tools/dimensional-drawings/extract-button-ios.mjs   (from the repo root; design-data on PATH)
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), "dd-draw-"));
const SIZES = { s: "sm", m: "md", l: "lg" };
const STYLES = ["primary", "accent"];
const STATES = ["rest", "hover", "down", "disabled"];
const SCHEMES = ["light", "dark"];

const states = [];
for (const size of Object.keys(SIZES))
  for (const style of STYLES)
    for (const st of STATES)
      for (const cs of SCHEMES)
        states.push({
          id: `${size}-${style}-${st}-${cs}`,
          component: "button-ios",
          size,
          label: "Label",
          platform: "ios",
          colorScheme: cs,
          options: {
            style,
            ...(st === "disabled" ? { isDisabled: true } : {}),
          },
          ...(st === "hover" || st === "down" ? { states: [st] } : {}),
        });
writeFileSync(join(tmp, "all.json"), JSON.stringify({ states }));
execFileSync(
  "design-data",
  [
    "render",
    "--platform",
    "ios",
    "--batch",
    join(tmp, "all.json"),
    "--out",
    join(tmp, "all"),
  ],
  { stdio: "inherit" },
);

const scene = (id) =>
  JSON.parse(readFileSync(join(tmp, "all", `${id}.scene.json`), "utf8"));
const num = (v) => parseFloat(String(v).replace(/[^0-9.-]/g, ""));
const tok = (node, prop) => node.tokens.find((t) => t.prop === prop);
const part = (d, name) => d.nodes.find((n) => n.part === name);

const sizes = {};
for (const [s, key] of Object.entries(SIZES)) {
  const d = scene(`${s}-accent-rest-light`);
  const c = part(d, "container");
  const i = part(d, "icon");
  const l = part(d, "label");
  const t = {
    P1: tok(c, "paddingInlineStart"),
    P2: tok(c, "paddingBlockStart"),
    G: tok(c, "gap"),
    R: tok(c, "cornerRadius"),
    Z: tok(i, "width"),
    LH: tok(l, "lineHeight"),
    FS: tok(l, "fontSize"),
    FW: tok(l, "fontWeight"),
  };
  const v = {
    n: s.toUpperCase(),
    key,
    P1: num(t.P1.value),
    P2: num(t.P2.value),
    G: num(t.G.value),
    Rtok: num(t.R.value),
    Z: num(t.Z.value),
    LH: num(t.LH.value),
    FS: num(t.FS.value),
    FW: t.FW.value,
    tok: Object.fromEntries(Object.entries(t).map(([k, x]) => [k, x.token])),
    fam: tok(l, "fontFamily").value,
  };
  // The drawing derives these; fail loudly if the recipe stops agreeing.
  if (Math.abs(c.h - (2 * v.P2 + v.LH)) > 0.01)
    throw new Error(`${s}: height != 2*P2 + LH`);
  if (Math.abs(c.radius - Math.min(v.Rtok, c.h / 2)) > 0.01)
    throw new Error(`${s}: radius != min(token, h/2)`);
  sizes[s] = v;
}

const colors = {};
for (const style of STYLES) {
  colors[style] = {};
  for (const cs of SCHEMES) {
    colors[style][cs] = {};
    for (const st of STATES) {
      const d = scene(`m-${style}-${st}-${cs}`);
      const f = tok(part(d, "container"), "fill");
      const c = tok(part(d, "icon"), "color");
      colors[style][cs][st] = {
        fill: [f.token, f.value],
        content: [c.token, c.value],
      };
    }
  }
}

const repo = execFileSync("git", ["rev-parse", "--show-toplevel"])
  .toString()
  .trim();
const set = JSON.parse(
  readFileSync(join(repo, "packages/design-data/icons/workflow.json"), "utf8"),
);
const icons = Object.fromEntries(
  Object.entries(set.icons).map(([n, v]) => [
    n,
    { viewBox: v.viewBox, paths: v.paths },
  ]),
);

writeFileSync(
  join(here, "data.json"),
  JSON.stringify({ sizes, colors, icons }),
);
console.log(`wrote ${join(here, "data.json")}`);
