/*
Copyright 2024 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import { basename } from "path";
import {
  tokenFileNames,
  getFileTokens,
  getAllTokens,
} from "@adobe/spectrum-tokens";

const ALIAS_PATTERN = /^\{([^}]+)\}$/;

function isAliasValue(value) {
  return typeof value === "string" && ALIAS_PATTERN.test(value);
}

function getReferencedTokenName(value) {
  const match = typeof value === "string" && value.match(ALIAS_PATTERN);
  return match ? match[1] : null;
}

/**
 * Build a map of token name -> source file (without .json) by reading each token file.
 */
export async function buildTokenFileMap() {
  const map = new Map();
  for (const filePath of tokenFileNames) {
    const fileName = basename(filePath);
    const data = await getFileTokens(fileName);
    const fileKey = basename(fileName, ".json");
    for (const name of Object.keys(data)) {
      map.set(name, fileKey);
    }
  }
  return map;
}

/**
 * Get the token page path (for links) for a token name.
 */
export function getTokenPageForName(tokenFileMap, tokenName) {
  const fileKey = tokenFileMap.get(tokenName);
  return fileKey ? `/tokens/${fileKey}/#${tokenName}` : null;
}

/**
 * Resolve a single value (string or alias reference) to its concrete value.
 * Returns { value, resolved } where resolved is the terminal concrete value.
 * Uses visited set to guard against circular references.
 */
function resolveValueOne(tokenMap, value, visited = new Set()) {
  if (value == null || typeof value !== "string") {
    return { value, resolved: value };
  }
  const ref = getReferencedTokenName(value);
  if (!ref) {
    return { value, resolved: value };
  }
  if (visited.has(ref)) {
    return { value, resolved: value };
  }
  const token = tokenMap.get(ref);
  if (!token) {
    return { value, resolved: value };
  }
  visited.add(ref);
  if (token.value != null && !isAliasValue(token.value)) {
    visited.delete(ref);
    return { value, resolved: token.value };
  }
  if (token.value != null && isAliasValue(token.value)) {
    const out = resolveValueOne(tokenMap, token.value, visited);
    visited.delete(ref);
    return { value, resolved: out.resolved };
  }
  if (token.sets) {
    const resolvedSets = {};
    for (const [setName, setToken] of Object.entries(token.sets)) {
      if (setToken && typeof setToken.value === "string") {
        const inner = resolveValueOne(tokenMap, setToken.value, visited);
        resolvedSets[setName] = inner.resolved;
      }
    }
    visited.delete(ref);
    return { value, resolved: resolvedSets };
  }
  visited.delete(ref);
  return { value, resolved: value };
}

/**
 * Resolve token value to concrete. For plain value: resolve once. For sets: resolve each set value.
 */
function resolveTokenValue(tokenMap, token) {
  if (token.value != null) {
    const ref = getReferencedTokenName(token.value);
    if (ref) {
      const tokenData = tokenMap.get(ref);
      if (tokenData) {
        return resolveValueOne(tokenMap, token.value);
      }
    }
    return { value: token.value, resolved: token.value };
  }
  if (token.sets) {
    const resolvedSets = {};
    for (const [setName, setToken] of Object.entries(token.sets)) {
      if (setToken && typeof setToken.value === "string") {
        const result = resolveValueOne(tokenMap, setToken.value);
        resolvedSets[setName] = result;
      } else {
        resolvedSets[setName] = {
          value: setToken?.value,
          resolved: setToken?.value,
        };
      }
    }
    return { value: null, resolved: resolvedSets };
  }
  return { value: null, resolved: null };
}

/**
 * Build a map of token name -> token data (from getAllTokens) for resolution.
 */
export async function buildTokenMap() {
  const all = await getAllTokens();
  return new Map(Object.entries(all));
}

/**
 * Get resolved value and link info for a token. Returns { value, resolved, valueLink, renamedLink }.
 */
export function getTokenDisplayInfo(tokenMap, fileMap, tokenName, token) {
  const resolved = resolveTokenValue(tokenMap, token);
  let valueLink = null;
  const ref = getReferencedTokenName(token?.value);
  if (ref) {
    valueLink = getTokenPageForName(fileMap, ref);
  }
  let renamedLink = null;
  if (token?.renamed) {
    renamedLink = getTokenPageForName(fileMap, token.renamed);
  }
  return {
    value: token?.value,
    resolved: resolved.resolved,
    valueLink,
    renamedLink,
  };
}
