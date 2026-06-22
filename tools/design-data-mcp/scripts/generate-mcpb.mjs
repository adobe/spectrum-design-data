// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

/**
 * Generates the MCPB staging directory for @adobe/design-data-mcp.
 *
 * Approach mirrors react-spectrum/packages/dev/s2-docs/scripts/generateMcpb.mjs:
 *  1. Copy src/ into the staging dir.
 *  2. Vendor all runtime dependencies (including workspace:* packages) by recursively
 *     walking node_modules via copyDependencyTree, using dereference:true to flatten
 *     pnpm symlinks. @adobe/design-data-wasm and @adobe/spectrum-design-data do not
 *     need to be publicly published — they are vendored directly from the monorepo.
 *  3. Generate icon.png from site/adobe_logo.svg via sharp (512x512, transparent bg).
 *  4. Generate manifest.json (manifest_version 0.3) with version auto-synced from
 *     package.json and tools list derived from createDesignDataTools() to avoid drift.
 *  5. Copy README.md + LICENSE into staging.
 *
 * Run via `moon run tools/design-data-mcp:bundle` (which also validates and packs).
 */

import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(scriptDir, '..');    // tools/design-data-mcp
const repoRoot = path.resolve(packageDir, '../..');  // spectrum-design-data repo root

const packageJson = JSON.parse(
  fs.readFileSync(path.join(packageDir, 'package.json'), 'utf8'),
);

const stagingDir = path.join(packageDir, 'dist', 'design-data-mcp-bundle');

/**
 * Per-package subpaths to omit from the published file set.
 * These are valid `files` entries that this Node stdio server never loads at runtime.
 * Each value is a list of relative paths (from the package root) to skip.
 */
const PER_PACKAGE_EXCLUDES = {
  // @adobe/design-data-wasm ships two wasm targets: pkg/node (loaded by the Node
  // exports condition) and pkg/web (browser target, never loaded by a Node stdio server).
  '@adobe/design-data-wasm': ['pkg/web'],
};

// ── 1. Staging dir setup ───────────────────────────────────────────────────

fs.rmSync(stagingDir, { recursive: true, force: true });
fs.mkdirSync(stagingDir, { recursive: true });

// ── 2. Copy src/ ───────────────────────────────────────────────────────────

const srcFrom = path.join(packageDir, 'src');
const srcTo = path.join(stagingDir, 'src');
if (!fs.existsSync(srcFrom)) {
  throw new Error(`Missing src/ at ${srcFrom}`);
}
copyDirectory(srcFrom, srcTo);

// ── 3. Vendor runtime dependencies ────────────────────────────────────────

const bundledPackages = new Set();
const stagingNodeModules = path.join(stagingDir, 'node_modules');
for (const dep of Object.keys(packageJson.dependencies || {})) {
  copyDependencyTree(dep, stagingNodeModules, bundledPackages, packageDir);
}

// ── 4. Generate icon.png from Adobe logo SVG ──────────────────────────────

