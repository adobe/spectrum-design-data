// Copyright 2026 Adobe. All rights reserved.
import {
  ActionButton,
  Button,
  Menu,
  MenuItem,
  MenuTrigger,
  PickerItem,
  Switch,
  Text,
  TextField,
  Tooltip,
  TooltipTrigger,
  AccordionItem,
  AccordionItemHeader,
  AccordionItemPanel,
  AccordionItemTitle,
} from "@react-spectrum/s2";
import Add from "@react-spectrum/s2/icons/Add";
import Edit from "@react-spectrum/s2/icons/Edit";
import Delete from "@react-spectrum/s2/icons/Delete";
import AlertTriangle from "@react-spectrum/s2/icons/AlertTriangle";
import { Dialog, Modal, ModalOverlay } from "react-aria-components";
import { useEffect, useRef, useState, type ComponentRef } from "react";
import { Picker } from "../../components/fields/Picker";
import {
  createBooleanProperty,
  createVariantProperty,
  type OptionProperty,
  type VariantProperty,
} from "../../features/option-groups/model";
import {
  registerTerm,
  type Classification,
  type TaxonomyDocument,
} from "../../features/taxonomy/model";
import { termLabel } from "../../features/taxonomy/termPresentation";
import {
  duplicateVariantOption,
  removeBooleanProperty,
  removeVariantOption,
  renameVariantOption,
  renameVariantProperty,
} from "../../features/structures/variantOperations";
import type {
  StructureEditorData,
  StructurePreviewState,
} from "../../features/structures/variants";

interface StructurePropertiesProps {
  editor: StructureEditorData;
  taxonomy: TaxonomyDocument;
  preview: StructurePreviewState;
  isReadOnly: boolean;
  onChange: (editor: StructureEditorData, taxonomy?: TaxonomyDocument) => void;
  onUndo: (before: StructureEditorData, after: StructureEditorData) => void;
  onPreview: (state: Partial<StructurePreviewState>) => void;
  report: (error: unknown) => void;
  addOptionRequest?: number;
}

