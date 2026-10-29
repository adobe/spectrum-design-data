// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createDefaultSnapshot } from "../src/features/edit-session/state";
import { computeComparison } from "../src/features/changelog/computeComparison";
import {
  componentImpactForSnapshots,
  summarizeComponentImpact,
} from "../src/features/impact/componentImpact";
import {
  componentImpactRows,
  componentImpactSegments,
} from "../src/features/impact/segments";
import type { ComponentsDocument } from "../src/features/components/model";
import type { ComponentToken } from "../src/features/components/references";

interface TestAssignment {
  id: string;
  ref?: string;
  value?: string;
}
const documentOf = (
  components: { id: string; name: string; assignments: TestAssignment[] }[],
) =>
  ({
    schemaVersion: 2,
    components: components.map((component) => ({
      id: component.id,
      declaration: { displayName: component.name },
      assignments: component.assignments.map((row) =>
        row.ref !== undefined
          ? { id: row.id, $ref: row.ref }
          : { id: row.id, value: row.value },
      ),
    })),
  }) as unknown as ComponentsDocument;
const tokensOf = (values: Record<string, string>) =>
  new Map(
    Object.entries(values).map(([id, value]) => [
      id,
      { id, value } as unknown as ComponentToken,
    ]),
  );

const shippedTokens = tokensOf({ a: "8px", b: "12px", c: "red" });
const shippedDoc = documentOf([
  {
    id: "c1",
    name: "Button",
    assignments: [
      { id: "1", ref: "a" },
      { id: "2", ref: "a" },
      { id: "3", ref: "a" },
      { id: "4", ref: "b" },
      { id: "5", value: "4px" },
    ],
  },
  {
    id: "c2",
    name: "Menu",
    assignments: [
      { id: "6", ref: "b" },
      { id: "7", ref: "c" },
    ],
  },
]);

// Nothing changed: zero affected, with the denominator counting every assignment, literals included.
const unchanged = summarizeComponentImpact(
  shippedDoc,
  shippedDoc,
  shippedTokens,
  shippedTokens,
);
assert.deepEqual([unchanged.affected.count, unchanged.affected.total], [0, 7]);
assert.deepEqual(
  unchanged.components.map((row) => [
    row.name,
    row.affected.count,
    row.affected.total,
  ]),
  [
    ["Button", 0, 5],
    ["Menu", 0, 2],
  ],
);

// Every reference counts: one token used three times in one component weighs three.
const changedA = summarizeComponentImpact(
  shippedDoc,
  shippedDoc,
  shippedTokens,
  tokensOf({ a: "9px", b: "12px", c: "red" }),
);
assert.deepEqual([changedA.affected.count, changedA.affected.total], [3, 7]);
assert.deepEqual(
  changedA.components.map((row) => row.affected.count),
  [3, 0],
);
const changedB = summarizeComponentImpact(
  shippedDoc,
  shippedDoc,
  shippedTokens,
  tokensOf({ a: "8px", b: "13px", c: "red" }),
);
assert.deepEqual(
  changedB.components.map((row) => row.affected.count),
  [1, 1],
  "A token shared by two components affects both.",
);

// More components dilute the same change: the denominator is every assignment in every component.
const manyDoc = documentOf([
  ...shippedDoc.components.map((component) => ({
    id: component.id,
    name: component.declaration.displayName,
    assignments: component.assignments.map((row) =>
      "$ref" in row
        ? { id: row.id, ref: row.$ref }
        : { id: row.id, value: String(row.value) },
    ),
  })),
  {
    id: "c3",
    name: "Tabs",
    assignments: [
      { id: "8", ref: "c" },
      { id: "9", ref: "c" },
      { id: "10", value: "1px" },
    ],
  },
]);
const diluted = summarizeComponentImpact(
  manyDoc,
  manyDoc,
  shippedTokens,
  tokensOf({ a: "9px", b: "12px", c: "red" }),
);
assert.deepEqual([diluted.affected.count, diluted.affected.total], [3, 10]);
assert.ok((diluted.affected.fraction ?? 1) < (changedA.affected.fraction ?? 0));

