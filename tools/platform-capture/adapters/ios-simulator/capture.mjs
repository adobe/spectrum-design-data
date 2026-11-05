// Copyright 2026 Adobe. All rights reserved.
// Licensed under the Apache License, Version 2.0.

// One-factor-at-a-time capture of the Spectrum iOS Catalog app via mobilebuildmcp + simctl.
// usage: node capture.mjs <outDir> [component ...]
// The app must already be installed and launched on the simulator (see README.md).
// env: SIM_ID (simulator UDID) or SIM_NAME (default "iPhone 17 Pro").
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";

const D =
  process.env.SIM_ID || findSim(process.env.SIM_NAME || "iPhone 17 Pro");

function findSim(name) {
  const all = JSON.parse(
    execFileSync("xcrun", ["simctl", "list", "devices", "available", "-j"], {
      encoding: "utf8",
    }),
  ).devices;
  const d = Object.values(all)
    .flat()
    .find((x) => x.name === name);
  if (!d) throw new Error(`No available simulator named ${name}`);
  return d.udid;
}
const [out, ...only] = process.argv.slice(2);
const ALL = [
  "Button",
  "Menu",
  "Picker",
  "Pop-up button",
  "Pop-up label",
  "Toggle button",
];
const comps = only.length ? only : ALL;
const sleep = (s) =>
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, s * 1000);
const slug = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const mbm = (...a) =>
  execFileSync("mobilebuildmcp", [...a, "--output", "json"], {
    encoding: "utf8",
    maxBuffer: 1 << 26,
  });
