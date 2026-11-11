// Copyright 2026 Adobe. All rights reserved.
import { DesignProperties } from "../design/DesignProperties";
import type { TaxonomyDocument } from "../../features/taxonomy/model";
import type {
  StructureEditorData,
  StructurePreviewState,
} from "../../features/structures/variants";
import {
  duplicateVariantOption,
  makeVariantOptionDefault,
  removeBooleanProperty,
  removeVariantOption,
} from "../../features/structures/variantOperations";

interface StructurePropertiesProps {
  editor: StructureEditorData;
  taxonomy: TaxonomyDocument;
  preview: StructurePreviewState;
  showIndentationLevel?: boolean;
  isReadOnly: boolean;
  onChange: (editor: StructureEditorData, taxonomy?: TaxonomyDocument) => void;
  onUndo: (before: StructureEditorData, after: StructureEditorData) => void;
  onPreview: (state: Partial<StructurePreviewState>) => void;
  report: (error: unknown) => void;
  addOptionRequest?: number;
  label?: string;
}

export function StructureProperties(props: StructurePropertiesProps) {
  return (
    <DesignProperties
      {...props}
      operations={{
        duplicateVariantOption,
        makeVariantOptionDefault,
        removeBooleanProperty,
        removeVariantOption,
      }}
      isBooleanUsed={(id) =>
        [
          ...Object.values(props.editor.visibilityBindings),
          ...Object.values(props.editor.layouts ?? {}).flatMap(
            (configuration) =>
              Object.values(configuration.visibilityBindings ?? {}),
          ),
        ].some((binding) => binding.propertyId === id)
      }
    />
  );
}
