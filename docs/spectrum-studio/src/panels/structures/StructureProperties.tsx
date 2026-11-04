// Copyright 2026 Adobe. All rights reserved.
import {
  Accordion,
  AccordionItem,
  AccordionItemHeader,
  AccordionItemPanel,
  AccordionItemTitle,
  ActionButton,
  Button,
  ButtonGroup,
  DialogTrigger,
  Heading,
  Menu,
  MenuItem,
  MenuTrigger,
  PickerItem,
  Popover,
  Switch,
  Text,
  TextField,
  Tooltip,
  TooltipTrigger,
} from "@react-spectrum/s2";
import Add from "@react-spectrum/s2/icons/Add";
import More from "@react-spectrum/s2/icons/More";
import Checkmark from "@react-spectrum/s2/icons/Checkmark";
import Close from "@react-spectrum/s2/icons/Close";
import AlertTriangle from "@react-spectrum/s2/icons/AlertTriangle";
import {
  useEffect,
  useRef,
  useState,
  type ComponentRef,
  type ReactNode,
} from "react";
import { Dialog } from "react-aria-components";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import { Picker } from "../../components/fields/Picker";
import { popoverDialogStyles } from "../../components/popoverLayout";
import {
  createBooleanProperty,
  createLocalVariantProperty,
  type BooleanProperty,
  type VariantProperty,
} from "../../features/option-groups/model";
import type { TaxonomyDocument } from "../../features/taxonomy/model";
import {
  duplicateVariantOption,
  makeVariantOptionDefault,
  removeBooleanProperty,
  removeVariantOption,
  renameVariantOption,
  renameVariantProperty,
  variantNameTermRequest,
} from "../../features/structures/variantOperations";
import type {
  StructureEditorData,
  StructurePreviewState,
} from "../../features/structures/variants";

