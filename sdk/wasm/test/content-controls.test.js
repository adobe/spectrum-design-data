// Copyright 2026 Adobe. All rights reserved.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import test from "ava";
import { Dataset } from "../pkg/node/design_data_wasm.js";
import {
  demoOptions,
  demoSlots,
  iconChoices,
  isNumberOption,
  isTextOption,
  iconRequest,
  labelText,
  readContentParams,
  sceneQuery,
  writeContentParams,
} from "../../plugins/site/assets/content-controls.js";

const icons = {
  "workflow:add": {},
  "workflow:delete": {},
  "workflow:arrow-up": {},
};

test("none is offered only for an optional content icon", (t) => {
  const values = (optional) => iconChoices(icons, optional).map(([v]) => v);
  t.deepEqual(values(true), [
    "",
    "none",
    "workflow:add",
    "workflow:arrow-up",
    "workflow:delete",
  ]);
  t.false(values(false).includes("none"));
  t.is(iconChoices(icons, true).at(-2)[1], "arrow up");
});

test("icon values become render requests", (t) => {
  t.is(iconRequest(""), undefined);
  t.is(iconRequest("none"), "none");
  t.deepEqual(iconRequest("workflow:add"), { set: "workflow", name: "add" });
});

test("label and icon round trip through the query string", (t) => {
  const params = new URLSearchParams("c=button&tab=anatomy");
  writeContentParams(params, { label: "Save & go", icon: "workflow:delete" });
  const back = readContentParams(new URLSearchParams(params.toString()));
  t.deepEqual(back, { label: "Save & go", icon: "workflow:delete" });
  t.is(params.get("c"), "button");

  writeContentParams(params, { label: "Label", icon: "" });
  t.false(params.has("label") || params.has("icon"));
  t.deepEqual(readContentParams(params), { label: "Label", icon: "" });

  writeContentParams(params, { label: "", icon: "none" });
  t.deepEqual(readContentParams(new URLSearchParams(params.toString())), {
    label: "",
    icon: "none",
  });
});

test("an empty label stays in the scene request while other empty values drop", (t) => {
  t.deepEqual(
    sceneQuery({
      name: "button",
      label: "",
      icon: "",
      size: "m",
      "opt.a": false,
    }),
    { name: "button", label: "", size: "m" },
  );
});

test("zooming restores the label text, but an off Label switch keeps what was typed", (t) => {
  t.is(labelText("Save", false), "Save");
  t.is(labelText("", false), "");
  t.is(labelText("", true), undefined);
  t.is(labelText("Save", true), "Save");
  t.is(labelText(undefined, false), undefined);
});

test("string and number options without listed values get an input box", (t) => {
  t.true(isTextOption("value", { type: "string" }));
  t.true(isTextOption("src", { type: "string" }));
  t.false(isTextOption("label", { type: "string" }));
  t.false(isTextOption("size", { type: "string", values: [{ value: "m" }] }));
  t.false(isTextOption("icon", { type: "string", $ref: "#/icon" }));
  t.false(isTextOption("isError", { type: "boolean" }));
  t.true(isNumberOption("value", { type: "number" }));
  t.false(isNumberOption("width", { type: "number" }));
  t.false(isNumberOption("size", { type: "number", values: [{ value: 50 }] }));
});

test("an empty text or number box sends nothing", (t) => {
  t.deepEqual(
    sceneQuery({
      name: "combo-box",
      label: "L",
      "opt.value": "",
      "opt.minValue": "0",
    }),
    { name: "combo-box", label: "L", "opt.minValue": "0" },
  );
});

const dataDir = new URL("../../../packages/design-data/", import.meta.url);
const readJson = (path) => JSON.parse(readFileSync(new URL(path, dataDir)));
const byName = Object.fromEntries(
  readdirSync(new URL("components/", dataDir)).map((f) => [
    f.replace(/\.json$/, ""),
    readJson(`components/${f}`),
  ]),
);

// Slots that accept nothing in particular (free content) have no demo: a fill is a component
// the slot accepts, and there is no text component yet.
const FREE_SLOTS = [
  "accordion/content",
  "standard-dialog/body",
  "standard-dialog/header-content",
];

