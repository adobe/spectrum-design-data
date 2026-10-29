// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.resolve("react-aria-components"));
const packageRoot = dirname(require.resolve("react-stately/package.json"));
const { Layout, LayoutInfo, Rect, Size } = require("react-stately/useVirtualizerState");

class MeasuredLayout extends Layout {
  contentSize = new Size(100, 100);
  measuredSize = new Size(100, 200);
  item = { id: "row" };
  updates = 0;

  update() {
    this.updates += 1;
  }

  getContentSize() {
    return this.contentSize;
  }

  getVisibleLayoutInfos() {
    this.contentSize = this.measuredSize;
    const info = new LayoutInfo("item", "row", new Rect(0, 0, 100, 20));
    info.content = this.item;
    return [info];
  }

  getLayoutInfo() {
    return new LayoutInfo("item", "row", new Rect(0, 0, 100, 20));
  }
}

for (const format of ["mjs", "cjs"]) {
  // The dependency's core is private; the application continues to use public S2 APIs.
  const file = join(packageRoot, `dist/private/virtualizer/Virtualizer.${format}`);
  const { Virtualizer } = format === "cjs" ? require(file) : await import(pathToFileURL(file).href);
  const layout = new MeasuredLayout();
  const collection = { getItem: () => null };
  const virtualizer = new Virtualizer({
    collection,
    layout,
    delegate: { renderView: () => null, invalidate: () => {}, setVisibleRect: () => {} },
  });
  const render = (top) => virtualizer.render({
    collection, layout, visibleRect: new Rect(0, top, 100, 20), size: new Size(100, 20),
    invalidationContext: {}, isScrolling: false,
  });

  render(0);
  assert.equal(virtualizer.contentSize.height, 200, `${format}: publish the initial lazy measurement`);
  assert.equal(layout.updates, 1);
  const initialSize = virtualizer.contentSize;
  layout.measuredSize = new Size(100, 400);
  render(20);
  assert.equal(virtualizer.contentSize.height, 400, `${format}: publish growth during offset-only scrolling`);
  assert.equal(layout.updates, 1, `${format}: exercise scrolling without a full relayout`);
  assert.equal(initialSize.height, 200, `${format}: preserve the previous snapshot used by scroll anchoring`);
  const grownSize = virtualizer.contentSize;
  render(40);
  assert.equal(virtualizer.contentSize, grownSize, `${format}: retain identity when dimensions are unchanged`);
  layout.measuredSize = new Size(160, 80);
  render(0);
  assert.equal(virtualizer.contentSize.width, 160, `${format}: publish lazy width changes`);
  assert.equal(virtualizer.contentSize.height, 80, `${format}: publish lazy shrinkage`);
  assert.equal(grownSize.height, 400, `${format}: do not mutate a previously published size`);
  const reducedSize = virtualizer.contentSize;
  layout.measuredSize.height = 160;
  assert.equal(reducedSize.height, 80, `${format}: detach the published size from mutable layout measurements`);
  render(20);
  assert.equal(virtualizer.contentSize.height, 160, `${format}: publish an in-place layout measurement`);
  assert.equal(reducedSize.height, 80, `${format}: preserve the prior snapshot after in-place growth`);

  const anchoredLayout = new MeasuredLayout();
  anchoredLayout.UNSTABLE_getScrollAnchorInfo = () => ({ edge: "end", axis: "y", threshold: 1 });
  const targets = [];
  const anchored = new Virtualizer({
    collection, layout: anchoredLayout,
    delegate: { renderView: () => null, invalidate: () => {}, setVisibleRect: (rect) => targets.push(rect) },
  });
  const renderAnchored = (top) => anchored.render({
    collection, layout: anchoredLayout, visibleRect: new Rect(0, top, 100, 20), size: new Size(100, 20),
    invalidationContext: {}, isScrolling: false,
  });
  renderAnchored(0);
  assert.equal(targets.at(-1)?.y, 180, `${format}: initial edge anchoring uses the lazy measured size`);
  renderAnchored(80);
  targets.length = 0;
  anchoredLayout.measuredSize = new Size(100, 400);
  anchored.relayout({ itemSizeChanged: true });
  assert.equal(targets.length, 0, `${format}: measurements do not pull a reader away from the middle`);
  renderAnchored(380);
  anchoredLayout.measuredSize = new Size(100, 600);
  anchored.relayout({ itemSizeChanged: true });
  assert.equal(targets.at(-1)?.y, 580, `${format}: preserve end anchoring when lazy content grows`);
}

console.log("Virtualizer lazy content-size checks passed (ESM and CommonJS).");
