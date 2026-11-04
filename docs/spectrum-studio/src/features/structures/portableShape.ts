// Copyright 2026 Adobe. All rights reserved.
import Ajv from "ajv";
import schema from "../../data/design-system.schema.json" with { type: "json" };
import type { PortableStructuresDocument } from "./portableModel";

const validate = new Ajv({
  allErrors: true,
  allowUnionTypes: true,
}).compile<PortableStructuresDocument>({
  $ref: "#/definitions/PortableStructuresDocument",
  definitions: schema.definitions,
});

export function isPortableStructuresDocument(
  input: unknown,
): input is PortableStructuresDocument {
  return validate(input);
}
