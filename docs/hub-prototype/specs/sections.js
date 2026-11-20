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

function sectionBlock(b) {
  const title =
    b.title && b.kind !== "placeholder" ? `<h3>${esc(b.title)}</h3>` : "";
  let body = "";
  if (b.kind === "table") {
    body = `<table class="grid"><thead><tr>${b.columns.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>${b.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
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
