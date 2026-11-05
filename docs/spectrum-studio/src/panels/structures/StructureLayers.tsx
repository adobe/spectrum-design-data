// Copyright 2026 Adobe. All rights reserved.
import {
  ActionButton,
  ActionButtonGroup,
  IconContext,
  type IconContextValue,
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
import { Dialog, useContextProps, useDragAndDrop } from "react-aria-components";
import Delete from "@react-spectrum/s2/icons/Delete";
import Visibility from "@react-spectrum/s2/icons/Visibility";
import VisibilityOff from "@react-spectrum/s2/icons/VisibilityOff";
import { useEffect, useRef, useState } from "react";
import { PropertyBindingIcon } from "../../assets/svgs/PropertyBindingIcon";
import { CategoryIcon } from "../../components/CategoryIcon";
import { Picker } from "../../components/fields/Picker";
import { popoverDialogStyles } from "../../components/popoverLayout";
import { createBooleanProperty } from "../../features/option-groups/model";
import { isLeaf } from "../../features/structures/children";
import { elementLabel } from "../../features/structures/elements";
import type { Structure } from "../../features/structures/model";
import {
  structureEditor,
  type StructureEditorData,
  type VisibilityBinding,
} from "../../features/structures/variants";
import {
  activeVariant,
  reorderLayers,
  updateOptionOverrides,
} from "../../features/structures/variantOperations";
import { hasCustomElementTargets } from "../../features/structures/elementResolution";
import {
  structureLayers,
  structureLayerPreview,
  findStructureLayer,
  type StructureLayer,
} from "../../features/structures/layers";
import { useAtomValue, useSetAtom, useStore } from "jotai";
import { structurePreviewsAtom } from "../../features/structures/documentState";
import { updateStructureEditorAtom } from "../../features/structures/variantState";
import {
  editElementsAtom,
  removeElementAtom,
  restoreElementAtom,
} from "../../features/structures/elementState";
import { useNotify } from "../../components/notifications/notificationContext";
import { withLayoutConfiguration } from "../../features/structures/configuration";
import "./StructureEditorPanel.css";

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
  const previews = useAtomValue(structurePreviewsAtom);
  const updateEditor = useSetAtom(updateStructureEditorAtom);
  const editElements = useSetAtom(editElementsAtom);
  const notify = useNotify();
  const store = useStore();
  const layers = structureLayers(structure, props.catalog, previews);
  const rootEditor = structureEditor(structure);
  const rootPreview = structureLayerPreview(structure, previews);
  const rootVariant = activeVariant(
    structure,
    rootPreview.activePropertyId,
    rootPreview.options,
  );
  const expandedLayouts = (items: readonly StructureLayer[]): string[] =>
    items.flatMap((layer) =>
      layer.layout ? [layer.key, ...expandedLayouts(layer.children)] : [],
    );
  const [expanded, setExpanded] = useState(
    new Set(["main-structure", ...expandedLayouts(layers)]),
  );
  useEffect(() => {
    if (!selectedId) return;
    const path = selectedId.split("/").filter(Boolean);
    setExpanded(
      (current) =>
        new Set([
          ...current,
          "main-structure",
          ...path
            .slice(0, -1)
            .map((_, index) =>
              index === 0 ? path[0] : `/${path.slice(0, index + 1).join("/")}`,
            ),
        ]),
    );
  }, [selectedId]);
  const renderLayer = (layer: StructureLayer) => {
    const child = layer.child;
    const owner = layer.owner;
    const id = child.id;
    const isRootChild = owner.conceptId === structure.conceptId;
    const ownerEditor = structureEditor(owner);
    const ownerPath = layer.path.slice(0, layer.path.lastIndexOf("/"));
    const configuration = rootEditor.layouts?.[ownerPath];
    const ownerPreview = structureLayerPreview(owner, previews);
    const active = activeVariant(
      owner,
      ownerPreview.activePropertyId,
      ownerPreview.options,
    );
    const visible = layer.configuration.visibility[id] !== false;
    const change = (editor: StructureEditorData) => {
      if (isRootChild) props.onChange(editor);
      else updateEditor({ structureId: owner.conceptId, editor });
    };
    const bindingEditor = isRootChild
      ? ownerEditor
      : {
          ...ownerEditor,
          properties: [...rootEditor.properties, ...ownerEditor.properties],
          visibilityBindings: {
            ...ownerEditor.visibilityBindings,
            ...configuration?.visibilityBindings,
          },
        };
    const changeBinding = (editor: StructureEditorData) => {
      if (isRootChild) return change(editor);
      const binding = editor.visibilityBindings[id];
      const newProperty = editor.properties.find(
        (property) =>
          !bindingEditor.properties.some((item) => item.id === property.id),
      );
      const parentBinding =
        !!binding &&
        (rootEditor.properties.some(
          (property) => property.id === binding.propertyId,
        ) ||
          newProperty?.id === binding.propertyId);
      const localBindings = { ...ownerEditor.visibilityBindings };
      const parentBindings = { ...configuration?.visibilityBindings };
      delete localBindings[id];
      delete parentBindings[id];
      if (binding) {
        if (parentBinding) parentBindings[id] = binding;
        else localBindings[id] = binding;
      }
      const localEditor = { ...ownerEditor, visibilityBindings: localBindings };
      if (!configuration && !parentBinding) return change(localEditor);
      updateEditor({
        structureId: structure.conceptId,
        editor: withLayoutConfiguration(
          {
            ...rootEditor,
            properties: newProperty
              ? [...rootEditor.properties, newProperty]
              : rootEditor.properties,
          },
          ownerPath,
          { ...configuration, visibilityBindings: parentBindings },
        ),
        relatedEditors: [{ structureId: owner.conceptId, editor: localEditor }],
      });
    };
    const label = isLeaf(child)
      ? elementLabel(child)
      : (props.catalog.find((item) => item.conceptId === child.structureId)
          ?.name ?? "Unavailable structure");
    return (
      <TreeViewItem key={layer.key} id={layer.key} textValue={label}>
        <TreeViewItemContent>
          <StructureLayerIcon
            category={
              isLeaf(layer.child) ? `element.${layer.child.kind}` : "structures"
            }
          />
          <Text>
            <span title={label}>{label}</span>
          </Text>
          {!isReadOnly && (
            <ActionButtonGroup
              size="M"
              isQuiet
              UNSAFE_className="structureLayerActions"
              aria-label={`${label} layer actions`}
            >
              <ActionButton
                UNSAFE_className="structureVisibilityAction"
                aria-label={`${visible ? "Hide" : "Show"} ${label}`}
                onPress={() => {
                  if (isRootChild) props.onVisibility(id, !visible);
                  else {
                    try {
                      if (rootVariant.option && !rootVariant.isDefault) {
                        const override =
                          configuration?.overrides?.[rootVariant.option.id];
                        updateEditor({
                          structureId: structure.conceptId,
                          editor: withLayoutConfiguration(
                            rootEditor,
                            ownerPath,
                            {
                              ...configuration,
                              overrides: {
                                ...configuration?.overrides,
                                [rootVariant.option.id]: {
                                  ...override,
                                  visibility: {
                                    ...override?.visibility,
                                    [id]: !visible,
                                  },
                                },
                              },
                            },
                          ),
                        });
                        return;
                      }
                      const override =
                        active.option && !active.isDefault
                          ? (ownerEditor.overrides[active.option.id] ?? {})
                          : null;
                      change(
                        override && active.option
                          ? updateOptionOverrides(
                              ownerEditor,
                              active.option.id,
                              {
                                ...override,
                                visibility: {
                                  ...override.visibility,
                                  [id]: !visible,
                                },
                              },
                            )
                          : {
                              ...ownerEditor,
                              visibility: {
                                ...ownerEditor.visibility,
                                [id]: !visible,
                              },
                            },
                      );
                    } catch (error) {
                      report(error);
                    }
                  }
                }}
              >
                {visible ? <VisibilityOff /> : <Visibility />}
              </ActionButton>
              <BooleanBindingButton
                binding={bindingEditor.visibilityBindings[id]}
                editor={bindingEditor}
                onChange={changeBinding}
                layerId={id}
                report={report}
              />
              <DeleteLayerButton
                label={label}
                needsConfirmation={hasCustomElementTargets(owner, id)}
                onDelete={(confirmed) => {
                  if (isRootChild && !layer.layout)
                    props.onDelete(id, confirmed);
                  else
                    notify.remove({
                      kind: layer.layout ? "structure" : "structureElement",
                      noun: layer.layout ? "Layout" : undefined,
                      run: (store) =>
                        store.set(removeElementAtom, {
                          structureId: owner.conceptId,
                          elementId: id,
                          selectionId: layer.key,
                          confirmed: true,
                        }),
                      undo: (removed) => store.set(restoreElementAtom, removed),
                      confirmed,
                    });
                }}
              />
            </ActionButtonGroup>
          )}
        </TreeViewItemContent>
        {layer.children.map(renderLayer)}
      </TreeViewItem>
    );
  };
  const { dragAndDropHooks } = useDragAndDrop({
    isDisabled: isReadOnly,
    getItems: (keys) =>
      [...keys]
        .filter((key) => !!findStructureLayer(layers, String(key)))
        .map((key) => ({ "text/plain": String(key) })),
    getAllowedDropOperations: () => ["move"],
    onReorder: (event) => {
      try {
        const target = findStructureLayer(layers, String(event.target.key));
        if (
          event.target.dropPosition === "on" ||
          !target ||
          [...event.keys].some((key) => {
            const moving = findStructureLayer(layers, String(key));
            return (
              !moving ||
              moving.path.slice(0, moving.path.lastIndexOf("/")) !==
                target.path.slice(0, target.path.lastIndexOf("/"))
            );
          })
        )
          throw new Error("Layers can be reordered, but not nested.");
        const owner = target.owner;
        const ownerPreview = structureLayerPreview(owner, previews);
        const nextOrder = reorderLayers(
          owner.conceptId === structure.conceptId
            ? order
            : target.configuration.order,
          new Set(
            [...event.keys].map(
              (key) => findStructureLayer(layers, String(key))!.child.id,
            ),
          ),
          target.child.id,
          event.target.dropPosition,
        );
        if (owner.conceptId === structure.conceptId) props.onOrder(nextOrder);
        else {
          if (rootVariant.option && !rootVariant.isDefault) {
            const path = target.path.slice(0, target.path.lastIndexOf("/"));
            const configuration = rootEditor.layouts?.[path];
            updateEditor({
              structureId: structure.conceptId,
              editor: withLayoutConfiguration(rootEditor, path, {
                ...configuration,
                overrides: {
                  ...configuration?.overrides,
                  [rootVariant.option.id]: {
                    ...configuration?.overrides?.[rootVariant.option.id],
                    order: nextOrder,
                  },
                },
              }),
            });
            return;
          }
          const active = activeVariant(
            owner,
            ownerPreview.activePropertyId,
            ownerPreview.options,
          );
          const editor = structureEditor(owner);
          if (active.option && !active.isDefault)
            updateEditor({
              structureId: owner.conceptId,
              editor: updateOptionOverrides(editor, active.option.id, {
                ...editor.overrides[active.option.id],
                order: nextOrder,
              }),
            });
          else
            editElements({
              structureId: owner.conceptId,
              elements: nextOrder.map((id) => {
                const child = owner.elements?.find((item) => item.id === id);
                if (!child)
                  throw new Error("The reordered layer is unavailable.");
                return child;
              }),
            });
        }
      } catch (error) {
        report(error);
      }
    },
  });
  return (
    <div className="structureLayersTree">
      <TreeView
        aria-label="Structure layers"
        selectionMode="single"
        selectionStyle="highlight"
        selectedKeys={[selectedId ?? "main-structure"]}
        expandedKeys={expanded}
        onExpandedChange={(keys) => setExpanded(new Set([...keys].map(String)))}
        dragAndDropHooks={dragAndDropHooks}
        onSelectionChange={(keys) => {
          if (keys === "all") return;
          const key = [...keys][0];
          props.onSelect(!key || key === "main-structure" ? null : String(key));
        }}
      >
        <TreeViewItem id="main-structure" textValue="Main structure">
          <TreeViewItemContent>
            <StructureLayerIcon category="structures" />
            <Text>Main structure</Text>
          </TreeViewItemContent>
          {order.flatMap((id) => {
            const layer = layers.find((item) => item.child.id === id);
            return layer ? [renderLayer(layer)] : [];
          })}
        </TreeViewItem>
      </TreeView>
    </div>
  );
}

function StructureLayerIcon({ category }: { category: string }) {
  const iconProps: IconContextValue = { slot: "icon" };
  const [props] = useContextProps(
    iconProps,
    useRef<SVGElement>(null),
    IconContext,
  );
  // Lazy-loaded icons may have a separate S2 context. Use the tree's icon slot.
  const icon = (
    <IconContext.Provider value={null}>
      <CategoryIcon category={category} />
    </IconContext.Provider>
  );
  return props.render ? props.render(icon) : icon;
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
      size="M"
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
      <SpectrumDialog size="M">
        {({ close }) => (
          <>
            <Heading slot="title">Delete this element</Heading>
            <Content>
              Its Custom element-preview targets will also be removed.
              Layout-token targets stay unchanged. Undo restores the element and
              its selections.
            </Content>
            <ButtonGroup>
              <Button size="M" variant="secondary" onPress={close}>
                Cancel
              </Button>
              <Button
                size="M"
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
          size="M"
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
