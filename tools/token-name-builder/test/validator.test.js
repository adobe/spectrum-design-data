/*
Copyright 2026 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import test from "ava";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const registryDir = resolve(
  __dirname,
  "../../../packages/design-system-registry/registry",
);

// Load registries directly for testing (avoids Vite alias dependency)
function loadRegistry(filename) {
  return JSON.parse(readFileSync(resolve(registryDir, filename), "utf-8"));
}

const registries = {
  component: loadRegistry("components.json"),
  structure: loadRegistry("structures.json"),
  substructure: loadRegistry("substructures.json"),
  anatomy: loadRegistry("anatomy-terms.json"),
  object: loadRegistry("token-objects.json"),
  variant: loadRegistry("variants.json"),
  state: loadRegistry("states.json"),
  orientation: loadRegistry("orientations.json"),
  position: loadRegistry("positions.json"),
  size: loadRegistry("sizes.json"),
  density: loadRegistry("densities.json"),
  shape: loadRegistry("shapes.json"),
};

const dimensionModes = {
  colorScheme: { modes: ["light", "dark", "wireframe"], defaultMode: "light" },
  scale: { modes: ["desktop", "mobile"], defaultMode: "desktop" },
  contrast: { modes: ["regular", "high"], defaultMode: "regular" },
};

const SEMANTIC_FIELDS = [
  "property",
  "component",
  "structure",
  "substructure",
  "anatomy",
  "object",
  "variant",
  "state",
  "orientation",
  "position",
  "size",
  "density",
  "shape",
];

const DIMENSION_FIELDS = ["colorScheme", "scale", "contrast"];

function hasValue(registry, searchTerm) {
  return registry.values.some(
    (v) => v.id === searchTerm || (v.aliases && v.aliases.includes(searchTerm)),
  );
}

function validate(name) {
  const messages = [];

  if (!name.property || name.property.trim().length === 0) {
    messages.push({
      field: "property",
      severity: "error",
      message: "Property is required.",
    });
  }

  if (name.substructure && !name.structure) {
    messages.push({
      field: "substructure",
      severity: "warning",
      message: "Substructure is set without a parent structure.",
    });
  }

  for (const field of SEMANTIC_FIELDS) {
    if (field === "property") continue;
    const value = name[field];
    if (!value) continue;
    const registry = registries[field];
    if (!registry) continue;
    if (!hasValue(registry, value)) {
      messages.push({
        field,
        severity: "warning",
        message: `"${value}" is not in the ${registry.type} registry. This is allowed but may indicate a typo.`,
      });
    }
  }

  for (const field of DIMENSION_FIELDS) {
    const value = name[field];
    if (!value) continue;
    const dim = dimensionModes[field];
    if (!dim) continue;
    if (!dim.modes.includes(value)) {
      messages.push({
        field,
        severity: "error",
        message: `Invalid mode "${value}" for ${field}. Allowed: ${dim.modes.join(", ")}.`,
      });
    }
  }

  return messages;
}

function isValid(messages) {
  return !messages.some((m) => m.severity === "error");
}

// --- Tests ---

test("valid name object produces no errors", (t) => {
  const messages = validate({
    property: "color",
    component: "button",
    variant: "accent",
    state: "hover",
  });
  t.true(isValid(messages));
  t.is(messages.filter((m) => m.severity === "error").length, 0);
});

test("missing property is an error", (t) => {
  const messages = validate({ property: "" });
  t.false(isValid(messages));
  t.true(
    messages.some((m) => m.field === "property" && m.severity === "error"),
  );
});

test("unknown semantic value is a warning, not an error", (t) => {
  const messages = validate({
    property: "color",
    component: "nonexistent-widget",
  });
  t.true(isValid(messages));
  const warning = messages.find((m) => m.field === "component");
  t.truthy(warning);
  t.is(warning.severity, "warning");
  t.true(warning.message.includes("nonexistent-widget"));
});

test("valid registry values produce no warnings", (t) => {
  const messages = validate({
    property: "color",
    object: "background",
    state: "hover",
    structure: "base",
  });
  t.is(messages.length, 0);
});

test("invalid dimension value is a strict error", (t) => {
  const messages = validate({
    property: "color",
    colorScheme: "dim",
  });
  t.false(isValid(messages));
  const error = messages.find((m) => m.field === "colorScheme");
  t.truthy(error);
  t.is(error.severity, "error");
  t.true(error.message.includes("dim"));
  t.true(error.message.includes("light, dark, wireframe"));
});

test("valid dimension values pass", (t) => {
  const messages = validate({
    property: "color",
    colorScheme: "dark",
    scale: "mobile",
    contrast: "high",
  });
  t.true(isValid(messages));
});

test("substructure without structure warns", (t) => {
  const messages = validate({
    property: "color",
    substructure: "item",
  });
  const warning = messages.find((m) => m.field === "substructure");
  t.truthy(warning);
  t.is(warning.severity, "warning");
});

test("substructure with structure does not warn", (t) => {
  const messages = validate({
    property: "color",
    structure: "list",
    substructure: "item",
  });
  const subWarning = messages.find(
    (m) => m.field === "substructure" && m.message.includes("without"),
  );
  t.falsy(subWarning);
});

test("multiple validation issues are all reported", (t) => {
  const messages = validate({
    property: "",
    component: "fake-component",
    colorScheme: "invalid-scheme",
  });
  t.true(messages.length >= 3);
  t.true(
    messages.some((m) => m.field === "property" && m.severity === "error"),
  );
  t.true(
    messages.some((m) => m.field === "component" && m.severity === "warning"),
  );
  t.true(
    messages.some((m) => m.field === "colorScheme" && m.severity === "error"),
  );
});

test("known anatomy terms pass validation", (t) => {
  const messages = validate({
    property: "color",
    anatomy: "icon",
  });
  const anatomyMsg = messages.find((m) => m.field === "anatomy");
  t.falsy(anatomyMsg);
});

test("known variants pass validation", (t) => {
  const messages = validate({
    property: "color",
    variant: "accent",
  });
  const variantMsg = messages.find((m) => m.field === "variant");
  t.falsy(variantMsg);
});

test("known sizes pass validation", (t) => {
  const messages = validate({
    property: "width",
    size: "m",
  });
  const sizeMsg = messages.find((m) => m.field === "size");
  t.falsy(sizeMsg);
});
