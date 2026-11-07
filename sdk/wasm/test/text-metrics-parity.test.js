// Copyright 2026 Adobe. All rights reserved.

import test from "ava";
import { defaultTable } from "./helpers/text-metrics.js";
import { Dataset } from "../pkg/node/design_data_wasm.js";
import {
  parseTextMetrics,
  renderScene,
  renderSvg,
} from "../../plugins/site/assets/visual-runtime.js";

const labelProps = (fontWeight) => ({
  fontSize: { value: 14 },
  ...(fontWeight ? { fontWeight: { value: fontWeight } } : {}),
});
const compiled = (fontWeight) => ({
  component: "action-button",
  root: "box",
  sizeScale: { m: 100 },
  optionDefaults: {},
  variants: {
    "m|light|desktop": {
      box: {
        kind: "box",
        children: ["label"],
        props: { width: { value: 40 } },
      },
      label: { kind: "text", props: labelProps(fontWeight) },
    },
  },
});
const recipe = (fontWeight) => ({
  specVersion: "1.0.0-draft",
  component: "action-button",
  root: "box",
  sizeScale: { m: 100 },
  parts: {
    box: { kind: "box", children: ["label"], props: { width: { value: 40 } } },
    label: { kind: "text", props: labelProps(fontWeight) },
  },
});
const request = (label, textMetrics) => ({
  component: "action-button",
  size: "m",
  states: [],
  options: {},
  mode: { colorScheme: "light", scale: "desktop" },
  label,
  ...(textMetrics ? { textMetrics } : {}),
});

const labels = [
  "Test",
  "Label",
  "Save changes",
  "WAVE Typography AVATAR To Yo",
  "Café 日本 😀",
  "",
];
const weights = [
  undefined,
  "400",
  "500",
  "600",
  "700",
  "800",
  "bold",
  "medium",
];
const textWidth = (scene) => scene.nodes[1].w;

// A table with wider letters and different kerning, to prove an override reaches both.
const override = {
  ...defaultTable,
  700: {
    adv: defaultTable[700].adv.map((a) => a + 100),
    kern: { Te: -50 },
  },
};

test("Rust and JS measure the same widths for the default table", (t) => {
  const ds = Dataset.embedded();
  try {
    for (const label of labels)
      for (const w of weights) {
        const req = request(label);
        const rust = JSON.parse(ds.renderScene(recipe(w), req));
        t.is(
          textWidth(renderScene(compiled(w), req)),
          textWidth(rust),
          `${label} @ ${w}`,
        );
        t.is(
          renderSvg(renderScene(compiled(w), req)),
          ds.renderSvg(recipe(w), req),
        );
      }
  } finally {
    ds.free();
  }
});

test("Rust and JS measure the same widths with a textMetrics override", (t) => {
  const ds = Dataset.embedded();
  try {
    for (const label of labels)
      for (const w of weights) {
        const req = request(label, override);
        t.is(
          textWidth(renderScene(compiled(w), req)),
          textWidth(JSON.parse(ds.renderScene(recipe(w), req))),
          `${label} @ ${w}`,
        );
      }
    const plain = request("Test");
    t.true(
      textWidth(renderScene(compiled("700"), request("Test", override))) >
        textWidth(renderScene(compiled("700"), plain)),
    );
  } finally {
    ds.free();
  }
});

test("known widths: Source Sans 3 'Test' at 700 is 1.803 em, and kerning applies", (t) => {
  const w = textWidth(renderScene(compiled("700"), request("Test")));
  t.true(Math.abs(w / 14 - 1.803) < 0.002, String(w));
  const plain = textWidth(renderScene(compiled("700"), request("T e")));
  const kerned = textWidth(renderScene(compiled("700"), request("Te")));
  t.true(
    kerned < plain - 14 * 0.1,
    "Te is kerned tighter than T plus space plus e",
  );
});

test("both loaders reject a bad table with a clear error", (t) => {
  const ds = Dataset.embedded();
  try {
    const bad = { ...defaultTable, 700: { adv: [1, 2, 3] } };
    t.throws(() => parseTextMetrics(bad), { message: /must hold 95 advances/ });
    t.throws(() => renderScene(compiled(), request("a", bad)), {
      message: /must hold 95 advances/,
    });
    t.throws(() => ds.renderScene(recipe(), request("a", bad)), {
      message: /95 advances/,
    });
    t.throws(() => parseTextMetrics({ ...defaultTable, nope: 1 }), {
      message: /unknown key 'nope'/,
    });
    const { 400: _drop, ...noRegular } = defaultTable;
    t.throws(() => parseTextMetrics(noRegular), {
      message: /missing weight 400/,
    });
  } finally {
    ds.free();
  }
});