test("every slot-hosting component declares demo fills the slot accepts, within min and max", (t) => {
  const problems = [];
  const hosts = [];
  for (const f of readdirSync(new URL("visuals/", dataDir))) {
    const name = f.replace(/\.json$/, "");
    const recipe = readJson(`visuals/${f}`);
    const slotParts = Object.entries(recipe.parts ?? {})
      .filter(([, p]) => p.kind === "slot")
      .map(([id]) => id);
    if (!slotParts.length) continue;
    hosts.push(name);
    const fills = demoSlots(byName[name], byName);
    for (const s of byName[name].slots.filter((x) =>
      slotParts.includes(x.part),
    )) {
      const key = `${name}/${s.name}`;
      if (s.collection) continue;
      if (!s.accepts?.length) {
        if (!FREE_SLOTS.includes(key)) problems.push(`${key}: not listed free`);
        continue;
      }
      const list = fills[s.name] ?? [];
      if (!s.demo) problems.push(`${key}: no demo`);
      if (list.some((x) => !s.accepts.includes(x.component)))
        problems.push(`${key}: fill the slot does not accept`);
      if (list.length < (s.min ?? 1) || list.length > (s.max ?? Infinity))
        problems.push(`${key}: ${list.length} fills outside min and max`);
    }
  }
  const expected = readdirSync(new URL("components/", dataDir))
    .map((f) => f.replace(/\.json$/, ""))
    .filter(
      (n) =>
        byName[n].slots?.length &&
        existsSync(new URL(`visuals/${n}.json`, dataDir)) &&
        Object.values(readJson(`visuals/${n}.json`).parts ?? {}).some(
          (p) => p.kind === "slot",
        ),
    );
  t.true(hosts.length > 0);
  t.deepEqual(hosts.sort(), expected.sort());
  t.deepEqual(problems, []);
});

test("a slot's demo reaches the request as declared", (t) => {
  const group = demoSlots(byName["button-group"], byName).default;
  t.is(group, byName["button-group"].slots[0].demo);
  t.deepEqual(
    group.map((f) => f.options.variant),
    ["secondary", "secondary", "accent"],
  );
  t.is(demoSlots(byName["radio-group"], byName).default.length, 5);
  t.is(demoSlots(byName["alert-dialog"], byName)["button-group"].length, 2);
  t.regex(
    demoSlots(byName["swatch-group"], byName).default[0].options.preview,
    /^rgb\(/,
  );
  t.deepEqual(demoSlots(byName["checkbox"], byName), {});
});

test("a slot without a demo falls back to fills of its first accepted component", (t) => {
  const def = {
    slots: [
      { name: "default", part: "p", accepts: ["radio-button"], max: 2 },
      { name: "footer", part: "f", accepts: ["swatch"], min: 2 },
      { name: "free", part: "x" },
    ],
  };
  const slots = demoSlots(def, byName);
  t.deepEqual(
    slots.default.map((f) => f.options.label),
    ["Radio button 1", "Radio button 2"],
  );
  t.is(slots.footer.length, 2);
  t.regex(slots.footer[0].options.preview, /^#/);
  t.false("free" in slots);
});

const COLLECTION_DEMOS = ["date-field", "time-field", "segmented-text-field"];

test("every collection slot's demo is item objects of its option's fields, within min and max", (t) => {
  const problems = [];
  const withDemo = [];
  for (const [name, def] of Object.entries(byName)) {
    for (const s of (def.slots ?? []).filter((x) => x.collection)) {
      const key = `${name}/${s.name}`;
      if (!s.demo) continue;
      withDemo.push(name);
      const props = def.options[s.collection]?.items?.properties ?? {};
      if (s.demo.length < (s.min ?? 1) || s.demo.length > (s.max ?? Infinity))
        problems.push(`${key}: ${s.demo.length} entries outside min and max`);
      for (const entry of s.demo)
        for (const [k, v] of Object.entries(entry)) {
          if (!props[k]) problems.push(`${key}: undeclared field ${k}`);
          else if (typeof v !== props[k].type)
            problems.push(`${key}: ${k} is not a ${props[k].type}`);
        }
    }
  }
  t.deepEqual(problems, []);
  t.deepEqual(withDemo.sort(), [...COLLECTION_DEMOS].sort());
});

test("a collection slot's demo reaches the request as the array option", (t) => {
  t.deepEqual(demoSlots(byName["date-field"], byName), {});
  for (const name of COLLECTION_DEMOS) {
    t.is(demoOptions(byName[name]).segments, byName[name].slots[0].demo);
  }
  t.deepEqual(demoOptions(byName["checkbox"]), {});

  const ds = Dataset.embedded();
  try {
    const draw = (name, options) => {
      const recipe = readJson(`visuals/${name}.json`);
      return JSON.parse(
        ds.renderScene(recipe, {
          component: name,
          size: "m",
          states: [],
          options,
          mode: { colorScheme: "light", scale: "desktop" },
          label: "Label",
        }),
      );
    };
    for (const name of COLLECTION_DEMOS) {
      const bare = draw(name, {});
      const demo = draw(name, demoOptions(byName[name]));
      t.deepEqual(demo.diagnostics, []);
      t.true(demo.nodes.length > bare.nodes.length, name);
    }
    const dates = JSON.stringify(
      draw("date-field", demoOptions(byName["date-field"])),
    );
    t.true(dates.includes("yyyy") && dates.includes("27"));
  } finally {
    ds.free();
  }
});
