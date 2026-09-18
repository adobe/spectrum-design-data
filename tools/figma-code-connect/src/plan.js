// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const PACKAGE_LABELS = [
  ["@react-spectrum/", "React"],
  ["@spectrum-web-components/", "Web Components"],
];

export async function loadComponents(componentsDir) {
  const files = (await readdir(componentsDir))
    .filter((file) => file.endsWith(".json"))
    .sort();
  const components = await Promise.all(
    files.map(async (file) =>
      JSON.parse(await readFile(join(componentsDir, file), "utf8")),
    ),
  );

  return components.filter(
    (component) =>
      typeof component.name === "string" &&
      typeof component.displayName === "string" &&
      Array.isArray(component.implementations),
  );
}

export function optionHints(options = {}) {
  return Object.entries(options)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, option]) => ({
      name,
      type: option.type ?? "unknown",
      default: option.default,
      values: Array.isArray(option.values)
        ? option.values.map(({ value }) => value)
        : undefined,
    }));
}

export function codeConnectLabel(implementation, labels = {}) {
  if (labels[implementation.platform]) {
    return labels[implementation.platform];
  }
  const source = implementation.package ?? implementation.importPath;
  if (typeof source !== "string" || !source) {
    throw new Error(
      `Implementation for ${implementation.platform} must define package or importPath.`,
    );
  }
  const packageLabel = PACKAGE_LABELS.find(([prefix]) =>
    source.startsWith(prefix),
  );
  if (packageLabel) {
    return packageLabel[1];
  }
  throw new Error(
    `No Code Connect label for ${implementation.platform} implementation ${source}. ` +
      `Pass --label ${implementation.platform}=LABEL.`,
  );
}

export function createMappingPlan(components, labels = {}) {
  return components.flatMap((component) =>
    component.implementations.map((implementation) => ({
      componentId: component.name,
      figmaName: component.displayName,
      platform: implementation.platform,
      source: implementation.package ?? implementation.importPath,
      componentName: implementation.componentName,
      label: codeConnectLabel(implementation, labels),
      propHints: optionHints(component.options),
    })),
  );
}

export function compactFigmaComponents(value) {
  const entries = Array.isArray(value) ? value : value.components;
  if (!Array.isArray(entries)) {
    throw new Error(
      "Figma component data must be an array or an object with a components array.",
    );
  }
  return entries.flatMap((component) => {
    const nodeId = component.nodeId ?? component.id;
    const name = component.name;
    return typeof nodeId === "string" && typeof name === "string"
      ? [{ nodeId, name }]
      : [];
  });
}

function normalize(value) {
  return value.toLowerCase().replaceAll(/[^a-z0-9]/g, "");
}

export function attachFigmaNodes(plan, figmaComponents) {
  const byName = new Map();
  for (const component of figmaComponents) {
    const name = normalize(component.name);
    const matches = byName.get(name) ?? [];
    matches.push(component.nodeId);
    byName.set(name, matches);
  }
  return plan.flatMap((mapping) => {
    const nodeIds = byName.get(normalize(mapping.figmaName)) ?? [];
    if (nodeIds.length > 1) {
      throw new Error(
        `Figma component name ${JSON.stringify(mapping.figmaName)} is ambiguous: ${nodeIds.join(", ")}.`,
      );
    }
    return nodeIds[0] ? [{ ...mapping, nodeId: nodeIds[0] }] : [];
  });
}

export function toMcpMapping(mapping) {
  return {
    nodeId: mapping.nodeId,
    source: mapping.source,
    componentName: mapping.componentName,
    label: mapping.label,
    templateDataJson: JSON.stringify({
      platform: mapping.platform,
      props: mapping.propHints,
    }),
  };
}