const adobeLogoSvg = path.join(repoRoot, 'docs', 'site', 'public', 'adobe_logo.svg');
if (!fs.existsSync(adobeLogoSvg)) {
  throw new Error(`Adobe logo SVG not found at ${adobeLogoSvg}`);
}
const svgBuffer = fs.readFileSync(adobeLogoSvg);
await sharp(svgBuffer)
  .resize(448, 448, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .extend({ top: 32, bottom: 32, left: 32, right: 32, background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile(path.join(stagingDir, 'icon.png'));

// ── 5. Derive tools list from source (no drift) ────────────────────────────

// Import the tool definitions directly so the manifest is always in sync with code.
const { createDesignDataTools } = await import('../src/tools/design-data.js');
const tools = createDesignDataTools().map(({ name, description }) => ({ name, description }));

// ── 6. Generate staging package.json ──────────────────────────────────────

fs.writeFileSync(
  path.join(stagingDir, 'package.json'),
  JSON.stringify(
    {
      name: 'design-data',
      version: packageJson.version,
      private: true,
      type: 'module',
    },
    null,
    2,
  ) + '\n',
);

// ── 7. Generate manifest.json ──────────────────────────────────────────────

fs.writeFileSync(
  path.join(stagingDir, 'manifest.json'),
  JSON.stringify(
    {
      manifest_version: '0.3',
      name: 'design-data',
      display_name: 'Spectrum Design Data',
      version: packageJson.version,
      description:
        'Spectrum design tokens, component schemas, and design guidelines — offline, zero-config.',
      long_description:
        'Provides 7 read-only tools for browsing Adobe Spectrum design data: token lookup, ' +
        'natural-language token suggestions, component schema inspection, token value resolution ' +
        'for mode contexts (color-scheme, scale, contrast), and Spectrum design guidelines. ' +
        'All data is served from an embedded Spectrum snapshot — no network access, no API keys, ' +
        'and no configuration required. Works offline immediately after install.',
      author: {
        name: 'Adobe',
        url: 'https://www.adobe.com',
      },
      repository: {
        type: 'git',
        url: 'https://github.com/adobe/spectrum-design-data',
      },
      homepage:
        'https://github.com/adobe/spectrum-design-data/tree/main/tools/design-data-mcp',
      documentation:
        'https://github.com/adobe/spectrum-design-data/tree/main/tools/design-data-mcp#readme',
      support: 'https://github.com/adobe/spectrum-design-data/issues',
      icon: 'icon.png',
      license: 'Apache-2.0',
      keywords: ['mcp', 'spectrum', 'adobe', 'design-system', 'design-tokens', 'design-data'],
      privacy_policies: ['https://www.adobe.com/privacy/policy.html'],
      tools,
      compatibility: {
        platforms: ['darwin', 'win32', 'linux'],
        runtimes: { node: '>=20.12' },
      },
      server: {
        type: 'node',
        entry_point: 'src/cli.js',
        mcp_config: {
          command: 'node',
          args: ['${__dirname}/src/cli.js'],
        },
      },
    },
    null,
    2,
  ) + '\n',
);

// ── 8. Copy README + LICENSE ───────────────────────────────────────────────

fs.copyFileSync(path.join(packageDir, 'README.md'), path.join(stagingDir, 'README.md'));
fs.copyFileSync(path.join(repoRoot, 'LICENSE'), path.join(stagingDir, 'LICENSE'));

console.log(`\nBundle staged at: ${stagingDir}`);
console.log('To validate and pack, run:');
console.log(`  pnpm exec mcpb validate ${stagingDir}`);
console.log(`  pnpm exec mcpb pack ${stagingDir} ${path.join(packageDir, 'dist', 'design-data.mcpb')}`);

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Recursively copy a package and all of its dependencies into outputNodeModulesDir,
 * dereferencing symlinks so pnpm workspace:* entries are physically copied.
 * Matches the approach used in react-spectrum/packages/dev/s2-docs/scripts/generateMcpb.mjs.
 */
function copyDependencyTree(
  packageName,
  outputNodeModulesDir,
  bundledPackages,
  fromDir = repoRoot,
) {
  // Dedup by bare package name (not name@version). This is correct for this repo's
  // pnpm workspace where packages are hoisted to a single resolved version per name.
  // If a future transitive dep requires a conflicting nested version, this guard will
  // copy only the first-resolved copy — revisit if bundling starts seeing version
  // mismatch errors at runtime.
  if (bundledPackages.has(packageName)) return;

  const pkgDir = resolvePackageDir(packageName, fromDir);
  const pkgJson = JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8'));
  bundledPackages.add(packageName);

  const destDir = path.join(outputNodeModulesDir, packageName);
  copyPackageFiles(pkgDir, destDir, packageName, pkgJson);

  for (const dep of Object.keys(pkgJson.dependencies || {})) {
    copyDependencyTree(dep, outputNodeModulesDir, bundledPackages, pkgDir);
  }
  for (const dep of Object.keys(pkgJson.optionalDependencies || {})) {
    copyDependencyTree(dep, outputNodeModulesDir, bundledPackages, pkgDir);
  }
}

/**
 * Copy the runtime-only files for a package into destDir.
 *
 * For workspace-source packages (resolved to a source tree, not a published store
 * entry), we honour the package's `files` allowlist (the same set npm would publish),
 * plus always-included files (package.json, README*, LICENSE*). This avoids copying
 * Rust sources, test fixtures, build configs, and nested devDep node_modules.
 *
 * For registry packages (already pruned published form), we copy the whole directory
 * but always exclude any nested `node_modules` subtrees — the recursion in
 * copyDependencyTree already flattens all declared runtime deps to the staging root.
 */
function copyPackageFiles(pkgDir, destDir, packageName, pkgJson) {
  fs.mkdirSync(destDir, { recursive: true });

  // Detect a workspace-source package: its resolved directory is NOT inside a
  // node_modules/.pnpm store path (i.e. it's a live monorepo source tree).
  const nodeModulesSep = `${path.sep}node_modules${path.sep}`;
  const isWorkspaceSource = !pkgDir.includes(nodeModulesSep);

  const excludedSubpaths = (PER_PACKAGE_EXCLUDES[packageName] || []).map(
    (p) => path.join(pkgDir, p),
  );

  if (isWorkspaceSource && Array.isArray(pkgJson.files) && pkgJson.files.length > 0) {
    // Always include package.json and top-level README / LICENSE files.
    const alwaysInclude = ['package.json'];
    for (const entry of fs.readdirSync(pkgDir)) {
      if (/^(readme|license|licence)/i.test(entry)) alwaysInclude.push(entry);
    }

    const toCopy = [...new Set([...pkgJson.files, ...alwaysInclude])];
    for (const entry of toCopy) {
      const src = path.join(pkgDir, entry);
      const dst = path.join(destDir, entry);
      if (!fs.existsSync(src)) continue;

      // Skip any per-package excluded subpath.
      if (excludedSubpaths.some((ex) => src === ex || src.startsWith(ex + path.sep))) {
        continue;
      }

      const stat = fs.statSync(src, { throwIfNoEntry: false });
      if (!stat) continue;
      if (stat.isDirectory()) {
        // Copy directory, dereferencing symlinks, but never include nested node_modules.
        fs.cpSync(src, dst, {
          recursive: true,
          dereference: true,
          filter: (srcPath) => !isInsideNodeModules(srcPath, src),
        });
      } else {
        fs.mkdirSync(path.dirname(dst), { recursive: true });
        fs.copyFileSync(src, dst);
      }
    }
  } else {
    // Registry package (already published/pruned) — copy whole dir, skip node_modules.
    fs.cpSync(pkgDir, destDir, {
      recursive: true,
      dereference: true,
      filter: (srcPath) => !isInsideNodeModules(srcPath, pkgDir),
    });
  }
}

/**
 * Returns true if `filePath` is inside a `node_modules` subdirectory of `pkgRoot`.
 * Used as an fs.cpSync filter to prevent nested devDep node_modules from being copied.
 */
function isInsideNodeModules(filePath, pkgRoot) {
  // Allow the root itself and paths that don't contain node_modules beneath pkgRoot.
  const rel = path.relative(pkgRoot, filePath);
  if (!rel) return false; // the root itself
  const parts = rel.split(path.sep);
  return parts.includes('node_modules');
}

/**
 * Resolve the package directory for a given package name, using Node's module
 * resolution from a specified fromDir. This handles pnpm's virtual store layout
 * (where packages live in .pnpm/ and are exposed via symlinks) correctly.
 *
 * We use createRequire() bound to fromDir so that resolution follows the same
 * node_modules lookup chain that the package at fromDir would use at runtime.
 *
 * IMPORTANT: Some packages (e.g. @modelcontextprotocol/sdk) have nested
 * `dist/cjs/package.json` stubs that satisfy `<pkg>/package.json` resolution but
 * carry empty `dependencies`. We always walk UP from any resolved path to find the
 * ancestor whose `package.json` has `name === packageName` — that is the true root
 * with the real dep tree.
 */
function resolvePackageDir(packageName, fromDir) {
  // createRequire needs a file URL or path to a *file* (not a directory) to anchor from.
  const anchorFile = path.join(fromDir, '__anchor__.js');
  const req = createRequire(anchorFile);

  // Get any resolvable path inside the package, then walk up to find the true root.
  let startPath;
  try {
    startPath = req.resolve(`${packageName}/package.json`);
  } catch {
    try {
      startPath = req.resolve(packageName);
    } catch {
      throw new Error(`Could not resolve package directory for: ${packageName} (from ${fromDir})`);
    }
  }

  // Walk up from the resolved path until we find a package.json with name === packageName.
  let dir = path.dirname(startPath);
  while (dir !== path.parse(dir).root) {
    const candidate = path.join(dir, 'package.json');
    if (fs.existsSync(candidate)) {
      const json = JSON.parse(fs.readFileSync(candidate, 'utf8'));
      if (json.name === packageName) return dir;
    }
    dir = path.dirname(dir);
  }

  throw new Error(`Could not find package root for: ${packageName} (from ${fromDir})`);
}

/**
 * Copy a directory tree, dereferencing symlinks (flattens pnpm workspace symlinks).
 * Used to copy `src/` into the staging root. Not used by copyDependencyTree — that
 * calls copyPackageFiles instead, which honours the package's `files` allowlist.
 */
function copyDirectory(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.cpSync(from, to, {
    recursive: true,
    dereference: true,
    filter: (srcPath) => !isInsideNodeModules(srcPath, from),
  });
}
