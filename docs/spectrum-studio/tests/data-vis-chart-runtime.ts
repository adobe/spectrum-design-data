// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { expressionFunction, parse, View } from "vega";

// S2 registers this expression through Vega before its specs reach the parser.
expressionFunction("rscContainerWidth", () => 320);
const runtime = parse({
  width: 320,
  height: 224,
  signals: [{ name: "containerWidth", update: "rscContainerWidth()" }],
  marks: [
    {
      type: "rect",
      encode: {
        enter: {
          x: { value: 0 },
          y: { value: 0 },
          width: { signal: "containerWidth" },
          height: { value: 100 },
          fill: { value: "#1645a1" },
        },
      },
    },
  ],
});
const view = new View(runtime, { renderer: "none" });
try {
  await view.runAsync();
  assert.equal(view.signal("containerWidth"), 320);
  const svg = await view.toSVG();
  assert.match(svg, /fill="#1645a1"/);
  assert.match(svg, /320/);
} finally {
  view.finalize();
}
console.log(
  "Chart runtime: S2 expression registration reaches the parser and SVG renderer.",
);
