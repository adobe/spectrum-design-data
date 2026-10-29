// Copyright 2026 Adobe. All rights reserved.
import {
  AccordionItem,
  AccordionItemHeader,
  AccordionItemPanel,
  AccordionItemTitle,
  ActionButton,
  Checkbox,
  Content,
  Heading,
  InlineAlert,
  PickerItem,
  Text,
} from "@react-spectrum/s2";
import Add from "@react-spectrum/s2/icons/Add";
import Delete from "@react-spectrum/s2/icons/Delete";
import ArrowUp from "@react-spectrum/s2/icons/ChevronUp";
import ArrowDown from "@react-spectrum/s2/icons/ChevronDown";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { useEffect, useState } from "react";
import { NestedPanelAccordion } from "../../components/NestedPanelAccordion";
import {
  EditableNumberField,
  EditablePicker,
  EditableTextField,
} from "../../components/editable";
import { ModeParameterControl } from "../../components/ModeParameterControl";
import { FOUNDATION_PARAMETERS } from "../../features/modes/parameters";
import type { AuthoringCapability } from "../../features/modes/model";
import {
  ELEVATION_LAYER_MAX,
  type ElevationDocument,
  type ShadowLayer,
} from "../../features/elevation/model";
import {
  ELEVATION_LINEAR_FORMULA_ID,
  ELEVATION_POWER_FORMULA_ID,
} from "../../features/elevation/formulas";
import { useRequestedFieldFocus } from "../../components/fields/useRequestedFieldFocus";

