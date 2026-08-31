// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

// Stage 2 of the S2 Tokens spec generator (see tools/component-spec-generator for
// Stage 1). Renders a component-token-spec.json (produced by that tool) onto the
// canvas, deterministically and idempotently: re-running with the same input updates
// existing nodes in place instead of duplicating them, by finding nodes by a stable
// name before creating one.
//
// Plain JS, no bundler — Figma's plugin sandbox runs this file directly as a classic
// script (no ES module imports), so a build step buys nothing here.
//
// Prototype scope: this renders plain auto-layout frames, not the existing
// "S2 Tokens/Content block" component instance. See the plan's "Fidelity" open item —
// switching to instancing that component is a follow-up once its slot API is known.

const FONT = { family: "Inter", style: "Regular" };
const FONT_BOLD = { family: "Inter", style: "Bold" };

figma.showUI(__html__, { width: 420, height: 320 });

figma.ui.onmessage = async (msg) => {
  if (msg.type !== "render-spec") return;
  try {
    const result = await renderSpec(msg.spec);
    figma.ui.postMessage({ type: "render-complete", result });
  } catch (err) {
    figma.ui.postMessage({
      type: "render-error",
      message: String(err && err.message ? err.message : err),
    });
  }
};

/**
 * @param {Record<string, { displayName: string, groups: Array<{label, property, rows}> }>} spec
 */
async function renderSpec(spec) {
  await figma.loadFontAsync(FONT);
  await figma.loadFontAsync(FONT_BOLD);

  let pagesRendered = 0;
  let groupsRendered = 0;

  for (const [component, componentSpec] of Object.entries(spec)) {
    const page = findOrCreatePage(
      `Spec: ${componentSpec.displayName || component}`,
    );
    figma.currentPage = page;

    let x = 0;
    for (const group of componentSpec.groups) {
      // Keyed by label, not group.property: Stage 1 groups CTR rows by their `context`
      // label (see component-spec-generator's groupsByContext), and multiple properties
      // can share one label (or vice versa) — property is informational only, and using
      // it here let unrelated groups collide onto the same frame name and overwrite
      // each other on every render.
      const frameName = `spec/${component}/${sanitizeNodeName(group.label)}`;
      renderGroup(page, frameName, group, x);
      x += 340;
      groupsRendered++;
    }
    pagesRendered++;
  }

  return { pagesRendered, groupsRendered };
}

// Figma node names allow any string, but slashes/parentheses in a label ("Spacing
// (top edge to text)") make the resulting `spec/<component>/<label>` path confusing
// to read in the layers panel. Collapse to a simple slug.
function sanitizeNodeName(label) {
  return String(label)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function findOrCreatePage(name) {
  const existing = figma.root.children.find((p) => p.name === name);
  if (existing) return existing;
  const page = figma.createPage();
  page.name = name;
  return page;
}

/**
 * Render (or, on re-run, replace) one property group as a fixed auto-layout frame.
 * Idempotent by node name: an existing frame with this name is removed and rebuilt
 * rather than left to accumulate duplicate rows on every re-run.
 */
function renderGroup(page, frameName, group, x) {
  const existing = page.findOne(
    (n) => n.name === frameName && n.type === "FRAME",
  );
  if (existing) existing.remove();

  const frame = figma.createFrame();
  frame.name = frameName;
  frame.x = x;
  frame.y = 0;
  frame.layoutMode = "VERTICAL";
  frame.primaryAxisSizingMode = "AUTO";
  frame.counterAxisSizingMode = "AUTO";
  frame.itemSpacing = 4;
  frame.paddingLeft = 16;
  frame.paddingRight = 16;
  frame.paddingTop = 16;
  frame.paddingBottom = 16;
  frame.fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];

  frame.appendChild(makeText(group.label, FONT_BOLD, 14));

  for (const row of group.rows) {
    const valuesText = Object.entries(row.values)
      .map(([ctx, value]) => `${ctx}: ${value}`)
      .join("  ·  ");
    const sizeDensity = [
      row.density !== "default" ? row.density : null,
      row.size,
    ]
      .filter(Boolean)
      .join(" ");
    const label = sizeDensity
      ? `${row.tokenName} (${sizeDensity})`
      : row.tokenName;
    frame.appendChild(makeText(label, FONT_BOLD, 11));
    frame.appendChild(makeText(valuesText, FONT, 11));
  }

  page.appendChild(frame);
  return frame;
}

function makeText(content, font, size) {
  const node = figma.createText();
  node.fontName = font;
  node.fontSize = size;
  node.characters = content;
  return node;
}
