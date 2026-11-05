// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

// Renders a component spec sheet (`design-data spec-sheet <component>`, schema
// component-spec-sheet.schema.json) and optionally its changelog onto the canvas, as plain
// auto-layout frames. Idempotent: the root frame is found by name and replaced.
//
// The plugin adds no layout or overlay logic of its own. Each block visual is the block's
// scene, scaled and offset by `render.view`; measurement bars come from
// `scene.measurements` and markers sit on the recipe part the sheet names. The sandbox runs
// this file as a classic script, so there are no imports and no build step.
// The original scaffold is from garthdb in 58687d09 (PR #1567); this version reads the sheet.

const BLUE = { r: 0.294, g: 0.459, b: 1 };
const INK = { r: 0.13, g: 0.13, b: 0.13 };
const GREY = { r: 0.4, g: 0.4, b: 0.4 };
const WHITE = { r: 1, g: 1, b: 1 };
// The Spectrum UI font, as the S2 Web file names it (family and styles read from its text nodes).
// Inter only stands in when Adobe Clean is not available to the Figma user.
const FAMILY = "Adobe Clean Spectrum VF";
const STYLES = ["Regular", "Medium", "Bold"];
let family = FAMILY;

// Scene font weights are names (`bold`, `semi-bold`, `Medium`) or numbers; unknown weights
// read as Regular.
const styleFor = (w) => {
  const n = Number(w);
  const name = String(w).toLowerCase();
  if (n >= 600 || /bold|heavy|black/.test(name)) return "Bold";
  if (n === 500 || name === "medium") return "Medium";
  return "Regular";
};

// Returns a warning when Adobe Clean could not be loaded and Inter is used instead, so a wrong
// family or style name does not pass unnoticed.
let fontsLoaded = false;
let fontWarning = null;

async function loadFonts() {
  if (fontsLoaded) return fontWarning;
  fontsLoaded = true;
  fontWarning = await loadFontsOnce();
  return fontWarning;
}

async function loadFontsOnce() {
  try {
    family = FAMILY;
    for (const style of STYLES) await figma.loadFontAsync({ family, style });
    return null;
  } catch (e) {
    family = "Inter";
    for (const style of STYLES) await figma.loadFontAsync({ family, style });
    const warning = `${FAMILY} could not be loaded (${e && e.message ? e.message : e}); text is set in Inter.`;
    console.warn(warning);
    try {
      figma.notify(warning, { error: true });
    } catch (_) {
      // use_figma has no notify; the warning is returned instead.
    }
    return warning;
  }
}

const solid = (color, opacity) => ({
  type: "SOLID",
  color,
  opacity: opacity === undefined ? 1 : opacity,
});

function parseColor(s) {
  if (!s || s === "none" || s === "transparent") return null;
  const m = String(s).match(/rgba?\(([^)]+)\)/);
  if (!m) return { c: { r: 0.5, g: 0.5, b: 0.5 }, o: 1 };
  const p = m[1].split(",").map(parseFloat);
  return {
    c: { r: p[0] / 255, g: p[1] / 255, b: p[2] / 255 },
    o: p[3] === undefined ? 1 : p[3],
  };
}

const paint = (s) => {
  const p = parseColor(s);
  return p ? [solid(p.c, p.o)] : [];
};

function text(str, size, style, color) {
  const t = figma.createText();
  t.fontName = { family, style: style || "Regular" };
  t.fontSize = size;
  t.characters = String(str);
  t.fills = [solid(color || INK)];
  return t;
}

function auto(direction, opts) {
  const f = figma.createFrame();
  f.layoutMode = direction;
  f.primaryAxisSizingMode = "AUTO";
  f.counterAxisSizingMode = "AUTO";
  f.fills = [];
  Object.assign(f, opts || {});
  return f;
}

function rect(x, y, w, h, color, opacity) {
  const r = figma.createRectangle();
  r.resize(Math.max(w, 0.01), Math.max(h, 0.01));
  r.x = x;
  r.y = y;
  r.fills = [solid(color, opacity)];
  return r;
}

function pill(str, color, ink) {
  const f = auto("HORIZONTAL", {
    paddingLeft: 6,
    paddingRight: 6,
    paddingTop: 2,
    paddingBottom: 2,
    cornerRadius: 9,
  });
  f.fills = [solid(color || BLUE)];
  f.appendChild(text(str, 10, "Medium", ink || WHITE));
  return f;
}

