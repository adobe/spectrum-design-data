// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import {
  numericValuesMayBeShared,
  taxonomyValueIssue,
} from "../src/features/taxonomy/valueDomains";
import { kebabCaseNameFormatter } from "../src/features/taxonomy/formatting";

const index = { id: "index", key: "scaleIndex", valueType: "number" as const };
const number = { id: "number", key: "number", valueType: "number" as const };
const text = { id: "text", key: "label", valueType: "string" as const };
const categories = [
  index,
  number,
  text,
  { id: "other", key: "coordinate", valueType: "number" as const },
];
const term = (categoryId: string, value: number | string) => ({
  categoryId,
  value,
});

for (const value of [-100, -0, 0, 0.125, 85, 2100, 1e21]) {
  assert.equal(taxonomyValueIssue(index, value), undefined);
  assert(kebabCaseNameFormatter.formatValue(value));
}
for (const value of [1, 100, Number.MAX_SAFE_INTEGER])
  assert.equal(taxonomyValueIssue(number, value), undefined);
for (const value of [-1, -0, 0, 0.5, Number.MAX_SAFE_INTEGER + 1])
  assert.match(taxonomyValueIssue(number, value)!, /positive whole number/);
for (const value of [NaN, Infinity, -Infinity])
  assert.match(taxonomyValueIssue(index, value)!, /finite/);
assert.match(taxonomyValueIssue(number, "100")!, /type/);
assert.match(taxonomyValueIssue(text, " ")!, /term/);
assert.equal(taxonomyValueIssue(text, "focus-ring"), undefined);
assert(
  numericValuesMayBeShared(term("index", 100), term("number", 100), categories),
);
assert(
  numericValuesMayBeShared(term("number", 100), term("index", 100), categories),
);
assert(
  !numericValuesMayBeShared(
    term("number", 100),
    term("number", 100),
    categories,
  ),
);
assert(
  !numericValuesMayBeShared(
    term("index", 100),
    term("text", "100"),
    categories,
  ),
);
assert(
  !numericValuesMayBeShared(term("index", 100), term("other", 100), categories),
);
assert(
  !numericValuesMayBeShared(
    term("index", 100),
    term("missing", 100),
    categories,
  ),
);
console.log(
  "Open coordinates, positive safe-integer Numbers and the narrow numeric ownership exception passed.",
);
