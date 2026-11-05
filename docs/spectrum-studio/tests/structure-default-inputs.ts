// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createStore } from "jotai";
import { createDefaultSnapshot } from "../src/features/edit-session/state";
import { buildTshirtArtifacts } from "../src/features/design-data/tshirtArtifacts";
import { primitiveReferencesAtom } from "../src/features/tokens/primitiveReferenceState";
import { resolveElements } from "../src/features/structures/elementResolution";
import { typographyDocumentAtom } from "../src/features/typography/state";
import {
  tshirtMappings,
  resolveTshirtRule,
} from "../src/features/logic/tshirt";
import { isStructureInstance } from "../src/features/structures/children";

const snapshot = createDefaultSnapshot();
const references = createStore().get(primitiveReferencesAtom);
const bundle = buildTshirtArtifacts(snapshot);
const generatedIds = new Set(
  bundle.semantics.flatMap((row) => [row.token.uuid, row.conceptId]),
);
const primitives = new Map(
  references.map((reference) => [reference.id, reference]),
);
const raw: unknown = JSON.parse(
  readFileSync(
    new URL("../src/data/design-system.defaults.json", import.meta.url),
    "utf8",
  ),
);
assert.ok(raw && typeof raw === "object" && "system" in raw);
assert.ok(
  raw.system && typeof raw.system === "object" && "structures" in raw.system,
);
let referenceCount = 0;
function audit(value: unknown, path: string) {
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    const address = `${path}/${key}`;
    if (key === "$ref") {
      assert.equal(typeof child, "string", address);
      assert.ok(
        primitives.has(child),
        `${address} must reference a foundation input.`,
      );
      assert.ok(
        !generatedIds.has(child),
        `${address} must not reference generated output.`,
      );
      referenceCount++;
    } else audit(child, address);
  }
}
audit(raw.system.structures, "/system/structures");
assert.ok(
  referenceCount > 40,
  "Audit definitions, owned layouts and conditional assignments.",
);
assert.ok(
  !references.some((reference) =>
    /^(base-workflow-icon|accessory-icon)-size-/.test(reference.name),
  ),
  "Duplicate structure-specific icon scales must not remain in the foundation picker.",
);

for (const structure of snapshot.structures!.structures) {
  for (const element of structure.elements ?? []) {
    if (isStructureInstance(element)) continue;
    if (element.kind !== "workflowIcon" && element.kind !== "uiIcon") continue;
    const binding = element.bindings.find((binding) => binding.slot === "size");
    assert.ok(
      binding && "$ref" in binding,
      `${structure.name} icon has a foundation input.`,
    );
    const primitive = primitives.get(binding.$ref)!;
    assert.ok(primitive);
    if (element.kind === "workflowIcon") {
      assert.equal(binding.family, "typography");
      assert.equal(primitive.metricId, "workflow-icon-size");
    } else {
      assert.equal(binding.family, "size");
      assert.equal(primitive.sourceId, "ca20c7d6-6b97-4281-a905-b2a83202e5df");
    }
  }
}
const base = snapshot.structures!.structures.find(
  (structure) => structure.name === "Base",
)!;
const workflow = base.elements!.find(
  (element) => element.kind === "workflowIcon",
)!;
assert.ok(!isStructureInstance(workflow));
const binding = workflow.bindings[0];
assert.ok("$ref" in binding);
const anchor = primitives.get(binding.$ref)!;
assert.equal(anchor.name, "workflow-icon-size-100");
const application = base.generation!.applications.find(
  (application) =>
    application.previewTargets?.kind === "custom" &&
    application.previewTargets.bindingIds.includes(binding.id),
)!;
const mappings = tshirtMappings(
  resolveTshirtRule(snapshot.rules!, application.ruleId),
  anchor,
  references,
  ["xs", "s", "m", "l", "xl"],
);
const rows = bundle.semantics.filter(
  (row) =>
    row.structureId === base.conceptId &&
    row.bindingIds.includes(binding.id) &&
    row.context.textScaling === "default",
);
assert.deepEqual(
  rows.map((row) => row.target.id),
  mappings.map((mapping) => mapping.target.id),
);
for (const mapping of mappings) {
  const resolved = resolveElements(
    base,
    references,
    snapshot.rules,
    mapping.size,
  ).find((element) => element.element.id === workflow.id)!;
  assert.deepEqual(resolved.issues, []);
  assert.equal(resolved.styles.width, mapping.target.value);
}
for (const [name, values] of [
  ["Base", [14, 16, 18, 20, 22]],
  ["Accessory", [14, 14, 16, 18, 20]],
] as const) {
  const structure = snapshot.structures!.structures.find(
    (structure) => structure.name === name,
  )!;
  const outputs = bundle.semantics.filter(
    (row) =>
      row.structureId === structure.conceptId &&
      row.token.name.element === "workflow-icon",
  );
  assert.equal(
    outputs.length,
    15,
    `${name} inherits the shared foundation's three text-scaling modes.`,
  );
  assert.deepEqual(
    outputs
      .filter((row) => row.context.textScaling === "default")
      .map((row) => row.target.value),
    values,
  );
}
const changed = structuredClone(snapshot);
changed.typography.iconography = { alignment: "text", baseSize: 24 };
const changedStore = createStore();
changedStore.set(typographyDocumentAtom, changed.typography);
const changedReferences = changedStore.get(primitiveReferencesAtom);
const changedRows = buildTshirtArtifacts(changed).semantics.filter(
  (row) =>
    row.structureId === base.conceptId &&
    row.bindingIds.includes(binding.id) &&
    row.context.textScaling === "default",
);
assert.deepEqual(
  changedRows.map((row) => row.token.uuid),
  rows.map((row) => row.token.uuid),
);
assert.notDeepEqual(
  changedRows.map((row) => row.token.value),
  rows.map((row) => row.token.value),
);
for (const row of changedRows) {
  assert.equal(
    row.target.value,
    changedReferences.find((reference) => reference.id === row.target.id)!
      .value,
  );
}
assert.deepEqual(
  buildTshirtArtifacts(changed).semantics.filter(
    (row) => !row.token.name.element,
  ),
  bundle.semantics.filter((row) => !row.token.name.element),
  "Changing the shared icon foundation leaves layout outputs untouched.",
);
console.log(
  `Audited ${referenceCount} default bindings: foundation inputs only; shared icon sources, size propagation, preview parity and stable output identities verified.`,
);
