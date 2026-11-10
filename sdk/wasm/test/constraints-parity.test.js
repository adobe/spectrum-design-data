// Copyright 2026 Adobe. All rights reserved.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "ava";
import {
  advisoriesOf,
  errorsOf,
  fixes,
  matching,
  readConstraints,
} from "../../plugins/site/assets/constraints.js";

const repo = fileURLToPath(new URL("../../../", import.meta.url));
const json = (p) => JSON.parse(readFileSync(`${repo}${p}`, "utf8"));
const { cases } = json("sdk/core/tests/fixtures/option-constraint-cases.json");

for (const c of cases) {
  test(`shared case: ${c.name}`, (t) => {
    const component = c.component
      ? json(`packages/design-data/components/${c.component}.json`)
      : { constraints: c.constraints };
    const got = matching(readConstraints(component), c.combo).map(
      (m) => m.index,
    );
    t.deepEqual(got.sort(), [...c.expected].sort());
  });
}

const button = readConstraints(
  json("packages/design-data/components/button.json"),
);

test("button: outline + accent has an error with a description and fix", (t) => {
  const m = matching(button, { style: "outline", variant: "accent" });
  t.is(errorsOf(m).length, 1);
  t.is(advisoriesOf(m).length, 0);
  t.is(
    m[0].description,
    "Outline style is only defined for primary and secondary.",
  );
  t.deepEqual(fixes(m[0]), [
    { option: "variant", values: ["primary", "secondary"] },
  ]);
});

test("button: static color + accent is advisory, not an error", (t) => {
  const m = matching(button, { variant: "accent", staticColor: "black" });
  t.is(errorsOf(m).length, 0);
  t.is(advisoriesOf(m).length, 1);
});

test("button: errors sort before advisories", (t) => {
  const m = matching(button, {
    style: "outline",
    variant: "negative",
    staticColor: "white",
  });
  t.deepEqual(
    m.map((c) => c.severity),
    ["error", "advisory"],
  );
});
