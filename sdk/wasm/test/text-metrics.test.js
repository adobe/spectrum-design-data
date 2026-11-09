// Copyright 2026 Adobe. All rights reserved.

import test from "ava";
import { defaultTable } from "./helpers/text-metrics.js";
import { Dataset } from "../pkg/node/design_data_wasm.js";

const recipe = (fontWeight) => ({
  specVersion: "1.0.0-draft",
  component: "action-button",
  root: "box",
  sizeScale: { m: 100 },
  parts: {
    box: { kind: "box", children: ["label"], props: { width: { value: 40 } } },
    label: {
      kind: "text",
      props: {
        fontSize: { value: 14 },
        ...(fontWeight ? { fontWeight: { value: fontWeight } } : {}),
      },
    },
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
const textWidth = (ds, w, req) =>
  JSON.parse(ds.renderScene(recipe(w), req)).nodes[1].w;

const withDataset = (fn) => (t) => {
  const ds = Dataset.embedded();
  try {
    fn(t, ds);
  } finally {
    ds.free();
  }
};

test(
  "known widths: Source Sans 3 'Test' at 700 is 1.803 em, and kerning applies",
  withDataset((t, ds) => {
    const w = textWidth(ds, "700", request("Test"));
    t.true(Math.abs(w / 14 - 1.803) < 0.002, String(w));
    const plain = textWidth(ds, "700", request("T e"));
    const kerned = textWidth(ds, "700", request("Te"));
    t.true(kerned < plain - 14 * 0.1, "Te is kerned tighter");
  }),
);

test(
  "a textMetrics override in the request changes the measured width",
  withDataset((t, ds) => {
    const override = {
      ...defaultTable,
      700: {
        adv: defaultTable[700].adv.map((a) => a + 100),
        kern: { Te: -50 },
      },
    };
    t.true(
      textWidth(ds, "700", request("Test", override)) >
        textWidth(ds, "700", request("Test")),
    );
  }),
);

test(
  "a bad table is rejected with a clear error",
  withDataset((t, ds) => {
    const bad = { ...defaultTable, 700: { adv: [1, 2, 3] } };
    t.throws(() => ds.renderScene(recipe(), request("a", bad)), {
      message: /95 advances/,
    });
  }),
);

test(
  "malformed kern and weight keys are rejected",
  withDataset((t, ds) => {
    const w = defaultTable[700];
    const tables = [
      { ...defaultTable, 700: { ...w, kern: null } },
      { ...defaultTable, 700: { ...w, kern: [] } },
      { ...defaultTable, "400.0": w },
      { ...defaultTable, "4e2": w },
      { ...defaultTable, "0x190": w },
    ];
    for (const bad of tables) {
      t.throws(() => ds.renderScene(recipe(), request("a", bad)));
    }
  }),
);

test(
  "odd weight values measure as 400",
  withDataset((t, ds) => {
    const regular = textWidth(ds, "400", request("Test"));
    for (const w of ["inf", "nan", "+700", "0x2bc", "1e3"]) {
      t.is(textWidth(ds, w, request("Test")), regular, w);
    }
  }),
);
