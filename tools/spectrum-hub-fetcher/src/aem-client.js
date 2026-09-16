/**
 * Copyright 2026 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

export const DEFAULT_SITE_ORIGIN = "https://main--spectrum-hub--adobe.aem.live";
export const QUERY_INDEX_PATH = "/query-index.json?limit=500";

const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);
export const DEFAULT_MAX_ATTEMPTS = 4;
export const DEFAULT_BASE_DELAY_MS = 500;
const MAX_RETRY_AFTER_MS = 30_000;

function httpDateToEpochSeconds(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return Math.floor(date.getTime() / 1000);
}

function defaultSleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function retryAfterMs(value) {
  if (!value) {
    return null;
  }

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(seconds * 1000, MAX_RETRY_AFTER_MS);
  }

  const epochSeconds = httpDateToEpochSeconds(value);
  if (epochSeconds === null) {
    return null;
  }

  const delta = epochSeconds * 1000 - Date.now();
  return delta > 0 ? Math.min(delta, MAX_RETRY_AFTER_MS) : 0;
}

export function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;

  const run = async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await worker(items[index], index);
    }
  };

  return Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, run),
  ).then(() => results);
}

export function createClient({
  siteOrigin = DEFAULT_SITE_ORIGIN,
  fetchImpl = globalThis.fetch,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
  baseDelayMs = DEFAULT_BASE_DELAY_MS,
  sleep = defaultSleep,
} = {}) {
  const cache = new Map();

  async function fetchWithRetry(url) {
    let lastReason = "unknown error";

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      let response = null;
      try {
        response = await fetchImpl(url);
      } catch (error) {
        lastReason = error instanceof Error ? error.message : String(error);
      }

      if (response) {
        if (response.ok || !RETRYABLE_STATUSES.has(response.status)) {
          return response;
        }

        lastReason = `HTTP ${response.status}`;
      }

      if (attempt < maxAttempts) {
        const advertised = response
          ? retryAfterMs(response.headers?.get("retry-after"))
          : null;
        await sleep(advertised ?? baseDelayMs * 2 ** (attempt - 1));
      }
    }

    throw new Error(
      `Gave up on ${url} after ${maxAttempts} attempts: ${lastReason}`,
    );
  }

  async function fetchQueryIndex() {
    const response = await fetchWithRetry(`${siteOrigin}${QUERY_INDEX_PATH}`);
    if (!response.ok) {
      throw new Error(
        `Could not fetch query-index.json: HTTP ${response.status}`,
      );
    }

    const json = await response.json();
    return json?.data || [];
  }

  function normalizePagePath(input) {
    if (!input) {
      return "/";
    }

    if (/^https?:\/\//i.test(input)) {
      try {
        return new URL(input).pathname;
      } catch {
        return input;
      }
    }

    let path = input.startsWith("/") ? input : `/${input}`;
    if (!path.endsWith(".html")) {
      path = `${path}.plain.html`;
    }
    return path;
  }

  async function fetchPage(path) {
    const normalizedPath = normalizePagePath(path);
    if (cache.has(normalizedPath)) {
      return cache.get(normalizedPath);
    }

    const promise = (async () => {
      const response = await fetchWithRetry(`${siteOrigin}${normalizedPath}`);
      if (!response.ok) {
        return null;
      }

      return {
        html: await response.text(),
        lastModified: httpDateToEpochSeconds(
          response.headers.get("last-modified"),
        ),
      };
    })().catch((error) => {
      cache.delete(normalizedPath);
      throw error;
    });

    cache.set(normalizedPath, promise);
    return promise;
  }

  return {
    fetchQueryIndex,
    fetchPage,
    fetchWithRetry,
  };
}
