// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Accessibility from "../src/pages/Accessibility";
import { resolveCategoryIcon } from "../src/features/icons/categoryIcons";

assert.deepEqual(resolveCategoryIcon("accessibility"), {
  iconName: "Accessibility",
});
const sidebar = readFileSync(
  new URL("../src/components/NavSidebar.tsx", import.meta.url),
  "utf8",
);
const accessibilityItem =
  sidebar.match(/\{\s*id:\s*"accessibility",[^}]*\}/)?.[0] ?? "";
assert.match(accessibilityItem, /label:\s*"Accessibility"/);
assert.match(accessibilityItem, /getCategoryIcon\("accessibility"\)/);
assert.match(accessibilityItem, /status:\s*"TBD"/);
assert.match(accessibilityItem, /statusVariant:\s*"notice"/);
const pageRoutes = readFileSync(
  new URL("../src/pages/BrowsingContext.tsx", import.meta.url),
  "utf8",
);
assert.match(pageRoutes, /import Accessibility from "\.\/Accessibility"/);
assert.match(pageRoutes, /accessibility:\s*Accessibility,/);
assert.equal(
  renderToStaticMarkup(createElement(Accessibility)),
  "",
  "The registered Accessibility page renders no placeholder content.",
);
console.log("Accessibility page, navigation badge and category icon pass.");
