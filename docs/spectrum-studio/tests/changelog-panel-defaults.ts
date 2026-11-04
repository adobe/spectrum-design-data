// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createStore } from "jotai";
import { changelogCollapsedAtom } from "../src/state/view/navigation";

// Entering edit mode leaves the Changes panel collapsed until the user opens it.
assert.equal(createStore().get(changelogCollapsedAtom), true);

const panel = readFileSync(
  new URL("../src/components/ChangelogPanel.tsx", import.meta.url),
  "utf8",
);
assert.match(panel, /useState\("log"\)/, "Log is the default tab");

const tabList = panel.slice(
  panel.indexOf('<TabList UNSAFE_className="changesTabList">'),
  panel.indexOf("</TabList>"),
);
const tabOrder = [...tabList.matchAll(/<Tab id="([^"]+)"/g)].map(
  (match) => match[1],
);
assert.deepEqual(tabOrder, ["log", "impact", "systemHealth"]);

console.log("changelog-panel-defaults checks passed");
