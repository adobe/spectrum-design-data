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

// Inline the serializer logic for testing without Vite/TS compilation.
// This mirrors src/serializer.ts and src/name-object.ts.

const SERIALIZATION_ORDER = [
  "variant",
  "component",
  "structure",
  "substructure",
  "anatomy",
  "object",
  "property",
  "orientation",
  "position",
  "size",
  "density",
  "shape",
  "state",
];

function orderedParts(name) {
  const parts = [];
  for (const field of SERIALIZATION_ORDER) {
    const value = name[field];
    if (value && value.trim().length > 0) {
      parts.push(value.trim());
    }
  }
  return parts;
}

function words(parts) {
  return parts.flatMap((p) => p.split("-"));
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function serialize(name, format = "kebab") {
  const parts = orderedParts(name);
  if (parts.length === 0) return "";

  switch (format) {
    case "kebab":
      return parts.join("-");
    case "camel": {
      const w = words(parts);
      return w[0] + w.slice(1).map(capitalize).join("");
    }
    case "cssVar":
      return `--spectrum-${parts.join("-")}`;
    case "constant":
      return words(parts).join("_").toUpperCase();
  }
}

// --- Tests ---

test("serialize kebab: property only", (t) => {
  t.is(serialize({ property: "color" }), "color");
});

test("serialize kebab: component + property", (t) => {
  t.is(serialize({ component: "button", property: "color" }), "button-color");
});

test("serialize kebab: full example from taxonomy.md", (t) => {
  const name = {
    variant: "accent",
    component: "button",
    anatomy: "icon",
    object: "background",
    property: "color",
    state: "hover",
  };
  t.is(serialize(name), "accent-button-icon-background-color-hover");
});

test("serialize kebab: ordering is deterministic regardless of object key order", (t) => {
  const a = serialize({
    state: "hover",
    property: "color",
    component: "button",
    variant: "accent",
  });
  const b = serialize({
    variant: "accent",
    component: "button",
    property: "color",
    state: "hover",
  });
  t.is(a, b);
  t.is(a, "accent-button-color-hover");
});

test("serialize kebab: skips empty and undefined fields", (t) => {
  t.is(
    serialize({
      property: "color",
      component: "",
      structure: undefined,
      state: "hover",
    }),
    "color-hover",
  );
});

test("serialize kebab: all semantic fields populated", (t) => {
  const name = {
    variant: "accent",
    component: "slider",
    structure: "base",
    substructure: "item",
    anatomy: "handle",
    object: "background",
    property: "color",
    orientation: "vertical",
    position: "top",
    size: "m",
    density: "compact",
    shape: "uniform",
    state: "hover",
  };
  t.is(
    serialize(name),
    "accent-slider-base-item-handle-background-color-vertical-top-m-compact-uniform-hover",
  );
});

test("serialize camelCase", (t) => {
  const name = {
    variant: "accent",
    component: "button",
    property: "color",
    state: "hover",
  };
  t.is(serialize(name, "camel"), "accentButtonColorHover");
});

test("serialize camelCase with compound property", (t) => {
  const name = {
    component: "button",
    property: "border-color",
  };
  t.is(serialize(name, "camel"), "buttonBorderColor");
});

test("serialize CSS custom property", (t) => {
  const name = {
    variant: "accent",
    component: "button",
    property: "color",
    state: "hover",
  };
  t.is(serialize(name, "cssVar"), "--spectrum-accent-button-color-hover");
});

test("serialize CONSTANT_CASE", (t) => {
  const name = {
    variant: "accent",
    component: "button",
    property: "color",
    state: "hover",
  };
  t.is(serialize(name, "constant"), "ACCENT_BUTTON_COLOR_HOVER");
});

test("serialize CONSTANT_CASE with compound values", (t) => {
  const name = {
    component: "button",
    property: "border-color",
    state: "keyboard-focus",
  };
  t.is(serialize(name, "constant"), "BUTTON_BORDER_COLOR_KEYBOARD_FOCUS");
});

test("serialize returns empty string for empty name object", (t) => {
  t.is(serialize({ property: "" }), "");
  t.is(serialize({ property: "  " }), "");
});

test("dimension fields are excluded from serialization", (t) => {
  const name = {
    component: "button",
    property: "color",
    colorScheme: "dark",
    scale: "mobile",
    contrast: "high",
  };
  // Dimension fields should not appear in the serialized output
  t.is(serialize(name), "button-color");
});
