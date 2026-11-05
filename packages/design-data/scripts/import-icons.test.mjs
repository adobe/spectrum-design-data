// Copyright 2026 Adobe. All rights reserved.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildSets,
  kebab,
  parseSvg,
  unregistered,
  WORKFLOW_ICONS,
} from "./import-icons.mjs";

const svg = (body, viewBox = "0 0 10 10") =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<svg id="a" data-name="ICONS" xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="${viewBox}">\n${body}\n</svg>`;
const fill = 'fill="var(--iconPrimary, #222)"';

test("names become kebab-case ids", () => {
  assert.equal(kebab("DragHandle"), "drag-handle");
  assert.equal(kebab("LinkOut"), "link-out");
  assert.equal(kebab("Chevron"), "chevron");
});

test("paths keep their data and fill rule and drop the colour", () => {
  const g = parseSvg(
    svg(
      `<path d="M1 1h8" ${fill}/><path d="M0 0z" fill-rule="evenodd" ${fill} stroke-width="0"/>`,
    ),
    "x.svg",
  );
  assert.deepEqual(g, {
    viewBox: "0 0 10 10",
    paths: [{ d: "M1 1h8" }, { d: "M0 0z", fillRule: "evenodd" }],
  });
});

test("circles become two arcs", () => {
  const g = parseSvg(svg(`<circle cx="3" cy="9" r="1" ${fill}/>`), "x.svg");
  assert.equal(g.paths[0].d, "M2,9a1,1 0 1 0 2,0a1,1 0 1 0 -2,0Z");
});

test("anything that cannot be kept exactly is an error", () => {
  for (const body of [
    `<rect width="1" height="1" ${fill}/>`,
    `<path d="M0 0" ${fill} transform="rotate(90)"/>`,
    `<path d="M0 0" fill="#fff"/>`,
    `<circle cx="8" cy="8" r="8" />`,
  ])
    assert.throws(() => parseSvg(svg(body), "x.svg"), /x\.svg/);
});

test("UI icons group by name and scale, workflow icons by name; unsized files are skipped", () => {
  const files = {
    "ui-icons": [
      "S2_ChevronSize100.svg",
      "S2_ChevronSize75.svg",
      "S2_Widget.svg",
      "S2_Chevron.tsx",
    ],
  };
  const { sets, skipped } = buildSets({
    sha: "0".repeat(40),
    list: (dir) => files[dir.split("/").at(-1)],
    read: (path) => svg(`<path d="${path}" ${fill}/>`),
  });
  assert.deepEqual(Object.keys(sets.ui.icons.chevron.sizes), ["75", "100"]);
  assert.equal(
    sets.ui.icons.chevron.sizes["100"].source,
    "S2_ChevronSize100.svg",
  );
  assert.deepEqual(skipped, [
    { file: "S2_Widget.svg", reason: "no Size<scale> suffix" },
  ]);
  assert.deepEqual(
    Object.keys(sets.workflow.icons),
    WORKFLOW_ICONS.map(kebab).sort(),
  );
  assert.equal(sets.workflow.source.commit, "0".repeat(40));
  assert.deepEqual(unregistered(sets, { values: [{ id: "chevron" }] }), [
    "workflow:add",
    "workflow:delete",
    "workflow:edit",
    "workflow:search",
    "workflow:settings",
  ]);
});

test("the committed icon files are what the importer wrote", () => {
  for (const name of ["ui", "workflow"]) {
    const text = readFileSync(
      new URL(`../icons/${name}.json`, import.meta.url),
      "utf8",
    );
    assert.equal(text, JSON.stringify(JSON.parse(text), null, 2) + "\n");
    assert.match(JSON.parse(text).source.commit, /^[0-9a-f]{40}$/);
  }
});
