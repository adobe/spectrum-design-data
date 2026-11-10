// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createDefaultSnapshot } from "../src/features/edit-session/state";
import {
  assignmentValue,
  componentTokenCatalog,
} from "../src/features/components/references";
import { inlineFixtureReferences } from "./fixtures/componentReferences";

const source = createDefaultSnapshot();
const original = structuredClone(source);
const targets = componentTokenCatalog(source);
const isolated = inlineFixtureReferences(
  source,
  (target) => target.kind === "semantic",
);
assert.deepEqual(
  source,
  original,
  "Fixture isolation does not mutate its input.",
);
assert.ok(isolated.components);
assert.ok(source.components);
let inlined = 0;
for (const [index, component] of source.components.components.entries()) {
  const result: typeof component = isolated.components.components[index];
  assert.deepEqual(result.identities, component.identities);
  assert.deepEqual(
    result.assignments.map((assignment) => assignment.id),
    component.assignments.map((assignment) => assignment.id),
    "Isolation preserves every component assignment.",
  );
  for (const [assignmentIndex, assignment] of component.assignments.entries()) {
    const updated = result.assignments[assignmentIndex];
    assert.deepEqual(
      assignmentValue(updated, targets),
      assignmentValue(assignment, targets),
      "Literal fixtures retain the original effective value.",
    );
    const target = targets.find((token) => token.id === assignment.$ref);
    if (target?.kind === "semantic") {
      inlined += 1;
      assert.equal(updated.$ref, undefined);
      const { $ref, ...fields } = assignment;
      const { value, ...updatedFields } = updated;
      void $ref;
      void value;
      assert.deepEqual(updatedFields, fields);
    } else assert.deepEqual(updated, assignment);
  }
}
assert.ok(inlined > 0, "The fixture includes a real semantic dependency.");
assert.deepEqual(
  inlineFixtureReferences(source, () => false),
  source,
  "An unmatched predicate preserves all reference relationships.",
);
const invalid = structuredClone(source);
const reference = invalid
  .components!.components.flatMap((component) => component.assignments)
  .find((assignment) => assignment.$ref)!;
reference.$ref = crypto.randomUUID();
assert.throws(
  () => inlineFixtureReferences(invalid, () => true),
  /must resolve before isolation/,
  "Isolation cannot conceal an already-invalid reference.",
);
console.log(
  "Fixture references: selected literals preserve values, fields, assignments, unrelated references and input state; invalid references fail explicitly.",
);
