// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, isAbsolute, resolve } from "path";

// The repo root relative to this file: src → package → tools → repo root.
// Used as the self-anchoring fallback when DESIGN_DATA_ROOT is not provided
// and the server is run from inside the monorepo checkout.
const SERVER_ROOT = fileURLToPath(new URL("../../..", import.meta.url));

// Claude Code launches the MCP server with the working directory inherited from
// wherever the editor was opened (e.g. `sdk/`), not the repo root. Relative
// DESIGN_DATA_* paths must therefore be anchored to a known root rather than the
// process CWD. Prefer an explicit absolute DESIGN_DATA_ROOT (works even when the
// server is launched via `npx` from the npm cache); fall back to SERVER_ROOT for
// in-repo runs.
const dataRoot = process.env.DESIGN_DATA_ROOT
  ? resolve(process.env.DESIGN_DATA_ROOT)
  : SERVER_ROOT;

function anchorPath(p) {
  return p && !isAbsolute(p) ? resolve(dataRoot, p) : p;
}

// Locate a directory inside the @adobe/spectrum-design-data package via Node's
// module resolution. In a pnpm workspace this resolves through the symlink to
// `packages/design-data`; when published it resolves the installed dependency.
// Either way it is independent of the process working directory, so it provides
// a zero-config default that does not depend on where the server was launched.
// Returns null when the package is not installed (e.g. a standalone CLI install
// that relies on the design-data binary's embedded snapshot instead).
function resolveDataPackageDir(subdir) {
  try {
    const pkgJson = createRequire(import.meta.url).resolve(
      "@adobe/spectrum-design-data/package.json",
    );
    return resolve(dirname(pkgJson), subdir);
  } catch {
    return null;
  }
}

// Path precedence: explicit env override (anchored to dataRoot) wins, then the
// resolved design-data package directory, then a final fallback.
export const config = {
  bin: process.env.DESIGN_DATA_BIN ?? "design-data",
  dataRoot,
  dataPath:
    anchorPath(process.env.DESIGN_DATA_PATH) ??
    resolveDataPackageDir("tokens") ??
    anchorPath("."),
  schemaPath: anchorPath(process.env.DESIGN_DATA_SCHEMAS ?? null),
  exceptionsPath: anchorPath(process.env.DESIGN_DATA_EXCEPTIONS ?? null),
  componentsDir:
    anchorPath(process.env.DESIGN_DATA_COMPONENTS) ??
    resolveDataPackageDir("components") ??
    null,
  fieldsDir:
    anchorPath(process.env.DESIGN_DATA_FIELDS) ??
    resolveDataPackageDir("fields") ??
    null,
};
