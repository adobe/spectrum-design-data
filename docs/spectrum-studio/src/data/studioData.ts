// Copyright 2026 Adobe. All rights reserved.

/**
 * Studio's default data is stored as several JSON files in `data/studio/`.
 * `studio.json` is the table of contents: it keeps small values inline and
 * marks where each larger part belongs with `{ "$file": "<path>" }`, so
 * composing the files rebuilds one dataset with its original key order.
 */
export const STUDIO_DATA_ENTRY = "studio.json";

export interface StudioDataPart {
  /** Location of the value inside the composed dataset. */
  readonly path: readonly string[];
  /** File in `data/studio/` that stores the value. */
  readonly file: string;
}

export const STUDIO_DATA_PARTS: readonly StudioDataPart[] = [
  ...(
    [
      "opacity",
      "color",
      "spacing",
      "size",
      "radius",
      "elevation",
      "typography",
      "icons",
    ] as const
  ).map((foundation) => ({
    path: ["system", "foundations", foundation],
    file: `foundations/${foundation}.json`,
  })),
  {
    path: ["system", "foundationParameterSettings"],
    file: "foundations/parameter-settings.json",
  },
  {
    path: ["system", "componentSizing"],
    file: "foundations/component-sizing.json",
  },
  { path: ["system", "scaleTypes"], file: "formulas/scale-types.json" },
  { path: ["system", "interpolations"], file: "formulas/interpolations.json" },
  { path: ["system", "rules"], file: "rules/rules.json" },
  {
    path: ["system", "taxonomy", "categories"],
    file: "taxonomy/categories.json",
  },
  { path: ["system", "taxonomy", "terms"], file: "taxonomy/terms.json" },
  { path: ["system", "taxonomy", "order"], file: "taxonomy/order.json" },
  { path: ["system", "styles", "recipes"], file: "styles/recipes.json" },
  {
    path: ["system", "styles", "publications"],
    file: "styles/publications.json",
  },
  { path: ["system", "styles", "examples"], file: "styles/examples.json" },
  { path: ["system", "styles", "colorRoles"], file: "styles/color-roles.json" },
  {
    path: ["system", "structures", "structures"],
    file: "structures/structures.json",
  },
  {
    path: ["system", "structures", "publications"],
    file: "structures/publications.json",
  },
  {
    path: ["system", "structures", "examples"],
    file: "structures/examples.json",
  },
  {
    path: ["system", "components", "components"],
    file: "components/components.json",
  },
  { path: ["system", "modeSets"], file: "modes/mode-sets.json" },
  { path: ["system", "platforms"], file: "modes/platforms.json" },
  {
    path: ["system", "browserTokenEdits"],
    file: "tokens/browser-token-edits.json",
  },
  { path: ["system", "aliases"], file: "tokens/aliases.json" },
];

export type StudioDataFiles = Readonly<Record<string, unknown>>;

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord =>
  !!value && typeof value === "object" && !Array.isArray(value);

export function isStudioFileReference(
  value: unknown,
): value is { $file: string } {
  return (
    isRecord(value) &&
    Object.keys(value).length === 1 &&
    typeof value.$file === "string"
  );
}

/** Rebuilds the dataset; every file must be referenced exactly once. */
export function composeStudioData(files: StudioDataFiles): unknown {
  if (!Object.hasOwn(files, STUDIO_DATA_ENTRY))
    throw new Error(`Studio data is missing ${STUDIO_DATA_ENTRY}.`);
  const used = new Set([STUDIO_DATA_ENTRY]);
  const resolve = (value: unknown, location: string): unknown => {
    if (isStudioFileReference(value)) {
      const file = value.$file;
      if (!Object.hasOwn(files, file))
        throw new Error(`${location}: Studio data file ${file} is missing.`);
      if (used.has(file))
        throw new Error(`${location}: ${file} is referenced more than once.`);
      used.add(file);
      return files[file];
    }
    if (Array.isArray(value))
      return value.map((item, index) => resolve(item, `${location}/${index}`));
    if (isRecord(value))
      return Object.fromEntries(
        Object.entries(value).map(([key, child]) => [
          key,
          resolve(child, `${location}/${key}`),
        ]),
      );
    return value;
  };
  const dataset = resolve(files[STUDIO_DATA_ENTRY], STUDIO_DATA_ENTRY);
  const unused = Object.keys(files).filter((file) => !used.has(file));
  if (unused.length)
    throw new Error(
      `Studio data files are not referenced: ${unused.join(", ")}.`,
    );
  return dataset;
}

/** Splits a dataset into `data/studio/` files, keyed by relative path. */
export function splitStudioData(dataset: unknown): Map<string, unknown> {
  const entry = structuredClone(dataset);
  if (!isRecord(entry)) throw new Error("Studio data must be a JSON object.");
  const assertNoReference = (value: unknown, location: string): void => {
    if (isStudioFileReference(value))
      throw new Error(
        `${location}: a stored value has the reserved {"$file": …} shape.`,
      );
    if (Array.isArray(value))
      value.forEach((item, index) =>
        assertNoReference(item, `${location}/${index}`),
      );
    else if (isRecord(value))
      for (const [key, child] of Object.entries(value))
        assertNoReference(child, `${location}/${key}`);
  };
  assertNoReference(entry, "");
  const files = new Map<string, unknown>([[STUDIO_DATA_ENTRY, entry]]);
  for (const { path, file } of STUDIO_DATA_PARTS) {
    const parent = path
      .slice(0, -1)
      .reduce<unknown>(
        (node, key) => (isRecord(node) ? node[key] : undefined),
        entry,
      );
    const key = path.at(-1)!;
    if (!isRecord(parent) || !Object.hasOwn(parent, key)) continue;
    files.set(file, parent[key]);
    parent[key] = { $file: file };
  }
  return files;
}

export function serializeStudioDataFile(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}
