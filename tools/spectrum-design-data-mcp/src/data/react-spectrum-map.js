/*
Copyright 2024 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use it except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

let mapCache = null;

/**
 * Load the React Spectrum token-to-style-macro mapping (PoC).
 * @returns {{ version: number, platform: string, mappings: Record<string, { styleMacro: { property: string, value: string } }> }}
 */
export function loadReactSpectrumMap() {
  if (mapCache) return mapCache;
  const path = join(__dirname, "../../data/react-spectrum-token-map.json");
  const raw = readFileSync(path, "utf-8");
  mapCache = JSON.parse(raw);
  return mapCache;
}

/**
 * Resolve a Spectrum token name to React Spectrum style macro property and value.
 * @param {string} tokenName - Token name (e.g. "accent-background-color-default", "font-size-100")
 * @returns {{ property: string, value: string } | null}
 */
export function resolveTokenToReactSpectrum(tokenName) {
  if (!tokenName || typeof tokenName !== "string") return null;
  const normalized = String(tokenName).trim();
  if (!normalized) return null;
  const { mappings } = loadReactSpectrumMap();
  const entry = mappings[normalized];
  return entry?.styleMacro ?? null;
}

/**
 * Reverse lookup: find Spectrum token name(s) that map to the given style macro property and value.
 * @param {string} property - Style macro property (e.g. "backgroundColor", "fontSize")
 * @param {string} value - Style macro value (e.g. "accent", "ui")
 * @returns {string[]}
 */
export function reverseLookupReactSpectrum(property, value) {
  if (!property || !value) return [];
  const { mappings } = loadReactSpectrumMap();
  const tokenNames = [];
  for (const [tokenName, entry] of Object.entries(mappings)) {
    const sm = entry?.styleMacro;
    if (sm && sm.property === property && sm.value === value) {
      tokenNames.push(tokenName);
    }
  }
  return tokenNames;
}

/**
 * List all token names that have a React Spectrum mapping.
 * @returns {string[]}
 */
export function listMappedTokenNames() {
  const { mappings } = loadReactSpectrumMap();
  return Object.keys(mappings);
}
