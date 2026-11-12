// Copyright 2026 Adobe. All rights reserved.
import { canonicalJson } from "./canonicalJson";
import type { AnalysisRecord } from "./comparison";

const object = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export function referenceRecords(
  source: string,
  data: unknown,
  modeKeys: readonly string[] = [
    "colorScheme",
    "contrast",
    "scale",
    "platform",
  ],
  onInvalid?: (message: string) => void,
): AnalysisRecord[] {
  const category = source.includes("/") ? source.split("/")[0] : "dataset";
  const entries = Array.isArray(data)
    ? data
    : object(data) && Array.isArray(data.values)
      ? data.values
      : [data];
  return entries.flatMap((entry: unknown, index): AnalysisRecord[] => {
    if (!object(entry)) {
      const message = `${source}/${index}: expected an object record`;
      if (!onInvalid) throw new Error(message);
      onInvalid(message);
      return [];
    }
    const pointer = Array.isArray(data)
      ? `/${index}`
      : object(data) && Array.isArray(data.values)
        ? `/values/${index}`
        : "";
    const identity =
      typeof entry.uuid === "string"
        ? entry.uuid
        : typeof entry.id === "string"
          ? entry.id
          : undefined;
    const dimension =
      object(entry.value) && typeof entry.value.unit === "string"
        ? entry.value
        : undefined;
    return [
      {
        id: `${source}#${identity ?? pointer}`,
        category,
        name:
          typeof entry.name === "string"
            ? entry.name
            : canonicalJson(entry.name ?? entry.id ?? source),
        source,
        pointer,
        classification: "authored",
        ...(typeof entry.$schema === "string" && { schema: entry.$schema }),
        ...(object(entry.lifecycle) && {
          lifecycle: {
            ...(typeof entry.lifecycle.introduced === "string" && {
              introduced: entry.lifecycle.introduced,
            }),
            ...(typeof entry.lifecycle.deprecatedIn === "string" && {
              deprecatedIn: entry.lifecycle.deprecatedIn,
            }),
            ...(typeof entry.lifecycle.deprecatedComment === "string" && {
              deprecatedComment: entry.lifecycle.deprecatedComment,
            }),
            ...((typeof entry.lifecycle.replacedBy === "string" ||
              (Array.isArray(entry.lifecycle.replacedBy) &&
                entry.lifecycle.replacedBy.every(
                  (id: unknown) => typeof id === "string",
                ))) && {
              replacedBy: entry.lifecycle.replacedBy as string | string[],
            }),
          },
        }),
        ...(object(entry.name) && { structuredName: entry.name }),
        ...(identity && { identity }),
        ...(typeof entry.conceptId === "string" && {
          conceptId: entry.conceptId,
        }),
        ...(category === "registry" &&
          object(data) &&
          typeof data.type === "string" && { vocabulary: data.type }),
        value:
          category === "tokens" ? (dimension?.value ?? entry.value) : entry,
        ...(dimension && { unit: dimension.unit as string }),
        ...(typeof entry.$ref === "string" && { reference: entry.$ref }),
        ...(object(entry.name) && {
          context: Object.fromEntries(
            Object.entries(entry.name).filter(
              ([key, value]) =>
                modeKeys.includes(key) &&
                (typeof value === "string" ||
                  (Array.isArray(value) &&
                    value.every(
                      (member: unknown) => typeof member === "string",
                    ))),
            ),
          ) as Record<string, string | string[]>,
        }),
      },
    ];
  });
}
