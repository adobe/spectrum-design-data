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
 * Finding the font that draws text in PNG previews.
 *
 * The target is Adobe Clean Spectrum VF. WebAssembly cannot read the disk, so this module
 * walks the machine's font folders, reads only each file's table directory and `name`
 * table (a few KB), and hands what it learned to the wasm `chooseFont`, which applies the
 * same rules and wording as the `design-data fonts` command. Only the chosen file is read in
 * full. When nothing matches, the bundled Source Sans 3 (SIL OFL) is used and the status
 * says how to install the real font.
 */

import {
  closeSync,
  existsSync,
  openSync,
  readdirSync,
  readFileSync,
  readSync,
  statSync,
} from "fs";
import { homedir } from "os";
import { join, resolve } from "path";
import { fileURLToPath } from "url";

export const TARGET_FAMILY = "Adobe Clean Spectrum VF";
export const ENV_VAR = "DESIGN_DATA_FONT";
const FALLBACK_NAME = "bundled Source Sans 3";
const FALLBACK_FILE = fileURLToPath(
  new URL("./fonts/SourceSans3VF-Upright.ttf", import.meta.url),
);

const MAX_FONT_BYTES = 25 * 1024 * 1024;
const MIN_FONT_BYTES = 1024;
const MAX_DEPTH = 4;
const MAX_FILES = 20000;
const MAX_NAME_TABLE = 1024 * 1024;
const HEAD_BYTES = 4096;

/**
 * Folders searched, in order, for a platform. The home folder comes from `env` (`HOME`, or
 * `USERPROFILE` on Windows) before the operating system's answer, so a caller that passes an
 * environment, and a worker thread whose `process.env` is only a copy, get the folder they mean.
 */
export function fontDirs({
  platform = process.platform,
  env = process.env,
  home = env.HOME || env.USERPROFILE || homedir(),
} = {}) {
  const under = (base, rest) => (base ? join(base, rest) : null);
  let dirs;
  if (platform === "darwin") {
    dirs = [
      under(home, "Library/Fonts"),
      "/Library/Fonts",
      under(
        home,
        "Library/Application Support/Adobe/CoreSync/plugins/livetype",
      ),
      under(home, "Library/Application Support/Adobe/Fonts"),
    ];
  } else if (platform === "win32") {
    dirs = [
      under(env.LOCALAPPDATA, "Microsoft/Windows/Fonts"),
      under(env.WINDIR, "Fonts"),
      under(env.APPDATA, "Adobe/CoreSync/plugins/livetype"),
    ];
  } else {
    dirs = [
      under(home, ".local/share/fonts"),
      under(home, ".fonts"),
      "/usr/share/fonts",
      "/usr/local/share/fonts",
    ];
  }
  return dirs.filter(Boolean);
}

/** Every file under `dir`, hidden ones included, in name order; links to folders are not followed. */
function filesUnder(dir, depth, out) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (depth < MAX_DEPTH) filesUnder(p, depth + 1, out);
    } else if (e.isFile() || e.isSymbolicLink()) {
      out.push(p);
    }
  }
}

const isFontMagic = (b) =>
  b.length >= 4 &&
  ((b[0] === 0 && b[1] === 1 && b[2] === 0 && b[3] === 0) ||
    b.toString("latin1", 0, 4) === "true" ||
    b.toString("latin1", 0, 4) === "OTTO");

/**
 * What a font file says about itself, from its first 4 KB and its `name` table; null for
 * anything that is not a TrueType or CFF font.
 */
function readFontInfo(path, wasm) {
  let fd;
  try {
    const stat = statSync(path);
    if (
      !stat.isFile() ||
      stat.size < MIN_FONT_BYTES ||
      stat.size > MAX_FONT_BYTES
    ) {
      return null;
    }
    fd = openSync(path, "r");
    const head = Buffer.alloc(Math.min(HEAD_BYTES, stat.size));
    readSync(fd, head, 0, head.length, 0);
    if (!isFontMagic(head)) return null;
    const count = head.readUInt16BE(4);
    let name = null;
    let variable = false;
    for (let i = 0; i < count && 12 + 16 * (i + 1) <= head.length; i++) {
      const rec = 12 + 16 * i;
      const tag = head.toString("latin1", rec, rec + 4);
      if (tag === "fvar") variable = true;
      if (tag === "name") {
        name = {
          offset: head.readUInt32BE(rec + 8),
          length: head.readUInt32BE(rec + 12),
        };
      }
    }
    if (
      !name ||
      name.length > MAX_NAME_TABLE ||
      name.offset + name.length > stat.size
    ) {
      return null;
    }
    const table = Buffer.alloc(name.length);
    readSync(fd, table, 0, name.length, name.offset);
    return wasm.describeFont(
      table,
      head.toString("latin1", 0, 4) === "OTTO",
      variable,
    );
  } catch {
    return null;
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

let cache = new Map();

/** A scan that found no match is trusted this long; after that it is repeated. */
const NOT_FOUND_TTL_MS = 10_000;

/** Forget remembered scans (tests; a user who installs the font while the server runs). */
export function resetFontCache() {
  cache = new Map();
}

/** Identify every font under `dirs`. Remembered per folder list; `fresh` scans again. */
function scan(dirs, wasm, fresh = false) {
  const key = dirs.join("\n");
  const hit = cache.get(key);
  if (hit && !fresh) return { ...hit.result, age: Date.now() - hit.at };
  const candidates = [];
  const searched = [];
  let seen = 0;
  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    searched.push(dir);
    const files = [];
    filesUnder(dir, 0, files);
    for (const file of files) {
      if (++seen > MAX_FILES) break;
      const info = readFontInfo(file, wasm);
      if (info) candidates.push({ origin: file, ...info });
    }
  }
  const result = { candidates, searched };
  cache.set(key, { result, at: Date.now() });
  return { ...result, age: 0 };
}

/** A font file named by the user (`fontPath` or `DESIGN_DATA_FONT`), or why it cannot be used. */
function readNamedFont(path, via) {
  const abs = resolve(path);
  try {
    const stat = statSync(abs);
    if (!stat.isFile() || stat.size > MAX_FONT_BYTES) {
      return { error: `is not a font file (set with ${via})` };
    }
    const data = readFileSync(abs);
    if (!isFontMagic(data)) {
      return { error: `is not a TrueType font (set with ${via})` };
    }
    return { origin: abs, data };
  } catch (e) {
    return {
      origin: abs,
      error: `cannot be read (set with ${via}): ${e.code ?? e.message}`,
    };
  }
}

/** An unset optional MCPB field can arrive as its own `${...}` placeholder, or empty. */
const isUnset = (v) => !v || /^\$\{[^}]*\}$/.test(String(v).trim());

