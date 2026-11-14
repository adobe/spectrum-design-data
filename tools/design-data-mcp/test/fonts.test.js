// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

import test from "ava";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as wasm from "@adobe/design-data-wasm";

import { fontDirs, findFont, resetFontCache } from "../src/fonts.js";

const CORE_FONT = new URL(
  "../../../sdk/core/src/raster/fonts/SourceSans3VF-Upright.ttf",
  import.meta.url,
);
const BUNDLED = new URL(
  "../src/fonts/SourceSans3VF-Upright.ttf",
  import.meta.url,
);
/** The family of the open font used as a stand-in for the Adobe one. */
const TARGET = "SourceSans3VF";

const tmp = () => mkdtempSync(join(tmpdir(), "dd-fonts-"));
const put = (path, data) => {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, data);
};
const copyFont = (to) => {
  mkdirSync(join(to, ".."), { recursive: true });
  copyFileSync(CORE_FONT, to);
};

/** A file that identifies as `family` but has no outlines: enough for discovery. */
function fakeFont(magic, family, sub = "Regular") {
  const u16 = (s) => Buffer.from(s, "utf16le").swap16();
  const [f, s] = [u16(family), u16(sub)];
  const name = Buffer.alloc(30);
  name.writeUInt16BE(0, 0);
  name.writeUInt16BE(2, 2);
  name.writeUInt16BE(30, 4);
  [
    [1, 0, f.length],
    [2, f.length, s.length],
  ].forEach(([id, off, len], i) => {
    [3, 1, 0x409, id, len, off].forEach((v, k) =>
      name.writeUInt16BE(v, 6 + 12 * i + 2 * k),
    );
  });
  const table = Buffer.concat([name, f, s]);
  const head = Buffer.alloc(28);
  Buffer.from(magic, "latin1").copy(head, 0);
  head.writeUInt16BE(1, 4);
  head.write("name", 12, "latin1");
  head.writeUInt32BE(28, 20);
  head.writeUInt32BE(table.length, 24);
  return Buffer.concat([head, table, Buffer.alloc(2048)]);
}

test.beforeEach(() => resetFontCache());

test("the bundled fallback font is the same file the SDK ships", (t) => {
  t.true(readFileSync(BUNDLED).equals(readFileSync(CORE_FONT)));
});

test("font folders per platform", (t) => {
  const mac = fontDirs({ platform: "darwin", home: "/h", env: {} });
  t.is(mac[0], join("/h", "Library/Fonts"));
  t.true(mac.includes("/Library/Fonts"));
  t.true(mac.some((d) => d.endsWith(join("CoreSync", "plugins", "livetype"))));
  t.true(
    fontDirs({ platform: "linux", home: "/h", env: {} }).includes(
      join("/h", ".local/share/fonts"),
    ),
  );
  const win = fontDirs({
    platform: "win32",
    home: "C:/u",
    env: { WINDIR: "C:/Windows", APPDATA: "C:/u/Roaming" },
  });
  t.true(win.includes(join("C:/Windows", "Fonts")));
  t.is(win.length, 2, "folders whose variables are unset are dropped");
});

test("finds a TrueType font by its name table even when it is hidden and named .otf", (t) => {
  const root = tmp();
  const cc = join(root, "livetype");
  copyFont(join(cc, ".r", ".14548.otf"));
  put(join(cc, ".t", ".7180.otf"), fakeFont("OTTO", "Adobe Clean", "Regular"));
  put(join(cc, ".e", ".10887"), Buffer.alloc(4096, 0xb2));
  const { fonts, status } = findFont(wasm, {
    dirs: [cc],
    target: TARGET,
    env: {},
  });
  t.true(status.found);
  t.false(status.fallback);
  t.true(status.using.endsWith(join(".r", ".14548.otf")));
  t.deepEqual(status.related, ["Adobe Clean"]);
  t.deepEqual(status.searched, [cc]);
  t.is(fonts.length, 1);
  t.true(Buffer.from(fonts[0].data).equals(readFileSync(CORE_FONT)));
  t.is(fonts[0].fallback, undefined);
});

test("with no match it uses the bundled font and says how to install the real one", (t) => {
  const root = tmp();
  put(
    join(root, "Fonts", "other.otf"),
    fakeFont("OTTO", "Adobe Clean", "Bold"),
  );
  const { fonts, status } = findFont(wasm, {
    dirs: [join(root, "Fonts"), join(root, "missing")],
    env: {},
  });
  t.false(status.found);
  t.true(status.fallback);
  t.is(status.using, "bundled Source Sans 3");
  t.true(fonts[0].fallback);
  t.is(fonts[0].data.length, readFileSync(BUNDLED).length);
  t.regex(status.help, /Adobe Clean Spectrum VF was not found/);
  t.regex(
    status.help,
    /inside\.corp\.adobe\.com\/content\/inside\/en\/brand-center\/font\.html/,
  );
  t.regex(status.help, /DESIGN_DATA_FONT/);
  t.regex(status.help, /different font/);
  t.deepEqual(status.related, ["Adobe Clean"]);
  t.deepEqual(
    status.searched,
    [join(root, "Fonts")],
    "only folders that exist",
  );
});

test("a CFF or italic file of the right family is reported with the reason", (t) => {
  const root = tmp();
  const dir = join(root, "Fonts");
  put(join(dir, "a.otf"), fakeFont("OTTO", "Adobe Clean Spectrum VF"));
  put(
    join(dir, "b.otf"),
    fakeFont("OTTO", "Adobe Clean Spectrum VF", "Italic"),
  );
  const { status } = findFont(wasm, { dirs: [dir], env: {} });
  t.false(status.found);
  t.is(status.rejected.length, 2);
  t.regex(
    status.help,
    /a\.otf but it is the PostScript-outline \(CFF\) version/,
  );
  t.regex(status.help, /\.ttf/);
});

