// Copyright 2026 Adobe. All rights reserved.

import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "ava";
import { Dataset } from "../pkg/node/design_data_wasm.js";
import {
  renderScene,
  renderSvg,
} from "../../plugins/site/assets/visual-runtime.js";

const repo = fileURLToPath(new URL("../../../", import.meta.url));
const bin = join(repo, "sdk/target/debug/design-data");
const out = mkdtempSync(join(tmpdir(), "site-"));
const cli = existsSync(bin)
  ? [bin, ["site", "--out", out]]
  : [
      "cargo",
      ["run", "-q", "-p", "design-data-cli", "--", "site", "--out", out],
    ];
execFileSync(cli[0], cli[1], { cwd: repo, stdio: "pipe" });

const data = JSON.parse(readFileSync(join(out, "data.json"), "utf8"));
const load = (component) => ({
  component,
  compiled: data.compiled[component],
  recipe: JSON.parse(
    readFileSync(
      join(repo, `packages/design-data/visuals/${component}.json`),
      "utf8",
    ),
  ),
});
const subjects = ["action-button", "badge", "button", "switch"].map(load);

const close = (a, b, path = "") => {
  if (typeof a === "number" && typeof b === "number") {
    return Math.abs(a - b) < 1e-9 || `${path}: ${a} !== ${b}`;
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) {
      const r = close(a[k], b[k], `${path}.${k}`);
      if (r !== true) return r;
    }
    return true;
  }
  return a === b || `${path}: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`;
};

const buttonOptionSets = [
  {},
  { variant: "primary", style: "outline" },
  { variant: "secondary", style: "outline", isDisabled: true },
  { variant: "negative", isPending: true },
  { variant: "primary", isLabelHidden: true },
  { variant: "secondary", staticColor: "white" },
  { style: "outline", staticColor: "black" },
];

const actionOptionSets = [
  {},
  { isDisabled: true },
  { isPending: true },
  { isQuiet: true, isSelected: true },
  { isQuiet: true, isDisabled: true },
  { hasHoldIcon: true, hideLabel: true },
  { isEmphasized: true, staticColor: "white" },
];

const badgeOptionSets = [
  {},
  { variant: "informative", style: "outline", icon: true },
  { variant: "negative", style: "subtle", icon: true },
  { variant: "celery", fixed: "left" },
  { variant: "fuchsia", style: "outline", fixed: "top", icon: true },
  { variant: "seafoam", style: "subtle", fixed: "right" },
  { variant: "notice", fixed: "bottom", label: false, icon: true },
  { variant: "neutral", isDisabled: true },
];

const switchOptionSets = [
  {},
  { isSelected: true },
  { isSelected: true, isEmphasized: true },
  { isDisabled: true },
  { isSelected: true, isEmphasized: true, isDisabled: true },
  { hideLabel: true, isSelected: true },
];

const optionSetsFor = {
  button: buttonOptionSets,
  badge: badgeOptionSets,
  switch: switchOptionSets,
};

for (const { component, compiled, recipe } of subjects) {
  const optionSets = optionSetsFor[component] ?? actionOptionSets;
  const stateSets =
    component === "badge"
      ? [[]]
      : [
          [],
          ["hover"],
          ["down"],
          [component === "button" ? "focus" : "keyboard-focus"],
        ];

  test(`${component}: JS runtime matches the WASM renderer across modes, sizes, states and options`, (t) => {
    const ds = Dataset.embedded();
    let n = 0;
    try {
      for (const size of Object.keys(compiled.sizeScale)) {
        for (const colorScheme of ["light", "dark", "wireframe"]) {
          for (const scale of ["desktop", "mobile"]) {
            for (const states of stateSets) {
              for (const options of optionSets) {
                const req = {
                  component,
                  size,
                  states,
                  options,
                  mode: { colorScheme, scale },
                  label: "Label",
                };
                const expected = JSON.parse(ds.renderScene(recipe, req));
                const r = close(renderScene(compiled, req), expected);
                if (r !== true) return t.fail(`${JSON.stringify(req)}\n${r}`);
                n++;
              }
            }
          }
        }
      }
    } finally {
      ds.free();
    }
    t.is(
      n,
      Object.keys(compiled.sizeScale).length *
        3 *
        2 *
        stateSets.length *
        optionSets.length,
    );
  });

  test(`${component}: renderSvg matches the WASM SVG for a scene`, (t) => {
    const ds = Dataset.embedded();
    try {
      const req = {
        component,
        size: "l",
        states: component === "badge" ? [] : ["hover"],
        options:
          component === "button"
            ? { style: "outline", variant: "secondary" }
            : component === "badge"
              ? {
                  variant: "informative",
                  style: "outline",
                  fixed: "left",
                  icon: true,
                }
              : component === "switch"
                ? { isSelected: true, isEmphasized: true }
                : { hasHoldIcon: true },
        mode: { colorScheme: "dark", scale: "desktop" },
        label: "Save",
      };
      t.is(renderSvg(renderScene(compiled, req)), ds.renderSvg(recipe, req));
    } finally {
      ds.free();
    }
  });
}
