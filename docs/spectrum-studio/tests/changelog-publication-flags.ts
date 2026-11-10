// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createDefaultSnapshot } from "../src/features/edit-session/state";
import { compareAuthoring } from "../src/features/changelog/registry";

const shipped = createDefaultSnapshot();
const sources = [
  (snapshot: typeof shipped) => snapshot.colorSystem.scales[0],
  (snapshot: typeof shipped) => snapshot.spacing!.scales[0],
  (snapshot: typeof shipped) => snapshot.size!.scales[0],
  (snapshot: typeof shipped) => snapshot.radius!.scales[0],
  (snapshot: typeof shipped) => snapshot.typography,
];
for (const source of sources) {
  const baseline = structuredClone(shipped);
  delete source(baseline).hideFromPublishing;
  const working = structuredClone(baseline);
  source(working).hideFromPublishing = false;
  const unchanged = compareAuthoring(baseline, working);
  assert.deepEqual(unchanged.groups, []);
  assert.ok(unchanged.slots.every((slot) => !slot.changed));
  assert.deepEqual(compareAuthoring(working, baseline).groups, []);

  source(working).hideFromPublishing = true;
  const hidden = compareAuthoring(baseline, working);
  const hiddenItems = hidden.groups.flatMap((group) => group.items);
  assert.equal(hiddenItems.length, 1);
  assert.equal(hiddenItems[0].fields.length, 1);
  const field = hiddenItems[0].fields[0];
  assert.equal(field.address!.path.at(-1), "hideFromPublishing");
  assert.equal(field.address!.expected, true);
  assert.equal(hidden.slots.filter((slot) => slot.changed).length, 1);

  const removed = structuredClone(working);
  delete source(removed).hideFromPublishing;
  const restored = compareAuthoring(working, removed);
  const restoredItems = restored.groups.flatMap((group) => group.items);
  assert.equal(restoredItems.length, 1);
  assert.equal(restoredItems[0].fields[0].address!.expected, undefined);
  assert.equal(source(baseline).hideFromPublishing, undefined);
}
console.log(
  "Publication flags: omitted and false are equivalent; true transitions retain exact reset addresses.",
);
