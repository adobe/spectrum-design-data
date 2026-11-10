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
import { selectModeAtom } from "../src/features/modes/selection";

const snapshot = createDefaultSnapshot();
assert.ok(snapshot.rules);
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
      binding && "$ref" in binding && typeof binding.$ref === "string",
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
assert.ok(typeof binding.$ref === "string");
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
    row.context.textScaling === "default" &&
    row.context.scale === "desktop",
);
assert.deepEqual(
  rows.map((row) => row.target.id),
  mappings.map((mapping) => mapping.target.id),
);
for (const mapping of mappings) {
  const resolved: ReturnType<typeof resolveElements>[number] = resolveElements(
    base,
    references,
    snapshot.rules,
    mapping.size,
  ).find((element) => element.element.id === workflow.id)!;
  assert.deepEqual(resolved.issues, []);
  assert.equal(resolved.styles.width, mapping.target.value);
}
const scale = snapshot.modeSets.find((axis) => axis.key === "scale")!;
const textScaling = snapshot.modeSets.find(
  (axis) => axis.key === "textScaling",
)!;
assert.ok(scale && textScaling);
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
    5 * scale.modes.length * textScaling.modes.length,
    `${name} inherits every owned Scale and Text scaling combination.`,
  );
  assert.deepEqual(
    outputs
      .filter(
        (row) =>
          row.context.textScaling === "default" &&
          row.context.scale === "desktop",
      )
      .map((row) => row.target.value),
    values,
  );
  const input = [
    structure,
    ...snapshot.structures!.structures.filter(
      (child) => child.parentStructureId === structure.conceptId,
    ),
  ].find((candidate) =>
    candidate.elements?.some((element) => element.kind === "workflowIcon"),
  );
  assert.ok(input);
  const icon = input.elements!.find(
    (element) => element.kind === "workflowIcon",
  );
  assert.ok(icon && !isStructureInstance(icon));
  const sizeBinding = icon.bindings.find((binding) => binding.slot === "size");
  assert.ok(sizeBinding && "$ref" in sizeBinding);
  const rule = resolveTshirtRule(
    snapshot.rules!,
    input.generation!.applications.find(
      (application) =>
        application.previewTargets?.kind === "custom" &&
        application.previewTargets.bindingIds.includes(sizeBinding.id),
    )!.ruleId,
  );
  for (const scaleMode of scale.modes) {
    for (const textMode of textScaling.modes) {
      const contextStore = createStore();
      contextStore.set(selectModeAtom, {
        modeSetKey: scale.key,
        modeId: scaleMode.id,
      });
      contextStore.set(selectModeAtom, {
        modeSetKey: textScaling.key,
        modeId: textMode.id,
      });
      const contextReferences = contextStore.get(primitiveReferencesAtom);
      const contextAnchor = contextReferences.find(
        (reference) => reference.id === sizeBinding.$ref,
      )!;
      assert.ok(contextAnchor);
      const expected = tshirtMappings(rule, contextAnchor, contextReferences, [
        "xs",
        "s",
        "m",
        "l",
        "xl",
      ]);
      const contextual = outputs.filter(
        (row) =>
          row.context.scale === scaleMode.key &&
          row.context.textScaling === textMode.key,
      );
      assert.deepEqual(
        contextual.map((row) => [
          row.size,
          row.target.id,
          row.target.value,
          row.token.value,
        ]),
        expected.map((mapping) => [
          mapping.size,
          mapping.target.id,
          mapping.target.value,
          `${mapping.target.value}px`,
        ]),
        `${name}: ${scaleMode.key}/${textMode.key} output matches its shared foundation and rule.`,
      );
      for (const mapping of expected) {
        const preview: ReturnType<typeof resolveElements>[number] =
          resolveElements(
            input,
            contextReferences,
            snapshot.rules,
            mapping.size,
          ).find((element) => element.element.id === icon.id)!;
        assert.deepEqual(preview.issues, []);
        assert.equal(preview.styles.width, mapping.target.value);
      }
    }
  }
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
    row.context.textScaling === "default" &&
    row.context.scale === "desktop",
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