function sceneNodes(parent, scene, view) {
  const k = view.scale;
  for (const n of scene.nodes) {
    const x = n.x * k + view.x;
    const y = n.y * k + view.y;
    const w = n.w * k;
    const h = n.h * k;
    if (n.kind === "box") {
      const r = figma.createRectangle();
      r.name = n.part;
      r.resize(Math.max(w, 0.01), Math.max(h, 0.01));
      r.x = x;
      r.y = y;
      r.fills = paint(n.fill);
      if (n.radii) {
        [
          r.topLeftRadius,
          r.topRightRadius,
          r.bottomRightRadius,
          r.bottomLeftRadius,
        ] = n.radii.map((v) => v * k);
      } else r.cornerRadius = n.radius * k;
      if (n.stroke && n.stroke_width > 0) {
        r.strokes = paint(n.stroke);
        r.strokeWeight = n.stroke_width * k;
        r.strokeAlign = "INSIDE";
      }
      parent.appendChild(r);
    } else if (n.kind === "text") {
      const t = text(n.text, n.font_size * k, styleFor(n.font_weight));
      t.name = n.part;
      t.fills = paint(n.color);
      t.textAutoResize = "WIDTH_AND_HEIGHT";
      t.lineHeight = { unit: "PIXELS", value: h };
      parent.appendChild(t);
      t.x = x;
      t.y = y;
    } else if (n.kind === "icon") {
      const c = parseColor(n.color) || { c: INK, o: 1 };
      const thick = Math.max(w * 0.1, 1);
      const g = figma.createFrame();
      g.name = n.part;
      g.fills = [];
      g.resize(w, h);
      g.clipsContent = false;
      parent.appendChild(g);
      g.x = x;
      g.y = y;
      g.appendChild(rect(0, (h - thick) / 2, w, thick, c.c, c.o));
      g.appendChild(rect((w - thick) / 2, 0, thick, h, c.c, c.o));
    }
  }
}

function overlay(parent, block, box) {
  const { scene, view, markers, measurements } = block.render;
  const k = view.scale;
  const o = figma.createFrame();
  o.name = "Overlay";
  o.fills = [];
  o.clipsContent = false;
  o.resize(box.width, box.height);
  parent.appendChild(o);
  o.x = 0;
  o.y = 0;
  const undrawn = markers.filter((mk) => !mk.drawn).map((mk) => mk.n);
  const lines = undrawn.length ? 1 : 0;
  if (lines) {
    const note = text(
      undrawn.join(", ") +
        ": not drawn in this visual (the recipe does not bind it yet)",
      11,
      "Regular",
      BLUE,
    );
    o.appendChild(note);
    note.x = 12;
    note.y = box.height - 12 - note.height;
  }
  measurements.forEach((sel, i) => {
    const m = scene.measurements[sel.index];
    const x = m.x * k + view.x;
    const y = m.y * k + view.y;
    const w = m.w * k;
    const h = m.h * k;
    const value = m.token.value;
    if (m.kind === "height") {
      const lx = x - 22;
      o.appendChild(rect(lx, y, 1, h, BLUE));
      o.appendChild(rect(lx - 4, y, 9, 1, BLUE));
      o.appendChild(rect(lx - 4, y + h, 9, 1, BLUE));
      const p = pill(value);
      o.appendChild(p);
      p.x = lx - 6 - p.width;
      p.y = y + h / 2 - p.height / 2;
    } else if (m.kind === "width") {
      const ly = y + h + 22;
      o.appendChild(rect(x, ly, w, 1, BLUE));
      o.appendChild(rect(x, ly - 4, 1, 9, BLUE));
      o.appendChild(rect(x + w, ly - 4, 1, 9, BLUE));
      const p = pill(value);
      o.appendChild(p);
      p.x = x + w / 2 - p.width / 2;
      p.y = ly + 8;
    } else if (m.kind === "radius") {
      o.appendChild(rect(x, y, w, h, BLUE, 0.25));
      const p = pill(value);
      o.appendChild(p);
      p.x = x - 6 - p.width;
      p.y = y - 18;
    } else {
      o.appendChild(rect(x, y, w, h, BLUE, 0.2));
      o.appendChild(rect(x, y + h + 8, w, 1, BLUE));
      const p = pill(value);
      o.appendChild(p);
      p.x = x + w / 2 - p.width / 2;
      p.y = y + h + 14;
    }
    const legend = text(sel.label + " · " + value, 11, "Regular", BLUE);
    o.appendChild(legend);
    legend.x = 12;
    legend.y =
      box.height -
      12 -
      legend.height -
      (measurements.length - 1 - i + lines) * 15;
  });
  for (const mk of markers) {
    const n = mk.drawn && scene.nodes.find((q) => q.part === mk.part);
    if (!n) continue;
    const cx = (n.x + n.w / 2) * k + view.x + (mk.n - 1) * 24;
    const cy = n.y * k + view.y - 14;
    const c = figma.createEllipse();
    c.resize(18, 18);
    o.appendChild(c);
    c.x = cx - 9;
    c.y = cy - 9;
    c.fills = [solid(BLUE)];
    const t = text(mk.n, 11, "Medium", WHITE);
    o.appendChild(t);
    t.x = cx - t.width / 2;
    t.y = cy - t.height / 2;
  }
}

