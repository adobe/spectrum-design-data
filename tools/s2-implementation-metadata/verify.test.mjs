// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  createImplementationMappings,
  createPlatformFragments,
  readReactSpectrumS2,
  readSpectrumWcGen2,
  removeImplementations,
  replaceImplementations,
} from "./verify.mjs";

async function writeFixture(root, relativePath, contents) {
  const filePath = path.join(root, relativePath);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, contents);
}

test("reads public S2 value exports through local re-exports", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "s2-exports-"));
  try {
    await writeFixture(
      root,
      "package.json",
      JSON.stringify({
        name: "@react-spectrum/s2",
        source: "exports/index.ts",
      }),
    );
    await writeFixture(
      root,
      "exports/index.ts",
      "export { Button, LinkButton as Link } from '../src/Button.js';\nexport type { ButtonProps } from '../src/Button.js';",
    );
    await writeFixture(
      root,
      "src/Button.ts",
      "export class Button {}\\nexport class LinkButton {}\\n",
    );

    const result = await readReactSpectrumS2(root);
    assert.deepEqual([...result.names].sort(), ["Button", "Link"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("accepts gen2 registrations only when the public subpath exports the class", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "spectrum-wc-gen2-"));
  try {
    await writeFixture(
      root,
      "package.json",
      JSON.stringify({
        name: "@adobe/spectrum-wc",
        exports: {
          "./components/*": "./dist/components/*/index.js",
        },
      }),
    );
    await writeFixture(
      root,
      "components/button/index.ts",
      "export * from './Button.js';",
    );
    await writeFixture(
      root,
      "components/button/Button.ts",
      "export class Button {}",
    );
    await writeFixture(
      root,
      "components/button/swc-button.ts",
      "defineElement('swc-button', Button);",
    );
    await writeFixture(
      root,
      "components/private/index.ts",
      "export * from './Private.js';",
    );
    await writeFixture(
      root,
      "components/private/Private.ts",
      "export class Private {}",
    );
    await writeFixture(
      root,
      "components/private/swc-private-alias.ts",
      "defineElement('sp-private', Private);",
    );

    const result = await readSpectrumWcGen2(root);
    assert.deepEqual([...result.components.keys()], ["Button"]);
    assert.deepEqual(result.components.get("Button"), {
      componentName: "Button",
      importPath: "@adobe/spectrum-wc/components/button",
      notes: "Spectrum 2 web component custom element: swc-button.",
      tag: "swc-button",
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("builds S2 mappings only for exact exported names", () => {
  const result = createImplementationMappings(
    ["button", "side-navigation"],
    {
      names: new Set(["Button", "SideNav"]),
      packageName: "@react-spectrum/s2",
    },
    {
      components: new Map([
        [
          "Button",
          {
            componentName: "Button",
            importPath: "@adobe/spectrum-wc/components/button",
            notes: "Spectrum 2 web component custom element: swc-button.",
          },
        ],
      ]),
      packageName: "@adobe/spectrum-wc",
    },
  );

  assert.deepEqual(result.get("button"), [
    {
      platform: "web",
      componentName: "Button",
      package: "@react-spectrum/s2",
    },
    {
      platform: "web",
      componentName: "Button",
      importPath: "@adobe/spectrum-wc/components/button",
      notes: "Spectrum 2 web component custom element: swc-button.",
    },
  ]);
  assert.deepEqual(result.get("side-navigation"), []);
});

test("replaces only the implementations array and preserves JSON strings", () => {
  const source = `{
  "name": "button",
  "implementations": [
    {
      "platform": "web",
      "componentName": "Old",
      "notes": "old ] value"
    }
  ],
  "description": "keep me"
}
`;
  const updated = replaceImplementations(source, [
    {
      platform: "web",
      componentName: "Button",
      package: "@react-spectrum/s2",
    },
  ]);
  const parsed = JSON.parse(updated);

  assert.deepEqual(parsed.implementations, [
    {
      platform: "web",
      componentName: "Button",
      package: "@react-spectrum/s2",
    },
  ]);
  assert.equal(parsed.description, "keep me");
  assert.match(updated, /"description": "keep me"/);
});

test("adds implementations before component document blocks when absent", () => {
  const source = `{
  "name": "action-bar",
  "meta": {
    "category": "actions"
  },
  "documentBlocks": []
}
`;
  const updated = replaceImplementations(source, [
    {
      platform: "web",
      componentName: "ActionBar",
      package: "@react-spectrum/s2",
    },
  ]);
  const parsed = JSON.parse(updated);

  assert.deepEqual(parsed.implementations, [
    {
      platform: "web",
      componentName: "ActionBar",
      package: "@react-spectrum/s2",
    },
  ]);
  assert.deepEqual(parsed.documentBlocks, []);
});

test("removes an empty implementations field without changing other fields", () => {
  const source = `{
  "name": "body",
  "implementations": [],
  "documentBlocks": []
}
`;
  const updated = removeImplementations(source);
  const parsed = JSON.parse(updated);

  assert.equal("implementations" in parsed, false);
  assert.deepEqual(parsed.documentBlocks, []);
});

test("emits platform-owned fragments carrying only that platform's rows", () => {
  const rsS2 = {
    packageName: "@react-spectrum/s2",
    names: new Set(["Button", "Picker"]),
  };
  const spectrumWc = {
    packageName: "@adobe/spectrum-wc",
    components: new Map([
      [
        "Button",
        {
          componentName: "Button",
          importPath: "@adobe/spectrum-wc/components/button",
          notes: "Spectrum 2 web component custom element: swc-button.",
        },
      ],
    ]),
  };
  const ids = ["button", "picker", "rating"];

  const rs = createPlatformFragments(ids, "react-spectrum", rsS2, spectrumWc);
  assert.deepEqual([...rs.keys()], ["button", "picker"]);
  assert.deepEqual(rs.get("picker").implementations, [
    { platform: "web", componentName: "Picker", package: "@react-spectrum/s2" },
  ]);

  const wc = createPlatformFragments(ids, "web-components", rsS2, spectrumWc);
  assert.deepEqual([...wc.keys()], ["button"]);
  assert.equal(wc.get("button").component, "button");
  assert.deepEqual(wc.get("button").implementations, [
    {
      platform: "web",
      componentName: "Button",
      package: "@adobe/spectrum-wc",
      importPath: "@adobe/spectrum-wc/components/button",
      notes: "Spectrum 2 web component custom element: swc-button.",
    },
  ]);
});
