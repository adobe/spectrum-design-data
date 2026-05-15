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
import { validateDataset } from "../src/validate.js";

// Minimal button component used across tests
const button = {
  $id: "https://example.com/button.json",
  name: "button",
  displayName: "Button",
  meta: { category: "actions", documentationUrl: "https://example.com/button" },
  options: {
    variant: {
      type: "string",
      enum: ["accent", "negative", "primary", "secondary"],
    },
  },
  anatomy: [
    { name: "icon", description: "Leading icon." },
    { name: "label", description: "Button text.", required: true },
  ],
  states: [
    { name: "hover", trigger: "interaction", precedence: 50 },
    { name: "focus", trigger: "interaction", precedence: 60, layered: true },
    { name: "disabled", trigger: "prop", precedence: 100 },
  ],
  slots: [
    { name: "default", description: "Text label." },
    { name: "icon", description: "Leading icon." },
  ],
};

// ---- SPEC-018: component-name-exists ----------------------------------------

test("SPEC-018: no error when component is declared", (t) => {
  const dataset = {
    tokens: [
      {
        name: { component: "button", property: "background-color" },
        value: "#fff",
      },
    ],
    components: [button],
  };
  const diags = validateDataset(dataset).filter((d) => d.ruleId === "SPEC-018");
  t.is(diags.length, 0);
});

test("SPEC-018: error when component is not declared", (t) => {
  const dataset = {
    tokens: [
      { name: { component: "ghost", property: "color" }, value: "#fff" },
    ],
    components: [],
  };
  const diags = validateDataset(dataset).filter((d) => d.ruleId === "SPEC-018");
  t.is(diags.length, 1);
  t.is(diags[0].severity, "error");
  t.regex(diags[0].message, /undeclared component/);
});

test("SPEC-018: string token names are skipped", (t) => {
  const dataset = {
    tokens: [{ name: "legacy-token-name", value: "#fff" }],
    components: [],
  };
  // String-named tokens skip SPEC-018 cross-reference checks; SPEC-017 may fire separately.
  const diags = validateDataset(dataset).filter((d) => d.ruleId === "SPEC-018");
  t.is(diags.length, 0);
});

// ---- SPEC-019: component-variant-valid --------------------------------------

test("SPEC-019: no error when variant is in enum", (t) => {
  const dataset = {
    tokens: [
      {
        name: {
          component: "button",
          variant: "accent",
          property: "background-color",
        },
        value: "#fff",
      },
    ],
    components: [button],
  };
  const diags = validateDataset(dataset).filter((d) => d.ruleId === "SPEC-019");
  t.is(diags.length, 0);
});

test("SPEC-019: error when variant is not in enum", (t) => {
  const dataset = {
    tokens: [
      {
        name: {
          component: "button",
          variant: "electric",
          property: "background-color",
        },
        value: "#fff",
      },
    ],
    components: [button],
  };
  const diags = validateDataset(dataset).filter((d) => d.ruleId === "SPEC-019");
  t.is(diags.length, 1);
  t.is(diags[0].severity, "error");
});

test("SPEC-019: no error when component has no variant enum", (t) => {
  const noVariantButton = { ...button, options: {} };
  const dataset = {
    tokens: [
      {
        name: { component: "button", variant: "anything", property: "color" },
        value: "#fff",
      },
    ],
    components: [noVariantButton],
  };
  const diags = validateDataset(dataset).filter((d) => d.ruleId === "SPEC-019");
  t.is(diags.length, 0);
});

// ---- SPEC-020: component-anatomy-valid ---------------------------------------

test("SPEC-020: no error when anatomy part is declared", (t) => {
  const dataset = {
    tokens: [
      {
        name: { component: "button", anatomy: "label", property: "color" },
        value: "#fff",
      },
    ],
    components: [button],
  };
  const diags = validateDataset(dataset).filter((d) => d.ruleId === "SPEC-020");
  t.is(diags.length, 0);
});

test("SPEC-020: error when anatomy part is not declared", (t) => {
  const dataset = {
    tokens: [
      {
        name: { component: "button", anatomy: "capsule", property: "color" },
        value: "#fff",
      },
    ],
    components: [button],
  };
  const diags = validateDataset(dataset).filter((d) => d.ruleId === "SPEC-020");
  t.is(diags.length, 1);
  t.is(diags[0].severity, "error");
});

