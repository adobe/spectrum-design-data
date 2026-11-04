// Copyright 2026 Adobe. All rights reserved.
import { Content, Heading, InlineAlert, PickerItem } from "@react-spectrum/s2";
import { useEffect, useState } from "react";
import { Panel } from "../../components/Panel";
import { EditableTextField } from "../../components/editable";
import { Picker } from "../../components/fields/Picker";
import { IconSamplePicker } from "../../components/fields/IconSamplePicker";
import type { SpectrumIconName } from "../../features/icons/spectrumIconCatalog.generated";
import {
  ELEMENT_SLOT_LABELS,
  ELEMENT_TYPES,
  UI_GLYPHS,
  elementReferenceAllowed,
  elementSlots,
  type ElementSlot,
  type StructureElement,
} from "../../features/structures/elements";
import type { StructureNumberLiteral } from "../../features/structures/model";
import { STRUCTURE_TERM_IDS } from "../../features/structures/vocabulary";
import type { PrimitiveReference } from "../../features/tokens/primitiveReferences";
import {
  StructureAppearanceControls,
  type AppearanceField,
} from "./StructureAppearanceControls";
import "./StructureEditorPanel.css";

export interface StructureElementEditorPanelProps {
  element: StructureElement;
  references: readonly PrimitiveReference[];
  isReadOnly: boolean;
  report: (failure: unknown) => void;
  onChange: (changes: {
    slot?: ElementSlot;
    referenceId?: string | null;
    value?: StructureNumberLiteral;
    glyph?: string;
    orientation?: string;
    name?: string;
  }) => void;
  embedded?: boolean;
}
export function StructureElementEditorPanel({
  element,
  references,
  isReadOnly,
  report,
  onChange,
  embedded = false,
}: StructureElementEditorPanelProps) {
  const [error, setError] = useState("");
  const [slotName, setSlotName] = useState(element.name ?? "");
  useEffect(() => setSlotName(element.name ?? ""), [element.id, element.name]);
  const commit = (action: () => void) => {
    try {
      action();
      setError("");
    } catch (failure) {
      const message =
        failure instanceof Error ? failure.message : String(failure);
      setError(message);
      report(failure);
    }
  };
  const fields: Partial<Record<ElementSlot, AppearanceField>> = {};
  for (const slot of elementSlots(element.kind)) {
    const binding = element.bindings.find((item) => item.slot === slot);
    const reference =
      binding && "$ref" in binding
        ? references.find((item) => item.id === binding.$ref)
        : undefined;
    fields[slot] = {
      label: ELEMENT_SLOT_LABELS[slot],
      options: references
        .filter((reference) => elementReferenceAllowed(slot, reference))
        .map((reference) => ({
          id: reference.id,
          kind: "token",
          name: reference.name,
          displayValue: reference.displayValue,
          hidden: reference.hidden,
          error: reference.error,
        })),
      selectedKey: binding?.$ref ?? null,
      customValue: {
        displayValue: binding?.value ? String(binding.value.value) : "",
        unit: binding?.value ? binding.value.unit : (reference?.unit ?? "px"),
      },
    };
  }
  const content = (
    <div className="structureEditorFields">
      {element.kind === "slot" && (
        <EditableTextField
          label="Slot name"
          value={slotName}
          isReadOnly={isReadOnly}
          onChange={setSlotName}
          onBlur={() => {
            if (slotName !== element.name)
              commit(() => onChange({ name: slotName }));
          }}
        />
      )}
      <StructureAppearanceControls
        fields={fields}
        sizingLayout="individual"
        isReadOnly={isReadOnly}
        onChange={(changes) => {
          for (const slot of elementSlots(element.kind)) {
            const value = changes[slot];
            if (value === undefined) continue;
            commit(() =>
              onChange(
                typeof value === "string" || value === null
                  ? { slot, referenceId: value }
                  : { slot, value },
              ),
            );
          }
        }}
      >
        {(element.kind === "workflowIcon" || element.kind === "uiIcon") && (
          <IconSamplePicker
            selectedIcon={element.glyph as SpectrumIconName}
            allowedIcons={element.kind === "uiIcon" ? UI_GLYPHS : undefined}
            isDisabled={isReadOnly}
            isCompact
            onChange={(glyph) => commit(() => onChange({ glyph }))}
          />
        )}
        {element.kind === "bar" && (
          <Picker
            label="Orientation"
            selectedKey={element.orientation}
            isDisabled={isReadOnly}
            onSelectionChange={(key) => {
              if (typeof key === "string")
                commit(() => onChange({ orientation: key }));
            }}
          >
            <PickerItem id={STRUCTURE_TERM_IDS.horizontal}>
              Horizontal
            </PickerItem>
            <PickerItem id={STRUCTURE_TERM_IDS.vertical}>Vertical</PickerItem>
          </Picker>
        )}
      </StructureAppearanceControls>
      {error && (
        <InlineAlert variant="negative">
          <Heading>Check this element</Heading>
          <Content>{error}</Content>
        </InlineAlert>
      )}
    </div>
  );
  return embedded ? (
    content
  ) : (
    <Panel
      label={`${ELEMENT_TYPES[element.kind].label} element settings`}
      className="structureEditorPanel"
    >
      {content}
    </Panel>
  );
}
