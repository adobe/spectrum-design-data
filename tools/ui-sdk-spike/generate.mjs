// Copyright 2026 Adobe. All rights reserved.
// Spike (beads 9fe.11, 9fe.13): emit Vercel ui-sdk CSS from visual recipes.
// Usage: node generate.mjs <design-data cli> <switch|checkbox>   (writes <component>.css and demo/public/<component>.expected.json)
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const px = (n) => `${+n.toFixed(3)}px`;
const node = (scene, part) => scene.nodes.find((n) => n.part === part);

const switchDecls = (scene)=> {
  const track = node(scene, "track");
  const handle = node(scene, "handle");
  const label = node(scene, "label");
  const ring = node(scene, "focus-indicator");
  const container = node(scene, "container");
  const border = track.stroke_width;
  return {
    root: {
      width: px(track.w),
      height: px(track.h),
      "border-radius": px(track.radius),
      background: track.fill,
      "border-color": track.stroke ?? "transparent",
      "border-width": px(border),
      outline: ring ? `${px(ring.stroke_width)} solid ${ring.stroke}` : "none",
      "outline-offset": ring
        ? px((ring.w - track.w) / 2 - ring.stroke_width)
        : "0",
    },
    thumb: {
      width: px(handle.w),
      height: px(handle.h),
      "border-radius": px(handle.radius),
      background: handle.fill,
      translate: `${px(handle.x - track.x - border)} 0`,
    },
    label: {
      "font-size": px(label.font_size),
      "font-weight": label.font_weight === "regular" ? 400 : (label.font_weight ?? 400),
      color: label.color,
      gap: px(
        container.tokens
          .find((t) => t.prop === "gap")
          ?.value.replace("px", "") * 1,
      ),
      "min-height": px(container.h),
    },
  };
};

const checkboxDecls = (scene) => {
  const box = node(scene, "box");
  const mark = node(scene, "checkmark") ?? node(scene, "dash");
  const label = node(scene, "label");
  const ring = node(scene, "focus-indicator");
  const container = node(scene, "container");
  return {
    root: {
      width: px(box.w),
      height: px(box.h),
      "border-radius": px(box.radius),
      background: box.fill ?? "transparent",
      "border-color": box.stroke ?? "transparent",
      "border-width": px(box.stroke_width),
      outline: ring ? `${px(ring.stroke_width)} solid ${ring.stroke}` : "none",
      "outline-offset": ring ? px((ring.w - box.w) / 2 - ring.stroke_width) : "0",
    },
    indicator: {
      width: px(mark?.w ?? 0),
      height: px(mark?.h ?? 0),
      color: mark?.color ?? "transparent",
    },
    label: {
      "font-size": px(label.font_size),
      "font-weight": label.font_weight === "regular" ? 400 : label.font_weight,
      color: label.color,
      gap: px(parseFloat(container.tokens.find((t) => t.prop === "gap").value)),
      "min-height": px(container.h),
    },
  };
};

// The only per-component knowledge. Everything marked HARD-CODED is a gap in the data.
const flag = (name, on, off) => ({ name, on, off });
const components = {
  switch: {
    slot: "switch", // HARD-CODED: ui-sdk slot name
    decls: switchDecls,
    parts: { thumb: "switch-thumb" }, // HARD-CODED: anatomy part -> ui-sdk slot
    // HARD-CODED: which options are state (attributes ui-sdk sets) and which are appearance (ours)
    axes: [
      { name: "value", values: [
        { key: "off", options: { isSelected: false }, attr: "[data-unchecked]" },
        { key: "on", options: { isSelected: true }, attr: "[data-checked]" },
      ] },
      { name: "emphasis", values: [
        { key: "std", options: { isEmphasized: false }, attr: ':not([data-variant="emphasized"])' },
        { key: "emph", options: { isEmphasized: true }, attr: '[data-variant="emphasized"]' },
      ] },
      { name: "disabled", values: [
        { key: "en", options: { isDisabled: false }, attr: ":not([data-disabled])" },
        { key: "dis", options: { isDisabled: true }, attr: "[data-disabled]", noStates: true },
      ] },
    ],
    expected: (s) => {
      const t = node(s, "track"), h = node(s, "handle");
      return { w: t.w, h: t.h, bg: t.fill, border: t.stroke ?? "transparent", thumbLeft: h.x - t.x, thumbW: h.w, thumbBg: h.fill };
    },
  },
  checkbox: {
    slot: "checkbox",
    center: true, // HARD-CODED: the indicator is centered in the box; the switch thumb is positioned by translate
    decls: checkboxDecls,
    parts: { indicator: "checkbox-indicator" },
    axes: [
      { name: "value", values: [
        // HARD-CODED: isSelected + isIndeterminate are one tri-state attribute set in ui-sdk
        { key: "off", options: { isSelected: false, isIndeterminate: false }, attr: "[data-unchecked]" },
        { key: "on", options: { isSelected: true, isIndeterminate: false }, attr: "[data-checked]" },
        { key: "mixed", options: { isIndeterminate: true }, attr: "[data-indeterminate]" },
      ] },
      { name: "emphasis", values: [
        { key: "std", options: { isEmphasized: false }, attr: ':not([data-variant="emphasized"])' },
        { key: "emph", options: { isEmphasized: true }, attr: '[data-variant="emphasized"]' },
      ] },
      { name: "error", values: [
        { key: "ok", options: { isError: false }, attr: ":not([data-invalid])" },
        { key: "err", options: { isError: true }, attr: "[data-invalid]" },
      ] },
      { name: "disabled", values: [
        { key: "en", options: { isDisabled: false }, attr: ":not([data-disabled])" },
        { key: "dis", options: { isDisabled: true }, attr: "[data-disabled]", noStates: true },
      ] },
    ],
    expected: (s) => {
      const b = node(s, "box"), m = node(s, "checkmark") ?? node(s, "dash");
      return { w: b.w, h: b.h, bg: b.fill ?? "transparent", border: b.stroke ?? "transparent", borderW: b.stroke_width, radius: b.radius, markW: m?.w ?? 0, markColor: m?.color ?? "transparent" };
    },
  },
};

