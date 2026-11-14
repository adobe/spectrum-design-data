// Copyright 2026 Adobe. All rights reserved.
// This file is licensed to you under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may obtain a copy
// of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software distributed under
// the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
// OF ANY KIND, either express or implied. See the License for the specific language
// governing permissions and limitations under the License.

import { readFileSync } from "node:fs";
import test from "ava";
import {
  Dataset,
  chooseFont,
  describeFont,
} from "../pkg/node/design_data_wasm.js";

const font = new URL(
  "../../core/src/raster/fonts/SourceSans3VF-Upright.ttf",
  import.meta.url,
);
const fontBytes = () => new Uint8Array(readFileSync(font));

const request = (component = "badge", label = "Label") => ({
  component,
  size: "m",
  states: [],
  options: {},
  mode: { colorScheme: "light", scale: "desktop" },
  label,
});

/** width and height from the IHDR chunk */
const size = (png) => {
  const v = new DataView(png.buffer, png.byteOffset);
  return [v.getUint32(16), v.getUint32(20)];
};

const isPng = (png) =>
  [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every(
    (b, i) => png[i] === b,
  );

test("renderComponentPng returns a PNG at the requested pixel ratio", (t) => {
  const ds = Dataset.embedded();
  try {
    const fonts = [{ data: fontBytes(), origin: "test.ttf" }];
    const one = ds.renderComponentPng(request(), fonts, { pixelRatio: 1 });
    const three = ds.renderComponentPng(request(), fonts, { pixelRatio: 3 });
    t.true(one.png instanceof Uint8Array && isPng(one.png));
    t.deepEqual(one.diagnostics, []);
    const [w1, h1] = size(one.png);
    const [w3, h3] = size(three.png);
    t.true(w1 > 20 && h1 > 10);
    t.true(Math.abs(w3 - 3 * w1) <= 3 && h3 === 3 * h1);
  } finally {
    ds.free();
  }
});

test("renderComponentPng draws text from the font and reports bars without one", (t) => {
  const ds = Dataset.embedded();
  try {
    const bars = ds.renderComponentPng(request(), [], { pixelRatio: 1 });
    t.true(bars.diagnostics.some((d) => d.includes("placeholder bars")));
    const drawn = ds.renderComponentPng(
      request(),
      [{ data: fontBytes(), origin: "test.ttf" }],
      { pixelRatio: 1 },
    );
    t.false(drawn.diagnostics.some((d) => d.includes("placeholder bars")));
    t.notDeepEqual(Array.from(bars.png), Array.from(drawn.png));
  } finally {
    ds.free();
  }
});

test("a chosen font sets the layout widths, a fallback does not", (t) => {
  const ds = Dataset.embedded();
  try {
    const wide = request("badge", "A much longer label than usual");
    const width = (fonts) =>
      size(ds.renderComponentPng(wide, fonts, { pixelRatio: 1 }).png)[0];
    const bytes = fontBytes();
    const chosen = width([{ data: bytes, origin: "mine.ttf" }]);
    const fallback = width([
      { data: bytes, origin: "bundled", fallback: true },
    ]);
    t.not(chosen, fallback);
    t.true(Math.abs(chosen - fallback) / fallback < 0.1);
  } finally {
    ds.free();
  }
});

test("renderComponentPng rejects bad input with a message", (t) => {
  const ds = Dataset.embedded();
  try {
    t.throws(() => ds.renderComponentPng(request("zzz-no-recipe"), [], {}), {
      message: /no visual recipe/,
    });
    t.throws(
      () =>
        ds.renderComponentPng(request(), [{ data: "nope", origin: "x" }], {}),
      { message: /Uint8Array/ },
    );
    const cff = new Uint8Array([
      0x4f, 0x54, 0x54, 0x4f, 0, 0, 0, 0, 0, 0, 0, 0,
    ]);
    t.throws(
      () =>
        ds.renderComponentPng(request(), [{ data: cff, origin: "a.otf" }], {}),
      { message: /a\.otf.*CFF/ },
    );
    t.throws(() => ds.renderComponentPng(request(), [], { pixelRatio: 0 }), {
      message: /scale must be positive/,
    });
  } finally {
    ds.free();
  }
});

// A name table with one Windows record for each of family (1) and subfamily (2).
const nameTable = (family, sub) => {
  const u16 = (s) => Buffer.from(s, "utf16le").swap16();
  const [f, s] = [u16(family), u16(sub)];
  const head = Buffer.alloc(6 + 24);
  head.writeUInt16BE(0, 0);
  head.writeUInt16BE(2, 2);
  head.writeUInt16BE(30, 4);
  [
    [1, 0, f.length],
    [2, f.length, s.length],
  ].forEach(([id, off, len], i) => {
    [3, 1, 0x409, id, len, off].forEach((v, k) =>
      head.writeUInt16BE(v, 6 + 12 * i + 2 * k),
    );
  });
  return new Uint8Array(Buffer.concat([head, f, s]));
};

test("describeFont reads a name table", (t) => {
  const info = describeFont(
    nameTable("Adobe Clean Spectrum VF", "Italic"),
    true,
    false,
  );
  t.deepEqual(info, {
    flavor: "cff",
    family: "Adobe Clean Spectrum VF",
    subfamily: "Italic",
    variable: false,
  });
  t.is(describeFont(new Uint8Array([1, 2, 3]), false, true).family, null);
});

test("chooseFont picks the variable Roman TrueType file and explains the rest", (t) => {
  const c = (
    origin,
    flavor,
    subfamily,
    variable,
    family = "Adobe Clean Spectrum VF",
  ) => ({
    origin,
    flavor,
    family,
    subfamily,
    variable,
  });
  const found = chooseFont(
    [
      c("a.otf", "cff", "Regular", true),
      c("b.ttf", "truetype", "Italic", true),
      c("c.ttf", "truetype", "Regular", true),
      c("d.ttf", "truetype", "Bold", false, "Adobe Clean"),
    ],
    undefined,
    "bundled",
  );
  t.true(found.found);
  t.is(found.using, "c.ttf");
  t.is(found.fallback, false);
  t.deepEqual(found.related, ["Adobe Clean"]);
  t.is(found.rejected.length, 2);

  const none = chooseFont(
    [c("only.otf", "cff", "Regular", true)],
    undefined,
    "bundled Source Sans 3",
  );
  t.false(none.found);
  t.true(none.fallback);
  t.is(none.using, "bundled Source Sans 3");
  t.regex(
    none.help,
    /Found only\.otf but it is the PostScript-outline \(CFF\) version/,
  );
  t.regex(none.help, /inside\.corp\.adobe\.com/);
  t.regex(none.help, /DESIGN_DATA_FONT/);
  t.throws(() => chooseFont("not an array", undefined, undefined));
});
