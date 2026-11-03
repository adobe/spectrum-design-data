// Copyright 2026 Adobe. All rights reserved.

// Renders the generated spec sheet and changelog JSON. Every visual is drawn from the block's
// scene; this file converts scene coordinates to screen space and draws marks, and computes no
// layout of its own.

import { renderSvg } from "./visual-runtime.js";

const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );
const [sheet, changelog] = await Promise.all(
  ["data/sheets/action-button.json", "data/changelog/action-button.json"].map(
    (u) => fetch(u).then((r) => r.json()),
  ),
);
const entries = new Map(
  changelog.revisions.flatMap((r) =>
    r.entries.map((e) => [e.id, { ...e, source: r.source, date: r.date }]),
  ),
);

const BOX = sheet.block;
const MARK = "#4b75ff";

function visual(block) {
  const { scene, highlight, markers, measurements } = block.render;
  const k = Math.min(
    (BOX.width - 160) / scene.width,
    (BOX.height - 120) / scene.height,
    5,
  );
  const tx = (BOX.width - scene.width * k) / 2;
  const ty = (BOX.height - scene.height * k) / 2;
  const X = (x) => x * k + tx;
  const Y = (y) => y * k + ty;
  const inner = renderSvg(scene)
    .replace(/^<svg[^>]*>/, "")
    .replace(/<\/svg>$/, "");
  let o = "";
  const label = (x, y, text, anchor = "middle") =>
    `<g><rect x="${anchor === "end" ? x - 8 - text.length * 6 : anchor === "start" ? x - 4 : x - 4 - text.length * 3}" y="${y - 10}" width="${text.length * 6 + 8}" height="18" rx="9" fill="${MARK}"/>` +
    `<text x="${anchor === "end" ? x - 4 : anchor === "start" ? x : x}" y="${y + 3}" fill="#fff" font-size="10" text-anchor="${anchor}">${esc(text)}</text></g>`;
  for (const m of scene.measurements ?? []) {
    if (!measurements.includes(m.prop)) continue;
    const text = m.token.value;
    const x = X(m.x),
      y = Y(m.y),
      w = m.w * k,
      h = m.h * k;
    o += `<title>${esc(m.token.token)}</title>`;
    if (m.kind === "height") {
      const lx = x - 22;
      o += `<line x1="${lx}" y1="${y}" x2="${lx}" y2="${y + h}" stroke="${MARK}"/><line x1="${lx - 4}" y1="${y}" x2="${lx + 4}" y2="${y}" stroke="${MARK}"/><line x1="${lx - 4}" y1="${y + h}" x2="${lx + 4}" y2="${y + h}" stroke="${MARK}"/>`;
      o += label(lx - 6, y + h / 2, text, "end");
    } else if (m.kind === "radius") {
      o += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${MARK}" fill-opacity=".25" stroke="${MARK}"/>`;
      o += label(x - 6, y - 8, text, "end");
    } else {
      o += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${MARK}" fill-opacity=".2"/>`;
      o += `<line x1="${x}" y1="${y + h + 8}" x2="${x + w}" y2="${y + h + 8}" stroke="${MARK}"/>`;
      o += label(x + w / 2, y + h + 26, text);
    }
  }
  for (const mk of markers) {
    const n = scene.nodes.find((n) => n.part === mk.part);
    if (!n) continue;
    const cx = X(n.x + n.w / 2) + (mk.n - 1) * 24;
    const cy = Y(n.y) - 14;
    o += `<circle cx="${cx}" cy="${cy}" r="9" fill="${MARK}"/><text x="${cx}" y="${cy + 4}" fill="#fff" font-size="11" text-anchor="middle">${mk.n}</text>`;
  }
  const dark = block.render.request.options.staticColor === "white";
  return (
    `<div class="visual${dark ? " dark" : ""}"><svg width="${BOX.width}" height="${BOX.height}" viewBox="0 0 ${BOX.width} ${BOX.height}" role="img" aria-label="${esc(block.title)}">` +
    `<g transform="translate(${tx} ${ty}) scale(${k})">${inner}</g>${o}</svg></div>`
  );
}

