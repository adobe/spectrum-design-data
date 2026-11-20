// Copyright 2026 Adobe. All rights reserved.

import test from "node:test";
import assert from "node:assert/strict";
import { renderSections, sectionNav } from "../specs/sections.js";

const sections = [
  {
    key: "usage",
    title: "Usage <guidelines>",
    blocks: [
      {
        kind: "prose",
        id: "usage--prose",
        section: "usage",
        title: "When",
        paragraphs: ["Use it."],
        bullets: ["Short labels"],
        do: ["Use a verb"],
        dont: ["Use a noun"],
      },
    ],
  },
  {
    key: "anatomy",
    title: "Anatomy",
    blocks: [
      {
        kind: "table",
        id: "anatomy--api",
        section: "anatomy",
        title: "API",
        columns: ["Prop", "Type"],
        rows: [["size", "s | m"]],
      },
      {
        kind: "placeholder",
        id: "anatomy--placeholder",
        section: "anatomy",
        title: "Anatomy",
        hint: "Variants table.",
      },
    ],
  },
];

test("renders each block kind with anchors and escapes text", () => {
  const html = renderSections(sections);
  assert.match(html, /id="section-usage"/);
  assert.match(html, /Usage &lt;guidelines&gt;/);
  assert.match(html, /class="do"[^]*Use a verb/);
  assert.match(html, /class="dont"[^]*Use a noun/);
  assert.match(html, /<th>Prop<\/th>/);
  assert.match(html, /<td>s \| m<\/td>/);
  assert.match(html, /badge manual">Manual<[^]*Variants table\./);
});

test("nav links to every section; no sections renders nothing", () => {
  const nav = sectionNav(sections);
  assert.match(nav, /href="#section-anatomy"/);
  assert.equal(renderSections(undefined), "");
  assert.equal(renderSections([]), "");
  assert.equal(sectionNav(undefined), "");
});
