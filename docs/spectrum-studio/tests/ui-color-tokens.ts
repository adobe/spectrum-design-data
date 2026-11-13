// Copyright 2026 Adobe. All rights reserved.
// Keeps interface text colors on React Spectrum S2 styles, so text follows the
// light/dark color scheme. Set text color with style() (for example
// `color: "neutral-subdued"`), or for selector-based CSS, define an S2 custom
// property with style() and read it with var(). Preview areas that show
// authored design data are listed in the allowlist with a reason.
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = join(import.meta.dirname, "..", "src");

const fixedColor =
  /--spectrum-|light-dark\(|contrast-color\(|#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|lab|lch|color-mix)\(/i;
const namedColor =
  /^(?:black|white|gr[ae]y|red|green|blue|yellow|orange|purple)(?:\s*!important)?$/i;

interface Allowed {
  file: string;
  /** Omit to allow every fixed color in a file that is entirely a preview. */
  value?: string;
  reason: string;
}

const preview =
  "Preview area that shows authored design data; review separately.";
const pairedBackground =
  "White text on a fixed colored background; move text and background to S2 together.";

const allowlist: Allowed[] = [
  { file: "views/SampleApp.tsx", reason: preview },
  {
    file: "components/value-preview/ValuePreview.css",
    value: "var(--spectrum-gray-800)",
    reason: preview,
  },
  {
    file: "views/color-system/ColorEvaluation.css",
    value: "contrast-color(var(--sw))",
    reason: `${preview} Text contrasts with each swatch color.`,
  },
  {
    file: "views/radius/RadiusElements.css",
    value: "var(--spectrum-gray-900)",
    reason: preview,
  },
  {
    file: "views/spacing/SpacingElements.css",
    value: "var(--elements-preview-foreground, light-dark(black, white))",
    reason: preview,
  },
  {
    file: "views/typography/TypographyElements.css",
    value: "var(--elements-preview-foreground, light-dark(black, white))",
    reason: preview,
  },
  {
    file: "views/structures/StructurePreview.css",
    value: "#222",
    reason: preview,
  },
  {
    file: "views/structures/StructureThumbnail.css",
    value: "var(--spectrum-fuchsia-800)",
    reason: preview,
  },
  {
    file: "views/structures/StructureDesignView.css",
    value: "var(--spectrum-fuchsia-800)",
    reason: preview,
  },
  {
    file: "views/structures/StructureDesignView.css",
    value: "white",
    reason: pairedBackground,
  },
  {
    file: "panels/tokens/TokenValueField.tsx",
    value: "rgba(0, 0, 0, 0.2)",
    reason:
      "Default color of a new shadow layer (token data), not a text style.",
  },
];

function textColorValues(source: string, kind: "css" | "ts"): string[] {
  if (kind === "css") {
    const css = source.replace(/\/\*[\s\S]*?\*\//g, "");
    return [...css.matchAll(/(?:^|[\s;{])color\s*:\s*([^;}]+)/g)]
      .map((match) => match[1].trim())
      .filter((value) => fixedColor.test(value) || namedColor.test(value));
  }
  return [...source.matchAll(/\bcolor\s*:\s*(["'`])([^"'`]*)\1/g)]
    .map((match) => match[2].trim())
    .filter((value) => fixedColor.test(value));
}

// The scanner must catch fixed colors and leave S2 and inherited colors alone.
assert.deepEqual(
  textColorValues(
    `.a { color: var(--spectrum-gray-700); } .b{color:#222} .c { color: light-dark(black, white) }
     .d { color: white } .e { background-color: red; border-color: #000 } .f { --x-color: red }
     .g { color: var(--code-keyword) } .h { color: inherit } /* color: red */`,
    "css",
  ),
  ["var(--spectrum-gray-700)", "#222", "light-dark(black, white)", "white"],
);
assert.deepEqual(
  textColorValues(
    `style({ color: "white" }); style({ color: "neutral" }); <span style={{ color: "#fff" }} />
     const x = { backgroundColor: "#000", color: \`var(--spectrum-red-900)\` };`,
    "ts",
  ),
  ["#fff", "var(--spectrum-red-900)"],
);

function files(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.(css|ts|tsx)$/.test(name) && !/\.stories\.tsx$/.test(name)
      ? [path]
      : [];
  });
}

const problems: string[] = [];
const used = new Set<Allowed>();
for (const path of files(root)) {
  const file = relative(root, path);
  const kind = file.endsWith(".css") ? "css" : "ts";
  for (const value of textColorValues(readFileSync(path, "utf8"), kind)) {
    const allowed = allowlist.find(
      (entry) =>
        entry.file === file &&
        (entry.value === undefined || entry.value === value),
    );
    if (allowed) used.add(allowed);
    else
      problems.push(
        `${file}: text color "${value}" doesn't follow S2. Use a style() color.`,
      );
  }
}
for (const entry of allowlist)
  if (!used.has(entry))
    problems.push(
      `allowlist entry no longer matches: ${entry.file} "${entry.value ?? "any"}"`,
    );

assert.deepEqual(problems, [], `\n${problems.join("\n")}`);
console.log("ui color tokens: ok");