const name = process.argv[3] ?? "switch";
const cli = process.argv[2] ?? "design-data";
const cfg = components[name];
if (!cfg) throw new Error(`unknown component ${name}`);
const sizes = ["s", "m", "l", "xl"];
const schemes = ["light", "dark"];
const stateList = ["hover", "down", "keyboard-focus"];
const stateSelector = { hover: ":hover", down: ":active", "keyboard-focus": ":focus-visible" };
// Later in the file wins at equal specificity, so hover precedes down precedes focus.
const stateOrder = [null, ...stateList];

const combos = cfg.axes.reduce(
  (acc, axis) => acc.flatMap((c) => axis.values.map((v) => [...c, v])),
  [[]],
);

const jobs = [];
for (const colorScheme of schemes)
  for (const size of sizes)
    for (const combo of combos)
      for (const state of combo.some((v) => v.noStates) ? [null] : [null, ...stateList])
        jobs.push({
          id: [colorScheme, size, ...combo.map((v) => v.key), state ?? "base"].join("_"),
          component: name,
          size,
          colorScheme,
          states: state ? [state] : [],
          options: Object.assign({}, ...combo.map((v) => v.options)),
          meta: { colorScheme, size, state, attrs: combo.map((v) => v.attr).join("") },
        });

const dir = mkdtempSync(join(tmpdir(), `ui-sdk-${name}-`));
const batch = join(dir, "batch.json");
writeFileSync(batch, JSON.stringify(jobs.map(({ meta, ...j }) => j)));
execFileSync(cli, ["render", "--batch", batch, "--out", dir, "--strict"], {
  stdio: ["ignore", "ignore", "inherit"],
});

const scenes = new Map(jobs.map((j) => [j.id, JSON.parse(readFileSync(join(dir, `${j.id}.scene.json`), "utf8"))]));
const decls = new Map([...scenes].map(([id, s]) => [id, cfg.decls(s)]));
const root = `[data-slot="${cfg.slot}"]`;

const out = [
  `/* Generated by tools/ui-sdk-spike/generate.mjs from the ${name} visual recipe. Do not edit. */`,
  `${root} { box-sizing: border-box; display: inline-flex; align-items: center; ${cfg.center ? "justify-content: center; " : ""}flex: none; padding: 0; border-style: solid; cursor: pointer; }`,
  `${root}[data-disabled] { cursor: default; }`,
  ...Object.values(cfg.parts).map((p) => `[data-slot="${p}"] { display: ${cfg.center ? "inline-flex; align-items: center; justify-content: center" : "block"}; flex: none; }`),
  `label:has(> ${root}) { display: inline-flex; align-items: center; }`,
];

for (const colorScheme of schemes) {
  const prefix = colorScheme === "dark" ? ':root[data-color-scheme="dark"] ' : "";
  for (const state of stateOrder)
    for (const j of jobs.filter((j) => j.meta.colorScheme === colorScheme && j.meta.state === state)) {
      const base = state ? decls.get(j.id.replace(/_[^_]+$/, "_base")) : null;
      for (const [part, props] of Object.entries(decls.get(j.id))) {
        const changed = Object.entries(props).filter(([k, v]) => !base || base[part][k] !== v);
        if (!changed.length) continue;
        const m = j.meta;
        const sw = `${root}[data-size="${m.size}"]${m.attrs}${state ? stateSelector[state] : ""}`;
        // The label lives outside the control, so its rules go on the control through :has().
        const sel = part === "label" ? `${prefix}label:has(> ${sw})` : part === "root" ? `${prefix}${sw}` : `${prefix}${sw} > [data-slot="${cfg.parts[part]}"]`;
        out.push(`${sel} { ${changed.map(([k, v]) => `${k}: ${v};`).join(" ")} }`);
      }
    }
}

writeFileSync(new URL(`./${name}.css`, import.meta.url), out.join("\n") + "\n");

// Expected resolved values for base scenes, for the browser check in demo/.
const expected = {};
for (const j of jobs.filter((j) => j.meta.state === null)) expected[j.id.replace(/_base$/, "")] = cfg.expected(scenes.get(j.id));
writeFileSync(new URL(`./demo/public/${name}.expected.json`, import.meta.url), JSON.stringify(expected));
