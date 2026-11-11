// Copyright 2026 Adobe. All rights reserved.
import type { Classification } from "../taxonomy/model";
import type { TaxonomyNameReference } from "../taxonomy/naming";
import type { BooleanProperty } from "../option-groups/model";
import type { StructureInstance } from "./children";
import type { StructureElement } from "./elements";
import type {
  StructureBinding,
  StructureGeneration,
  StructureSelection,
} from "./model";
import type { VariantSemanticIdentities } from "./semanticIdentity";

export type PortableOptionName =
  | { name: string; categoryId?: never; termId?: never }
  | { name?: never; categoryId: string; termId: string };

export interface PortableVariantValue {
  id: string;
  name: PortableOptionName;
  classification: Classification;
}

export interface PortableVariant {
  id: string;
  kind: "variant";
  name: { name: string } | { categoryId: string };
  classification: Classification;
  defaultOptionId: string;
  values: PortableVariantValue[];
}

export type PortableOption = BooleanProperty | PortableVariant;

export interface StructureTarget {
  structureId: string;
  path: string[];
}

export interface StructureCondition {
  optionId: string;
  valueId: string;
}

export type PortableElement = Omit<StructureElement, "glyph">;

export type StructureEffect =
  | { kind: "binding"; bindingId: string; selection: StructureSelection | null }
  | { kind: "size"; bindingId: string; termId: string }
  | { kind: "order"; elementIds: string[] }
  | { kind: "visibility"; elementId: string; visible: boolean }
  | {
      kind: "visibilityBinding";
      elementId: string;
      optionId: string;
      inverted: boolean;
    }
  | {
      kind: "elementFields";
      elementId: string;
      fields: Pick<PortableElement, "bindings"> &
        Partial<Pick<PortableElement, "orientation" | "name" | "textStyle">>;
      unset: ("orientation" | "name" | "textStyle")[];
    };

export interface StructureConfiguration {
  target: StructureTarget;
  when?: StructureCondition;
  effect: StructureEffect;
}

export interface PortableStructure {
  conceptId: string;
  parentStructureId?: string;
  name: TaxonomyNameReference | string;
  description?: string;
  bindings: StructureBinding[];
  elements?: (PortableElement | StructureInstance)[];
  generation?: StructureGeneration;
  options: PortableOption[];
  configuration: StructureConfiguration[];
}

export interface StructurePublication {
  target: StructureTarget;
  identities: VariantSemanticIdentities;
}

export interface StructureExample {
  target: StructureTarget;
  elementId: string;
  when?: StructureCondition;
  glyph: string | null;
}

/**
 * Studio's portable source contract, not an accepted upstream Design Data schema.
 */
export interface PortableStructuresDocument {
  schemaVersion: 1;
  structures: PortableStructure[];
  publications: StructurePublication[];
  examples: StructureExample[];
}
