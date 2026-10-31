// Copyright 2026 Adobe. All rights reserved.
import {
  ActionButton,
  Button,
  Checkbox,
  DialogTrigger,
  PickerItem,
  Popover,
  Text,
  TextField,
  Tooltip,
  TooltipTrigger,
  TreeView,
  TreeViewItem,
  TreeViewItemContent,
  Content,
  Heading,
  ButtonGroup,
  Dialog as SpectrumDialog,
} from "@react-spectrum/s2";
import { Dialog, useDragAndDrop } from "react-aria-components";
import Delete from "@react-spectrum/s2/icons/Delete";
import Visibility from "@react-spectrum/s2/icons/Visibility";
import VisibilityOff from "@react-spectrum/s2/icons/VisibilityOff";
import { useState } from "react";
import { PropertyBindingIcon } from "../../assets/svgs/PropertyBindingIcon";
import { CategoryIcon } from "../../components/CategoryIcon";
import { Picker } from "../../components/fields/Picker";
import { popoverDialogStyles } from "../../components/popoverLayout";
import { createBooleanProperty } from "../../features/option-groups/model";
import { isLeaf } from "../../features/structures/children";
import { ELEMENT_TYPES } from "../../features/structures/elements";
import type { Structure } from "../../features/structures/model";
import {
  structureEditor,
  type StructureEditorData,
  type VisibilityBinding,
} from "../../features/structures/variants";
import { reorderLayers } from "../../features/structures/variantOperations";
import { hasCustomElementTargets } from "../../features/structures/elementResolution";

interface StructureLayersProps {
  structure: Structure;
  catalog: readonly Structure[];
  order: readonly string[];
  visibility: Record<string, boolean>;
  selectedId: string | null;
  isReadOnly: boolean;
  onSelect: (id: string | null) => void;
  onChange: (editor: StructureEditorData) => void;
  onOrder: (ids: string[]) => void;
  onVisibility: (id: string, visible: boolean) => void;
  onDelete: (id: string, confirmed?: boolean) => void;
  report: (error: unknown) => void;
}

export function StructureLayers(props: StructureLayersProps) {
  const { structure, order, selectedId, isReadOnly, report } = props;
  const editor = structureEditor(structure);
  const { dragAndDropHooks } = useDragAndDrop({
    isDisabled: isReadOnly,
    getItems: (keys) =>
      [...keys]
        .filter((key) => order.includes(String(key)))
        .map((key) => ({ "text/plain": String(key) })),
    getAllowedDropOperations: () => ["move"],
    onReorder: (event) => {
      try {
        if (event.target.dropPosition === "on")
          throw new Error("Layers can be reordered, but not nested.");
        props.onOrder(
          reorderLayers(
            order,
            new Set([...event.keys].map(String)),
            String(event.target.key),
            event.target.dropPosition,
          ),
        );
      } catch (error) {
        report(error);
      }
    },
  });
  return (
    <TreeView
      aria-label="Structure layers"
      selectionMode="single"
      selectionStyle="highlight"
      selectedKeys={[selectedId ?? "main-structure"]}
      defaultExpandedKeys={["main-structure"]}
      dragAndDropHooks={dragAndDropHooks}
      onSelectionChange={(keys) => {
        if (keys === "all") return;
        const key = [...keys][0];
        props.onSelect(!key || key === "main-structure" ? null : String(key));
      }}
    >
      <TreeViewItem id="main-structure" textValue="Main structure">
        <TreeViewItemContent>
          <CategoryIcon category="structures" />
          <Text>Main structure</Text>
        </TreeViewItemContent>
        {order.map((id) => {
          const child = structure.elements?.find((item) => item.id === id);
          if (!child) return null;
          const label = isLeaf(child)
            ? ELEMENT_TYPES[child.kind].label
            : (props.catalog.find(
                (item) => item.conceptId === child.structureId,
              )?.name ?? "Unavailable structure");
          const visible = props.visibility[id] !== false;
          return (
            <TreeViewItem key={id} id={id} textValue={label}>
              <TreeViewItemContent>
                <CategoryIcon
                  category={
                    isLeaf(child) ? `element.${child.kind}` : "structures"
                  }
                />
                <Text>{label}</Text>
                {!isReadOnly && (
                  <div slot="actions" className="structureLayerActions">
                    <span className="structureVisibilityAction">
                      <ActionButton
                        size="S"
                        isQuiet
                        aria-label={`${visible ? "Hide" : "Show"} ${label}`}
                        onPress={() => props.onVisibility(id, !visible)}
                      >
                        {visible ? <VisibilityOff /> : <Visibility />}
                      </ActionButton>
                    </span>
                    <BooleanBindingButton
                      binding={editor.visibilityBindings[id]}
                      editor={editor}
                      onChange={(next) => props.onChange(next)}
                      layerId={id}
                      report={report}
                    />
                    <DeleteLayerButton
                      label={label}
                      needsConfirmation={hasCustomElementTargets(structure, id)}
                      onDelete={(confirmed) => props.onDelete(id, confirmed)}
                    />
                  </div>
                )}
              </TreeViewItemContent>
            </TreeViewItem>
          );
        })}
      </TreeViewItem>
    </TreeView>
  );
}

