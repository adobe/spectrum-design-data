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
        kind: "gallery",
        id: "anatomy--variants",
        section: "anatomy",
        title: "All 2 variants",
        caption: "Size x quiet.",
        columns: 2,
        cell: { width: 100, height: 60 },
        items: ["Small, default", "Small, quiet"].map((title) => ({
          title,
          render: {
            view: { scale: 1, x: 5, y: 5 },
            scene: {
              width: 90,
              height: 50,
              nodes: [
                {
                  part: "box",
                  kind: "box",
                  x: 0,
                  y: 0,
                  w: 90,
                  h: 50,
                  fill: "#ffffff",
                },
              ],
            },
            svg: '<svg width="90" height="50"><rect width="90" height="50"/></svg>',
          },
        })),
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
  assert.match(html, /repeat\(2,100px\)/);
  assert.match(html, /<figcaption>Small, quiet<\/figcaption>/);
  assert.match(html, /translate\(5 5\) scale\(1\)"><rect/);
  assert.match(html, /badge manual">Manual<[^]*Variants table\./);
});

test("nav links to every section; no sections renders nothing", () => {
  const nav = sectionNav(sections);
  assert.match(nav, /href="#section-anatomy"/);
  assert.equal(renderSections(undefined), "");
  assert.equal(renderSections([]), "");
  assert.equal(sectionNav(undefined), "");
});

test("a long table shows 20 rows and puts the rest in a details with its own header", () => {
  const rows = Array.from({ length: 25 }, (_, i) => [`r${i}`]);
  const html = renderSections([
    {
      key: "anatomy",
      title: "Anatomy",
      blocks: [
        {
          kind: "table",
          id: "t",
          section: "anatomy",
          title: "Tokens (25)",
          columns: ["Name"],
          rows,
        },
      ],
    },
  ]);
  const [open, rest] = html.split("<details>");
  assert.equal((open.match(/<tr>/g) ?? []).length, 21);
  assert.match(rest, /Show all 25 rows<\/summary>[^]*<th>Name<\/th>[^]*r24/);
  assert.equal((rest.match(/<td>/g) ?? []).length, 5);
  assert.doesNotMatch(renderSections(sections), /<details>/);
});
