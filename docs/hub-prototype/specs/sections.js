// Copyright 2026 Adobe. All rights reserved.

// HTML for the template sections (`sheet.sections`) shown below the measurement blocks. Pure
// functions of the sheet JSON, so they run in Node tests as well as in the page.

const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );

const list = (cls, label, items) =>
  items?.length
    ? `<div class="${cls}"><strong>${label}</strong><ul>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul></div>`
    : "";

// The cell draws the render's svg (`spec-sheet --svg`) under the view the generator fitted.
function galleryCell(item, cell) {
  const { view, svg } = item.render;
  const inner = (svg ?? "")
    .replace(/^<svg[^>]*>/, "")
    .replace(/<\/svg>\s*$/, "");
  return `<figure><svg width="${cell.width}" height="${cell.height}" viewBox="0 0 ${cell.width} ${cell.height}" role="img" aria-label="${esc(item.title)}"><g transform="translate(${view.x} ${view.y}) scale(${view.scale})">${inner}</g></svg><figcaption>${esc(item.title)}</figcaption></figure>`;
}

// Column widths: weighted by the larger of the header length and the 90th percentile of the
// cell lengths, but never narrower than the longest unbreakable word (7.2px a character plus the
// 16px cell padding) and never wider than 45% of the width; they sum to 960.
function columnWidths(b) {
  const MAX = 960 * 0.45;
  const pct = (a) => {
    const s = a.slice().sort((x, y) => x - y);
    return s.length ? s[Math.ceil(s.length * 0.9) - 1] : 0;
  };
  const word = (v) =>
    String(v ?? "")
      .split(/\s+/)
      .reduce((m, x) => Math.max(m, x.length), 0);
  const cols = b.columns.map((h, i) => {
    const cells = b.rows.map((r) => String(r[i] ?? ""));
    return {
      weight: Math.max(String(h).length, pct(cells.map((x) => x.length)), 1),
      min: Math.min(
        Math.ceil(Math.max(word(h), pct(cells.map(word))) * 7.2) + 16,
        MAX,
      ),
    };
  });
  const minSum = cols.reduce((s, c) => s + c.min, 0);
  if (minSum > 960) cols.forEach((c) => (c.min = (c.min / minSum) * 960));
  const w = cols.map(() => null);
  for (let pass = 0; pass <= cols.length * 2; pass++) {
    const free = cols.filter((_, i) => w[i] === null);
    const left = 960 - w.reduce((s, x) => s + (x === null ? 0 : x), 0);
    const total = free.reduce((s, c) => s + c.weight, 0);
    let pinned = false;
    cols.forEach((c, i) => {
      if (w[i] !== null) return;
      const x = (c.weight / total) * left;
      if (x < c.min) ((w[i] = c.min), (pinned = true));
      else if (x > MAX) ((w[i] = MAX), (pinned = true));
    });
    if (!pinned) {
      cols.forEach((c, i) => {
        if (w[i] === null) w[i] = (c.weight / total) * left;
      });
      break;
    }
  }
  const out = w.map((x) => Math.floor(x ?? 0));
  out[out.length - 1] += 960 - out.reduce((x, y) => x + y, 0);
  return out;
}

// Longer tables show this many rows; the rest sit in a <details>.
const VISIBLE_ROWS = 20;

function sectionBlock(b) {
  const title =
    b.title && b.kind !== "placeholder" ? `<h3>${esc(b.title)}</h3>` : "";
  let body = "";
  if (b.kind === "table") {
    const cols = `<colgroup>${columnWidths(b)
      .map((w) => `<col style="width:${((w / 960) * 100).toFixed(2)}%">`)
      .join("")}</colgroup>`;
    const head = `<thead><tr>${b.columns.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead>`;
    const rows = (rs) =>
      `<tbody>${rs.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody>`;
    const open = b.rows.slice(0, VISIBLE_ROWS);
    const rest = b.rows.slice(VISIBLE_ROWS);
    body = `<table class="grid">${cols}${head}${rows(open)}</table>`;
    if (rest.length)
      body += `<details><summary>Show all ${b.rows.length} rows</summary><table class="grid">${cols}${head}${rows(rest)}</table></details>`;
  } else if (b.kind === "gallery") {
    body =
      (b.caption ? `<p>${esc(b.caption)}</p>` : "") +
      `<div class="gallery" style="grid-template-columns:repeat(${Number(b.columns) || 1},${Number(b.cell.width)}px)">${b.items.map((i) => galleryCell(i, b.cell)).join("")}</div>`;
  } else if (b.kind === "placeholder") {
    body = `<div class="placeholder"><span class="badge manual">Manual</span><p>${esc(b.hint)}</p></div>`;
  } else {
    body =
      (b.paragraphs ?? []).map((p) => `<p>${esc(p)}</p>`).join("") +
      list("bullets", "", b.bullets) +
      (b.do?.length || b.dont?.length
        ? `<div class="do-dont">${list("do", "Do", b.do)}${list("dont", "Don\u2019t", b.dont)}</div>`
        : "");
  }
  return `<div class="section-block" id="${esc(b.id)}">${title}${body}</div>`;
}

export function sectionNav(sections = []) {
  return sections
    .map((s) => `<a href="#section-${esc(s.key)}">${esc(s.title)}</a>`)
    .join("");
}

export function renderSections(sections = []) {
  return sections
    .map(
      (s) =>
        `<section class="spec-section" id="section-${esc(s.key)}" aria-labelledby="section-${esc(s.key)}-h"><h2 id="section-${esc(s.key)}-h">${esc(s.title)}</h2>${s.blocks.map(sectionBlock).join("")}</section>`,
    )
    .join("");
}
