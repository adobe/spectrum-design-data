// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { runInNewContext } from "node:vm";

const require = createRequire(import.meta.resolve("@react-spectrum/s2"));
const ariaRoot = dirname(require.resolve("react-aria/package.json"));
const domRoot = dirname(require.resolve("react-dom/package.json"));
const { ItemNode } = await import(
  pathToFileURL(join(ariaRoot, "dist/private/collections/BaseCollection.mjs")).href
);

for (const name of ["client", "profiling"]) {
  const source = await readFile(
    join(domRoot, `cjs/react-dom-${name}.development.js`),
    "utf8",
  );
  const start = source.indexOf("function getArrayKind(");
  const end = source.indexOf("function setCurrentTrackFromLanes(", start);
  assert.ok(start >= 0 && end > start, `${name}: locate installed profiler helpers`);
  const diff = runInNewContext(
    `${source.slice(start, end)}; addObjectDiffToProperties`,
    {
      Object,
      isArrayImpl: Array.isArray,
      hasOwnProperty: Object.prototype.hasOwnProperty,
      REACT_ELEMENT_TYPE: Symbol.for("react.transitional.element"),
      EMPTY_ARRAY: 0,
      PRIMITIVE_ARRAY: 1,
      ENTRIES_ARRAY: 2,
      COMPLEX_ARRAY: 3,
      OMITTED_PROP_ERROR: Symbol("omitted"),
      ADDED: "+",
      REMOVED: "-",
      UNCHANGED: "=",
    },
  );

  const node = new ItemNode("token");
  const copy = { ...node, childNodes: [] };
  assert.throws(() => node.childNodes, /childNodes is not supported/);
  for (const [previous, next] of [[node, copy], [copy, node]]) {
    const properties = [];
    assert.doesNotThrow(
      () => diff({ item: previous }, { item: next }, properties, 0),
      `${name}: collection nodes must not be deeply compared with plain copies`,
    );
    assert.ok(properties.length > 0, `${name}: retain diagnostic property output`);
  }
  assert.equal(
    diff({ item: new ItemNode("token") }, { item: new ItemNode("token") }, [], 0),
    false,
    `${name}: distinct collection instances are not deeply equal plain objects`,
  );
  assert.equal(
    diff({ options: { values: [1, 2] } }, { options: { values: [1, 2] } }, [], 0),
    true,
    `${name}: preserve deep comparison of plain objects and arrays`,
  );
  assert.equal(
    diff({ options: { values: [1, 2] } }, { options: { values: [1, 3] } }, [], 0),
    false,
    `${name}: preserve reporting of changed plain-object values`,
  );
}

console.log("React development render logging safely handles React Aria collection nodes.");
