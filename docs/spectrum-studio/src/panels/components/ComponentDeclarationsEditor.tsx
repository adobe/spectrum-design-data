// Copyright 2026 Adobe. All rights reserved.
import { useId, useState } from "react";
import { v4 as uuid } from "uuid";
import {
  ActionButton,
  Button,
  ButtonGroup,
  Checkbox,
  CheckboxGroup,
  Content,
  Dialog,
  DialogContainer,
  Form,
  Heading,
  NumberField,
  Picker,
  PickerItem,
  Text,
  TextArea,
  TextField,
} from "@react-spectrum/s2";
import {
  Cell,
  Column,
  Row,
  TableBody,
  TableHeader,
  TableView,
} from "@react-spectrum/s2/TableView";
import { style } from "@react-spectrum/s2/style" with { type: "macro" };
import Add from "@react-spectrum/s2/icons/Add";
import Edit from "@react-spectrum/s2/icons/Edit";
import Delete from "@react-spectrum/s2/icons/Delete";
import type {
  ComponentOption,
  ComponentPart,
  ComponentRecord,
  ComponentState,
  JsonValue,
  OptionType,
} from "../../features/components/model";
import {
  isJsonValue,
  renameCondition,
  renamePart,
} from "../../features/components/model";
import { canonicalJson } from "../../features/design-data/canonicalJson";
import {
  declarationNames,
  reorderDeclarations,
  type DeclarationSection,
} from "../../features/components/ordering";
import { useComponentReordering } from "./useComponentReordering";

const tableStyles = style({ width: "full", height: 420, minWidth: 0 });
type Draft = {
  id: string;
  previous?: string;
  name: string;
  description: string;
  required: boolean;
  contains: string[];
  type: string;
  values: string;
  hasDefault: boolean;
  default: string;
  advanced: string;
  trigger: string;
  hasPrecedence: boolean;
  precedence: number;
  layered: boolean | undefined;
};
const defaultText = (value: JsonValue | undefined) =>
  typeof value === "string"
    ? value
    : value === undefined
      ? ""
      : JSON.stringify(value);
