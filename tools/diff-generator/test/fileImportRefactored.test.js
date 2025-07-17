/*
Copyright 2025 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import test from "ava";
import {
  buildTokenURL,
  buildFetchOptions,
  cleanTokenPath,
  processTokenNames,
  RemoteTokenFetcher,
  LocalFileSystem,
  TokenLoader,
} from "../src/lib/file-import.js";

// ===== PURE FUNCTION TESTS (100% coverage easily achievable) =====

test("buildTokenURL - constructs URL with custom repo", (t) => {
  const url = buildTokenURL(
    "color-aliases.json",
    "v1.0.0",
    "main",
    "custom/repo",
  );
  t.is(
    url,
    "https://raw.githubusercontent.com/custom/repo/v1.0.0/packages/tokens/color-aliases.json",
  );
});

test("buildTokenURL - constructs URL with default repo", (t) => {
  const url = buildTokenURL("color-aliases.json", "v1.0.0", "main", "");
  t.is(
    url,
    "https://raw.githubusercontent.com/adobe/spectrum-tokens/v1.0.0/packages/tokens/color-aliases.json",
  );
});

test("buildTokenURL - constructs URL with null repo", (t) => {
  const url = buildTokenURL("color-aliases.json", "v1.0.0", "main", null);
  t.is(
    url,
    "https://raw.githubusercontent.com/adobe/spectrum-tokens/v1.0.0/packages/tokens/color-aliases.json",
  );
});

test("buildTokenURL - uses location for latest version", (t) => {
  const url = buildTokenURL(
    "color-aliases.json",
    "latest",
    "develop",
    "custom/repo",
  );
  t.is(
    url,
    "https://raw.githubusercontent.com/custom/repo/develop/packages/tokens/color-aliases.json",
  );
});

test("buildTokenURL - handles double slashes in token name", (t) => {
  const url = buildTokenURL("src//test.json", "latest", "main", "repo");
  t.is(
    url,
    "https://raw.githubusercontent.com/repo/main/packages/tokens/src/test.json",
  );
});

test("buildFetchOptions - returns empty options without API key", (t) => {
  const options = buildFetchOptions("");
  t.deepEqual(options, {});
});

test("buildFetchOptions - returns empty options with null API key", (t) => {
  const options = buildFetchOptions(null);
  t.deepEqual(options, {});
});

test("buildFetchOptions - returns auth headers with API key", (t) => {
  const options = buildFetchOptions("test-api-key");
  t.deepEqual(options, {
    headers: {
      Authorization: "Bearer test-api-key",
    },
  });
});

test("cleanTokenPath - removes quotes and commas", (t) => {
  const result = cleanTokenPath("/base/", '"test-file.json",');
  t.is(result, "/base/test-file.json");
});

test("cleanTokenPath - trims whitespace", (t) => {
  const result = cleanTokenPath("/base/", "  test-file.json  ");
  t.is(result, "/base/test-file.json");
});

test("cleanTokenPath - handles complex cleanup", (t) => {
  const result = cleanTokenPath("/base/", '  "test-file.json", ');
  t.is(result, "/base/test-file.json");
});

test("processTokenNames - adds src/ prefix when given token names", (t) => {
  const result = processTokenNames(["color.json", "layout.json"], true);
  t.deepEqual(result, ["src/color.json", "src/layout.json"]);
});

test("processTokenNames - keeps original names when not given", (t) => {
  const result = processTokenNames(["packages/tokens/src/color.json"], false);
  t.deepEqual(result, ["packages/tokens/src/color.json"]);
});

test("processTokenNames - handles empty array", (t) => {
  const result = processTokenNames([], true);
  t.deepEqual(result, []);
});

// ===== RemoteTokenFetcher TESTS (with mocked fetch) =====

test("RemoteTokenFetcher - successful fetch", async (t) => {
  const mockData = { tokens: { "test-token": { value: "#FF0000" } } };
  const mockFetch = async () => ({
    status: 200,
    json: async () => mockData,
  });

  const fetcher = new RemoteTokenFetcher(mockFetch);
  const result = await fetcher.fetchTokens(
    "test.json",
    "v1.0.0",
    "main",
    "",
    "",
  );

  t.deepEqual(result, mockData);
});

test("RemoteTokenFetcher - handles fetch error", async (t) => {
  const mockFetch = async () => ({
    status: 404,
    statusText: "Not Found",
  });

  const fetcher = new RemoteTokenFetcher(mockFetch);

  await t.throwsAsync(
    async () => {
      await fetcher.fetchTokens("missing.json", "v1.0.0", "main", "", "");
    },
    {
      message: /404: Not Found/,
    },
  );
});

test("RemoteTokenFetcher - handles JSON parse error", async (t) => {
  const mockFetch = async () => ({
    status: 200,
    json: async () => {
      throw new Error("Invalid JSON");
    },
  });

  const fetcher = new RemoteTokenFetcher(mockFetch);

  await t.throwsAsync(
    async () => {
      await fetcher.fetchTokens("invalid.json", "v1.0.0", "main", "", "");
    },
    {
      message: /Failed to parse JSON.*Invalid JSON/,
    },
  );
});

test("RemoteTokenFetcher - uses GitHub API key", async (t) => {
  let capturedUrl;
  let capturedOptions;
  const mockFetch = async (url, options) => {
    capturedUrl = url;
    capturedOptions = options;
    return {
      status: 200,
      json: async () => ({ test: "data" }),
    };
  };

  const fetcher = new RemoteTokenFetcher(mockFetch);
  await fetcher.fetchTokens(
    "test.json",
    "v1.0.0",
    "main",
    "custom/repo",
    "test-key",
  );

  t.true(capturedUrl.includes("custom/repo"));
  t.deepEqual(capturedOptions, {
    headers: {
      Authorization: "Bearer test-key",
    },
  });
});

test("RemoteTokenFetcher - handles server error", async (t) => {
  const mockFetch = async () => ({
    status: 500,
    statusText: "Internal Server Error",
  });

  const fetcher = new RemoteTokenFetcher(mockFetch);

  await t.throwsAsync(
    async () => {
      await fetcher.fetchTokens("test.json", "v1.0.0", "main", "", "");
    },
    {
      message: /500: Internal Server Error/,
    },
  );
});

// ===== LocalFileSystem TESTS (with mocked filesystem) =====

test("LocalFileSystem - getRootPath finds target file", (t) => {
  const mockFS = {
    existsSync: (path) => !path.includes("nonexistent"),
  };
  const mockPath = {
    join: (a, b) => `${a}/${b}`,
    dirname: (p) => {
      const parts = p.split("/");
      return parts.slice(0, -1).join("/");
    },
  };

  const fs = new LocalFileSystem(mockFS, mockPath);
  const result = fs.getRootPath("/project/subdir", "pnpm-lock.yaml");

  t.is(result, "/project/subdir/pnpm-lock.yaml");
});

test("LocalFileSystem - getRootPath returns null when not found", (t) => {
  const mockFS = {
    existsSync: () => false,
  };
  const mockPath = {
    join: (a, b) => `${a}/${b}`,
    dirname: () => "/",
  };

  const fs = new LocalFileSystem(mockFS, mockPath);
  const result = fs.getRootPath("/nonexistent", "target.file");

  t.is(result, null);
});

test("LocalFileSystem - getRootPath handles root directory", (t) => {
  const mockFS = {
    existsSync: (path) => path === "/" || path === "/target.file",
  };
  const mockPath = {
    join: (a, b) => (a === "/" ? `/${b}` : `${a}/${b}`),
    dirname: (p) => (p === "/" ? "/" : "/"),
  };

  const fs = new LocalFileSystem(mockFS, mockPath);
  const result = fs.getRootPath("/", "target.file");

  t.is(result, "/target.file");
});

test("LocalFileSystem - loadData loads and merges files", async (t) => {
  const mockFS = {
    access: async () => {},
    readFile: async (path) => {
      if (path.includes("file1.json")) {
        return '{"token1": {"value": "#FF0000"}}';
      }
      return '{"token2": {"value": "#00FF00"}}';
    },
  };

  const fs = new LocalFileSystem(mockFS);
  const result = await fs.loadData("/base/", ["file1.json", "file2.json"]);

  t.deepEqual(result, {
    token1: { value: "#FF0000" },
    token2: { value: "#00FF00" },
  });
});

test("LocalFileSystem - loadData handles file access error", async (t) => {
  const mockFS = {
    access: async () => {
      throw new Error("File not found");
    },
  };

  const fs = new LocalFileSystem(mockFS);

  await t.throwsAsync(
    async () => {
      await fs.loadData("/base/", ["missing.json"]);
    },
    {
      message: "File not found",
    },
  );
});

test("LocalFileSystem - loadData handles JSON parse error", async (t) => {
  const mockFS = {
    access: async () => {},
    readFile: async () => "invalid json",
  };

  const fs = new LocalFileSystem(mockFS);

  await t.throwsAsync(
    async () => {
      await fs.loadData("/base/", ["invalid.json"]);
    },
    {
      message: /Unexpected token/,
    },
  );
});

test("LocalFileSystem - getTokenFiles returns glob results", async (t) => {
  const mockFS = {
    glob: async (pattern, options) => {
      t.is(pattern, "src/*.json");
      t.deepEqual(options, {
        ignore: ["node_modules/**", "coverage/**"],
        cwd: "../../",
      });
      return ["file1.json", "file2.json"];
    },
  };

  const fs = new LocalFileSystem(mockFS);
  const result = await fs.getTokenFiles("src");

  t.deepEqual(result, ["file1.json", "file2.json"]);
});

// ===== TokenLoader TESTS (integration with mocked dependencies) =====

test("TokenLoader - loadRemoteTokens with explicit token names", async (t) => {
  const mockRemoteFetcher = {
    fetchTokens: async (name) => {
      return { [`token-from-${name}`]: { value: "#FF0000" } };
    },
  };

  const loader = new TokenLoader(mockRemoteFetcher, null);
  const result = await loader.loadRemoteTokens(
    ["color.json", "layout.json"],
    "v1.0.0",
    "main",
    "",
    "",
  );

  t.deepEqual(result, {
    "token-from-src/color.json": { value: "#FF0000" },
    "token-from-src/layout.json": { value: "#FF0000" },
  });
});

test("TokenLoader - loadRemoteTokens loads manifest when no token names", async (t) => {
  const mockRemoteFetcher = {
    fetchTokens: async (name) => {
      if (name === "manifest.json") {
        return ["color.json", "layout.json"];
      }
      return { [`token-from-${name}`]: { value: "#00FF00" } };
    },
  };

  const loader = new TokenLoader(mockRemoteFetcher, null);
  const result = await loader.loadRemoteTokens(null, "latest", "main", "", "");

  t.deepEqual(result, {
    "token-from-color.json": { value: "#00FF00" },
    "token-from-layout.json": { value: "#00FF00" },
  });
});

test("TokenLoader - loadRemoteTokens with default version and location", async (t) => {
  const mockRemoteFetcher = {
    fetchTokens: async (name, version, location) => {
      t.is(version, "latest");
      t.is(location, "main");
      return { [`token-${name}`]: { value: "#0000FF" } };
    },
  };

  const loader = new TokenLoader(mockRemoteFetcher, null);
  const result = await loader.loadRemoteTokens(["test.json"]);

  t.deepEqual(result, {
    "token-src/test.json": { value: "#0000FF" },
  });
});

test("TokenLoader - loadLocalTokens with specific files", async (t) => {
  const mockLocalFS = {
    process: { cwd: () => "/project" },
    getRootPath: () => "/project/pnpm-lock.yaml",
    loadData: async (dir, files) => {
      t.is(dir, "/project/tokens/");
      t.deepEqual(files, ["color.json"]);
      return { "local-token": { value: "#0000FF" } };
    },
  };

  const loader = new TokenLoader(null, mockLocalFS);
  const result = await loader.loadLocalTokens("tokens", ["color.json"]);

  t.deepEqual(result, { "local-token": { value: "#0000FF" } });
});

test("TokenLoader - loadLocalTokens loads all files when none specified", async (t) => {
  const mockLocalFS = {
    process: { cwd: () => "/project" },
    getRootPath: () => "/project/pnpm-lock.yaml",
    getTokenFiles: async (dirName) => {
      t.is(dirName, "tokens");
      return ["file1.json", "file2.json"];
    },
    loadData: async (dir, files) => {
      t.is(dir, "/project/");
      t.deepEqual(files, ["file1.json", "file2.json"]);
      return { "all-tokens": { value: "#FFFF00" } };
    },
  };

  const loader = new TokenLoader(null, mockLocalFS);
  const result = await loader.loadLocalTokens("tokens", null);

  t.deepEqual(result, { "all-tokens": { value: "#FFFF00" } });
});

test("TokenLoader - loadLocalTokens throws when root not found", async (t) => {
  const mockLocalFS = {
    process: { cwd: () => "/project" },
    getRootPath: () => null,
  };

  const loader = new TokenLoader(null, mockLocalFS);

  await t.throwsAsync(
    async () => {
      await loader.loadLocalTokens("tokens", ["test.json"]);
    },
    {
      message: "Could not find project root (pnpm-lock.yaml)",
    },
  );
});

test("TokenLoader - loadLocalTokens handles and rethrows errors", async (t) => {
  const mockLocalFS = {
    process: { cwd: () => "/project" },
    getRootPath: () => "/project/pnpm-lock.yaml",
    loadData: async () => {
      throw new Error("File system error");
    },
  };

  const loader = new TokenLoader(null, mockLocalFS);

  await t.throwsAsync(
    async () => {
      await loader.loadLocalTokens("tokens", ["test.json"]);
    },
    {
      message: "File system error",
    },
  );
});

// ===== INTEGRATION TESTS (testing the classes working together) =====

test("TokenLoader - full integration with real token structure", async (t) => {
  const mockRemoteFetcher = {
    fetchTokens: async (name) => {
      if (name === "manifest.json") {
        return ["color-palette.json", "layout.json"];
      }
      if (name === "color-palette.json") {
        return { "spectrum-blue-100": { value: "#E6F2FF" } };
      }
      if (name === "layout.json") {
        return { "spacing-75": { value: "6px" } };
      }
      throw new Error(`Unexpected token file: ${name}`);
    },
  };

  const loader = new TokenLoader(mockRemoteFetcher, null);
  const result = await loader.loadRemoteTokens(
    null,
    "v1.0.0",
    "main",
    "test/repo",
    "api-key",
  );

  t.deepEqual(result, {
    "spectrum-blue-100": { value: "#E6F2FF" },
    "spacing-75": { value: "6px" },
  });
});

test("LocalFileSystem - full directory traversal", (t) => {
  const checkPaths = [];
  const mockFS = {
    existsSync: (path) => {
      checkPaths.push(path);
      // All directories exist until we hit root
      if (path === "/") return false;
      return true;
    },
  };
  const mockPath = {
    join: (a, b) => `${a}/${b}`,
    dirname: (p) => {
      if (p === "/project/subdir/deep") return "/project/subdir";
      if (p === "/project/subdir") return "/project";
      if (p === "/project") return "/";
      return "/";
    },
  };

  const fs = new LocalFileSystem(mockFS, mockPath);
  const result = fs.getRootPath("/project/subdir/deep", "pnpm-lock.yaml");

  t.is(result, "/project/subdir/deep/pnpm-lock.yaml");
  // Verify it checked the path we started with
  t.true(checkPaths.includes("/project/subdir/deep"));
});

// ===== ERROR HANDLING AND EDGE CASES =====

test("RemoteTokenFetcher - handles network timeout simulation", async (t) => {
  const mockFetch = async () => {
    throw new Error("Network timeout");
  };

  const fetcher = new RemoteTokenFetcher(mockFetch);

  await t.throwsAsync(
    async () => {
      await fetcher.fetchTokens("test.json", "v1.0.0", "main", "", "");
    },
    {
      message: "Network timeout",
    },
  );
});

test("LocalFileSystem - handles empty token files array", async (t) => {
  const mockFS = {
    access: async () => {},
    readFile: async () => "{}",
  };

  const fs = new LocalFileSystem(mockFS);
  const result = await fs.loadData("/base/", []);

  t.deepEqual(result, {});
});

test("TokenLoader - handles malformed manifest response", async (t) => {
  const mockRemoteFetcher = {
    fetchTokens: async (name) => {
      if (name === "manifest.json") {
        return null; // Malformed response
      }
      return {};
    },
  };

  const loader = new TokenLoader(mockRemoteFetcher, null);

  await t.throwsAsync(
    async () => {
      await loader.loadRemoteTokens(null, "latest", "main", "", "");
    },
    {
      message: /Cannot read properties of null/,
    },
  );
});
