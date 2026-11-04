// Copyright 2026 Adobe. All rights reserved.
import { isStructuresDocument } from "../structures/model";
import { isTaxonomyDocument } from "../taxonomy/model";
import { isPortableStructuresDocument } from "../structures/portableShape";
import {
  toPortableStructures,
  fromPortableStructures,
} from "../structures/portableConversion";
import { reconcileStructureNames } from "../structures/registeredNames";

const record = (input: unknown): input is Record<string, unknown> =>
  !!input && typeof input === "object" && !Array.isArray(input);

/**
 * One storage representation; current runtime generators use the domain read
 * adapter. Saved and working snapshots are converted independently by the owner.
 */
export function encodeStructureSource(input: unknown): unknown {
  if (!record(input) || input.structures === undefined) return input;
  if (!isTaxonomyDocument(input.taxonomy))
    throw new Error("Structure storage needs an available Registry.");
  if (!isStructuresDocument(input.structures))
    throw new Error("Structure storage needs a valid authoring document.");
  if (
    input.structures.structures.some(
      (structure) => !structure.nameRef && !structure.parentStructureId,
    )
  )
    throw new Error("Structure names must be registered before storage.");
  const converted = toPortableStructures(input.structures, input.taxonomy, {});
  if (converted.status !== "ready")
    throw new Error(converted.issues.map((issue) => issue.message).join(" "));
  return { ...input, structures: converted.value };
}

export function decodeStructureSource(
  input: unknown,
  identities: Map<string, string> = new Map(),
): unknown {
  if (!record(input) || input.structures === undefined) return input;
  if (!isTaxonomyDocument(input.taxonomy))
    throw new Error("Stored Structures need an available Registry.");
  if (isPortableStructuresDocument(input.structures)) {
    const converted = fromPortableStructures(input.structures, input.taxonomy);
    if (converted.status !== "ready")
      throw new Error(converted.issues.map((issue) => issue.message).join(" "));
    return { ...input, structures: converted.value };
  }
  if (!isStructuresDocument(input.structures))
    throw new Error("Stored Structures have an unsupported format.");
  const named = reconcileStructureNames(
    input.taxonomy,
    input.structures,
    input.structures,
    (key) => {
      const id = identities.get(key) ?? crypto.randomUUID();
      identities.set(key, id);
      return id;
    },
  );
  return { ...input, taxonomy: named.taxonomy, structures: named.document };
}
