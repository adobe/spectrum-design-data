// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

// Static file server for local preview of dist/ (run `design-data site --out dist` first).
// Any static host works the same way; this exists only for local use.

import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const dist = join(dirname(fileURLToPath(import.meta.url)), "dist");
const port = Number(process.env.PORT ?? 4173);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".json": "application/json",
  ".wasm": "application/wasm",
};

createServer(async (req, res) => {
  const { pathname } = new URL(req.url, "http://localhost");
  const rel = normalize(pathname === "/" ? "/index.html" : pathname);
  try {
    const body = await readFile(join(dist, rel));
    res.writeHead(200, {
      "content-type": types[extname(rel)] ?? "application/octet-stream",
    });
    res.end(body);
  } catch {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("Not found");
  }
}).listen(port, () => console.log(`Hub prototype: http://localhost:${port}`));