function visual(block, box) {
  const f = figma.createFrame();
  f.name = "Visual";
  f.resize(box.width, box.height);
  f.cornerRadius = 8;
  f.clipsContent = true;
  f.fills = [
    solid(
      block.render.request.options.staticColor === "white"
        ? { r: 0.1, g: 0.1, b: 0.1 }
        : { r: 0.96, g: 0.96, b: 0.96 },
    ),
  ];
  const g = figma.createFrame();
  g.name = "Scene";
  g.fills = [];
  g.clipsContent = false;
  g.resize(box.width, box.height);
  f.appendChild(g);
  g.x = 0;
  g.y = 0;
  sceneNodes(g, block.render.scene, block.render.view);
  overlay(f, block, box);
  return f;
}

// A table-only sheet has no render: the slot says so and draws nothing else.
function noVisual(box) {
  const f = figma.createFrame();
  f.name = "Visual";
  f.resize(box.width, box.height);
  f.cornerRadius = 8;
  f.fills = [solid({ r: 0.96, g: 0.96, b: 0.96 })];
  const t = text("No visual recipe yet", 12, "Regular", GREY);
  f.appendChild(t);
  t.x = 16;
  t.y = 16;
  return f;
}

const valueText = (values) =>
  Object.keys(values)
    .map((scale) => {
      const v = values[scale];
      return (
        (typeof v === "object" ? "→ " + v.alias : v) +
        (scale === "value" ? "" : " (" + scale + ")")
      );
    })
    .join(" · ");

function tokenList(block) {
  const f = auto("VERTICAL", { itemSpacing: 8 });
  f.name = "Tokens";
  const undrawn = ((block.render && block.render.markers) || [])
    .filter((m) => !m.drawn)
    .map((m) => m.n);
  const head = auto("HORIZONTAL", {
    itemSpacing: 12,
    counterAxisAlignItems: "CENTER",
  });
  head.name = "Title";
  head.appendChild(text(block.title, 20, "Bold"));
  if (block.titleSource === "property") {
    head.appendChild(text("by property", 11, "Regular", GREY));
  }
  for (const b of block.badges) {
    const p = pill(b, { r: 0.99, g: 0.9, b: 0.66 }, { r: 0.2, g: 0.15, b: 0 });
    p.name = "Badge";
    head.appendChild(p);
  }
  f.appendChild(head);
  for (const row of block.rows) {
    const cond = Object.keys(row.conditions)
      .map((k) => k + "=" + row.conditions[k])
      .join(", ");
    if (cond) f.appendChild(text(cond, 11, "Regular", GREY));
    for (const it of row.items) {
      const r = auto("HORIZONTAL", { itemSpacing: 12 });
      r.name = "Token row";
      const slot = figma.createFrame();
      slot.name = "Marker";
      slot.fills = [];
      slot.resize(18, 18);
      if (it.marker) {
        const c = figma.createEllipse();
        c.resize(18, 18);
        slot.appendChild(c);
        c.x = 0;
        c.y = 0;
        const outline = undrawn.indexOf(it.marker) >= 0;
        if (outline) {
          c.fills = [];
          c.strokes = [solid(BLUE)];
          c.strokeWeight = 1.5;
        } else {
          c.fills = [solid(BLUE)];
        }
        const t = text(it.marker, 11, "Medium", outline ? BLUE : WHITE);
        slot.appendChild(t);
        t.x = 9 - t.width / 2;
        t.y = 9 - t.height / 2;
      }
      r.appendChild(slot);
      r.appendChild(
        text(
          it.token.name + (it.source === "inline" ? " (inline value)" : ""),
          13,
        ),
      );
      r.appendChild(text(it.label, 13));
      r.appendChild(text(valueText(it.values), 13, "Regular", GREY));
      f.appendChild(r);
    }
  }
  return f;
}