const nameTextStyles = style({ textAlign: "start", truncate: true });
const nameFieldStyles = style({ flexGrow: 1, minWidth: 0, width: "full" });
const termHeadingStyles = style({ font: "heading-xs", margin: 0 });
const termBodyStyles = style({ font: "body-sm" });
const termActionsStyles = style({ alignSelf: "end" });

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
  const { editor, preview, isReadOnly, onChange, onPreview, report } = props;
  const [setup, setSetup] = useState<"variant" | "option" | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editingProperty, setEditingProperty] = useState<string | null>(null);
  const active = editor.properties.find(
    (item): item is VariantProperty =>
      item.kind === "variant" && item.id === preview.activePropertyId,
  );
  const [handledRequest, setHandledRequest] = useState(
    props.addOptionRequest ?? 0,
  );
  if ((props.addOptionRequest ?? 0) !== handledRequest) {
    setHandledRequest(props.addOptionRequest ?? 0);
    setSetup(active ? "option" : "variant");
  }
  const change = (next: StructureEditorData, taxonomy?: TaxonomyDocument) => {
    try {
      onChange(next, taxonomy);
      return true;
    } catch (error) {
      report(error);
      return false;
    }
  };
  const select = (property: VariantProperty, id: string) =>
    onPreview({
      activePropertyId: property.id,
      options: { ...preview.options, [property.id]: id },
    });
  const addProperty = (kind: "boolean" | "variant") => {
    let number = 1;
    const label = kind === "boolean" ? "Boolean" : "Variant";
    while (
      editor.properties.some(
        (property) =>
          property.name.toLowerCase() === `${label} ${number}`.toLowerCase(),
      )
    )
      number++;
    const property =
      kind === "boolean"
        ? createBooleanProperty(`${label} ${number}`)
        : createLocalVariantProperty(`${label} ${number}`);
    if (!change({ ...editor, properties: [...editor.properties, property] }))
      return;
    setSetup(null);
    if (property.kind === "variant") {
      select(property, property.defaultOptionId);
      setEditingProperty(property.id);
    } else setEditing(property.id);
  };
  return (
    <Accordion size="M" density="spacious" defaultExpandedKeys={["properties"]}>
      <AccordionItem id="properties">
        <AccordionItemHeader>
          <AccordionItemTitle>{props.label ?? "Properties"}</AccordionItemTitle>
          {!isReadOnly && (
            <MenuTrigger>
              <ActionButton size="M" isQuiet aria-label="Add property">
                <Add />
              </ActionButton>
              <Menu
                onAction={(key) =>
                  addProperty(key === "boolean" ? "boolean" : "variant")
                }
              >
                <MenuItem id="boolean">Boolean</MenuItem>
                <MenuItem id="variant">Variant</MenuItem>
              </Menu>
            </MenuTrigger>
          )}
        </AccordionItemHeader>
        <AccordionItemPanel>
          <div className="structureEditorFields">
            {props.showIndentationLevel && (
              <Picker
                size="M"
                label="Indentation level"
                selectedKey={String(preview.indentationLevel)}
                onSelectionChange={(key) => {
                  if (key === "0") onPreview({ indentationLevel: 0 });
                  else if (key === "1") onPreview({ indentationLevel: 1 });
                  else if (key === "2") onPreview({ indentationLevel: 2 });
                }}
              >
                <PickerItem id="0">0</PickerItem>
                <PickerItem id="1">1</PickerItem>
                <PickerItem id="2">2</PickerItem>
              </Picker>
            )}
            <div className="structurePropertyRows">
              {editor.properties.map((property) => {
                const selected =
                  property.kind === "variant"
                    ? property.options.find(
                        (item) =>
                          item.id ===
                          (preview.options[property.id] ??
                            property.defaultOptionId),
                      )
                    : undefined;
                const unused =
                  property.kind === "boolean" &&
                  ![
                    ...Object.values(editor.visibilityBindings),
                    ...Object.values(editor.layouts ?? {}).flatMap(
                      (configuration) =>
                        Object.values(configuration.visibilityBindings ?? {}),
                    ),
                  ].some((binding) => binding.propertyId === property.id);
                const deletingDefault =
                  property.kind === "variant" &&
                  selected?.id === property.defaultOptionId;
                const editingName =
                  editing === property.id || editingProperty === property.id;
                return (
                  <StructurePropertyRow
                    key={property.id}
                    name={property.name}
                    isReadOnly={isReadOnly}
                    onEditName={() => {
                      if (property.kind === "variant")
                        setEditingProperty(property.id);
                      else setEditing(property.id);
                    }}
                    nameEditor={
                      editing === property.id && property.kind === "boolean" ? (
                        <BooleanNameEditor
                          property={property}
                          onCancel={() => setEditing(null)}
                          onCommit={(name) => {
                            if (
                              change({
                                ...editor,
                                properties: editor.properties.map((item) =>
                                  item.id === property.id
                                    ? { ...item, name }
                                    : item,
                                ),
                              })
                            )
                              setEditing(null);
                          }}
                        />
                      ) : property.kind === "variant" &&
                        editingProperty === property.id ? (
                        <VariantNameEditor
                          key={`property-${property.id}`}
                          editor={editor}
                          propertyId={property.id}
                          taxonomy={props.taxonomy}
                          onCancel={() => setEditingProperty(null)}
                          onCommit={(next, taxonomy) => {
                            if (change(next, taxonomy))
                              setEditingProperty(null);
                          }}
                        />
                      ) : editing === property.id &&
                        property.kind === "variant" &&
                        selected ? (
                        <VariantNameEditor
                          key={selected.id}
                          editor={editor}
                          propertyId={property.id}
                          optionId={selected.id}
                          taxonomy={props.taxonomy}
                          onCancel={() => setEditing(null)}
                          onCommit={(next, taxonomy) => {
                            if (change(next, taxonomy)) setEditing(null);
                          }}
                        />
                      ) : null
                    }
                  >
                    {property.kind === "variant" && !editingName && (
                      <Picker
                        size="M"
                        UNSAFE_className="structureVariantPicker"
                        aria-label={`${property.name} option`}
                        selectedKey={selected?.id ?? property.defaultOptionId}
                        onSelectionChange={(key) => {
                          if (key !== null) select(property, String(key));
                        }}
                      >
                        {property.options.map((option) => (
                          <PickerItem key={option.id} id={option.id}>
                            {option.name}
                          </PickerItem>
                        ))}
                      </Picker>
                    )}
                    {property.kind === "boolean" && !editingName && (
                      <Switch
                        size="M"
                        aria-label={property.name}
                        isSelected={
                          preview.booleans[property.id] ?? property.defaultValue
                        }
                        onChange={(value) =>
                          onPreview({
                            booleans: {
                              ...preview.booleans,
                              [property.id]: value,
                            },
                          })
                        }
                      />
                    )}
                    {unused && !editingName && (
                      <TooltipTrigger>
                        <ActionButton
                          size="M"
                          isQuiet
                          aria-label="boolean option not used"
                        >
                          <AlertTriangle />
                        </ActionButton>
                        <Tooltip>boolean option not used</Tooltip>
                      </TooltipTrigger>
                    )}
                    {!isReadOnly && !editingName && (
                      <MenuTrigger>
                        <ActionButton
                          size="M"
                          isQuiet
                          aria-label={`More actions for ${property.name}`}
                        >
                          <More />
                        </ActionButton>
                        <Menu
                          aria-label={`Actions for ${property.name}`}
                          disabledKeys={deletingDefault ? ["delete"] : []}
                          onAction={(key) => {
                            try {
                              if (
                                key === "add" &&
                                property.kind === "variant"
                              ) {
                                select(
                                  property,
                                  selected?.id ?? property.defaultOptionId,
                                );
                                setSetup("option");
                              } else if (
                                key === "default" &&
                                property.kind === "variant"
                              ) {
                                change(
                                  makeVariantOptionDefault(
                                    editor,
                                    property.id,
                                    selected!.id,
                                  ),
                                );
                              } else if (key === "edit") {
                                setEditing(property.id);
                              } else if (key === "delete" && !deletingDefault) {
                                const next =
                                  property.kind === "boolean"
                                    ? removeBooleanProperty(editor, property.id)
                                    : removeVariantOption(
                                        editor,
                                        property.id,
                                        selected!.id,
                                      );
                                if (change(next) && property.kind === "variant")
                                  select(property, property.defaultOptionId);
                              }
                            } catch (error) {
                              report(error);
                            }
                          }}
                        >
                          {property.kind === "variant" && (
                            <MenuItem id="add">Add option</MenuItem>
                          )}
                          {property.kind === "variant" &&
                            !Object.keys(property.classification).length &&
                            !deletingDefault && (
                              <MenuItem id="default">Set as default</MenuItem>
                            )}
                          <MenuItem
                            id="edit"
                            aria-label={`Edit ${property.kind === "variant" ? (selected?.name ?? property.name) : property.name}`}
                          >
                            {property.kind === "variant"
                              ? "Edit option"
                              : "Edit"}
                          </MenuItem>
                          <MenuItem
                            id="delete"
                            aria-label={
                              property.kind === "variant"
                                ? `Delete option ${selected?.name ?? ""}`
                                : `Delete ${property.name}`
                            }
                          >
                            {property.kind === "variant"
                              ? "Delete option"
                              : "Delete"}
                          </MenuItem>
                        </Menu>
                      </MenuTrigger>
                    )}
                  </StructurePropertyRow>
                );
              })}
            </div>
            {editor.properties.some(
              (property) =>
                property.kind === "variant" &&
                (!Object.keys(property.classification).length ||
                  property.options.some(
                    (option) => !Object.keys(option.classification).length,
                  )),
            ) && <Text>Options without token naming are preview-only.</Text>}
            {setup && !isReadOnly && (
              <PropertySetup
                key={`${setup}-${active?.id ?? ""}`}
                kind={setup}
                property={active}
                onClose={() => setSetup(null)}
                report={report}
                onSubmit={(name) => {
                  if (setup === "option") {
                    if (!active)
                      throw new Error(
                        "The selected variant is no longer available.",
                      );
                    const option = {
                      id: crypto.randomUUID(),
                      name: name.trim(),
                      classification: {},
                    };
                    const next = duplicateVariantOption(
                      editor,
                      active.id,
                      preview.options[active.id] ?? active.defaultOptionId,
                      option,
                    );
                    if (change(next)) {
                      select(active, option.id);
                      setSetup(null);
                    }
                  } else {
                    const property = createLocalVariantProperty(name);
                    if (
                      change({
                        ...editor,
                        properties: [...editor.properties, property],
                      })
                    ) {
                      select(property, property.defaultOptionId);
                      setSetup(null);
                    }
                  }
                }}
              />
            )}
          </div>
        </AccordionItemPanel>
      </AccordionItem>
    </Accordion>
  );
}

