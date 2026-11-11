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
  type BooleanProperty,
  type VariantOption,
  type OptionProperty,
  type VariantProperty,
} from "../../features/option-groups/model";
import type { TaxonomyDocument } from "../../features/taxonomy/model";
import {
  renameVariantOption,
  renameVariantProperty,
  variantNameTermRequest,
  variantRegistrationRequest,
  registerVariantProperty,
  registeredPropertyNames,
  type PropertiesEditor,
  type VariantNamingScope,
  type VariantRegistryRequest,
} from "../../features/option-groups/naming";
import "./DesignPanels.css";

const nameTextStyles = style({ textAlign: "start", truncate: true });
const nameFieldStyles = style({ flexGrow: 1, minWidth: 0, width: "full" });
const termHeadingStyles = style({ font: "heading-xs", margin: 0 });
const termBodyStyles = style({ font: "body-sm" });
const termActionsStyles = style({ alignSelf: "end" });

export interface DesignPropertyPreview {
  activePropertyId: string | null;
  options: Record<string, string>;
  booleans: Record<string, boolean>;
  indentationLevel: 0 | 1 | 2;
}

export interface DesignPropertyOperations<T extends PropertiesEditor> {
  removeProperty?: (editor: T, propertyId: string) => T;
  duplicateVariantOption: (
    editor: T,
    propertyId: string,
    sourceId: string,
    option: VariantOption,
  ) => T;
  makeVariantOptionDefault: (
    editor: T,
    propertyId: string,
    optionId: string,
  ) => T;
  removeVariantOption: (editor: T, propertyId: string, optionId: string) => T;
  removeBooleanProperty: (editor: T, propertyId: string) => T;
}

export interface DesignPropertiesProps<T extends PropertiesEditor> {
  editor: T;
  taxonomy: TaxonomyDocument;
  preview: DesignPropertyPreview;
  operations: DesignPropertyOperations<T>;
  supportedKinds?: readonly OptionProperty["kind"][];
  isBooleanUsed?: (id: string) => boolean;
  showIndentationLevel?: boolean;
  isReadOnly: boolean;
  onChange: (editor: T, taxonomy?: TaxonomyDocument) => void;
  onPreview: (state: Partial<DesignPropertyPreview>) => void;
  report: (error: unknown) => void;
  addOptionRequest?: number;
  label?: string;
  namingScope?: VariantNamingScope;
}