test("SPEC-020: no error when component declares no anatomy", (t) => {
  const noAnatomyButton = { ...button, anatomy: [] };
  const dataset = {
    tokens: [
      {
        name: { component: "button", anatomy: "anything", property: "color" },
        value: "#fff",
      },
    ],
    components: [noAnatomyButton],
  };
  const diags = validateDataset(dataset).filter((d) => d.ruleId === "SPEC-020");
  t.is(diags.length, 0);
});

// ---- SPEC-021: component-slot-vocabulary ------------------------------------

test("SPEC-021: no warning when custom slot has description", (t) => {
  const comp = {
    ...button,
    slots: [{ name: "badge", description: "Badge overlay." }],
  };
  const dataset = { tokens: [], components: [comp] };
  const diags = validateDataset(dataset).filter((d) => d.ruleId === "SPEC-021");
  t.is(diags.length, 0);
});

test("SPEC-021: warning when custom slot has no description", (t) => {
  const comp = { ...button, slots: [{ name: "badge" }] };
  const dataset = { tokens: [], components: [comp] };
  const diags = validateDataset(dataset).filter((d) => d.ruleId === "SPEC-021");
  t.is(diags.length, 1);
  t.is(diags[0].severity, "warning");
});

test("SPEC-021: no warning for canonical slot without description", (t) => {
  const comp = { ...button, slots: [{ name: "icon" }] };
  const dataset = { tokens: [], components: [comp] };
  const diags = validateDataset(dataset).filter((d) => d.ruleId === "SPEC-021");
  t.is(diags.length, 0);
});

// ---- SPEC-022: component-state-valid ----------------------------------------

test("SPEC-022: no error when state is declared", (t) => {
  const dataset = {
    tokens: [
      {
        name: {
          component: "button",
          state: "hover",
          property: "background-color",
        },
        value: "#fff",
      },
    ],
    components: [button],
  };
  const diags = validateDataset(dataset).filter((d) => d.ruleId === "SPEC-022");
  t.is(diags.length, 0);
});

test("SPEC-022: error when state is not declared", (t) => {
  const dataset = {
    tokens: [
      {
        name: {
          component: "button",
          state: "jello",
          property: "background-color",
        },
        value: "#fff",
      },
    ],
    components: [button],
  };
  const diags = validateDataset(dataset).filter((d) => d.ruleId === "SPEC-022");
  t.is(diags.length, 1);
  t.is(diags[0].severity, "error");
});

test("SPEC-022: no error when component declares no states", (t) => {
  const noStatesButton = { ...button, states: [] };
  const dataset = {
    tokens: [
      {
        name: { component: "button", state: "anything", property: "color" },
        value: "#fff",
      },
    ],
    components: [noStatesButton],
  };
  const diags = validateDataset(dataset).filter((d) => d.ruleId === "SPEC-022");
  t.is(diags.length, 0);
});

// ---- SPEC-023: anatomy-custom-part-documented --------------------------------

test("SPEC-023: no warning when custom part has description", (t) => {
  const comp = {
    ...button,
    anatomy: [{ name: "shimmer", description: "Loading shimmer overlay." }],
  };
  const dataset = { tokens: [], components: [comp] };
  const diags = validateDataset(dataset).filter((d) => d.ruleId === "SPEC-023");
  t.is(diags.length, 0);
});

test("SPEC-023: warning when custom anatomy part has no description", (t) => {
  const comp = { ...button, anatomy: [{ name: "shimmer" }] };
  const dataset = { tokens: [], components: [comp] };
  const diags = validateDataset(dataset).filter((d) => d.ruleId === "SPEC-023");
  t.is(diags.length, 1);
  t.is(diags[0].severity, "warning");
});

test("SPEC-023: no warning for canonical anatomy part without description", (t) => {
  const comp = { ...button, anatomy: [{ name: "label" }] };
  const dataset = { tokens: [], components: [comp] };
  const diags = validateDataset(dataset).filter((d) => d.ruleId === "SPEC-023");
  t.is(diags.length, 0);
});

// ---- SPEC-024: anatomy-part-name-unique --------------------------------------

