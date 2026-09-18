// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

import test from "ava";

import {
  attachFigmaNodes,
  compactFigmaComponents,
  createMappingPlan,
  toMcpMapping,
} from "../src/plan.js";

const button = {
  name: "button",
  displayName: "Button",
  implementations: [
    {
      platform: "web",
      componentName: "Button",
      package: "@spectrum-web-components/button",
    },
    {
      platform: "web",
      componentName: "Button",
      package: "@react-spectrum/button",
    },
  ],
  options: {
    isDisabled: { type: "boolean", default: false },
    variant: {
      type: "string",
      values: [{ value: "accent" }, { value: "negative" }],
    },
  },
};

test("creates explicit platform mappings with component option hints", (t) => {
  const plan = createMappingPlan([button]);

  t.deepEqual(plan, [
    {
      componentId: "button",
      figmaName: "Button",
      platform: "web",
      source: "@spectrum-web-components/button",
      componentName: "Button",
      label: "Web Components",
      propHints: [
        {
          name: "isDisabled",
          type: "boolean",
          default: false,
          values: undefined,
        },
        {
          name: "variant",
          type: "string",
          default: undefined,
          values: ["accent", "negative"],
        },
      ],
    },
    {
      componentId: "button",
      figmaName: "Button",
      platform: "web",
      source: "@react-spectrum/button",
      componentName: "Button",
      label: "React",
      propHints: [
        {
          name: "isDisabled",
          type: "boolean",
          default: false,
          values: undefined,
        },
        {
          name: "variant",
          type: "string",
          default: undefined,
          values: ["accent", "negative"],
        },
      ],
    },
  ]);
});

test("matches only compact top-level Figma components and preserves prop hints", (t) => {
  const [mapping] = createMappingPlan([button]);
  const figmaComponents = compactFigmaComponents([
    { id: "1:2", name: "Button", icon: "very-large-value" },
    { id: "3:4", name: 42 },
  ]);
  const [matched] = attachFigmaNodes([mapping], figmaComponents);

  t.deepEqual(figmaComponents, [{ nodeId: "1:2", name: "Button" }]);
  t.deepEqual(toMcpMapping(matched), {
    nodeId: "1:2",
    source: "@spectrum-web-components/button",
    componentName: "Button",
    label: "Web Components",
    templateDataJson: JSON.stringify({
      platform: "web",
      props: mapping.propHints,
    }),
  });
});

test("requires an explicit Code Connect label for unknown platform implementations", (t) => {
  const ios = {
    ...button,
    implementations: [
      {
        platform: "ios",
        componentName: "Button",
        package: "Spectrum",
      },
    ],
  };

  t.throws(() => createMappingPlan([ios]), {
    message: /Pass --label ios=LABEL/,
  });
});
