// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../..");
const defaultRsS2Root = path.join(
  process.env.HOME ?? "",
  "Spectrum/react-spectrum/packages/@react-spectrum/s2",
);
const defaultSpectrumWcRoot = path.join(
  process.env.HOME ?? "",
  "Spectrum/spectrum-web-components/gen2/packages/swc",
);
const defaultComponentsDir = path.join(
  repoRoot,
  "packages/design-data/components",
);

const aliasCandidates = {
  "bar-panel": ["ActionBar"],
  "card-horizontal": ["Card"],
  cards: ["Card"],
  "collection-card": ["CollectionCardPreview", "Collection"],
  "double-calendar": ["Calendar"],
  field: ["ColorField", "DateField", "NumberField", "SearchField", "TextField"],
  "floating-action-button": ["ActionButton", "Button"],
  "form-item": ["Form"],
  "help-text": ["Text"],
  "in-field-button": ["InfieldButton"],
  "in-field-progress-button": ["Button"],
  "in-field-progress-circle": ["ProgressCircle"],
  "in-line-alert": ["InlineAlert"],
  "radio-button": ["Radio"],
  "segmented-text-field": ["TextField"],
  "side-navigation": ["SideNav"],
  "single-calendar": ["Calendar"],
  "standard-dialog": ["Dialog"],
  swatch: ["ColorSwatch", "ColorSwatchPicker"],
  table: ["TableView"],
  "tag-field": ["Tag"],
  tag: ["Tag"],
  "takeover-dialog": ["Dialog"],
  title: ["AccordionItemTitle", "DisclosureTitle", "Heading"],
  toast: ["ToastContainer", "ToastQueue"],
  "triple-calendar": ["Calendar"],
  "user-card": ["UserCard"],
};

function exportedNames(source) {
  const names = new Set();
  const exportBlocks =
    /\bexport\s+(type\s+)?\{([\s\S]*?)\}\s*(?:from\s*['"][^'"]+['"])?\s*;?/g;

  for (const match of source.matchAll(exportBlocks)) {
    if (match[1]) {
      continue;
    }

    for (const item of match[2].split(",")) {
      const value = item.trim().replace(/^type\s+/, "");
      if (!value) {
        continue;
      }

      const alias = value.match(/\bas\s+([\w$]+)/);
      const name = alias?.[1] ?? value;
      if (/^[A-Za-z_$][\w$]*$/.test(name)) {
        names.add(name);
      }
    }
  }

  for (const match of source.matchAll(
    /\bexport\s+(?:declare\s+)?(?:abstract\s+)?(?:class|function|const|let|var|enum)\s+([\w$]+)/g,
  )) {
    names.add(match[1]);
  }

  return names;
}

function resolveTypeScriptPath(filePath) {
  const parsed = path.parse(filePath);
  const base = path.join(parsed.dir, parsed.name);
  return [`${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.jsx`];
}