const value = (v) =>
  Object.entries(v)
    .map(
      ([scale, x]) =>
        `${typeof x === "object" ? `→ ${x.alias}` : x}${scale === "value" ? "" : ` (${scale})`}`,
    )
    .join(" · ");

function tokens(block) {
  let h = `<h3>${esc(block.title)}${block.badges.map((b) => `<span class="badge">${esc(b)}</span>`).join("")}</h3>`;
  for (const row of block.rows) {
    const cond = Object.entries(row.conditions)
      .map(([k, v]) => `${k}=${v}`)
      .join(", ");
    if (cond) h += `<div class="row-cond">${esc(cond)}</div>`;
    h += "<table>";
    for (const it of row.items) {
      h += `<tr><td class="n">${row.marker ? `<span class="marker">${row.marker}</span>` : ""}</td><td class="t">${esc(it.token.name)}</td><td>${esc(it.label)}</td><td class="v">${esc(value(it.values))}</td></tr>`;
    }
    h += "</table>";
  }
  return `<div class="tokens">${h}${block.notes.map((n) => `<p>${esc(n)}</p>`).join("")}</div>`;
}

const sourceLink = (s) =>
  s.type === "pr"
    ? `<a href="${esc(s.url)}">#${s.number}</a>`
    : `<code>${esc(s.sha.slice(0, 8))}</code> ${esc(s.subject)}`;

const describe = (e) =>
  `${e.kind} ${e.change}${e.path ? ` ${e.path}` : ""}${e.scope?.property ? ` · ${e.scope.property}` : ""}${e.token ? ` · ${e.token.slice(0, 8)}` : ""}`;

function renderChangelog() {
  const rows = changelog.revisions
    .map((r) => {
      const byClass = {};
      for (const e of r.entries) byClass[e.class] = (byClass[e.class] ?? 0) + 1;
      const chips = Object.entries(byClass)
        .map(([c, n]) => `<span class="chip ${c}">${c} ${n}</span>`)
        .join(" ");
      const items = r.entries
        .slice(0, 40)
        .map(
          (e) =>
            `<li><span class="chip ${e.class}">${e.class}</span>${e.indirect ? '<span class="chip indirect">indirect</span>' : ""}<span>${esc(describe(e))}</span><span>${esc((e.contexts ?? []).join(", "))}</span></li>`,
        )
        .join("");
      return `<details class="rev"><summary>${esc(r.date)} · ${sourceLink(r.source)} · ${r.entries.length} changes ${chips}</summary><ul>${items}${r.entries.length > 40 ? `<li>… ${r.entries.length - 40} more</li>` : ""}</ul></details>`;
    })
    .join("");
  document.getElementById("changelog").innerHTML =
    `<h2 id="changelog-h">Changelog</h2><p>${esc(changelog.from.ref)} → ${esc(changelog.to.commit.slice(0, 8))}</p>${rows}`;
}

function renderPage(title) {
  const page = sheet.pages.find((p) => p.title === title);
  document.getElementById("blocks").innerHTML =
    `<h2 class="page-title">${esc(page.title)}</h2>` +
    page.blocks
      .map(
        (b) =>
          `<article class="block" id="${esc(b.id)}">${visual(b)}${tokens(b)}</article>`,
      )
      .join("");
  for (const b of document.querySelectorAll("#pages button"))
    b.setAttribute("aria-current", String(b.textContent === title));
}

document.getElementById("title").textContent =
  `${sheet.displayName} spec sheet (generated)`;
document.getElementById("pages").innerHTML = sheet.pages
  .map((p) => `<button>${esc(p.title)}</button>`)
  .join("");
document
  .getElementById("pages")
  .addEventListener(
    "click",
    (e) => e.target.matches("button") && renderPage(e.target.textContent),
  );
renderChangelog();
renderPage(
  new URLSearchParams(location.search).get("page") ?? sheet.pages[0].title,
);
