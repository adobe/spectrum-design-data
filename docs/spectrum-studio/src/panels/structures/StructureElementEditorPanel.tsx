// Copyright 2026 Adobe. All rights reserved.
import {
  Button,
  ButtonGroup,
  Content,
  Dialog,
  DialogTrigger,
  Heading,
  InlineAlert,
  Picker,
  PickerItem,
  SegmentedControl,
  SegmentedControlItem,
  Text,
  ToastQueue,
} from "@react-spectrum/s2";
import { useState } from "react";
import { Panel } from "../../components/Panel";
import {
  TokenComboBox,
  type TokenDisplayMode,
} from "../../components/fields/TokenComboBox";
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
import { STRUCTURE_TERM_IDS } from "../../features/structures/vocabulary";
import type { PrimitiveReference } from "../../features/tokens/primitiveReferences";
import "./StructureEditorPanel.css";

export interface StructureElementEditorPanelProps {
  element: StructureElement;
  label?: string;
  references: readonly PrimitiveReference[];
  isReadOnly: boolean;
  hasCustomTargets?: boolean;
  onChange: (changes: {
    slot?: ElementSlot;
    referenceId?: string | null;
    glyph?: string;
    orientation?: string;
  }) => void;
  onDelete: () => void;
  onBack: () => void;
}
export function StructureElementEditorPanel({
  element,
  label = ELEMENT_TYPES[element.kind].label,
  references,
  isReadOnly,
  hasCustomTargets,
  onChange,
  onDelete,
  onBack,
}: StructureElementEditorPanelProps) {
  const [displayMode, setDisplayMode] = useState<TokenDisplayMode>("tokens");
  const [error, setError] = useState("");
  const commit = (action: () => void) => {
    try {
      action();
      setError("");
    } catch (failure) {
      const message =
        failure instanceof Error ? failure.message : String(failure);
      setError(message);
      ToastQueue.negative(message);
    }
  };
  const deleteButton = (
    <Button
      variant="negative"
      onPress={hasCustomTargets ? undefined : () => commit(onDelete)}
    >
      Delete element
    </Button>
  );
  return (
    <Panel label={`${label} element settings`} className="structureEditorPanel">
      <div className="structureEditorFields">
        <Button variant="secondary" onPress={onBack}>
          Structure settings
        </Button>
        <Heading>{label}</Heading>
        <Text>
          Unassigned fields use preview samples. Element bindings create no
          tokens or aliases.
        </Text>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            flexGrow: "1",
            gap: "0px",
            width: "100%",
          }}
        >
          <Text>Show as</Text>
          <SegmentedControl
            aria-label="Show element as"
            isJustified
            selectedKey={displayMode}
            onSelectionChange={(key) => {
              if (key === "tokens" || key === "values") setDisplayMode(key);
            }}
          >
            <SegmentedControlItem id="tokens">Tokens</SegmentedControlItem>
            <SegmentedControlItem id="values">Values</SegmentedControlItem>
          </SegmentedControl>
        </div>
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
        {elementSlots(element.kind).map((slot) => (
          <TokenComboBox
            key={`${element.id}/${slot}`}
            label={ELEMENT_SLOT_LABELS[slot]}
            options={references
              .filter((reference) => elementReferenceAllowed(slot, reference))
              .map((reference) => ({
                id: reference.id,
                kind: "token",
                name: reference.name,
                displayValue: reference.displayValue,
                hidden: reference.hidden,
                error: reference.error,
              }))}
            selectedKey={
              element.bindings.find((binding) => binding.slot === slot)?.$ref ??
              null
            }
            displayMode={displayMode}
            isDisabled={isReadOnly}
            onChange={(referenceId) =>
              commit(() => onChange({ slot, referenceId }))
            }
          />
        ))}
        {!isReadOnly &&
          (hasCustomTargets ? (
            <DialogTrigger>
              {deleteButton}
              <Dialog size="S">
                {({ close }) => (
                  <>
                    <Heading slot="title">Delete this element?</Heading>
                    <Content>
                      Its Custom element-preview targets will also be removed.
                      Layout-token targets stay unchanged. Undo restores the
                      element and its selections.
                    </Content>
                    <ButtonGroup>
                      <Button variant="secondary" onPress={close}>
                        Cancel
                      </Button>
                      <Button
                        variant="negative"
                        onPress={() =>
                          commit(() => {
                            onDelete();
                            close();
                          })
                        }
                      >
                        Delete
                      </Button>
                    </ButtonGroup>
                  </>
                )}
              </Dialog>
            </DialogTrigger>
          ) : (
            deleteButton
          ))}
        {error && (
          <InlineAlert variant="negative">
            <Heading>Check this element</Heading>
            <Content>{error}</Content>
          </InlineAlert>
        )}
      </div>
    </Panel>
  );
}