// Metadata-class changes are only counted per commit in the changelog JSON; rows list the rest.
function changelogFrame(changelog, rev8) {
  const f = auto("VERTICAL", { itemSpacing: 8 });
  f.name = "Changelog";
  f.appendChild(text("Changelog", 32, "Bold"));
  const first = changelog.baseline
    ? changelog.baseline.release
    : "first release";
  const latest = changelog.releases[changelog.releases.length - 1];
  f.appendChild(
    text(
      "Version " +
        (latest ? latest.version : "") +
        " · from " +
        first +
        " · dataset " +
        rev8,
      13,
    ),
  );
  for (const rel of changelog.releases.slice().reverse()) {
    const commits = rel.commits
      .map((c) => ({ c, shown: c.entries }))
      .filter((x) => x.shown.length);
    if (!commits.length) continue;
    f.appendChild(
      text(
        rel.version +
          " · " +
          (rel.bump || "first release") +
          " · release " +
          rel.release +
          " · " +
          rel.date,
        16,
        "Bold",
      ),
    );
    for (const { c, shown } of commits) {
      const by = {};
      for (const e of shown) by[e.class] = (by[e.class] || 0) + 1;
      const src =
        c.source.type === "pr"
          ? "#" + c.source.number + " " + c.source.title
          : c.source.sha.slice(0, 8) + " " + c.source.subject;
      const row = auto("HORIZONTAL", {
        paddingTop: 6,
        paddingBottom: 6,
        paddingLeft: 12,
        paddingRight: 12,
        cornerRadius: 8,
      });
      row.name = "Changelog item";
      row.strokes = [solid({ r: 0.88, g: 0.88, b: 0.88 })];
      row.strokeWeight = 1;
      const chips = Object.keys(by)
        .map((k) => k + " " + by[k])
        .join(", ");
      row.appendChild(
        text(
          c.date +
            " · " +
            src +
            " · " +
            shown.length +
            " changes (" +
            chips +
            ")",
          13,
        ),
      );
      f.appendChild(row);
    }
  }
  return f;
}

const BUILDING = " (building)";
const rootNameOf = (sheet) => sheet.displayName + " \u2013 spec (generated)";
const revOf = (sheet) =>
  sheet.datasetRevision ? sheet.datasetRevision.slice(0, 8) : "unknown";

function findBuilding(sheet) {
  const root = topLevel(rootNameOf(sheet) + BUILDING);
  if (!root) throw new Error("No sheet is being built: run the first payload.");
  return root;
}

function blockRow(sheet, b) {
  const row = auto("HORIZONTAL", {
    itemSpacing: 32,
    paddingTop: 24,
    paddingBottom: 24,
  });
  row.name = "Block \u2013 " + b.title;
  row.appendChild(b.render ? visual(b, sheet.block) : noVisual(sheet.block));
  row.appendChild(tokenList(b));
  return row;
}

// The steps below are what `use_figma` payloads call one after another (the sheet is built
// under a "(building)" name and only takes the final name in finishSheet, so a failed or
// partial run never touches the previous render). renderSheet runs them in one go.
// `sheet` needs displayName, size, block, datasetRevision and pages[].title.

// Only the root frames this renderer made are ever removed, and only at the top level of its
// own page. The "Notes" page is created when missing and never written to.
function topLevel(name) {
  return figma.currentPage.children.find((n) => n.name === name) || null;
}

function ensureNotesPage() {
  if (!figma.root.children.some((p) => p.name === "Notes"))
    figma.createPage().name = "Notes";
}

