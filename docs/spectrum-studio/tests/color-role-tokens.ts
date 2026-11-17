// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { createDefaultSnapshot } from "../src/features/edit-session/state";
import {
  buildStylesForSource,
  styleContexts,
} from "../src/features/styles/artifacts";
import {
  canonicalAliasRows,
  completeAliasSource,
} from "../src/features/tokens/aliasTargets";
import { ORDERED_CATEGORY_IDS } from "../src/features/taxonomy/orderedVocabulary";
import { modeSelections } from "../src/features/modes/combinations";

const snapshot = createDefaultSnapshot();
const styles = snapshot.styles!;
const taxonomy = snapshot.taxonomy!;
const scales = snapshot.colorSystem!.scales;
const accentTerm = taxonomy.terms.find(
  (term) =>
    term.categoryId === ORDERED_CATEGORY_IDS.colorRole &&
    term.value === "accent",
)!;
assert(accentTerm, "The default Registry defines the Accent role.");
const accent = styles.colorRoles.find(
  (role) => role.roleTermId === accentTerm.id,
)!;
assert(accent, "The default Styles assign the Accent color role.");

// One mode selection keeps this check within the bounded runner's memory.
const selections = modeSelections(snapshot.modeSets).slice(0, 1);
const contexts = styleContexts(snapshot, selections);
function scaleSteps(scaleId: string) {
  return contexts[0].references.filter(
    (reference) =>
      reference.property === "color" &&
      reference.familyId === scaleId &&
      reference.index !== undefined,
  );
}
function build(source: typeof snapshot) {
  return buildStylesForSource(source, selections);
}
function roleRows(output: ReturnType<typeof build>) {
  return output.rows.filter((row) => row.recipeId === accent.id);
}

// Accent aliases every step of its assigned scale, named by the role.
const blueSteps = scaleSteps(accent.scaleId);
assert(blueSteps.length > 1, "The assigned scale exposes its steps.");
const original = build(snapshot);
const before = roleRows(original);
assert.equal(before.length, blueSteps.length);
const firstMode = before;
for (const step of blueSteps) {
  const row = firstMode.find((row) => row.scaleIndex === step.index)!;
  assert(row, `Accent aliases step ${step.index}.`);
  // The Registry hides the color Property term, matching primitives like blue-100.
  assert.equal(row.name, `accent-${step.index}`);
  assert.equal(row.token.$ref, step.uuid);
  assert.equal(row.value, step.value);
}

// Re-pointing the role keeps identities and swaps every alias target.
const other = scales.find(
  (scale) =>
    scale.id !== accent.scaleId &&
    scaleSteps(scale.id).length === blueSteps.length,
)!;
assert(other, "Another scale with matching steps is available.");
const swapped = structuredClone(snapshot);
swapped.styles!.colorRoles = swapped.styles!.colorRoles.map((role) =>
  role.id === accent.id ? { ...role, scaleId: other.id } : role,
);
const swappedOutput = build(swapped);
const after = roleRows(swappedOutput);
assert.deepEqual(
  after.map((row) => [row.conceptId, row.token.uuid, row.name]),
  before.map((row) => [row.conceptId, row.token.uuid, row.name]),
);
const otherSteps = scaleSteps(other.id);
for (const row of after)
  assert.equal(
    row.token.$ref,
    otherSteps.find((step) => step.index === row.scaleIndex)!.uuid,
  );

// Other style outputs are unaffected by the role change.
const unrelated = (output: ReturnType<typeof build>) =>
  output.rows.filter((row) => row.recipeId !== accent.id);
assert.deepEqual(unrelated(swappedOutput), unrelated(original));

// Role tokens reach the token catalog and keep per-token overrides when their
// role is re-pointed.
const target = before[0];
const retargeted = after.find((row) => row.conceptId === target.conceptId)!;
const overridden = canonicalAliasRows(
  completeAliasSource({
    ...swapped,
    browserTokenEdits: {
      [target.conceptId]: {
        name: "brand-highlight",
        description: "Primary emphasis.",
        values: {},
      },
    },
  }),
  undefined,
  "preserve-for-review",
  { selections },
).find((row) => row.id === target.conceptId && row.context === target.modeKey)!;
assert(overridden, "The role token reaches the token catalog.");
assert.equal(overridden.token.name, "brand-highlight");
assert.equal(overridden.token.description, "Primary emphasis.");
assert.equal(overridden.token.referenceId, retargeted.referenceId);

// An unavailable scale is a diagnostic, never a failure.
const missing = structuredClone(snapshot);
missing.styles!.colorRoles = missing.styles!.colorRoles.map((role) =>
  role.id === accent.id ? { ...role, scaleId: "missing-scale" } : role,
);
const diagnostics = build(missing);
assert.equal(roleRows(diagnostics).length, 0);
assert(
  diagnostics.issues.some(
    (issue) =>
      issue.recipeId === accent.id &&
      issue.message.includes("has no available steps"),
  ),
);

// Roles generate output even when no style recipes exist.
const rolesOnly = structuredClone(snapshot);
rolesOnly.styles!.recipes = [];
rolesOnly.styles!.publications = [];
assert.equal(roleRows(build(rolesOnly)).length, before.length);

console.log("Color role tokens checks passed.");
