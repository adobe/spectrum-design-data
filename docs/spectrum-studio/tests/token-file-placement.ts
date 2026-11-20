// Copyright 2026 Adobe. All rights reserved.
import assert from "node:assert/strict";
import {
  placeTokens,
  tokenFilePath,
  tokenLookup,
  tokenSubject,
  tokenTypeName,
  type PlacementToken,
  type TokenTier,
} from "../src/features/design-data/tokenFilePlacement";

const type = (name: string) =>
  `https://opensource.adobe.com/spectrum-design-data/schemas/token-types/${name}.json`;
const token = (
  uuid: string,
  extra: Partial<PlacementToken> = {},
): PlacementToken => ({ uuid, $schema: type("dimension"), ...extra });

assert.equal(tokenTypeName(type("font-size")), "font-size");
assert.equal(tokenTypeName("not-a-schema"), undefined);

// Subjects come from the value type an alias finally resolves to.
const gray = token("gray", { $schema: type("color") });
const background = token("background", {
  $schema: type("alias"),
  $ref: "gray",
});
const surface = token("surface", {
  $schema: type("alias"),
  $ref: "background",
});
const byUuid = new Map([gray, background, surface].map((t) => [t.uuid, t]));
assert.equal(tokenSubject(surface, byUuid), "color");
assert.equal(
  tokenSubject(token("weight", { $schema: type("font-weight") }), byUuid),
  "typography",
);
assert.equal(
  tokenSubject(token("dangling", { $ref: "missing" }), byUuid),
  "other",
);
const loopA = token("a", { $ref: "b" });
const loopB = token("b", { $ref: "a" });
assert.equal(
  tokenSubject(
    loopA,
    new Map([
      ["a", loopA],
      ["b", loopB],
    ]),
  ),
  "other",
);

// An alias may point at a concept ID instead of a row's own ID.
const blueDesktop = token("blue-desktop", {
  $schema: type("color"),
  conceptId: "blue",
});
const accent = token("accent", { $schema: type("alias"), $ref: "blue" });
const conceptLookup = tokenLookup([blueDesktop, accent]);
assert.equal(conceptLookup.get("blue"), blueDesktop);
assert.equal(tokenSubject(accent, conceptLookup), "color");
assert.equal(
  placeTokens([blueDesktop, accent], (row) =>
    row.uuid === "accent" ? "semantic" : "primitive",
  ).placements.get("accent")?.file,
  "semantic/color.tokens.json",
);

// File names by tier.
assert.equal(
  tokenFilePath({ tier: "primitive", subject: "color" }),
  "primitives/color.tokens.json",
);
assert.equal(
  tokenFilePath({ tier: "semantic", subject: "layout" }),
  "semantic/layout.tokens.json",
);
assert.equal(
  tokenFilePath({ tier: "component", subject: "layout", component: "tabs" }),
  "components/tabs.tokens.json",
);
assert.equal(
  tokenFilePath({ tier: "component", subject: "other" }),
  "components/unassigned.tokens.json",
);
assert.throws(
  () =>
    tokenFilePath({
      tier: "component",
      subject: "layout",
      component: "../escape",
    }),
  /cannot be used as a file name/,
);

// One concept stays in one file: its highest tier wins, even when only one
// mode row is an alias, and rows keep their input order inside each file.
const rows: PlacementToken[] = [
  token("desktop", { conceptId: "padding" }),
  gray,
  token("mobile", { conceptId: "padding", $schema: type("alias"), $ref: "x" }),
  token("x"),
  token("button-radius", {
    conceptId: "radius",
    name: { component: "button", property: "corner-radius" },
  }),
  background,
];
const tiers: Record<string, TokenTier> = {
  desktop: "primitive",
  mobile: "semantic",
  gray: "primitive",
  x: "primitive",
  "button-radius": "component",
  background: "semantic",
};
const { files, placements } = placeTokens(rows, (row) => tiers[row.uuid]);
assert.deepEqual(
  Object.fromEntries(
    [...files].map(([file, list]) => [file, list.map((row) => row.uuid)]),
  ),
  {
    "semantic/layout.tokens.json": ["desktop", "mobile"],
    "primitives/color.tokens.json": ["gray"],
    "primitives/layout.tokens.json": ["x"],
    "components/button.tokens.json": ["button-radius"],
    "semantic/color.tokens.json": ["background"],
  },
);
assert.deepEqual(placements.get("mobile"), {
  tier: "semantic",
  subject: "layout",
  file: "semantic/layout.tokens.json",
});
assert.equal(placements.get("button-radius")?.component, "button");

// Without an official tier the rule refuses to guess.
assert.throws(
  () => placeTokens([token("unknown")], () => undefined),
  /no official tier/,
);

console.log("Token file placement follows tier, subject and concept rules.");