test("SPEC-024: no error when anatomy part names are unique", (t) => {
  const comp = {
    ...button,
    anatomy: [
      { name: "label", description: "Button text." },
      { name: "icon", description: "Leading icon." },
    ],
  };
  const dataset = { tokens: [], components: [comp] };
  const diags = validateDataset(dataset).filter((d) => d.ruleId === "SPEC-024");
  t.is(diags.length, 0);
});

test("SPEC-024: error when anatomy part names are duplicated", (t) => {
  const comp = {
    ...button,
    anatomy: [
      { name: "label", description: "Button text." },
      { name: "icon", description: "Leading icon." },
      { name: "label", description: "Duplicate." },
    ],
  };
  const dataset = { tokens: [], components: [comp] };
  const diags = validateDataset(dataset).filter((d) => d.ruleId === "SPEC-024");
  t.is(diags.length, 1);
  t.is(diags[0].severity, "error");
  t.regex(diags[0].message, /duplicate anatomy part.*label/i);
});

// ---- SPEC-026: state-custom-name-documented ----------------------------------

test("SPEC-026: no warning when custom state has description", (t) => {
  const comp = {
    ...button,
    states: [{ name: "wobble", description: "Wobble animation state." }],
  };
  const dataset = { tokens: [], components: [comp] };
  const diags = validateDataset(dataset).filter((d) => d.ruleId === "SPEC-026");
  t.is(diags.length, 0);
});

test("SPEC-026: warning when custom state has no description", (t) => {
  const comp = { ...button, states: [{ name: "wobble" }] };
  const dataset = { tokens: [], components: [comp] };
  const diags = validateDataset(dataset).filter((d) => d.ruleId === "SPEC-026");
  t.is(diags.length, 1);
  t.is(diags[0].severity, "warning");
});

test("SPEC-026: no warning for canonical state without description", (t) => {
  const comp = { ...button, states: [{ name: "hover" }] };
  const dataset = { tokens: [], components: [comp] };
  const diags = validateDataset(dataset).filter((d) => d.ruleId === "SPEC-026");
  t.is(diags.length, 0);
});

// ---- SPEC-027: token-binding-token-exists ------------------------------------

const buttonWithBindings = {
  ...button,
  tokenBindings: [
    { token: "button-background-color-accent", context: "Fill background" },
    { token: "component-height-100", context: "Height" },
  ],
};

test("SPEC-027: no error when all tokenBinding tokens exist", (t) => {
  const dataset = {
    tokens: [
      { name: "button-background-color-accent", value: "#0265dc" },
      { name: "component-height-100", value: "32px" },
    ],
    components: [buttonWithBindings],
  };
  const diags = validateDataset(dataset).filter((d) => d.ruleId === "SPEC-027");
  t.is(diags.length, 0);
});

test("SPEC-027: error when tokenBinding references unknown token", (t) => {
  const dataset = {
    tokens: [{ name: "component-height-100", value: "32px" }],
    components: [buttonWithBindings],
  };
  const diags = validateDataset(dataset).filter((d) => d.ruleId === "SPEC-027");
  t.is(diags.length, 1);
  t.is(diags[0].severity, "error");
  t.regex(diags[0].message, /unknown token/);
});

test("SPEC-027: no error when tokenBindings is absent", (t) => {
  const dataset = { tokens: [], components: [button] };
  const diags = validateDataset(dataset).filter((d) => d.ruleId === "SPEC-027");
  t.is(diags.length, 0);
});

test("SPEC-027: no error for empty tokenBindings array", (t) => {
  const dataset = {
    tokens: [],
    components: [{ ...button, tokenBindings: [] }],
  };
  const diags = validateDataset(dataset).filter((d) => d.ruleId === "SPEC-027");
  t.is(diags.length, 0);
});

// ---- Empty dataset ----------------------------------------------------------

test("empty dataset produces no diagnostics", (t) => {
  t.deepEqual(validateDataset({}), []);
  t.deepEqual(validateDataset({ tokens: [], components: [] }), []);
});

test("null token name produces no diagnostics", (t) => {
  const dataset = {
    tokens: [{ name: null, value: "#fff" }],
    components: [],
  };
  t.deepEqual(validateDataset(dataset), []);
});