// Literal edits, re-pointing, additions and removals are affected; equal effective values are not.
const edited = documentOf([
  {
    id: "c1",
    name: "Button",
    assignments: [
      { id: "1", ref: "b" },
      { id: "2", ref: "a" },
      { id: "3", ref: "a" },
      { id: "4", value: "12px" },
      { id: "5", value: "5px" },
      { id: "new", value: "2px" },
    ],
  },
  { id: "c2", name: "Menu", assignments: [{ id: "6", ref: "b" }] },
]);
const editedImpact = summarizeComponentImpact(
  shippedDoc,
  edited,
  shippedTokens,
  shippedTokens,
);
// 1 re-pointed to b (8px to 12px), 4 became a literal with the same value (unchanged), 5 literal changed, new added, 7 removed.
assert.deepEqual(
  editedImpact.components.map((row) => [
    row.name,
    row.affected.count,
    row.affected.total,
  ]),
  [
    ["Button", 3, 6],
    ["Menu", 1, 2],
  ],
);
assert.deepEqual(
  [editedImpact.affected.count, editedImpact.affected.total],
  [4, 8],
);

// A reference that stops resolving is affected; one that never resolved is not.
const missing = summarizeComponentImpact(
  shippedDoc,
  shippedDoc,
  shippedTokens,
  tokensOf({ a: "8px", b: "12px" }),
);
assert.deepEqual(
  missing.components.map((row) => row.affected.count),
  [0, 1],
);
const neverResolved = summarizeComponentImpact(
  shippedDoc,
  shippedDoc,
  tokensOf({ a: "8px" }),
  tokensOf({ a: "8px" }),
);
assert.equal(neverResolved.affected.count, 0);

// No component data: zero total, not a percentage.
const empty = summarizeComponentImpact(
  undefined,
  undefined,
  new Map(),
  new Map(),
);
assert.deepEqual(
  [empty.affected.count, empty.affected.total, empty.affected.fraction],
  [0, 0, null],
);

// Segments stack to the headline; rows use each component's own total.
const segments = componentImpactSegments(changedA);
assert.equal(segments.length, 1);
assert.equal(segments[0]!.fraction, changedA.affected.fraction);
assert.deepEqual(
  componentImpactRows(changedA).map((row) => [
    row.label,
    row.ratio.count,
    row.ratio.total,
  ]),
  [
    ["Button", 3, 5],
    ["Menu", 0, 2],
  ],
);

// Real defaults: a foundation edit reaches components, weighted by how often each component references the changed tokens.
const shipped = createDefaultSnapshot();
const none = componentImpactForSnapshots(shipped, structuredClone(shipped));
assert.equal(none.status, "ready");
if (none.status === "ready") {
  assert.equal(none.summary.affected.count, 0);
  assert.equal(
    none.summary.affected.total,
    shipped.components!.components.reduce(
      (sum, component) => sum + component.assignments.length,
      0,
    ),
  );
}
const working = structuredClone(shipped);
(
  working.size!.scales[0] as unknown as { parameters: Record<string, number> }
).parameters = { step: 5 };
const impact = componentImpactForSnapshots(shipped, working);
assert.equal(impact.status, "ready");
if (impact.status === "ready") {
  assert.ok(
    impact.summary.affected.count > 0,
    "Editing a Size scale must reach the components that reference its tokens.",
  );
  assert.equal(
    impact.summary.components.reduce((sum, row) => sum + row.affected.count, 0),
    impact.summary.affected.count,
  );
  assert.ok(
    impact.summary.affected.count < impact.summary.affected.total,
    "Components that do not use the changed tokens stay unaffected.",
  );
}
const output = computeComparison(
  { shipped, working, attachments: {} as never },
  () => {},
);
assert.deepEqual(
  output.componentImpact,
  impact,
  "The comparison worker publishes the same component impact.",
);

// Unavailable token data is reported as unavailable, never as zero impact.
const broken = structuredClone(shipped) as unknown as Record<string, unknown>;
broken.elevation = undefined;
const unavailable = componentImpactForSnapshots(
  shipped,
  broken as unknown as typeof shipped,
);
assert.equal(unavailable.status, "unavailable");
console.log(
  "component impact: weighting, denominator, edits, unavailable data and comparison wiring passed",
);