function StructurePropertyRow({
  name,
  isReadOnly,
  onEditName,
  nameEditor,
  children,
}: {
  name: string;
  isReadOnly: boolean;
  onEditName: () => void;
  nameEditor: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="structurePropertyRow">
      {nameEditor ??
        (isReadOnly ? (
          <Text UNSAFE_className={String(nameTextStyles)}>{name}</Text>
        ) : (
          <ActionButton
            size="M"
            isQuiet
            UNSAFE_className="structurePropertyNameButton"
            aria-label={`Edit property ${name}`}
            onPress={onEditName}
          >
            <Text UNSAFE_className={String(nameTextStyles)}>{name}</Text>
          </ActionButton>
        ))}
      {!nameEditor && children}
    </div>
  );
}

function BooleanNameEditor({
  property,
  onCommit,
  onCancel,
}: {
  property: BooleanProperty;
  onCommit: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(property.name);
  const field = useNameEditorFocus();
  return (
    <div className="structureNameEditor">
      <TextField
        size="M"
        ref={field}
        styles={nameFieldStyles}
        aria-label="Boolean name"
        value={name}
        onChange={setName}
        onKeyDown={(event) => {
          if (event.key === "Escape") onCancel();
          if (event.key === "Enter" && name.trim()) onCommit(name.trim());
        }}
      />
      <ActionButton
        size="M"
        isQuiet
        aria-label="Save boolean name"
        isDisabled={!name.trim()}
        onPress={() => onCommit(name.trim())}
      >
        <Checkmark />
      </ActionButton>
      <ActionButton
        size="M"
        isQuiet
        aria-label="Cancel editing boolean name"
        onPress={onCancel}
      >
        <Close />
      </ActionButton>
    </div>
  );
}

function PropertySetup({
  kind,
  property,
  onSubmit,
  onClose,
  report,
}: {
  kind: "variant" | "option";
  property?: VariantProperty;
  onSubmit: (name: string) => void;
  onClose: () => void;
  report: (error: unknown) => void;
}) {
  const [name, setName] = useState("");
  const field = useNameEditorFocus();
  const submit = () => {
    try {
      onSubmit(name.trim());
    } catch (error) {
      report(error);
    }
  };
  return (
    <div
      role="group"
      aria-label={
        kind === "option" ? `Add option to ${property?.name}` : "Add variant"
      }
      className="structureNameEditor"
    >
      <TextField
        ref={field}
        size="M"
        styles={nameFieldStyles}
        label={kind === "option" ? "Option name" : "Variant name"}
        value={name}
        onChange={setName}
        onKeyDown={(event) => {
          if (event.key === "Escape") onClose();
          if (event.key === "Enter" && name.trim()) submit();
        }}
      />
      <ActionButton
        size="M"
        isQuiet
        aria-label="Add"
        isDisabled={!name.trim()}
        onPress={submit}
      >
        <Checkmark />
      </ActionButton>
      <ActionButton
        size="M"
        isQuiet
        aria-label="Cancel adding property option"
        onPress={onClose}
      >
        <Close />
      </ActionButton>
    </div>
  );
}

function VariantNameEditor({
  editor,
  propertyId,
  optionId,
  taxonomy,
  onCommit,
  onCancel,
}: {
  editor: StructureEditorData;
  propertyId: string;
  optionId?: string;
  taxonomy: TaxonomyDocument;
  onCommit: (editor: StructureEditorData, taxonomy: TaxonomyDocument) => void;
  onCancel: () => void;
}) {
  const property = editor.properties.find(
    (item): item is VariantProperty =>
      item.id === propertyId && item.kind === "variant",
  )!;
  const selected = optionId
    ? property.options.find((option) => option.id === optionId)!
    : property;
  const [name, setName] = useState(selected.name);
  const [error, setError] = useState("");
  const [termRequest, setTermRequest] =
    useState<ReturnType<typeof variantNameTermRequest>>(null);
  const field = useNameEditorFocus();
  const label = optionId ? "option name" : "variant name";
  const save = (createTerm = false) => {
    try {
      if (!createTerm) {
        const request = variantNameTermRequest(
          editor,
          propertyId,
          optionId,
          name,
          taxonomy,
        );
        if (request) {
          setTermRequest(request);
          return;
        }
      }
      const next = optionId
        ? renameVariantOption(
            editor,
            propertyId,
            optionId,
            name,
            taxonomy,
            createTerm,
          )
        : renameVariantProperty(editor, propertyId, name, taxonomy, createTerm);
      onCommit(next.editor, next.taxonomy);
      setTermRequest(null);
    } catch (failure) {
      setTermRequest(null);
      setError(failure instanceof Error ? failure.message : String(failure));
    }
  };
  return (
    <div className="structureNameEditor">
      <TextField
        size="M"
        ref={field}
        styles={nameFieldStyles}
        aria-label={optionId ? "Option name" : "Variant name"}
        value={name}
        onChange={(value) => {
          setName(value);
          setError("");
        }}
        isInvalid={!!error}
        errorMessage={error}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onCancel();
          }
          if (event.key === "Enter" && name.trim()) save();
        }}
      />
      <DialogTrigger
        isOpen={termRequest !== null}
        onOpenChange={(open) => {
          if (!open) setTermRequest(null);
        }}
      >
        <ActionButton
          size="M"
          isQuiet
          aria-label={`Save ${label}`}
          isDisabled={!name.trim()}
          onPress={() => save()}
        >
          <Checkmark />
        </ActionButton>
        <Popover size="S">
          <Dialog
            aria-label="Create Registry term"
            className={popoverDialogStyles}
          >
            <div className="structureEditorFields">
              <Heading level={3} styles={termHeadingStyles}>
                Create Registry term
              </Heading>
              <Text UNSAFE_className={String(termBodyStyles)}>
                Add "{termRequest?.name}" to{" "}
                {
                  taxonomy.categories.find(
                    (category) => category.id === termRequest?.categoryId,
                  )?.name
                }{" "}
                and use it for this name.
              </Text>
              <ButtonGroup align="end" styles={termActionsStyles}>
                <Button
                  size="M"
                  variant="secondary"
                  onPress={() => setTermRequest(null)}
                >
                  Cancel
                </Button>
                <Button size="M" variant="primary" onPress={() => save(true)}>
                  Create
                </Button>
              </ButtonGroup>
            </div>
          </Dialog>
        </Popover>
      </DialogTrigger>
      <ActionButton
        size="M"
        isQuiet
        aria-label={`Cancel editing ${label}`}
        onPress={onCancel}
      >
        <Close />
      </ActionButton>
    </div>
  );
}

function useNameEditorFocus() {
  const field = useRef<ComponentRef<typeof TextField>>(null);
  useEffect(() => {
    field.current?.focus();
  }, []);
  return field;
}
