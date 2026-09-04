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
 * Best-effort runtime check that the embedded dataset (provenance.designDataVersion,
 * baked into @adobe/design-data-wasm at build time) isn't behind the latest published
 * @adobe/spectrum-design-data. See spectrum-design-data-9fe.5 — a plain `npx -y <pkg>`
 * (no @latest tag) can silently reuse a cached older wasm build.
 *
 * Deliberately silent on any failure (offline, registry down, timeout): this is a
 * courtesy signal, never a reason to break the primer response.
 */

const REGISTRY_URL =
  "https://registry.npmjs.org/@adobe/spectrum-design-data/latest";
const TIMEOUT_MS = 1500;

/**
 * Numeric major.minor.patch compare. ponytail: ignores prerelease/build tags;
 * add real semver only if a data prerelease ships.
 */
export function isBehind(embedded, latest) {
  const a = String(embedded).split(".").map(Number);
  const b = String(latest).split(".").map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y) return x < y;
  }
  return false;
}

let warned = false;
let cached; // Promise<status|null>, memoized per process

/**
 * @param {string} embeddedVersion - provenance.designDataVersion from ds.primer()
 * @returns {Promise<{latestVersion: string, isStale: boolean, message?: string}|null>}
 */
export function checkDatasetFreshness(embeddedVersion) {
  if (!embeddedVersion || process.env.DESIGN_DATA_SKIP_VERSION_CHECK) {
    return Promise.resolve(null);
  }
  if (!cached) {
    cached = fetchLatest(embeddedVersion);
  }
  return cached;
}

async function fetchLatest(embeddedVersion) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(REGISTRY_URL, { signal: controller.signal });
    if (!res.ok) return null;
    const { version: latestVersion } = await res.json();
    const isStale = isBehind(embeddedVersion, latestVersion);
    const status = { latestVersion, isStale };
    if (isStale) {
      status.message =
        `Embedded dataset (${embeddedVersion}) is behind the latest published ` +
        `@adobe/spectrum-design-data (${latestVersion}). Reinstall with ` +
        `npx -y @adobe/design-data-agent-mcp@latest to pick up the newer snapshot.`;
      if (!warned) {
        warned = true;
        console.error(`[design-data] ${status.message}`);
      }
    }
    return status;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Test-only: clear the memoized check + warn-once flag between cases. */
export function __resetFreshnessCache() {
  warned = false;
  cached = undefined;
}