function optionLiteral(text: string, type: string): JsonValue {
  if (type === "string") return text;
  const value: unknown = JSON.parse(text);
  if (!isJsonValue(value)) throw new Error("Enter a valid JSON value.");
  return value;
}
export function ComponentDeclarationsEditor({
  component,
  section,
  editable,
  onApply,
}: {
  component: ComponentRecord;
  section: DeclarationSection;
  editable: boolean;
  onApply: (component: ComponentRecord) => void;
}) {
  const [draft, setDraft] = useState<Draft>();
  const [error, setError] = useState("");
  const formId = useId();
  const entries = declarationNames(component, section);
  const noun =
    section === "parts" ? "part" : section === "options" ? "option" : "state";
  const dragAndDropHooks = useComponentReordering<{ id: string; name: string }>(
    editable,
    `${component.id}-${section}`,
    (keys, target, position) => {
      onApply(reorderDeclarations(component, section, keys, target, position));
      setError("");
    },
    setError,
  );
  function open(name?: string) {
    const part = component.declaration.anatomy?.find(
      (part) => part.name === name,
    );
    const option = name ? component.declaration.options?.[name] : undefined;
    const state = component.declaration.states?.find(
      (state) => state.name === name,
    );
    setError("");
    setDraft({
      id: name ? component.identities[section][name] : uuid(),
      previous: name,
      name: name ?? "",
      description:
        (section === "parts" ? part : section === "options" ? option : state)
          ?.description ?? "",
      required: part?.required ?? false,
      contains: part?.contains ?? [],
      type: option?.$ref
        ? "schema"
        : typeof option?.type === "string"
          ? option.type
          : option?.type
            ? "structured"
            : "string",
      values:
        option?.values?.map((value) => defaultText(value.value)).join("\n") ??
        "",
      hasDefault: option ? "default" in option : false,
      default: defaultText(option?.default),
      advanced: JSON.stringify(option ?? { type: "object" }, null, 2),
      trigger: name ? (state?.trigger ?? "unspecified") : "interaction",
      hasPrecedence: state?.precedence !== undefined,
      precedence: state?.precedence ?? 0,
      layered: state?.layered,
    });
  }
  function apply(next: ComponentRecord, close = true) {
    try {
      onApply(next);
      setError("");
      if (close) setDraft(undefined);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    }
  }
  function remove(name: string) {
    const next = structuredClone(component);
    const id = next.identities[section][name];
    delete next.identities[section][name];
    if (section === "parts")
      next.declaration.anatomy = next.declaration.anatomy?.filter(
        (part) => part.name !== name,
      );
    else if (section === "states")
      next.declaration.states = next.declaration.states?.filter(
        (state) => state.name !== name,
      );
    else {
      if (
        component.assignments.some((row) => row.options && name in row.options)
      ) {
        setError(
          "This option is used by a property assignment. Remove its condition first.",
        );
        return;
      }
      delete next.declaration.options?.[name];
      next.optionOrder = next.optionOrder.filter((entry) => entry !== id);
    }
    apply(next);
  }
  function submit() {
    if (!draft) return;
    try {
      if (!draft.name.trim()) throw new Error(`Enter a ${noun} name.`);
      const existing = draft.previous !== undefined;
      if (
        draft.name !== draft.previous &&
        component.identities[section][draft.name]
      )
        throw new Error(`This ${noun} name is already used.`);
      let next = structuredClone(component);
      if (existing && draft.name !== draft.previous)
        next =
          section === "parts"
            ? renamePart(next, draft.previous!, draft.name)
            : renameCondition(next, section, draft.previous!, draft.name);
      next.identities[section][draft.name] = draft.id;
      if (section === "parts") {
        const original = next.declaration.anatomy?.find(
          (part) => part.name === draft.name,
        );
        const part: ComponentPart = {
          ...original,
          name: draft.name,
          description: draft.description,
          required: draft.required,
          contains: draft.contains.map((name) =>
            name === draft.previous ? draft.name : name,
          ),
        };
        next.declaration.anatomy = existing
          ? next.declaration.anatomy!.map((entry) =>
              entry.name === draft.name ? part : entry,
            )
          : [...(next.declaration.anatomy ?? []), part];
      } else if (section === "states") {
        const original = next.declaration.states?.find(
          (state) => state.name === draft.name,
        );
        const state: ComponentState = {
          ...original,
          name: draft.name,
          description: draft.description,
          ...(draft.trigger === "prop" || draft.trigger === "interaction"
            ? { trigger: draft.trigger }
            : {}),
        };
        if (draft.trigger === "unspecified") delete state.trigger;
        if (draft.layered === undefined) delete state.layered;
        else state.layered = draft.layered;
        if (draft.hasPrecedence) state.precedence = draft.precedence;
        else delete state.precedence;
        next.declaration.states = existing
          ? next.declaration.states!.map((entry) =>
              entry.name === draft.name ? state : entry,
            )
          : [...(next.declaration.states ?? []), state];
      } else {
        let option: ComponentOption;
        if (
          ["schema", "structured", "object", "array", "null"].includes(
            draft.type,
          )
        ) {
          const parsed: unknown = JSON.parse(draft.advanced);
          if (
            !parsed ||
            typeof parsed !== "object" ||
            Array.isArray(parsed) ||
            !isJsonValue(parsed)
          )
            throw new Error("Enter an option descriptor object.");
          option = parsed as ComponentOption;
          option.description = draft.description;
        } else {
          const original = next.declaration.options?.[draft.name];
          option = {
            ...original,
            type: draft.type as OptionType,
            description: draft.description,
          };
          delete option.$ref;
          if (draft.values.trim())
            option.values = draft.values.split("\n").map((text) => {
              const value = optionLiteral(text, draft.type);
              const previous = original?.values?.find(
                (entry) => canonicalJson(entry.value) === canonicalJson(value),
              );
              return { ...previous, value };
            });
          else delete option.values;
          if (draft.hasDefault)
            option.default = optionLiteral(draft.default, draft.type);
          else delete option.default;
        }
        next.declaration.options = {
          ...next.declaration.options,
          [draft.name]: option,
        };
        if (!existing) next.optionOrder.push(draft.id);
      }
      apply(next);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    }
  }
  const rows = entries.map((name) => {
    const part = component.declaration.anatomy?.find(
      (part) => part.name === name,
    );
    const option = component.declaration.options?.[name];
    const state = component.declaration.states?.find(
      (state) => state.name === name,
    );
    const details =
      section === "parts"
        ? `${part?.required ? "Required" : "Optional"}${part?.contains?.length ? `, contains ${part.contains.join(", ")}` : ""}`
        : section === "states"
          ? `${state?.trigger ?? "Unspecified trigger"}, precedence ${state?.precedence ?? "not set"}, layering ${state?.layered === undefined ? "not set" : state.layered ? "on" : "off"}`
          : `${option?.$ref ? `Shared type: ${option.$ref}` : `Type: ${Array.isArray(option?.type) ? option.type.join(" or ") : (option?.type ?? "unspecified")}`}${option && "default" in option ? `, default: ${defaultText(option.default)}` : ", no default"}${option?.values ? `, allowed values: ${option.values.map((entry) => defaultText(entry.value)).join(", ")}` : ""}`;
    return {
      id: component.identities[section][name],
      name,
      details,
      description:
        (section === "parts" ? part : section === "states" ? state : option)
          ?.description ?? "",
    };
  });
  const close = () => {
    setDraft(undefined);
    setError("");
  };
  return (
    <section
      className="componentSection"
      aria-label={`${section} declarations`}
    >
      {editable && (
        <ActionButton onPress={() => open()}>
          <Add />
          <Text>Add {noun}</Text>
        </ActionButton>
      )}
      <TableView
        key={`${section}:${editable}`}
        aria-label={`${section} declarations`}
        styles={tableStyles}
        dragAndDropHooks={dragAndDropHooks}
      >
        <TableHeader>
          <Column id="name" isRowHeader minWidth={120}>
            Name
          </Column>
          <Column id="details" minWidth={160}>
            Details
          </Column>
          <Column id="description" minWidth={140}>
            Description
          </Column>
          {editable && (
            <Column id="actions" width={104}>
              Actions
            </Column>
          )}
        </TableHeader>
        <TableBody
          items={rows}
          dependencies={[editable]}
          renderEmptyState={() => `No ${section} are declared.`}
        >
          {(row) => (
            <Row id={row.id} textValue={row.name}>
              <Cell>{row.name}</Cell>
              <Cell>
                <span className="componentDescription" title={row.details}>
                  {row.details}
                </span>
              </Cell>
              <Cell>
                <span className="componentDescription" title={row.description}>
                  {row.description}
                </span>
              </Cell>
              {editable && (
                <Cell>
                  <div className="componentRowActions">
                    <ActionButton
                      isQuiet
                      size="S"
                      aria-label={`Edit ${noun} ${row.name}`}
                      onPress={() => open(row.name)}
                    >
                      <Edit />
                    </ActionButton>
                    <ActionButton
                      isQuiet
                      size="S"
                      aria-label={`Delete ${noun} ${row.name}`}
                      onPress={() => remove(row.name)}
                    >
                      <Delete />
                    </ActionButton>
                  </div>
                </Cell>
              )}
            </Row>
          )}
        </TableBody>
      </TableView>
      {error && !draft && <p role="alert">{error}</p>}
      <DialogContainer onDismiss={close}>
        {draft && editable && (
          <Dialog size="L">
            <Heading slot="title">
              {draft.previous ? "Edit" : "Add"} {noun}
            </Heading>
            <Content>
              <Form
                id={formId}
                aria-label={`${draft.previous ? "Edit" : "Add"} ${noun}`}
                UNSAFE_className="componentForm"
                onSubmit={(event) => {
                  event.preventDefault();
                  submit();
                }}
              >
                {/* eslint-disable-next-line jsx-a11y/no-autofocus -- Focus follows the user's Add or Edit action. */}
                <TextField
                  label={`${noun[0].toUpperCase()}${noun.slice(1)} name`}
                  autoFocus
                  isRequired
                  value={draft.name}
                  onChange={(name) => setDraft({ ...draft, name })}
                />
                <TextArea
                  label="Description"
                  value={draft.description}
                  onChange={(description) =>
                    setDraft({ ...draft, description })
                  }
                />
                {section === "parts" && (
                  <>
                    <Checkbox
                      isSelected={draft.required}
                      onChange={(required) => setDraft({ ...draft, required })}
                    >
                      Required part
                    </Checkbox>
                    <CheckboxGroup
                      label="Contains"
                      value={draft.contains}
                      onChange={(contains) => setDraft({ ...draft, contains })}
                    >
                      {entries
                        .filter((name) => name !== draft.previous)
                        .map((name) => (
                          <Checkbox key={name} value={name}>
                            {name}
                          </Checkbox>
                        ))}
                    </CheckboxGroup>
                  </>
                )}
                {section === "states" && (
                  <>
                    <Picker
                      label="Trigger"
                      selectedKey={draft.trigger}
                      onSelectionChange={(key) =>
                        setDraft({ ...draft, trigger: String(key) })
                      }
                    >
                      <PickerItem id="unspecified">Unspecified</PickerItem>
                      <PickerItem id="prop">Prop</PickerItem>
                      <PickerItem id="interaction">Interaction</PickerItem>
                    </Picker>
                    <Checkbox
                      isSelected={draft.hasPrecedence}
                      onChange={(hasPrecedence) =>
                        setDraft({ ...draft, hasPrecedence })
                      }
                    >
                      Set precedence
                    </Checkbox>
                    {draft.hasPrecedence && (
                      <NumberField
                        label="Precedence"
                        minValue={0}
                        step={1}
                        value={draft.precedence}
                        onChange={(precedence) =>
                          setDraft({ ...draft, precedence })
                        }
                      />
                    )}
                    <Checkbox
                      isSelected={draft.layered ?? false}
                      onChange={(layered) => setDraft({ ...draft, layered })}
                    >
                      Layered state
                    </Checkbox>
                    {draft.layered !== undefined && (
                      <ActionButton
                        onPress={() =>
                          setDraft({ ...draft, layered: undefined })
                        }
                      >
                        Clear layering
                      </ActionButton>
                    )}
                  </>
                )}
                {section === "options" && (
                  <>
                    <Picker
                      label="Type"
                      selectedKey={draft.type}
                      onSelectionChange={(key) => {
                        const type = String(key);
                        setDraft({
                          ...draft,
                          type,
                          advanced: JSON.stringify(
                            type === "schema"
                              ? { $ref: "", description: draft.description }
                              : {
                                  type:
                                    type === "structured"
                                      ? ["string", "number"]
                                      : type,
                                  description: draft.description,
                                },
                            null,
                            2,
                          ),
                        });
                      }}
                    >
                      {[
                        ["string", "Text"],
                        ["number", "Number"],
                        ["integer", "Integer"],
                        ["boolean", "Boolean"],
                        ["object", "Object"],
                        ["array", "Array"],
                        ["null", "Null"],
                        ["structured", "Structured or union"],
                        ["schema", "Shared schema"],
                      ].map(([id, label]) => (
                        <PickerItem key={id} id={id}>
                          {label}
                        </PickerItem>
                      ))}
                    </Picker>
                    {[
                      "schema",
                      "structured",
                      "object",
                      "array",
                      "null",
                    ].includes(draft.type) ? (
                      <TextArea
                        label="Option descriptor JSON"
                        value={draft.advanced}
                        onChange={(advanced) =>
                          setDraft({ ...draft, advanced })
                        }
                      />
                    ) : (
                      <>
                        <TextArea
                          label="Allowed values"
                          description="One value per line. Leave empty for an unrestricted option."
                          value={draft.values}
                          onChange={(values) => setDraft({ ...draft, values })}
                        />
                        <Checkbox
                          isSelected={draft.hasDefault}
                          onChange={(hasDefault) =>
                            setDraft({
                              ...draft,
                              hasDefault,
                              default:
                                draft.type === "boolean" && !draft.default
                                  ? "false"
                                  : draft.default,
                            })
                          }
                        >
                          Set a default
                        </Checkbox>
                        {draft.hasDefault &&
                          (draft.type === "boolean" ? (
                            <Picker
                              label="Default value"
                              selectedKey={draft.default || "false"}
                              onSelectionChange={(key) =>
                                setDraft({ ...draft, default: String(key) })
                              }
                            >
                              <PickerItem id="false">False</PickerItem>
                              <PickerItem id="true">True</PickerItem>
                            </Picker>
                          ) : (
                            <TextField
                              label="Default value"
                              value={draft.default}
                              onChange={(value) =>
                                setDraft({ ...draft, default: value })
                              }
                            />
                          ))}
                      </>
                    )}
                  </>
                )}
                {error && <p role="alert">{error}</p>}
              </Form>
            </Content>
            <ButtonGroup>
              <Button variant="secondary" onPress={close}>
                Cancel changes
              </Button>
              <Button type="submit" form={formId} variant="primary">
                Apply changes
              </Button>
            </ButtonGroup>
          </Dialog>
        )}
      </DialogContainer>
    </section>
  );
}