function DeleteLayerButton({
  label,
  needsConfirmation,
  onDelete,
}: {
  label: string;
  needsConfirmation: boolean;
  onDelete: (confirmed: boolean) => void;
}) {
  const trigger = (
    <ActionButton
      size="S"
      isQuiet
      aria-label={`Delete ${label}`}
      onPress={needsConfirmation ? undefined : () => onDelete(false)}
    >
      <Delete />
    </ActionButton>
  );
  if (!needsConfirmation) return trigger;
  return (
    <DialogTrigger>
      {trigger}
      <SpectrumDialog size="S">
        {({ close }) => (
          <>
            <Heading slot="title">Delete this element</Heading>
            <Content>
              Its Custom element-preview targets will also be removed.
              Layout-token targets stay unchanged. Undo restores the element and
              its selections.
            </Content>
            <ButtonGroup>
              <Button size="S" variant="secondary" onPress={close}>
                Cancel
              </Button>
              <Button
                size="S"
                variant="negative"
                onPress={() => {
                  onDelete(true);
                  close();
                }}
              >
                Delete
              </Button>
            </ButtonGroup>
          </>
        )}
      </SpectrumDialog>
    </DialogTrigger>
  );
}

function BooleanBindingButton({
  binding,
  editor,
  layerId,
  onChange,
  report,
}: {
  binding?: VisibilityBinding;
  editor: StructureEditorData;
  layerId: string;
  onChange: (editor: StructureEditorData) => void;
  report: (error: unknown) => void;
}) {
  const [name, setName] = useState("");
  const bind = (next: VisibilityBinding | null) => {
    try {
      const bindings = { ...editor.visibilityBindings };
      if (next) bindings[layerId] = next;
      else delete bindings[layerId];
      const after = { ...editor, visibilityBindings: bindings };
      onChange(after);
      return after;
    } catch (error) {
      report(error);
      return null;
    }
  };
  return (
    <TooltipTrigger>
      <DialogTrigger>
        <ActionButton
          size="S"
          isQuiet
          aria-label="Bind to a show/hide option"
          UNSAFE_className={binding ? "structureBoundProperty" : undefined}
        >
          <PropertyBindingIcon />
        </ActionButton>
        <Popover padding="none">
          <Dialog
            aria-label="Bind layer visibility"
            className={popoverDialogStyles}
          >
            <Picker
              size="S"
              label="Boolean property"
              selectedKey={binding?.propertyId ?? null}
              onSelectionChange={(key) => {
                if (key !== null)
                  bind({
                    propertyId: String(key),
                    inverted: binding?.inverted ?? false,
                  });
              }}
            >
              {editor.properties
                .filter((item) => item.kind === "boolean")
                .map((property) => (
                  <PickerItem key={property.id} id={property.id}>
                    {property.name}
                  </PickerItem>
                ))}
            </Picker>
            <Checkbox
              size="S"
              isDisabled={!binding}
              isSelected={binding?.inverted ?? false}
              onChange={(inverted) => {
                if (binding) bind({ ...binding, inverted });
              }}
            >
              Invert visibility
            </Checkbox>
            <TextField
              size="S"
              label="New boolean name"
              value={name}
              onChange={setName}
            />
            <Button
              size="S"
              variant="secondary"
              isDisabled={!name.trim()}
              onPress={() => {
                try {
                  const property = createBooleanProperty(name);
                  onChange({
                    ...editor,
                    properties: [...editor.properties, property],
                    visibilityBindings: {
                      ...editor.visibilityBindings,
                      [layerId]: { propertyId: property.id, inverted: false },
                    },
                  });
                  setName("");
                } catch (error) {
                  report(error);
                }
              }}
            >
              Create and bind
            </Button>
            {binding && (
              <Button
                size="S"
                variant="secondary"
                onPress={() => {
                  bind(null);
                }}
              >
                Unbind
              </Button>
            )}
          </Dialog>
        </Popover>
      </DialogTrigger>
      <Tooltip>Bind to a show/hide option</Tooltip>
    </TooltipTrigger>
  );
}
