// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import {
  assignmentValue,
  componentTokenCatalog,
  type ComponentToken,
} from "../../src/features/components/references";
import type { EditSessionSnapshot } from "../../src/features/edit-session/state";

export function inlineFixtureReferences(
  snapshot: EditSessionSnapshot,
  matches: (target: ComponentToken) => boolean,
): EditSessionSnapshot {
  assert.ok(snapshot.components);
  const targets = componentTokenCatalog(snapshot);
  return {
    ...snapshot,
    components: {
      ...snapshot.components,
      components: snapshot.components.components.map((component) => ({
        ...component,
        assignments: component.assignments.map((assignment) => {
          if (!assignment.$ref) return assignment;
          const target = targets.find((token) => token.id === assignment.$ref);
          assert.ok(
            target,
            "Fixture references must resolve before isolation.",
          );
          if (!matches(target)) return assignment;
          const { $ref, ...fields } = assignment;
          void $ref;
          return {
            ...fields,
            value: structuredClone(assignmentValue(assignment, targets)),
          };
        }),
      })),
    },
  };
}