async function beginSheet(sheet, pageTitles) {
  const warning = await loadFonts();
  const page = figma.currentPage;
  if (page.name === "Notes")
    throw new Error("Run on a page other than Notes: nothing may write there.");
  ensureNotesPage();
  const stale = topLevel(rootNameOf(sheet) + BUILDING);
  if (stale) stale.remove();
  const root = auto("VERTICAL", {
    itemSpacing: 80,
    paddingLeft: 64,
    paddingRight: 64,
    paddingTop: 64,
    paddingBottom: 64,
  });
  root.name = rootNameOf(sheet) + BUILDING;
  root.fills = [solid(WHITE)];
  page.appendChild(root);
  const cover = auto("VERTICAL", {
    itemSpacing: 12,
    paddingLeft: 64,
    paddingRight: 64,
    paddingTop: 64,
    paddingBottom: 64,
    cornerRadius: 8,
  });
  cover.name = "Cover";
  cover.fills = [solid({ r: 0.96, g: 0.96, b: 0.96 })];
  cover.appendChild(text(sheet.displayName, 48, "Bold"));
  cover.appendChild(
    text(
      "Spec sheet generated from design-data. Size " +
        sheet.size.toUpperCase() +
        ". Dataset " +
        revOf(sheet) +
        ".",
      16,
    ),
  );
  cover.appendChild(
    text("Generated: do not edit this page. Add notes on the Notes page.", 16),
  );
  root.appendChild(cover);
  const specs = auto("HORIZONTAL", { itemSpacing: 64 });
  specs.name = "Specs";
  root.appendChild(specs);
  const pages = sheet.pages.filter(
    (p) => !pageTitles || pageTitles.indexOf(p.title) !== -1,
  );
  for (const p of pages) {
    const col = auto("VERTICAL", { itemSpacing: 8 });
    col.name = "Spec page \u2013 " + p.title;
    col.appendChild(text(p.title, 32, "Bold"));
    specs.appendChild(col);
  }
  return { step: "begin", pages: pages.map((p) => p.title), warning };
}

async function appendChangelog(sheet, changelog) {
  await loadFonts();
  const root = findBuilding(sheet);
  const frame = changelogFrame(changelog, revOf(sheet));
  root.insertChild(1, frame);
  return { step: "changelog", items: frame.children.length };
}

async function appendBlocks(sheet, pageTitle, blocks) {
  await loadFonts();
  const col = findBuilding(sheet).findOne(
    (n) => n.name === "Spec page \u2013 " + pageTitle,
  );
  if (!col) throw new Error("No page column for " + pageTitle);
  for (const b of blocks) col.appendChild(blockRow(sheet, b));
  return { step: "blocks", page: pageTitle, blocksRendered: blocks.length };
}

async function finishSheet(sheet) {
  const root = findBuilding(sheet);
  const name = rootNameOf(sheet);
  const previous = topLevel(name);
  if (previous) {
    root.x = previous.x;
    root.y = previous.y;
    previous.remove();
  }
  root.name = name;
  const columns = root.findAll((n) => n.name.startsWith("Spec page \u2013 "));
  const blocks = root.findAll((n) => n.name.startsWith("Block \u2013 "));
  return {
    step: "finish",
    root: name,
    id: root.id,
    pagesRendered: columns.length,
    blocksRendered: blocks.length,
  };
}

async function renderSheet(sheet, changelog, pageTitles) {
  const begun = await beginSheet(sheet, pageTitles);
  try {
    if (changelog) await appendChangelog(sheet, changelog);
    for (const p of sheet.pages) {
      if (begun.pages.indexOf(p.title) === -1) continue;
      await appendBlocks(sheet, p.title, p.blocks);
    }
    const done = await finishSheet(sheet);
    return {
      root: done.root,
      pagesRendered: done.pagesRendered,
      blocksRendered: done.blocksRendered,
      warning: begun.warning,
    };
  } catch (err) {
    // The old render stays; drop the half-built one.
    const half = topLevel(rootNameOf(sheet) + BUILDING);
    if (half) half.remove();
    throw err;
  }
}

// shell:begin (the desktop plugin UI; use_figma payloads leave this out)
figma.showUI(__html__, { width: 420, height: 360 });

figma.ui.onmessage = async (msg) => {
  if (msg.type !== "render-sheet") return;
  try {
    const result = await renderSheet(msg.sheet, msg.changelog, msg.pages);
    figma.ui.postMessage({ type: "render-complete", result });
  } catch (err) {
    figma.ui.postMessage({
      type: "render-error",
      message: String(err && err.message ? err.message : err),
    });
  }
};
// shell:end