export function StructureProperties(props: StructurePropertiesProps) {
  const { editor, preview, isReadOnly, onChange, onPreview, report } = props;
  const [dialog, setDialog] = useState<"boolean" | "variant" | "option" | null>(
    null,
  );
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
    setDialog(active ? "option" : "variant");
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
  return (
    <AccordionItem id="properties">
      <AccordionItemHeader>
        <AccordionItemTitle>Properties</AccordionItemTitle>
        {!isReadOnly && (
          <MenuTrigger>
            <ActionButton size="S" isQuiet aria-label="Add property">
              <Add />
            </ActionButton>
            <Menu
              onAction={(key) =>
                setDialog(key === "boolean" ? "boolean" : "variant")
              }
            >
              <MenuItem id="boolean">Boolean</MenuItem>
              <MenuItem id="variant">Variant</MenuItem>
            </Menu>
          </MenuTrigger>
        )}
      </AccordionItemHeader>
      <AccordionItemPanel>
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
              !Object.values(editor.visibilityBindings).some(
                (binding) => binding.propertyId === property.id,
              );
            const deletingDefault =
              property.kind === "variant" &&
              selected?.id === property.defaultOptionId;
            return (
              <div key={property.id} className="structurePropertyRow">
                {editing === property.id && property.kind === "boolean" ? (
                  <BooleanNameEditor
                    property={property}
                    onCancel={() => setEditing(null)}
                    onCommit={(name) => {
                      if (
                        change({
                          ...editor,
                          properties: editor.properties.map((item) =>
                            item.id === property.id ? { ...item, name } : item,
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
                      if (change(next, taxonomy)) setEditingProperty(null);
                    }}
                  />
                ) : property.kind === "variant" && !isReadOnly ? (
                  <ActionButton
                    size="S"
                    isQuiet
                    aria-label={`Edit property ${property.name}`}
                    onPress={() => setEditingProperty(property.id)}
                  >
                    {property.name}
                  </ActionButton>
                ) : (
                  <Text>{property.name}</Text>
                )}
                {property.kind === "variant" &&
                  (editing === property.id && selected ? (
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
                  ) : (
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
                  ))}
                {property.kind === "boolean" && (
                  <Switch
                    size="S"
                    aria-label={property.name}
                    isSelected={
                      preview.booleans[property.id] ?? property.defaultValue
                    }
                    onChange={(value) =>
                      onPreview({
                        booleans: { ...preview.booleans, [property.id]: value },
                      })
                    }
                  />
                )}
                {unused && (
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
                {!isReadOnly && (
                  <>
                    <ActionButton
                      size="S"
                      isQuiet
                      aria-label={`Edit ${property.kind === "variant" ? (selected?.name ?? property.name) : property.name}`}
                      onPress={() => setEditing(property.id)}
                    >
                      <Edit />
                    </ActionButton>
                    <ActionButton
                      size="S"
                      isQuiet
                      isDisabled={deletingDefault}
                      aria-label={
                        property.kind === "variant"
                          ? `Delete option ${selected?.name ?? ""}`
                          : `Delete ${property.name}`
                      }
                      onPress={() => {
                        try {
                          const next =
                            property.kind === "boolean"
                              ? removeBooleanProperty(editor, property.id)
                              : removeVariantOption(
                                  editor,
                                  property.id,
                                  selected!.id,
                                );
                          if (change(next)) {
                            if (property.kind === "variant")
                              select(property, property.defaultOptionId);
                          }
                        } catch (error) {
                          report(error);
                        }
                      }}
                    >
                      <Delete />
                    </ActionButton>
                  </>
                )}
              </div>
            );
          })}
        </div>
        {dialog && (
          <PropertySetup
            key={dialog}
            kind={dialog}
            taxonomy={props.taxonomy}
            property={active}
            onClose={() => setDialog(null)}
            report={report}
            onSubmit={(property, taxonomy) => {
              let next = {
                ...editor,
                properties: [...editor.properties, property],
              };
              if (
                dialog === "option" &&
                active &&
                property.kind === "variant"
              ) {
                const option = property.options[0];
                next = duplicateVariantOption(
                  editor,
                  active.id,
                  preview.options[active.id] ?? active.defaultOptionId,
                  option,
                );
                if (change(next, taxonomy)) {
                  select(active, option.id);
                  setDialog(null);
                }
              } else if (change(next, taxonomy)) {
                if (property.kind === "variant")
                  select(property, property.options[1].id);
                setDialog(null);
              }
            }}
          />
        )}
      </AccordionItemPanel>
    </AccordionItem>
  );
}

function BooleanNameEditor({
  property,
  onCommit,
  onCancel,
}: {
  property: OptionProperty;
  onCommit: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(property.name);
  const field = useNameEditorFocus();
  return (
    <TextField
      size="S"
      ref={field}
      aria-label="Boolean name"
      value={name}
      onChange={setName}
      isInvalid={!name.trim()}
      errorMessage="Give the boolean a name."
      onBlur={() => {
        if (name.trim()) onCommit(name.trim());
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") onCancel();
        if (event.key === "Enter" && name.trim()) onCommit(name.trim());
      }}
    />
  );
}

function RegistryAssignment({
  label,
  classification,
  taxonomy,
  onChange,
  onTaxonomy,
}: {
  label: string;
  classification: Classification;
  taxonomy: TaxonomyDocument;
  onChange: (classification: Classification) => void;
  onTaxonomy: (taxonomy: TaxonomyDocument) => void;
}) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const categoryId = Object.keys(classification)[0] ?? null;
  const termId = categoryId ? classification[categoryId] : null;
  return (
    <div className="structureEditorFields">
      <Picker
        size="S"
        label={`${label} category`}
        selectedKey={categoryId}
        onSelectionChange={(key) => {
          if (key !== null) onChange({ [String(key)]: "" });
        }}
      >
        {taxonomy.categories
          .filter((category) => category.scopes.includes("structures"))
          .map((category) => (
            <PickerItem id={category.id} key={category.id}>
              {category.name}
            </PickerItem>
          ))}
      </Picker>
      <Picker
        size="S"
        label={label}
        selectedKey={typeof termId === "string" && termId ? termId : null}
        isDisabled={!categoryId}
        onSelectionChange={(key) => {
          if (categoryId && key !== null)
            onChange({ [categoryId]: String(key) });
        }}
      >
        {taxonomy.terms
          .filter((term) => term.categoryId === categoryId)
          .map((term) => (
            <PickerItem id={term.id} key={term.id}>
              {termLabel(term.value)}
            </PickerItem>
          ))}
      </Picker>
      <TextField
        size="S"
        label={`New ${label.toLowerCase()} term`}
        value={draft}
        onChange={setDraft}
      />
      <Button
        size="S"
        variant="secondary"
        isDisabled={!categoryId || !draft.trim()}
        onPress={() => {
          try {
            if (!categoryId) throw new Error("Choose a Registry category.");
            const id = crypto.randomUUID();
            const next = registerTerm(taxonomy, categoryId, draft.trim(), id);
            const term = next.terms.find(
              (item) =>
                item.categoryId === categoryId &&
                String(item.value).toLowerCase() === draft.trim().toLowerCase(),
            );
            if (!term)
              throw new Error("The new Registry term could not be selected.");
            onTaxonomy(next);
            onChange({ [categoryId]: term.id });
            setDraft("");
            setError("");
          } catch (failure) {
            setError(
              failure instanceof Error ? failure.message : String(failure),
            );
          }
        }}
      >
        Create Registry term
      </Button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}

function PropertySetup({
  kind,
  taxonomy: initial,
  property,
  onSubmit,
  onClose,
  report,
}: {
  kind: "boolean" | "variant" | "option";
  taxonomy: TaxonomyDocument;
  property?: VariantProperty;
  onSubmit: (property: OptionProperty, taxonomy: TaxonomyDocument) => void;
  onClose: () => void;
  report: (error: unknown) => void;
}) {
  const [taxonomy, setTaxonomy] = useState(initial);
  const [name, setName] = useState("");
  const [classification, setClassification] = useState<Classification>(
    property?.classification ?? {},
  );
  const [first, setFirst] = useState<Classification>({});
  const [second, setSecond] = useState<Classification>({});
  const label = (selection: Classification) =>
    Object.values(selection)
      .flatMap((ids) =>
        (typeof ids === "string" ? [ids] : ids).map((id) =>
          termLabel(taxonomy.terms.find((term) => term.id === id)?.value ?? ""),
        ),
      )
      .join(" ");
  return (
    <ModalOverlay
      isOpen
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      isDismissable
      className="structureModalOverlay"
    >
      <Modal className="structureModal">
        <Dialog aria-label={`Add ${kind}`} className="structureEditorFields">
          <h3>
            {kind === "option" ? "Add variant option" : `Add ${kind} property`}
          </h3>
          {kind === "boolean" ? (
            <TextField
              size="S"
              label="Boolean name"
              value={name}
              onChange={setName}
            />
          ) : (
            <>
              {kind === "variant" && (
                <RegistryAssignment
                  label="Property"
                  taxonomy={taxonomy}
                  classification={classification}
                  onChange={setClassification}
                  onTaxonomy={setTaxonomy}
                />
              )}
              <RegistryAssignment
                label={kind === "variant" ? "Default option" : "Option"}
                taxonomy={taxonomy}
                classification={first}
                onChange={setFirst}
                onTaxonomy={setTaxonomy}
              />
              {kind === "variant" && (
                <RegistryAssignment
                  label="New option"
                  taxonomy={taxonomy}
                  classification={second}
                  onChange={setSecond}
                  onTaxonomy={setTaxonomy}
                />
              )}
            </>
          )}
          <div className="structureCompactRow">
            <Button size="S" variant="secondary" onPress={onClose}>
              Cancel
            </Button>
            <Button
              size="S"
              variant="primary"
              onPress={() => {
                try {
                  if (kind === "boolean")
                    onSubmit(createBooleanProperty(name), taxonomy);
                  else {
                    const next = createVariantProperty(
                      label(classification),
                      classification,
                      [
                        { name: label(first), classification: first },
                        {
                          name:
                            kind === "option" ? label(first) : label(second),
                          classification: kind === "option" ? first : second,
                        },
                      ],
                    );
                    onSubmit(next, taxonomy);
                  }
                } catch (error) {
                  report(error);
                }
              }}
            >
              Add
            </Button>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
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
  const field = useNameEditorFocus();
  const save = (createTerm = false) => {
    try {
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
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    }
  };
  return (
    <div className="structureEditorFields">
      <TextField
        size="S"
        ref={field}
        aria-label={optionId ? "Option name" : "Property name"}
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
          if (event.key === "Enter") save();
        }}
      />
      <div className="structureCompactRow">
        <Button size="S" variant="secondary" onPress={onCancel}>
          Cancel
        </Button>
        <Button size="S" variant="secondary" onPress={() => save()}>
          Save
        </Button>
      </div>
      {error && (
        <Button
          size="S"
          variant="secondary"
          isDisabled={!name.trim()}
          onPress={() => save(true)}
        >
          Create Registry term
        </Button>
      )}
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
