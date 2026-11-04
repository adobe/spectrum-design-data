// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createElement as reactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  createElement,
  isStructureElement,
  UI_GLYPHS,
} from "../src/features/structures/elements";
import { spectrumIconLoaders } from "../src/features/icons/spectrumIconCatalog.generated";

const drag = { ...createElement("uiIcon"), glyph: "DragHandle" };
assert.equal(isStructureElement(drag), true);
assert.ok(UI_GLYPHS.includes("DragHandle"));
assert.equal(isStructureElement({ ...drag, glyph: "NotAnIcon" }), false);
const { default: Icon } = await spectrumIconLoaders.DragHandle();
const html = renderToStaticMarkup(
  reactElement(Icon, {
    "aria-hidden": true,
    UNSAFE_style: { width: "100%", height: "100%" },
  }),
);
assert.match(html, /<svg/);
assert.match(html, /<circle/);
assert.equal((html.match(/<circle/g) ?? []).length, 8);
assert.match(html, /viewBox="0 0 6 12"/);
assert.match(html, /aria-hidden="true"/);
assert.match(html, /fill="currentColor"/);
assert.match(html, /width:100%;height:100%/);
assert.doesNotMatch(html, /<button|draggable=/);
assert.equal(isStructureElement({ ...drag, glyph: "ChevronRight" }), true);
console.log(
  "Structure UI icons: official Spectrum drag glyph loads and renders without interactive drag behavior; ChevronRight and invalid glyph checks pass.",
);
