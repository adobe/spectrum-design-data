// Copyright 2026 Adobe. All rights reserved.

import { readdirSync, readFileSync } from "node:fs";
import test from "ava";
import {
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

// Slots that accept nothing in particular (free content) have no demo fill yet.
const FREE_SLOTS = [
  "accordion/content",
  "standard-dialog/body",
  "standard-dialog/header-content",
];

test("every slot-hosting component's explorer default fills each slot that lists accepts", (t) => {
  const missing = [];
  let hosts = 0;
  for (const f of readdirSync(new URL("visuals/", dataDir))) {
    const name = f.replace(/\.json$/, "");
    const recipe = readJson(`visuals/${f}`);
    const slotParts = Object.entries(recipe.parts ?? {})
      .filter(([, p]) => p.kind === "slot")
      .map(([id]) => id);
    if (!slotParts.length) continue;
    hosts++;
    const fills = demoSlots(byName[name], byName);
    for (const s of byName[name].slots.filter((x) =>
      slotParts.includes(x.part),
    )) {
      const key = `${name}/${s.name}`;
      if (s.collection) continue;
      if (s.accepts?.length) {
        if (!fills[s.name]?.length) missing.push(key);
        else t.true(fills[s.name].every((x) => byName[x.component]));
      } else if (!FREE_SLOTS.includes(key)) missing.push(key);
    }
  }
  t.is(hosts, 13);
  t.deepEqual(missing, []);
});

test("demo fills are labeled, capped by max, and give swatches a color", (t) => {
  const radio = demoSlots(byName["radio-group"], byName).default;
  t.deepEqual(
    radio.map((f) => f.options.label),
    ["Radio button 1", "Radio button 2", "Radio button 3"],
  );
  t.is(demoSlots(byName["coach-mark"], byName)["button-group"].length, 1);
  t.is(demoSlots(byName["popover"], byName).default.length, 3);
  t.regex(
    demoSlots(byName["swatch-group"], byName).default[0].options.preview,
    /^#/,
  );
  t.deepEqual(demoSlots(byName["checkbox"], byName), {});
});