const sim = (...a) =>
  execFileSync("xcrun", ["simctl", ...a], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

function snap() {
  const cap = JSON.parse(
    mbm("ui-automation", "snapshot-ui", "--simulator-id", D),
  ).data.capture;
  const parse = (t) => {
    const [ref, , role, label, value, id] = t.split("|");
    return { ref, role, label, value, id, n: +ref.slice(1) };
  };
  const r = cap.targets.map(parse);
  r.texts = (cap.text || []).map(parse);
  return r;
}
const tap = (ref) =>
  mbm(
    "ui-automation",
    "tap",
    "--simulator-id",
    D,
    "--element-ref",
    ref,
    "--post-delay",
    "1.2",
  );

function shot(dir, name) {
  mkdirSync(`${out}/${dir}`, { recursive: true });
  const base = `${out}/${dir}/${slug(name)}`;
  sim("io", D, "screenshot", `${base}.light.png`);
  sim("ui", D, "appearance", "dark");
  sleep(1);
  sim("io", D, "screenshot", `${base}.dark.png`);
  sim("ui", D, "appearance", "light");
  sleep(1);
  console.log("  ✓", `${dir}/${slug(name)}`);
}

// Picker rows: "Name, Value" buttons; the demo control and text-field rows have no matching inner button.
const rows = (t) =>
  t.filter(
    (x) =>
      x.role === "button" &&
      /^[^,]+, .+$/.test(x.label) &&
      !x.id &&
      !x.label.includes("Preview") &&
      !/^(SwiftUI|UIKit) - /.test(x.label),
  );
const rowName = (r) => r.label.split(", ")[0];
const innerOf = (t, r) => {
  const cur = r.label.slice(rowName(r).length + 2);
  return {
    cur,
    inner: t.find((x) => x.role === "button" && x.label === cur && x.n > r.n),
  };
};

// Menu items are appended after everything that was already on screen.
function menuOptions(before, after) {
  return after
    .slice(before.length)
    .filter((x) => x.role === "button" && x.label);
}
function pickAfter(before, label) {
  const o = menuOptions(before, snap()).find((x) => x.label === label);
  tap(o.ref);
}

// Opens row idx's menu; returns null for non-menu rows (text fields, the demo control).
function openRow(idx) {
  const t = snap();
  const r = rows(t)[idx];
  const { cur, inner } = innerOf(t, r);
  if (!inner) return null;
  tap(inner.ref);
  const opts = menuOptions(t, snap());
  if (!opts.length) return null;
  return { cur, opts: opts.map((o) => o.label), before: t, name: rowName(r) };
}

function closeMenu(m) {
  if (m.opts.includes(m.cur)) return pickAfter(m.before, m.cur);
  // selected item isn't exposed as a button; tap the control underneath to dismiss
  tap(snap().find((x) => x.role === "button" && x.label === m.cur).ref);
}

function sweepRows(dir) {
  shot(dir, "default");
  const names = rows(snap()).map(rowName);
  const seen = {};
  const keys = names.map((n) =>
    (seen[n] = (seen[n] || 0) + 1) > 1 ? `${n} ${seen[n]}` : n,
  );
  const deferred = [];
  for (let idx = 0; idx < names.length; idx++) {
    const key = keys[idx];
    try {
      const m = openRow(idx);
      if (!m) {
        console.log(` skip ${key} (not a menu)`);
        continue;
      }
      if (!m.opts.includes(m.cur)) {
        console.log(` defer ${key}: [${m.opts}]`);
        deferred.push(idx);
        closeMenu(m);
        continue;
      }
      console.log(` ${key}: [${m.opts}] (default ${m.cur})`);
      closeMenu(m);
      for (const o of m.opts) {
        if (o === m.cur) continue;
        const m2 = openRow(idx);
        pickAfter(m2.before, o);
        shot(dir, `${key}=${o}`);
      }
      const m3 = openRow(idx);
      pickAfter(m3.before, m.cur);
    } catch (e) {
      console.log("  ✗ row", key, e.message.split("\n")[0]);
    }
  }
  const nsw = snap().filter((x) => x.role === "switch").length;
  for (let i = 0; i < nsw; i++) {
    try {
      const t = snap();
      const s = t.filter((x) => x.role === "switch")[i];
      const lbl =
        [...t.texts].reverse().find((x) => x.n < s.n)?.label || `switch${i}`;
      tap(s.ref);
      shot(dir, `${lbl}-${i}-toggled`);
      tap(snap().filter((x) => x.role === "switch")[i].ref);
    } catch (e) {
      console.log("  ✗ switch", i, e.message.split("\n")[0]);
    }
  }
  for (const idx of deferred) {
    try {
      const m0 = openRow(idx);
      const opts = m0.opts;
      closeMenu(m0);
      for (const o of opts) {
        const m2 = openRow(idx);
        pickAfter(m2.before, o);
        shot(dir, `${keys[idx]}=${o}`);
      }
    } catch (e) {
      console.log("  ✗ deferred row", keys[idx], e.message.split("\n")[0]);
    }
  }
}

function frameworks(comp) {
  const t = snap();
  const tabs = t.filter(
    (x) => x.role === "tab" && (x.label === "SwiftUI" || x.label === "UIKit"),
  );
  if (tabs.length) return { kind: "tabs", names: ["SwiftUI", "UIKit"] };
  const hdr = t.find(
    (x) => x.role === "button" && /^(SwiftUI|UIKit) - /.test(x.label),
  );
  if (!hdr) return { kind: "none", names: ["default"] };
  const variants = [];
  for (const group of ["SwiftUI", "UIKit"]) {
    const t1 = snap();
    tap(
      t1.find((x) => x.role === "button" && /^(SwiftUI|UIKit) - /.test(x.label))
        .ref,
    );
    tap(menuOptions(t1, snap()).find((x) => x.label === group).ref);
    const items = menuOptions(t1, snap())
      .map((x) => x.label)
      .filter((l) => l !== group);
    for (const i of items) variants.push({ group, item: i });
    tap(menuOptions(t1, snap()).find((x) => x.label === items[0]).ref);
  }
  return { kind: "menu", names: variants };
}

function selectVariant(v) {
  const t = snap();
  tap(
    t.find((x) => x.role === "button" && /^(SwiftUI|UIKit) - /.test(x.label))
      .ref,
  );
  tap(menuOptions(t, snap()).find((x) => x.label === v.group).ref);
  tap(menuOptions(t, snap()).find((x) => x.label === v.item).ref);
}

sim("ui", D, "appearance", "light");
for (const comp of comps) {
  console.log(comp);
  for (let tries = 0; tries < 4; tries++) {
    const t = snap();
    if (t.some((x) => x.id === "BackButton")) break;
    const row = t.find((x) => x.label.startsWith(`${comp}, `));
    if (row) tap(row.ref);
    sleep(1);
  }
  const fws = frameworks(comp);
  for (const fw of fws.names) {
    if (fws.kind === "tabs") {
      const tab = snap().find((x) => x.role === "tab" && x.label === fw);
      tap(tab.ref);
    } else if (fws.kind === "menu") {
      selectVariant(fw);
    }
    try {
      sweepRows(
        `${slug(comp)}/${fws.kind === "tabs" ? fw : fws.kind === "menu" ? slug(fw.group + "-" + fw.item) : slug(fw)}`,
      );
    } catch (e) {
      console.log("  ✗ failed", fw, e.message.split("\n")[0]);
    }
  }
  tap(snap().find((x) => x.id === "BackButton").ref);
  sleep(1);
}