test("fontPath and DESIGN_DATA_FONT win over the scan and are used as given", (t) => {
  const root = tmp();
  const mine = join(root, "mine", "x.ttf");
  copyFont(mine);
  const viaArg = findFont(wasm, { fontPath: mine, dirs: [], env: {} });
  t.true(viaArg.status.found);
  t.is(viaArg.status.using, mine);
  t.regex(viaArg.status.help, /set with fontPath/);
  const viaEnv = findFont(wasm, { dirs: [], env: { DESIGN_DATA_FONT: mine } });
  t.is(viaEnv.status.using, mine);
  t.regex(viaEnv.status.help, /set with DESIGN_DATA_FONT/);
  // The argument beats the environment.
  const both = findFont(wasm, {
    fontPath: mine,
    dirs: [],
    env: { DESIGN_DATA_FONT: "/elsewhere.ttf" },
  });
  t.is(both.status.using, mine);
});

test("a bad named font is reported and the search carries on", (t) => {
  const root = tmp();
  const notFont = join(root, "notes.txt");
  put(notFont, "just some text, long enough to not be tiny ".repeat(40));
  const missing = findFont(wasm, {
    fontPath: join(root, "nope.ttf"),
    dirs: [],
    env: {},
  });
  t.true(missing.status.fallback);
  t.regex(
    missing.status.help,
    /nope\.ttf but it cannot be read \(set with fontPath\)/,
  );
  const text = findFont(wasm, { dirs: [], env: { DESIGN_DATA_FONT: notFont } });
  t.regex(
    text.status.help,
    /is not a TrueType font \(set with DESIGN_DATA_FONT\)/,
  );
  t.is(text.status.rejected[0].origin, notFont);
  // A folder is not a font either.
  const dir = findFont(wasm, { fontPath: root, dirs: [], env: {} });
  t.regex(dir.status.help, /is not a font file/);
});

test("scans are remembered until the cache is reset", (t) => {
  const root = tmp();
  const dir = join(root, "Fonts");
  mkdirSync(dir, { recursive: true });
  t.false(
    findFont(wasm, { dirs: [dir], target: TARGET, env: {} }).status.found,
  );
  copyFont(join(dir, "late.ttf"));
  t.false(
    findFont(wasm, { dirs: [dir], target: TARGET, env: {} }).status.found,
  );
  resetFontCache();
  t.true(findFont(wasm, { dirs: [dir], target: TARGET, env: {} }).status.found);
});

test("an unset optional field is ignored, whether empty or still a placeholder", (t) => {
  for (const value of [
    "",
    "${user_config.font_file}",
    "  ${user_config.font_file} ",
  ]) {
    const { status } = findFont(wasm, {
      dirs: [],
      env: { DESIGN_DATA_FONT: value },
    });
    t.deepEqual(status.rejected, [], JSON.stringify(value));
    t.true(status.fallback);
    t.notRegex(status.help, /user_config/);
  }
  // A real path still counts, and a bad one is still reported.
  const bad = findFont(wasm, {
    dirs: [],
    env: { DESIGN_DATA_FONT: "/no/such.ttf" },
  });
  t.is(bad.status.rejected.length, 1);
});

test.serial(
  "a remembered 'not found' goes stale and the scan is repeated",
  (t) => {
    const root = tmp();
    const dir = join(root, "Fonts");
    mkdirSync(dir, { recursive: true });
    const opts = { dirs: [dir], target: TARGET, env: {} };
    t.false(findFont(wasm, opts).status.found);
    copyFont(join(dir, "late.ttf"));
    t.false(findFont(wasm, opts).status.found, "still remembered");
    const real = Date.now;
    Date.now = () => real() + 60_000;
    try {
      t.true(
        findFont(wasm, opts).status.found,
        "found after the memory expires",
      );
    } finally {
      Date.now = real;
    }
  },
);

test("a font removed after the scan is reported and the search goes on", (t) => {
  const root = tmp();
  const dir = join(root, "Fonts");
  const first = join(dir, "a.ttf");
  const second = join(dir, "b.ttf");
  copyFont(first);
  copyFont(second);
  const opts = { dirs: [dir], target: TARGET, env: {} };
  t.is(findFont(wasm, opts).status.using, first);
  rmSync(first);
  const { status, fonts } = findFont(wasm, opts);
  t.is(status.using, second, "the next font is used");
  t.true(Buffer.from(fonts[0].data).equals(readFileSync(CORE_FONT)));
  t.is(status.rejected[0].origin, first);
  t.regex(status.rejected[0].reason, /cannot be read: ENOENT/);
  t.regex(status.help, /a\.ttf but it cannot be read/);
  // With nothing left it falls back instead of throwing.
  rmSync(second);
  const none = findFont(wasm, opts);
  t.true(none.status.fallback);
  t.true(none.fonts[0].fallback);
});

test("files to exclude and reasons to report are honoured", (t) => {
  const root = tmp();
  const dir = join(root, "Fonts");
  const only = join(dir, "x.ttf");
  copyFont(only);
  const { status } = findFont(wasm, {
    dirs: [dir],
    target: TARGET,
    env: {},
    exclude: [only],
    skipped: [{ origin: only, reason: "cannot be drawn (broken)" }],
  });
  t.true(status.fallback);
  t.regex(status.help, /x\.ttf but it cannot be drawn \(broken\)\./);
  t.is(status.rejected[0].origin, only);
});
