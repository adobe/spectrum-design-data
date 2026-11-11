// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import dataset from "../src/data/design-system.defaults.json" with { type: "json" };
import canonical from "../../../packages/design-data/tokens/typography.tokens.json" with { type: "json" };
import schema from "../../../packages/design-data-spec/schemas/token-types/font-family.json" with { type: "json" };
import { isTaxonomyDocument } from "../src/features/taxonomy/model";
import { reconcileFontNames } from "../src/features/typography/fontVocabulary";
import {
  fontTokenSources,
  FONT_FAMILY_PATTERN,
  FONT_FAMILY_SCHEMA,
} from "../src/features/typography/fontTokens";
import { isTypographyFont } from "../src/features/typography/model";
import {
  upgradeTypographyFontsDocument,
  upgradeTypographyFontsSnapshot,
} from "../src/features/typography/fontsUpgrade";
import { browserSourcesFromOutputs } from "../src/features/tokens/browserSources";
import { projectBrowserTokens } from "../src/features/tokens/browserModel";
import {
  parseBrowserTokenValue,
  resolveBrowserTokens,
  compatibleTokenTypes,
} from "../src/features/tokens/browserResolution";
import { canonicalTokenRecord } from "../src/features/taxonomy/export";
import { tokenOutputDiagnostics } from "../src/features/tokens/outputMetadata";
import { sourceValuePreview } from "../src/features/tokens/valuePreview";
import type { CanonicalAliasRow } from "../src/features/tokens/aliasTargets";
import {
  readAuthoringRecord,
  writeAuthoringRecord,
  AUTHORING_RECORD_VERSION,
  AUTHORING_STORAGE_KEY,
} from "../src/features/edit-session/storage";
import type { TypographyFont } from "../src/features/typography/model";
import type { TaxonomyDocument } from "../src/features/taxonomy/model";

assert(isTaxonomyDocument(dataset.system.taxonomy));
const named = reconcileFontNames(
  dataset.system.taxonomy,
  dataset.system.foundations.typography.fonts,
);
const sources = browserSourcesFromOutputs([], [], [], [], {
  names: dataset.system.foundations.typography.metricNames,
  registry: named.taxonomy,
  fonts: named.fonts,
});
assert.equal(sources.length, 3);
assert(
  sources.every(
    (source) =>
      source.type === "typography" &&
      source.groupId === "font-family" &&
      source.tier === "primitive" &&
      source.unit === "",
  ),
);
assert(sources.every((source) => source.projection?.issues.length === 0));
assert.equal(FONT_FAMILY_SCHEMA, schema.$id);
assert.equal(
  FONT_FAMILY_PATTERN.source,
  new RegExp(schema.properties.value.pattern).source,
);
const projected = projectBrowserTokens(
  resolveBrowserTokens(sources, {}, "[]"),
  named.taxonomy,
);
const rows: CanonicalAliasRow[] = projected.map((token) => ({
  id: token.id,
  rowId: token.rowId!,
  context: "[]",
  name: token.name,
  token,
}));
assert(projected.every((token) => token.projection?.issues.length === 0));
const overridden = projectBrowserTokens(
  [{ ...projected[0], classificationOverride: {} }],
  named.taxonomy,
)[0];
assert.deepEqual(overridden.projection!.flat, projected[0].projection!.flat);
assert(
  overridden.projection!.issues.some((issue) =>
    issue.includes("classification override"),
  ),
);
const unresolved = fontTokenSources(
  [{ ...named.fonts[0], nameReference: undefined }],
  named.taxonomy,
);
assert(
  projectBrowserTokens(
    resolveBrowserTokens(unresolved, {}, "[]"),
    named.taxonomy,
  )[0].projection!.issues.length > 0,
);
for (const row of rows) {
  const record = canonicalTokenRecord(row, rows);
  assert("value" in record);
  assert.equal(typeof record.value, "string");
  assert.equal(record.$schema, FONT_FAMILY_SCHEMA);
  assert(FONT_FAMILY_PATTERN.test(String(record.value)));
  assert.deepEqual(sourceValuePreview(row.token), {
    kind: "font-family",
    value: row.token.value,
  });
  assert.equal(
    parseBrowserTokenValue(row.token, String(row.token.value)),
    row.token.value,
  );
  if (record.name.family !== "monospace") {
    const expected = canonical.find((token) => token.uuid === record.uuid);
    assert(expected);
    assert.deepEqual(
      record,
      expected,
      "Default font records must exactly match canonical design-data.",
    );
  } else {
    assert.equal(record.value, "Source Code Pro");
    assert.equal(record.uuid, named.fonts[2].uuid);
    assert.equal(record.conceptId, named.fonts[2].conceptId);
  }
}
assert.deepEqual(fontTokenSources(named.fonts, named.taxonomy), sources);
assert.equal(
  compatibleTokenTypes(sources[0], {
    ...sources[0],
    groupId: "font-size",
    unit: "px",
  }),
  false,
);
assert.equal(compatibleTokenTypes(sources[0], sources[1]), true);
assert.throws(() => parseBrowserTokenValue(sources[0], ""), /font family/);
assert.throws(
  () => parseBrowserTokenValue(sources[0], "Example-Family"),
  /font family/,
);
const blank = { ...rows[0], token: { ...rows[0].token, value: "" } };
assert.throws(() => canonicalTokenRecord(blank, [blank]), /before exporting/);
assert.equal(tokenOutputDiagnostics([blank])[0].tokenId, blank.id);
assert.deepEqual(tokenOutputDiagnostics(rows), []);

