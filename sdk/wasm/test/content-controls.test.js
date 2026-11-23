// Copyright 2026 Adobe. All rights reserved.

import test from "ava";
import {
  iconChoices,
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