const stack = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
  padding: 16,
  minWidth: 0,
});
const subStack = style({
  display: "flex",
  flexDirection: "column",
  gap: 12,
  padding: 8,
  minWidth: 0,
});
const row = style({
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
});
export interface ElevationEditorProps {
  document: ElevationDocument;
  isReadOnly: boolean;
  owned?: Partial<Record<AuthoringCapability, string>>;
  error?: string;
  duplicates?: boolean;
  focusLayerId?: string | null;
  onLayerFocused?: (id: string) => void;
  onChange: (
    patch: Partial<
      Pick<
        ElevationDocument,
        "below" | "above" | "depth" | "color" | "hideFromPublishing"
      >
    >,
  ) => void;
  onLayerChange: (
    id: string,
    patch: Partial<Omit<ShadowLayer, "id">>,
  ) => string | undefined;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
}
function ShadowFields({
  layer,
  isReadOnly,
  owned,
  onLayerChange,
  focusName,
  onNameFocused,
}: Pick<ElevationEditorProps, "isReadOnly" | "owned" | "onLayerChange"> & {
  layer: ShadowLayer;
  focusName: boolean;
  onNameFocused: () => void;
}) {
  const nameRef = useRequestedFieldFocus(
    focusName && !isReadOnly,
    onNameFocused,
  );
  const [label, setLabel] = useState(layer.label);
  const [error, setError] = useState<string>();
  useEffect(() => {
    setLabel(layer.label);
    setError(undefined);
  }, [layer.label, isReadOnly]);
  const commit = () => {
    if (label === layer.label) return;
    setError(onLayerChange(layer.id, { label: label.trim() }));
  };
  return (
    <div className={subStack}>
      <EditableTextField
        label="Shadow name"
        isReadOnly={isReadOnly}
        value={label}
        onChange={setLabel}
        ref={nameRef}
        onBlur={commit}
        isInvalid={!!error}
        errorMessage={error}
        onKeyDown={(event) => {
          if (event.key === "Enter") commit();
          if (event.key === "Escape") {
            setLabel(layer.label);
            setError(undefined);
          }
        }}
      />
      <EditablePicker
        label="Formula"
        isReadOnly={isReadOnly}
        selectedKey={layer.scaleTypeId}
        displayValue={
          layer.scaleTypeId === ELEVATION_POWER_FORMULA_ID ? "Power" : "Linear"
        }
        onSelectionChange={(key) => {
          if (key != null)
            onLayerChange(layer.id, { scaleTypeId: String(key) });
        }}
      >
        <PickerItem id={ELEVATION_POWER_FORMULA_ID}>Power</PickerItem>
        <PickerItem id={ELEVATION_LINEAR_FORMULA_ID}>Linear</PickerItem>
      </EditablePicker>
      <EditableNumberField
        label="Base blur (px)"
        isReadOnly={isReadOnly}
        value={layer.base}
        minValue={0}
        onChange={(base) => onLayerChange(layer.id, { base })}
      />
      <EditableNumberField
        label={
          layer.scaleTypeId === ELEVATION_POWER_FORMULA_ID
            ? "Scale (ratio)"
            : "Scale (px increment)"
        }
        isReadOnly={isReadOnly}
        value={layer.scale}
        minValue={layer.scaleTypeId === ELEVATION_POWER_FORMULA_ID ? 1 : 0}
        step={layer.scaleTypeId === ELEVATION_POWER_FORMULA_ID ? 0.1 : 1}
        onChange={(scale) => onLayerChange(layer.id, { scale })}
      />
      {!owned?.["elevation.layerOpacities"] && (
        <EditableNumberField
          label="Opacity (%)"
          isReadOnly={isReadOnly}
          value={layer.opacity}
          minValue={0}
          maxValue={100}
          onChange={(opacity) => onLayerChange(layer.id, { opacity })}
        />
      )}
    </div>
  );
}
export function ElevationEditor({
  document,
  isReadOnly,
  owned = {},
  error,
  duplicates,
  focusLayerId,
  onLayerFocused,
  onChange,
  onLayerChange,
  onAdd,
  onRemove,
  onMove,
}: ElevationEditorProps) {
  return (
    <div className={stack} data-component="ElevationEditor">
      {error && (
        <InlineAlert variant="negative">
          <Heading>Could not update Elevation</Heading>
          <Content>{error}</Content>
        </InlineAlert>
      )}
      {duplicates && (
        <InlineAlert variant="informative">
          <Heading>Identical shadow values</Heading>
          <Content>
            Some complete levels have the same shadow. Constant layers are
            allowed.
          </Content>
        </InlineAlert>
      )}
      <EditableNumberField
        label="Smaller sizes"
        isReadOnly={isReadOnly}
        value={document.below}
        minValue={0}
        maxValue={9}
        onChange={(below) => onChange({ below })}
      />
      <EditableNumberField
        label="Larger sizes"
        isReadOnly={isReadOnly}
        value={document.above}
        minValue={0}
        maxValue={40}
        onChange={(above) => onChange({ above })}
      />
      {!owned["elevation.depth"] && (
        <EditableNumberField
          label="Depth (%)"
          isReadOnly={isReadOnly}
          value={document.depth}
          minValue={0}
          maxValue={200}
          onChange={(depth) => onChange({ depth })}
        />
      )}
      {!owned["elevation.color"] &&
        (isReadOnly ? (
          <Text>Shadow color: {document.color}</Text>
        ) : (
          <ModeParameterControl
            parameter={
              FOUNDATION_PARAMETERS.find(
                (parameter) => parameter.id === "elevation.color",
              )!
            }
            documents={{ elevation: document }}
            value={document.color}
            onChange={(color) => onChange({ color: String(color) })}
          />
        ))}
      <div className={row}>
        <Heading level={3}>Shadows</Heading>
        {!isReadOnly && (
          <ActionButton
            size="S"
            isDisabled={document.layers.length >= ELEVATION_LAYER_MAX}
            onPress={onAdd}
          >
            <Add />
            <Text>Add shadow</Text>
          </ActionButton>
        )}
      </div>
      {!document.layers.length && (
        <Text>No shadows. Add a shadow to create an elevation scale.</Text>
      )}
      {document.layers.map((layer, index) => (
        <NestedPanelAccordion key={layer.id} defaultExpandedKeys={[layer.id]}>
          <AccordionItem id={layer.id}>
            <AccordionItemHeader>
              <AccordionItemTitle>{layer.label}</AccordionItemTitle>
              {!isReadOnly && (
                <>
                  <ActionButton
                    size="S"
                    isQuiet
                    aria-label={`Move ${layer.label} up`}
                    isDisabled={index === 0}
                    onPress={() => onMove(layer.id, -1)}
                  >
                    <ArrowUp />
                  </ActionButton>
                  <ActionButton
                    size="S"
                    isQuiet
                    aria-label={`Move ${layer.label} down`}
                    isDisabled={index === document.layers.length - 1}
                    onPress={() => onMove(layer.id, 1)}
                  >
                    <ArrowDown />
                  </ActionButton>
                  <ActionButton
                    size="S"
                    isQuiet
                    aria-label={`Delete ${layer.label}`}
                    onPress={() => onRemove(layer.id)}
                  >
                    <Delete />
                  </ActionButton>
                </>
              )}
            </AccordionItemHeader>
            <AccordionItemPanel>
              <ShadowFields
                layer={layer}
                isReadOnly={isReadOnly}
                owned={owned}
                onLayerChange={onLayerChange}
                focusName={focusLayerId === layer.id}
                onNameFocused={() => onLayerFocused?.(layer.id)}
              />
            </AccordionItemPanel>
          </AccordionItem>
        </NestedPanelAccordion>
      ))}
      <Checkbox
        isSelected={document.hideFromPublishing ?? false}
        isDisabled={isReadOnly}
        onChange={(hideFromPublishing) => onChange({ hideFromPublishing })}
      >
        Hide from publishing
      </Checkbox>
    </div>
  );
}