const edited = reconcileFontNames(named.taxonomy, [
  {
    ...named.fonts[0],
    name: "Display",
    nameReference: undefined,
    fontFamily: "Example Family",
  },
  ...named.fonts.slice(1),
]);
const changed = fontTokenSources(edited.fonts, edited.taxonomy);
assert.equal(changed[0].id, sources[0].id);
assert.equal(changed[0].rowId, sources[0].rowId);
assert.equal(changed[0].projection!.flat.family, "display");
assert.equal(changed[0].value, "Example Family");
assert.deepEqual(changed.slice(1), sources.slice(1));
assert.deepEqual(
  fontTokenSources([...edited.fonts].reverse(), edited.taxonomy).map(
    (font) => font.id,
  ),
  changed.map((font) => font.id).reverse(),
);

const custom = { id: crypto.randomUUID(), name: "Custom", fontFamily: "" };
const legacy = { schemaVersion: 10, fonts: [custom] };
const allocations = new Map<string, string>();
const saved = upgradeTypographyFontsDocument(legacy, allocations);
const working = upgradeTypographyFontsDocument(
  {
    ...legacy,
    fonts: [{ ...custom, fontFamily: "Saved Family" }],
  },
  allocations,
);
assert(
  saved &&
    typeof saved === "object" &&
    "fonts" in saved &&
    Array.isArray(saved.fonts),
);
assert(
  working &&
    typeof working === "object" &&
    "fonts" in working &&
    Array.isArray(working.fonts),
);
assert(isTypographyFont(saved.fonts[0]));
assert(isTypographyFont(working.fonts[0]));
assert.equal(saved.fonts[0].uuid, working.fonts[0].uuid);
assert.equal(saved.fonts[0].conceptId, working.fonts[0].conceptId);
assert.equal(upgradeTypographyFontsDocument(saved), saved);
const restored = upgradeTypographyFontsSnapshot(
  { typography: saved, taxonomy: named.taxonomy },
  allocations,
);
assert(
  restored &&
    typeof restored === "object" &&
    "typography" in restored &&
    "taxonomy" in restored,
);
assert.equal(upgradeTypographyFontsSnapshot(restored), restored);
assert.deepEqual(
  upgradeTypographyFontsDocument({ schemaVersion: 10, fonts: [] }),
  { schemaVersion: 11, fonts: [] },
);

interface FontSnapshot {
  typography: { schemaVersion: 11; fonts: TypographyFont[] };
  taxonomy: TaxonomyDocument;
}
function assertFontSnapshot(value: unknown): asserts value is FontSnapshot {
  assert(
    value &&
      typeof value === "object" &&
      "typography" in value &&
      "taxonomy" in value,
  );
  assert(
    value.typography &&
      typeof value.typography === "object" &&
      "fonts" in value.typography,
  );
  assert(
    Array.isArray(value.typography.fonts) &&
      value.typography.fonts.every(isTypographyFont),
  );
  assert(isTaxonomyDocument(value.taxonomy));
}
const storage = new Map<string, string>();
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    },
  },
});
storage.set(
  AUTHORING_STORAGE_KEY,
  JSON.stringify({
    version: 32,
    working: {
      typography: {
        ...legacy,
        fonts: [{ ...custom, fontFamily: "Working Family" }],
      },
      taxonomy: named.taxonomy,
    },
    saved: { typography: legacy, taxonomy: named.taxonomy },
    attachments: {},
    savedAttachments: {},
    isEditing: true,
  }),
);
const record = readAuthoringRecord(assertFontSnapshot, (value) => value)!;
assert.equal(record.version, AUTHORING_RECORD_VERSION);
assert.equal(
  record.working.typography.fonts[0].uuid,
  record.saved.typography.fonts[0].uuid,
);
assert.equal(
  record.working.typography.fonts[0].conceptId,
  record.saved.typography.fonts[0].conceptId,
);
assert.equal(record.working.typography.fonts[0].fontFamily, "Working Family");
assert.equal(record.saved.typography.fonts[0].fontFamily, "");
assert.deepEqual(
  record.working.typography.fonts[0].nameReference,
  record.saved.typography.fonts[0].nameReference,
);
writeAuthoringRecord(record);
assert.deepEqual(readAuthoringRecord(assertFontSnapshot), record);
Reflect.deleteProperty(globalThis, "window");
console.log(
  "Font-family primitives: exact canonical records, string values, Registry references, previews, stable identities and draft migration passed.",
);
