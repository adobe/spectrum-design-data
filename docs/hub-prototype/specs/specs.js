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
const commits = changelog.releases.flatMap((rel) =>
  rel.commits.map((c) => ({ ...c, release: rel })),
);
const entries = new Map(
  commits.flatMap((c) =>
    c.entries.map((e) => [e.id, { ...e, source: c.source, date: c.date }]),
  ),
);

const BOX = sheet.block;
const MARK = "#4b75ff";

function visual(block) {
  const { scene, markers, measurements } = block.render;
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
  for (const sel of measurements) {
    const m = scene.measurements[sel.index];
    const text = m.token.value;
    const x = X(m.x),
      y = Y(m.y),
      w = m.w * k,
      h = m.h * k;
    o += `<title>${esc(sel.relationship ?? sel.label)}</title>`;
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
  measurements.forEach((sel, i) => {
    const m = scene.measurements[sel.index];
    const y = BOX.height - 12 - (measurements.length - 1 - i) * 15;
    o += `<text x="12" y="${y}" fill="${MARK}" font-size="11">${esc(sel.label)} · ${esc(m.token.value)}</text>`;
  });
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
      h += `<tr><td class="n">${it.marker ? `<span class="marker">${it.marker}</span>` : ""}</td><td class="t">${esc(it.token.name)}</td><td>${esc(it.label)}</td><td class="v">${esc(value(it.values))}</td></tr>`;
    }
    h += "</table>";
  }
  return `<div class="tokens">${h}${block.notes.map((n) => `<p>${esc(n)}</p>`).join("")}</div>`;
}

// A sheet built without a changelog has no dataset revision.
const rev8 = (d) =>
  d.datasetRevision ? d.datasetRevision.slice(0, 8) : "unknown";

// Metadata-class changes are only counted per commit (`metadata: {count, fields}`).
const shown = (c) => c.entries;

const sourceLink = (s) =>
  s.type === "pr"
    ? `<a href="${esc(s.url)}">#${s.number}</a> ${esc(s.title)}`
    : `<code>${esc(s.sha.slice(0, 8))}</code> ${esc(s.subject)}`;

const describe = (e) =>
  `${e.kind} ${e.change}${e.fields[0] ? ` ${e.fields[0].path}` : ""}${e.scope?.property ? ` · ${e.scope.property}` : ""}${e.name && !e.scope ? ` · ${e.name}` : ""}`;

function renderChangelog() {
  const rows = [...changelog.releases]
    .reverse()
    .map((rel) => {
      const rows = rel.commits
        .map((c) => [c, shown(c)])
        .filter(([, entries]) => entries.length)
        .map(([c, entries]) => {
          const byClass = {};
          for (const e of entries)
            byClass[e.class] = (byClass[e.class] ?? 0) + 1;
          const chips = Object.entries(byClass)
            .map(([k, n]) => `<span class="chip ${k}">${k} ${n}</span>`)
            .join(" ");
          const items = entries
            .slice(0, 40)
            .map(
              (e) =>
                `<li><span class="chip ${e.class}">${e.class}</span>${e.indirect ? '<span class="chip indirect">indirect</span>' : ""}<span>${esc(describe(e))}</span><span>${esc(e.contexts.join(", "))}</span></li>`,
            )
            .join("");
          return `<details class="rev"><summary>${esc(c.date)} · ${sourceLink(c.source)} · ${entries.length} changes ${chips}${c.metadata ? ` · ${c.metadata.count} metadata` : ""}</summary><ul>${items}${entries.length > 40 ? `<li>… ${entries.length - 40} more</li>` : ""}</ul></details>`;
        })
        .join("");
      return rows
        ? `<h3>${esc(rel.version)} <small>${esc(rel.bump ?? "first release")} · release ${esc(rel.release)} · ${esc(rel.date)}</small></h3>${rows}`
        : "";
    })
    .join("");
  const latest = changelog.releases.at(-1);
  document.getElementById("changelog").innerHTML =
    `<h2 id="changelog-h">Changelog</h2><p>Version ${esc(latest?.version ?? changelog.baseline?.version ?? "")} · from ${esc(changelog.baseline?.release ?? "the first release")} · dataset ${esc(rev8(sheet))}</p>${rows}`;
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
  `${sheet.displayName} spec sheet (generated, dataset ${rev8(sheet)})`;
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