export function DesignProperties<T extends PropertiesEditor>(
  props: DesignPropertiesProps<T>,
) {
  const { preview, isReadOnly, onChange, onPreview, report } = props;
  const namingScope = props.namingScope ?? "structures";
  const editor = registeredPropertyNames(props.editor, props.taxonomy);
  const {
    duplicateVariantOption,
    makeVariantOptionDefault,
    removeBooleanProperty,
    removeVariantOption,
  } = props.operations;
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
  const change = (next: T, taxonomy?: TaxonomyDocument) => {
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
    if (kind === "variant") {
      setSetup("variant");
      return;
    }
    let number = 1;
    const label = "Boolean";
    while (
      editor.properties.some(
        (property) =>
          property.name.toLowerCase() === `${label} ${number}`.toLowerCase(),
      )
    )
      number++;
    const property = createBooleanProperty(`${label} ${number}`);
    if (!change({ ...editor, properties: [...editor.properties, property] }))
      return;
    setSetup(null);
    setEditing(property.id);
  };
  return (
    <Accordion size="S" density="spacious" defaultExpandedKeys={["properties"]}>
      <AccordionItem id="properties">
        <AccordionItemHeader>
          <AccordionItemTitle>{props.label ?? "Properties"}</AccordionItemTitle>
          {!isReadOnly && (
            <MenuTrigger>
              <ActionButton size="S" isQuiet aria-label="Add property">
                <Add />
              </ActionButton>
              <Menu
                onAction={(key) =>
                  addProperty(key === "boolean" ? "boolean" : "variant")
                }
              >
                {(!props.supportedKinds ||
                  props.supportedKinds.includes("boolean")) && (
                  <MenuItem id="boolean">Boolean</MenuItem>
                )}
                {(!props.supportedKinds ||
                  props.supportedKinds.includes("variant")) && (
                  <MenuItem id="variant">Variant</MenuItem>
                )}
              </Menu>
            </MenuTrigger>
          )}
        </AccordionItemHeader>
        <AccordionItemPanel>
          <div className="structureEditorFields">
            {props.showIndentationLevel && (
              <Picker
                size="S"
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
                  props.isBooleanUsed?.(property.id) === false;
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
                          namingScope={namingScope}
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
                          namingScope={namingScope}
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
                        size="S"
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
                        size="S"
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
                          size="S"
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
                          size="S"
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
                              } else if (
                                key === "delete-property" &&
                                props.operations.removeProperty
                              ) {
                                change(
                                  props.operations.removeProperty(
                                    editor,
                                    property.id,
                                  ),
                                );
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
                          {props.operations.removeProperty && (
                            <MenuItem id="delete-property">
                              Delete property
                            </MenuItem>
                          )}
                        </Menu>
                      </MenuTrigger>
                    )}
                  </StructurePropertyRow>
                );
              })}
            </div>
            {setup && !isReadOnly && (
              <PropertySetup
                key={`${setup}-${active?.id ?? ""}`}
                kind={setup}
                property={active}
                taxonomy={props.taxonomy}
                namingScope={namingScope}
                onClose={() => setSetup(null)}
                report={report}
                onSubmit={(property, taxonomy) => {
                  if (setup === "option") {
                    if (!active)
                      throw new Error(
                        "The selected variant is no longer available.",
                      );
                    const option = property.options.at(-1)!;
                    const next = duplicateVariantOption(
                      editor,
                      active.id,
                      preview.options[active.id] ?? active.defaultOptionId,
                      option,
                    );
                    if (
                      change(
                        {
                          ...next,
                          properties: next.properties.map((entry) =>
                            entry.id === property.id ? property : entry,
                          ),
                        },
                        taxonomy,
                      )
                    ) {
                      select(active, option.id);
                      setSetup(null);
                    }
                  } else {
                    if (
                      change(
                        {
                          ...editor,
                          properties: [...editor.properties, property],
                        },
                        taxonomy,
                      )
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
            size="S"
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
        size="S"
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
        size="S"
        isQuiet
        aria-label="Save boolean name"
        isDisabled={!name.trim()}
        onPress={() => onCommit(name.trim())}
      >
        <Checkmark />
      </ActionButton>
      <ActionButton
        size="S"
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
  taxonomy,
  namingScope,
  onSubmit,
  onClose,
  report,
}: {
  kind: "variant" | "option";
  property?: VariantProperty;
  taxonomy: TaxonomyDocument;
  namingScope: VariantNamingScope;
  onSubmit: (property: VariantProperty, taxonomy: TaxonomyDocument) => void;
  onClose: () => void;
  report: (error: unknown) => void;
}) {
  const [name, setName] = useState("");
  const [defaultName, setDefaultName] = useState("");
  const [request, setRequest] = useState<VariantRegistryRequest | null>(null);
  const field = useNameEditorFocus();
  const canSubmit =
    !!name.trim() && (kind === "option" || !!defaultName.trim());
  const submit = (createEntries = false) => {
    try {
      const option: VariantOption = {
        id: crypto.randomUUID(),
        name: (kind === "option" ? name : defaultName).trim(),
        classification: {},
      };
      let candidate: VariantProperty;
      if (kind === "option") {
        if (!property) throw new Error("The selected variant is unavailable.");
        candidate = {
          ...property,
          options: [...property.options, option],
        };
      } else {
        candidate = {
          id: crypto.randomUUID(),
          kind: "variant",
          name: name.trim(),
          classification: {},
          defaultOptionId: option.id,
          options: [option],
        };
      }
      if (!createEntries) {
        const pending = variantRegistrationRequest(
          candidate,
          taxonomy,
          namingScope,
        );
        if (pending) {
          setRequest(pending);
          return;
        }
      }
      const next = registerVariantProperty(
        candidate,
        taxonomy,
        createEntries,
        namingScope,
      );
      onSubmit(next.property, next.taxonomy);
      setRequest(null);
    } catch (error) {
      setRequest(null);
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
      <div className="structureEditorFields">
        <TextField
          ref={field}
          size="S"
          styles={nameFieldStyles}
          label={kind === "option" ? "Option name" : "Variant name"}
          value={name}
          onChange={setName}
          onKeyDown={(event) => {
            if (event.key === "Escape") onClose();
            if (event.key === "Enter" && canSubmit) submit();
          }}
        />
        {kind === "variant" && (
          <TextField
            size="S"
            styles={nameFieldStyles}
            label="Default option name"
            value={defaultName}
            onChange={setDefaultName}
            onKeyDown={(event) => {
              if (event.key === "Escape") onClose();
              if (event.key === "Enter" && canSubmit) submit();
            }}
          />
        )}
      </div>
      <DialogTrigger
        isOpen={request !== null}
        onOpenChange={(open) => {
          if (!open) setRequest(null);
        }}
      >
        <ActionButton
          size="S"
          isQuiet
          aria-label="Add"
          isDisabled={!canSubmit}
          onPress={() => submit()}
        >
          <Checkmark />
        </ActionButton>
        <Popover size="S">
          <Dialog
            aria-label="Create Registry entries"
            className={popoverDialogStyles}
          >
            <RegistryCreationContent
              request={request}
              taxonomy={taxonomy}
              onCancel={() => setRequest(null)}
              onCreate={() => submit(true)}
            />
          </Dialog>
        </Popover>
      </DialogTrigger>
      <ActionButton
        size="S"
        isQuiet
        aria-label="Cancel adding property option"
        onPress={onClose}
      >
        <Close />
      </ActionButton>
    </div>
  );
}

function VariantNameEditor<T extends PropertiesEditor>({
  editor,
  propertyId,
  optionId,
  taxonomy,
  namingScope,
  onCommit,
  onCancel,
}: {
  editor: T;
  propertyId: string;
  optionId?: string;
  taxonomy: TaxonomyDocument;
  namingScope: VariantNamingScope;
  onCommit: (editor: T, taxonomy: TaxonomyDocument) => void;
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
          namingScope,
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
            namingScope,
          )
        : renameVariantProperty(
            editor,
            propertyId,
            name,
            taxonomy,
            createTerm,
            namingScope,
          );
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
        size="S"
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
          size="S"
          isQuiet
          aria-label={`Save ${label}`}
          isDisabled={!name.trim()}
          onPress={() => save()}
        >
          <Checkmark />
        </ActionButton>
        <Popover size="S">
          <Dialog
            aria-label={
              termRequest?.entries
                ? "Create Registry entries"
                : "Create Registry term"
            }
            className={popoverDialogStyles}
          >
            <RegistryCreationContent
              request={termRequest}
              taxonomy={taxonomy}
              onCancel={() => setTermRequest(null)}
              onCreate={() => save(true)}
            />
          </Dialog>
        </Popover>
      </DialogTrigger>
      <ActionButton
        size="S"
        isQuiet
        aria-label={`Cancel editing ${label}`}
        onPress={onCancel}
      >
        <Close />
      </ActionButton>
    </div>
  );
}

function RegistryCreationContent({
  request,
  taxonomy,
  onCancel,
  onCreate,
}: {
  request: VariantRegistryRequest | null;
  taxonomy: TaxonomyDocument;
  onCancel: () => void;
  onCreate: () => void;
}) {
  return (
    <div className="structureEditorFields">
      <Heading level={3} styles={termHeadingStyles}>
        Create Registry {request?.entries ? "entries" : "term"}
      </Heading>
      <Text UNSAFE_className={String(termBodyStyles)}>
        {request?.entries
          ? `Add these entries to the Registry: ${request.entries.join("; ")}.`
          : `Add "${request?.name}" to ${taxonomy.categories.find((category) => category.id === request?.categoryId)?.name} and use it for this name.`}
      </Text>
      <ButtonGroup align="end" styles={termActionsStyles}>
        <Button size="S" variant="secondary" onPress={onCancel}>
          Cancel
        </Button>
        <Button size="S" variant="primary" onPress={onCreate}>
          Create
        </Button>
      </ButtonGroup>
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