async function findLocalModule(fromFile, specifier) {
  const target = path.resolve(path.dirname(fromFile), specifier);
  for (const candidate of resolveTypeScriptPath(target)) {
    try {
      if ((await stat(candidate)).isFile()) {
        return candidate;
      }
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
  }

  return null;
}

async function collectExportNames(entryFile, seen = new Set()) {
  const normalizedEntry = path.resolve(entryFile);
  if (seen.has(normalizedEntry)) {
    return new Set();
  }
  seen.add(normalizedEntry);

  const source = await readFile(normalizedEntry, "utf8");
  const names = exportedNames(source);
  const exportAll = /\bexport\s+\*\s+from\s*['"]([^'"]+)['"]\s*;?/g;

  for (const match of source.matchAll(exportAll)) {
    const localModule = await findLocalModule(normalizedEntry, match[1]);
    if (localModule) {
      for (const name of await collectExportNames(localModule, seen)) {
        names.add(name);
      }
    }
  }

  return names;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

export async function readReactSpectrumS2(root) {
  const packageJson = await readJson(path.join(root, "package.json"));
  const sourcePath = packageJson.source ?? packageJson.exports?.["."]?.source;
  if (packageJson.name !== "@react-spectrum/s2" || !sourcePath) {
    throw new Error(
      `Expected an @react-spectrum/s2 checkout with a source entry in ${root}`,
    );
  }

  const names = await collectExportNames(path.resolve(root, sourcePath));
  return { names, packageName: packageJson.name };
}

async function readElementRegistrations(filePath) {
  const source = await readFile(filePath, "utf8");
  const registrations = [];
  const defineElement = /\bdefineElement\(\s*['"]([^'"]+)['"]\s*,\s*([\w$]+)/g;

  for (const match of source.matchAll(defineElement)) {
    registrations.push({ tag: match[1], componentName: match[2] });
  }

  return registrations;
}

export async function readSpectrumWcGen2(root) {
  const packageJson = await readJson(path.join(root, "package.json"));
  if (
    packageJson.name !== "@adobe/spectrum-wc" ||
    !packageJson.exports?.["./components/*"]
  ) {
    throw new Error(
      `Expected an @adobe/spectrum-wc gen2 checkout with a components export in ${root}`,
    );
  }

  const componentsRoot = path.join(root, "components");
  const entries = await readdir(componentsRoot, { withFileTypes: true });
  const components = new Map();

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const componentDir = path.join(componentsRoot, entry.name);
    const indexPath = path.join(componentDir, "index.ts");
    let publicNames;
    try {
      publicNames = await collectExportNames(indexPath);
    } catch (error) {
      if (error.code === "ENOENT") {
        continue;
      }
      throw error;
    }

    const files = await readdir(componentDir, { withFileTypes: true });
    for (const file of files) {
      if (!file.isFile() || !file.name.endsWith(".ts")) {
        continue;
      }

      const filePath = path.join(componentDir, file.name);
      for (const registration of await readElementRegistrations(filePath)) {
        if (
          !registration.tag.startsWith("swc-") ||
          !publicNames.has(registration.componentName)
        ) {
          continue;
        }

        components.set(registration.componentName, {
          componentName: registration.componentName,
          importPath: `${packageJson.name}/components/${entry.name}`,
          notes: `Spectrum 2 web component custom element: ${registration.tag}.`,
          tag: registration.tag,
        });
      }
    }
  }

  return { components, packageName: packageJson.name };
}

export function pascalCase(componentId) {
  return componentId
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export function createImplementationMappings(componentIds, rsS2, spectrumWc) {
  const mappings = new Map();

  for (const componentId of componentIds) {
    const componentName = pascalCase(componentId);
    const implementations = [];

    if (rsS2.names.has(componentName)) {
      implementations.push({
        platform: "web",
        componentName,
        package: rsS2.packageName,
      });
    }

    const wcImplementation = spectrumWc.components.get(componentName);
    if (wcImplementation) {
      implementations.push({
        platform: "web",
        componentName: wcImplementation.componentName,
        importPath: wcImplementation.importPath,
        notes: wcImplementation.notes,
      });
    }

    mappings.set(componentId, implementations);
  }

  return mappings;
}

export function replaceImplementations(source, implementations) {
  const property = /^([ \t]*)"implementations"\s*:\s*\[/m.exec(source);
  const indent =
    property?.[1] ?? /^([ \t]*)"meta"\s*:/m.exec(source)?.[1] ?? "  ";
  const formatted = (baseIndent) =>
    JSON.stringify(implementations, null, 2).replace(/\n/g, `\n${baseIndent}`);

  if (!property) {
    const nextProperty =
      /^([ \t]*)"(?:documentBlocks|options|states|lifecycle|accessibility)"\s*:/m.exec(
        source,
      );
    const serialized = formatted(indent);
    if (nextProperty) {
      return `${source.slice(0, nextProperty.index)}${indent}"implementations": ${serialized},\n${source.slice(nextProperty.index)}`;
    }

    const closeObject = source.lastIndexOf("}");
    if (closeObject < 0) {
      throw new Error("Component JSON is missing its root object");
    }
    const beforeClose = source.slice(0, closeObject).trimEnd();
    const suffix = source.slice(closeObject + 1);
    return `${beforeClose},\n${indent}"implementations": ${serialized}\n}${suffix}`;
  }

  const arrayStart = property.index + property[0].lastIndexOf("[");
  let depth = 0;
  let inString = false;
  let escaped = false;
  let arrayEnd = -1;

  for (let i = arrayStart; i < source.length; i++) {
    const character = source[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }

    if (character === '"') {
      inString = true;
    } else if (character === "[") {
      depth++;
    } else if (character === "]") {
      depth--;
      if (depth === 0) {
        arrayEnd = i + 1;
        break;
      }
    }
  }

  if (arrayEnd < 0) {
    throw new Error("Could not find the end of the implementations array");
  }

  return `${source.slice(0, arrayStart)}${formatted(property[1])}${source.slice(arrayEnd)}`;
}

export function removeImplementations(source) {
  const property = /^([ \t]*)"implementations"\s*:\s*\[/m.exec(source);
  if (!property) {
    return source;
  }

  const arrayStart = property.index + property[0].lastIndexOf("[");
  let depth = 0;
  let inString = false;
  let escaped = false;
  let end = -1;

  for (let i = arrayStart; i < source.length; i++) {
    const character = source[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }

    if (character === '"') {
      inString = true;
    } else if (character === "[") {
      depth++;
    } else if (character === "]") {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }

  if (end < 0) {
    throw new Error("Could not find the end of the implementations array");
  }
  if (source[end] === ",") {
    end++;
  }
  if (source[end] === "\r") {
    end++;
  }
  if (source[end] === "\n") {
    end++;
  }

  return `${source.slice(0, property.index)}${source.slice(end)}`;
}

function parseArgs(argv) {
  const options = {
    componentsDir: defaultComponentsDir,
    reactSpectrumRoot: defaultRsS2Root,
    spectrumWcRoot: defaultSpectrumWcRoot,
    write: false,
    check: false,
    json: false,
  };
  const values = {
    "--components": "componentsDir",
    "--react-spectrum-s2": "reactSpectrumRoot",
    "--spectrum-wc-gen2": "spectrumWcRoot",
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--write") {
      options.write = true;
    } else if (arg === "--check") {
      options.check = true;
    } else if (arg === "--json") {
      options.json = true;
    } else if (values[arg]) {
      const value = argv[++i];
      if (!value) {
        throw new Error(`Missing value for ${arg}`);
      }
      options[values[arg]] = path.resolve(value);
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (options.write && options.check) {
    throw new Error("Use either --write or --check, not both");
  }

  return options;
}

function usage() {
  return [
    "Usage: node tools/s2-implementation-metadata/verify.mjs [options]",
    "",
    "Default: report exact S2 matches, alias candidates, and unmatched components.",
    "  --write                 Replace implementations[] with verified S2 mappings.",
    "  --check                 Fail if component data differs from verified mappings.",
    "  --json                  Emit the full report as JSON.",
    "  --components <path>     Component JSON directory.",
    "  --react-spectrum-s2 <path>  Local @react-spectrum/s2 package checkout.",
    "  --spectrum-wc-gen2 <path>   Local @adobe/spectrum-wc gen2 package checkout.",
  ].join("\n");
}

async function componentFiles(componentsDir) {
  const entries = await readdir(componentsDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => ({
      id: entry.name.slice(0, -".json".length),
      path: path.join(componentsDir, entry.name),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

function aliasReport(componentIds, mappings, rsS2, spectrumWc) {
  return Object.entries(aliasCandidates)
    .filter(
      ([componentId]) =>
        componentIds.includes(componentId) &&
        mappings.get(componentId).length === 0,
    )
    .map(([componentId, candidates]) => ({
      componentId,
      candidates: candidates.filter(
        (name) => rsS2.names.has(name) || spectrumWc.components.has(name),
      ),
    }))
    .filter((entry) => entry.candidates.length > 0);
}

export async function run(options) {
  const [rsS2, spectrumWc, files] = await Promise.all([
    readReactSpectrumS2(options.reactSpectrumRoot),
    readSpectrumWcGen2(options.spectrumWcRoot),
    componentFiles(options.componentsDir),
  ]);
  const componentIds = files.map((file) => file.id);
  const mappings = createImplementationMappings(componentIds, rsS2, spectrumWc);
  const aliases = aliasReport(componentIds, mappings, rsS2, spectrumWc);
  const exactCount = [...mappings.values()].filter(
    (implementations) => implementations.length > 0,
  ).length;
  const report = {
    summary: {
      componentCount: files.length,
      reactSpectrumExportCount: rsS2.names.size,
      spectrumWcElementCount: spectrumWc.components.size,
      exactMatchedComponents: exactCount,
      unmatchedComponents: files.length - exactCount,
      aliasCandidatesRequiringReview: aliases.length,
    },
    aliases,
    unmatched: files
      .filter((file) => mappings.get(file.id).length === 0)
      .map((file) => file.id),
    exact: files
      .filter((file) => mappings.get(file.id).length > 0)
      .map((file) => ({
        componentId: file.id,
        implementations: mappings.get(file.id),
      })),
  };

  if (options.write) {
    for (const file of files) {
      const source = await readFile(file.path, "utf8");
      const implementations = mappings.get(file.id);
      const updated =
        implementations.length > 0
          ? replaceImplementations(source, implementations)
          : removeImplementations(source);
      if (updated !== source) {
        await writeFile(file.path, updated);
      }
    }
  } else if (options.check) {
    const differences = [];
    for (const file of files) {
      const source = await readFile(file.path, "utf8");
      const current = JSON.parse(source).implementations ?? [];
      if (JSON.stringify(current) !== JSON.stringify(mappings.get(file.id))) {
        differences.push(file.id);
      }
    }
    if (differences.length > 0) {
      throw new Error(
        `Implementation mappings differ from verified S2 exports: ${differences.join(", ")}`,
      );
    }
  }

  if (options.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    console.log(
      `${report.summary.exactMatchedComponents}/${report.summary.componentCount} components have exact S2 mappings; ${report.summary.unmatchedComponents} remain unmatched.`,
    );
    console.log(
      `Verified exports: ${rsS2.names.size} React Spectrum S2 names, ${spectrumWc.components.size} Spectrum WC gen2 elements.`,
    );
    if (options.write) {
      console.log(
        "Wrote verified mappings; non-exact aliases were not applied.",
      );
    }
    if (options.check) {
      console.log("All component mappings match the verified S2 exports.");
    }
    if (aliases.length > 0) {
      console.log("\nAlias candidates requiring review (not applied):");
      for (const alias of aliases) {
        console.log(`  ${alias.componentId}: ${alias.candidates.join(", ")}`);
      }
    }
    if (report.unmatched.length > 0) {
      console.log(`\nUnmatched: ${report.unmatched.join(", ")}`);
    }
  }

  return report;
}

async function main(argv) {
  const options = parseArgs(argv);
  if (options.help) {
    console.log(usage());
    return;
  }
  await run(options);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