/**
 * Choose the font for a PNG.
 *
 * @param {object} wasm   the `@adobe/design-data-wasm` module
 * @param {object} [opts]
 * @param {string} [opts.fontPath]   explicit font file (a tool argument)
 * @param {string[]} [opts.dirs]     folders to search (default: this machine's)
 * @param {string} [opts.target]     family to look for (default: Adobe Clean Spectrum VF)
 * @param {object} [opts.env]        environment (default: process.env)
 * @param {string[]} [opts.exclude]  files to skip, because they could not be drawn
 * @param {{origin: string, reason: string}[]} [opts.skipped]  why, for the status
 * @returns {{ fonts: {data: Uint8Array, origin: string, fallback?: boolean}[], status: object, explicit: boolean }}
 */
export function findFont(
  wasm,
  {
    fontPath,
    dirs,
    env = process.env,
    target = TARGET_FAMILY,
    exclude = [],
    skipped = [],
  } = {},
) {
  const rejected = [...skipped];
  const named = [
    [fontPath, "fontPath"],
    [isUnset(env[ENV_VAR]) ? undefined : env[ENV_VAR], ENV_VAR],
  ].find(([p]) => !isUnset(p));
  if (named) {
    const font = readNamedFont(named[0], named[1]);
    if (font.data) {
      // Used as given, even when it is not the usual family: the user chose it.
      return {
        explicit: true,
        fonts: [{ data: font.data, origin: font.origin }],
        status: {
          target: TARGET_FAMILY,
          found: true,
          using: font.origin,
          fallback: false,
          rejected: [],
          related: [],
          searched: [],
          help: `Using ${font.origin}, set with ${named[1]}.`,
        },
      };
    }
    rejected.push({
      origin: font.origin ?? resolve(named[0]),
      reason: font.error,
    });
  }

  const searchDirs = dirs ?? fontDirs({ env });
  const gone = [];
  const attempt = (fresh) => {
    const { candidates, searched, age } = scan(searchDirs, wasm, fresh);
    const usable = candidates.filter(
      (c) => !exclude.includes(c.origin) && !gone.includes(c.origin),
    );
    const status = wasm.chooseFont(usable, target, FALLBACK_NAME);
    status.searched = searched;
    return { status, age };
  };
  let { status, age } = attempt(false);
  // A remembered "not found" goes stale: the user installs the font and asks again.
  if (!status.found && age > NOT_FOUND_TTL_MS) ({ status } = attempt(true));
  let data;
  // A chosen file can have gone away since the scan (the font was uninstalled): note it,
  // skip it and scan again, a couple of times at most.
  for (let tries = 0; status.found && !data; tries++) {
    try {
      data = readFileSync(status.using);
    } catch (e) {
      const origin = status.using;
      gone.push(origin);
      rejected.push({
        origin,
        reason: `cannot be read: ${e.code ?? e.message}`,
      });
      status =
        tries < 2
          ? attempt(true).status
          : wasm.chooseFont([], target, FALLBACK_NAME);
    }
  }
  if (rejected.length) {
    status.rejected = [...rejected, ...status.rejected];
    status.help =
      rejected.map((r) => `Found ${r.origin} but it ${r.reason}.`).join(" ") +
      " " +
      status.help;
  }
  if (status.found && data) {
    return { explicit: false, fonts: [{ data, origin: status.using }], status };
  }
  return {
    explicit: false,
    fonts: [
      {
        data: readFileSync(FALLBACK_FILE),
        origin: FALLBACK_NAME,
        fallback: true,
      },
    ],
    status,
  };
}
