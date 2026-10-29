// Copyright 2026 Adobe. All rights reserved.
import { isComponentsDocument } from "../components/validation";
import { upgradeColorOutputSnapshot } from "./colorOutputUpgrade";
import { isSnapshot, type EditSessionSnapshot } from "./state";

const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export function upgradeComponentOrderSnapshot(
  input: unknown,
  version: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13,
): EditSessionSnapshot {
  if (!object(input))
    throw new Error("Stored component authoring data could not be upgraded.");
  const next = structuredClone(input);
  const document = next.components;
  if (
    object(document) &&
    document.schemaVersion === 1 &&
    Array.isArray(document.components)
  ) {
    const components = document.components.map((record: unknown) => {
      if (
        !object(record) ||
        "optionOrder" in record ||
        !object(record.declaration) ||
        !object(record.identities) ||
        !object(record.identities.options) ||
        (record.declaration.options !== undefined &&
          !object(record.declaration.options))
      ) {
        throw new Error(
          "Stored component option identities could not be upgraded.",
        );
      }
      return {
        ...record,
        optionOrder: Object.keys(record.declaration.options ?? {}).map(
          (name) =>
            object(record.identities) && object(record.identities.options)
              ? record.identities.options[name]
              : undefined,
        ),
      };
    });
    const upgraded = { ...document, schemaVersion: 2, components };
    if (!isComponentsDocument(upgraded))
      throw new Error("Stored component option ordering is invalid.");
    next.components = upgraded;
  }
  if (version !== 13) return upgradeColorOutputSnapshot(next, version);
  if (!isSnapshot(next) || !next)
    throw new Error("Stored component ordering could not be restored.");
  return next;
}
